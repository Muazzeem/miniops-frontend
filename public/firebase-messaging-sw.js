/* Shows Firebase pushes while no MiniOps tab is focused (open tabs get them over the WebSocket).
   Keep the version in step with the "firebase" package. */
importScripts(
  "https://www.gstatic.com/firebasejs/13.2.0/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/13.2.0/firebase-messaging-compat.js",
);
// Config comes from the registration URL (see src/lib/push.ts).
firebase.initializeApp(Object.fromEntries(new URL(self.location.href).searchParams));
firebase.messaging();
