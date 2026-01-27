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
    // Prioriza o 'body' da API, depois 'message', e por fim o padrão
    body: data.body || data.message || 'Tens uma nova mensagem.',
    
    // Agora o ícone e o badge são dinâmicos!
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    
    // Ativa a vibração enviada pela API
    vibrate: data.vibrate || [200, 100, 200],
    
    data: {
      // Garante que o URL de destino também é dinâmico
      url: (data.data && data.data.url) || data.url || '/'
    },
    
    // Tag ajuda a substituir notificações antigas pelas novas
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
