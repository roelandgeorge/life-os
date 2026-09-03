/*
 * Push handlers, imported into the service worker vite-plugin-pwa generates
 * (see `workbox.importScripts` in vite.config.ts).
 *
 * It lives in public/ rather than src/ because it is not part of the app
 * bundle — the service worker imports it verbatim at its own scope, with no
 * build step and no module system.
 */

self.addEventListener('push', (event) => {
  // A push with no payload still has to show something: `userVisibleOnly` is
  // required by every browser, and a push that shows nothing can get the
  // subscription revoked.
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || 'Life OS';
  const options = {
    body: payload.body || 'Fill in today.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    // One reminder replaces the last rather than stacking a week of them.
    tag: 'life-os-daily',
    renotify: true,
    data: { url: payload.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // Focus the app if it is already open rather than stacking another copy.
      for (const client of windows) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow(target);
    })(),
  );
});
