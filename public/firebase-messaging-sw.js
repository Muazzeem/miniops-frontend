/* Shows Firebase pushes while no MiniOps tab is focused (open tabs get them over the WebSocket).
   Keep the version in step with the "firebase" package.
   Logs show in DevTools → Application → Service workers → this worker's console. */
self.addEventListener("error", (e) => console.error("[push-sw] error", e.message, e.error));
self.addEventListener("unhandledrejection", (e) => console.error("[push-sw] unhandled", e.reason));
// Registered before Firebase's own handler so clicks focus an open MiniOps tab (or open one).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((tabs) => {
      const tab = tabs.find((c) => new URL(c.url).origin === self.location.origin);
      return tab ? tab.focus() : clients.openWindow("/");
    }),
  );
});
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
