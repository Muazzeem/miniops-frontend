/** Browser push (Firebase Cloud Messaging): the token is saved on the user via /users/me/. */
import { usersApi } from "@/lib/api";

const env = import.meta.env;
const config: Record<string, string> = {
  apiKey: env["VITE_FIREBASE_API_KEY"] ?? "",
  authDomain: env["VITE_FIREBASE_AUTH_DOMAIN"] ?? "",
  projectId: env["VITE_FIREBASE_PROJECT_ID"] ?? "",
  messagingSenderId: env["VITE_FIREBASE_MESSAGING_SENDER_ID"] ?? "",
  appId: env["VITE_FIREBASE_APP_ID"] ?? "",
};
const vapidKey: string = env["VITE_FIREBASE_VAPID_KEY"] ?? "";
// Set when someone turns browser notifications off on this browser.
const OPT_OUT = "miniops:browser-push-off";

// shortcut: verbose "[push]" logs while setting push up, trim once it's working.
const log = (...args: unknown[]) => console.log("[push]", ...args);

export const pushAvailable = () =>
  typeof window !== "undefined" &&
  "Notification" in window &&
  "serviceWorker" in navigator &&
  !!config["apiKey"];

function logAvailability() {
  log("available?", {
    window: typeof window !== "undefined",
    Notification: typeof window !== "undefined" && "Notification" in window,
    serviceWorker: typeof navigator !== "undefined" && "serviceWorker" in navigator,
    apiKey: !!config["apiKey"],
    projectId: config["projectId"],
    vapidKey: vapidKey ? "custom" : "Firebase default",
    secureContext: typeof window !== "undefined" && window.isSecureContext,
  });
}

export function pushOptedIn(): boolean {
  try {
    return localStorage.getItem(OPT_OUT) !== "1";
  } catch {
    return true;
  }
}

function setOptIn(on: boolean) {
  try {
    if (on) localStorage.removeItem(OPT_OUT);
    else localStorage.setItem(OPT_OUT, "1");
  } catch {
    /* private mode: the switch just won't be remembered */
  }
}

/** Creates this browser's FCM token and saves it on the user. `fromClick` (the toast or
 * settings button) may show the permission prompt, which browsers only allow on a click,
 * and undoes an earlier "Not now". It must stay synchronous up to requestPermission. */
export async function registerPush(fromClick = false): Promise<boolean> {
  log("registerPush", { fromClick, optedIn: pushOptedIn() });
  if (!pushAvailable()) {
    logAvailability();
    log("stop: push not available in this browser/config");
    return false;
  }
  if (!fromClick && !pushOptedIn()) {
    log("stop: this browser chose 'Not now' earlier");
    return false;
  }
  log("permission before:", Notification.permission);
  if (Notification.permission === "default") {
    if (!fromClick) {
      log("stop: permission not asked yet, needs a click");
      return false;
    }
    const answer = await Notification.requestPermission();
    log("permission answer:", answer);
  }
  if (Notification.permission !== "granted") {
    log("stop: permission is", Notification.permission);
    return false;
  }
  const [{ getApps, initializeApp }, { getMessaging, getToken, isSupported }] = await Promise.all([
    import("firebase/app"),
    import("firebase/messaging"),
  ]);
  log("firebase loaded");
  const supported = await isSupported();
  log("firebase messaging supported:", supported);
  if (!supported) return false;
  const app = getApps()[0] ?? initializeApp(config);
  log("firebase app ready:", app.options.projectId);
  // The service worker can't read Vite env, so it gets the config in its URL.
  const sw = await navigator.serviceWorker.register(
    `/firebase-messaging-sw.js?${new URLSearchParams(config)}`,
  );
  log("service worker registered:", sw.scope, {
    installing: !!sw.installing,
    waiting: !!sw.waiting,
    active: !!sw.active,
  });
  // No VAPID key set: Firebase falls back to its built-in default key.
  log("requesting FCM token…");
  const token = await getToken(getMessaging(app), {
    serviceWorkerRegistration: sw,
    ...(vapidKey ? { vapidKey } : {}),
  });
  log("FCM token:", token ? `${token.slice(0, 16)}… (${token.length} chars)` : token);
  if (!token) return false;
  log("saving token to /users/me/…");
  await usersApi.update({ fcm_token: token });
  log("token saved ✓");
  setOptIn(true);
  return true;
}

/** Clears the saved token. `forget` (switch turned off) also opts this browser out;
 * sign-out doesn't, so the next sign-in here resumes pushes. */
export async function unregisterPush(forget = false): Promise<void> {
  log("unregisterPush (clears the saved token)", { forget });
  if (forget) setOptIn(false);
  await usersApi.update({ fcm_token: "" }).catch(() => {});
}

const warn = (e: unknown) => console.error("[push] setup failed", e);

/** On sign-in: refreshes the token if already allowed. True when we should ask. */
export function startPush(): boolean {
  logAvailability();
  log("startPush (signed in)", {
    optedIn: pushOptedIn(),
    permission: typeof Notification !== "undefined" ? Notification.permission : "n/a",
  });
  if (!pushAvailable() || !pushOptedIn()) {
    log("stop: not available or opted out");
    return false;
  }
  if (Notification.permission === "granted") {
    registerPush().catch(warn);
    return false;
  }
  const ask = Notification.permission === "default"; // "denied": blocked in browser settings
  log(ask ? "showing permission dialog" : "stop: notifications blocked in browser settings");
  return ask;
}

/** "Not now": stop asking on this browser (the settings switch can still turn it on). */
export const declinePush = () => {
  log("user clicked 'Not now'");
  setOptIn(false);
};
