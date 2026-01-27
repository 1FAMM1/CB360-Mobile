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
      // Tenta ler como JSON, se falhar vai para o catch
      data = event.data.json();
    }
  } catch (err) {
    // Se o envio não for JSON (ex: texto simples), assume como a mensagem
    data.message = event.data.text();
  }
  const options = {
    body: data.message || data.body || 'Tens uma nova mensagem.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    // No iOS, estas tags ajudam a agrupar notificações
    tag: 'cb360-notification',
    renotify: true
  };
  const title = data.title || 'CB360 Mobile';
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});
// Evento de Clique na Notificação
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  // Tenta focar numa janela aberta ou abrir uma nova
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
