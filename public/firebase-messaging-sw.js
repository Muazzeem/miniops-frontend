/* Shows Firebase pushes while no MiniOps tab is focused (open tabs get them over the WebSocket).
   Keep the version in step with the "firebase" package.
   Logs show in DevTools → Application → Service workers → this worker's console. */
self.addEventListener("error", (e) => console.error("[push-sw] error", e.message, e.error));
self.addEventListener("unhandledrejection", (e) => console.error("[push-sw] unhandled", e.reason));
try {
  importScripts(
    "https://www.gstatic.com/firebasejs/13.2.0/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/13.2.0/firebase-messaging-compat.js",
  );
  // Config comes from the registration URL (see src/lib/push.ts).
  firebase.initializeApp(Object.fromEntries(new URL(self.location.href).searchParams));
  firebase
    .messaging()
    .onBackgroundMessage((payload) => console.log("[push-sw] notification received", payload));
} catch (e) {
  console.error("[push-sw] setup failed", e);
}
