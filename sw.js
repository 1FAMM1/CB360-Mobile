// Força o Service Worker a atualizar-se mal haja uma nova versão
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

// Evento de Receção da Notificação
self.addEventListener('push', function(event) {
  // Valores padrão caso algo falhe no JSON
  let data = { 
    title: 'CB360 Mobile', 
    body: 'Nova atualização no sistema!',
    icon: '/icon-192.png',
    badge: '/icon-192.png'
  };

  try {
    if (event.data) {
      // Tenta ler o JSON enviado pela tua API (sendPush.js)
      data = event.data.json();
    }
  } catch (err) {
    // Se não for JSON, lê como texto simples
    data.body = event.data.text();
  }

  const options = {
    body: data.body || 'Tens uma nova mensagem.',
    icon: data.icon || '/icon-192.png', // O logo vermelho que vem da API
    badge: data.badge, // A bolinha da esquerda
    vibrate: [200, 100, 200],
    tag: 'cb360-msg',
    renotify: true,
    requireInteraction: true, // Ajuda o banner a ficar visível
    data: {
      url: data.data?.url || '/'
    }
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
      const targetUrl = event.notification.data.url || '/';
      
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
