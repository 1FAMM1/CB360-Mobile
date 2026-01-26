self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('fetch', (e) => {});
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : { title: 'Aviso', message: 'Nova notificação!' };
  
  const options = {
    body: data.message,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: { url: '/' }
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
