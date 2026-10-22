// Smartly's service worker: reminders as push notifications, nothing else.
// No caching and no offline pages -- every request still goes to the network
// exactly as it would without this file.
//
// The backend sends { title, body, url, tag } already written in the
// device's language (see the reminders scheduler). A tap opens `url` in a
// Smartly tab that is already open, or in a new one.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "Smartly";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      icon: "/brand/icon-192.png",
      badge: "/brand/badge-96.png",
      tag: payload.tag || undefined,
      data: { url: payload.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // Only this site's own pages: a url from elsewhere opens the home page.
  const target = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin);
  const url = target.origin === self.location.origin ? target.href : self.location.origin + "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((tabs) => {
      const tab = tabs.find((each) => new URL(each.url).origin === self.location.origin);
      if (!tab) return self.clients.openWindow(url);
      // navigate() needs a tab this worker controls; one it doesn't gets a
      // new window instead.
      return tab
        .focus()
        .then((focused) => focused.navigate(url))
        .catch(() => self.clients.openWindow(url));
    }),
  );
});
