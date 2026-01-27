// SW Version 1.2 - Badge CB360 Update
// Força o Service Worker a atualizar-se mal haja uma nova versão
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

// Evento de Receção da Notificação
self.addEventListener('push', function(event) {
  let data = { title: 'CB360 Mobile', message: 'Nova atualização no sistema!' };
  
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (err) {
    data.message = event.data.text();
  }
  
  const options = {
    body: data.message || data.body || 'Tens uma nova mensagem.',
    icon: '/icon-192.png',
    badge: '/badge-icon.png',
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: data.url || '/'
    },
    tag: 'cb360-notification',
    renotify: true,
    silent: false
  };
  
  const title = data.title || 'CB360 Mobile';
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Evento de Clique na Notificação
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url || '/');
      }
    })
  );
});
