self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('fetch', (e) => {});


self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : { title: 'Notificação', message: 'Nova mensagem!' };

  const options = {
    body: data.message,
    icon: '/icon-192x192.png', // Garante que este ficheiro existe
    badge: '/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      url: '/' // Abre o site ao clicar
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Ao clicar na notificação, foca na janela do app
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
