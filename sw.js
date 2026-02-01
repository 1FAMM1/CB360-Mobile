/* =========================================================
CB360 Mobile - Complete Service Worker (v2.8.2)
Optimized for: Smart Push Filtering + Offline Cache
========================================================= */
const CACHE_NAME = 'cb360-cache-v2.8.7';
const ASSETS_TO_CACHE = [
  '/', '/index.html', '/MainPage.html', '/ScalesView.html', '/Swaps.html', 
  '/MainPageEl.html', '/PiqDisp.html', '/DecDisp.html', '/ExtDisp.html', 
  '/DispView.html', '/SolVacat.html', '/Attendance.html', '/OnGoingOcr.html', 
  '/FomioPage.html', '/Events.html', '/MissReport.html', '/Documents.html', 
  '/Comunic.html', '/MeteoAdv.html', '/NoHospital.html', '/MainPageVe.html', 
  '/VeicStat.html', '/VeicSitop.html', '/Tools.html', '/GCIncRural.html', 
  '/DecirTeam.html', '/InterChat.html', '/manifest.json',
];
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: A guardar ficheiros essenciais na cache');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              return caches.delete(cache);
            }
          })
        );
      })
    ])
  );
});
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes(self.location.origin)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {        
        });
      })
    );
  }
});
/* ============================ PUSH v2.8.7 ============================ */
self.addEventListener('push', function(event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { message: event.data.text() };
  }

  // O ID de quem enviou (neste caso, o 103)
  const idDoRemetente = data.chatId ? String(data.chatId).trim() : null;

  const promise = clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(windowClients => {
      // Procuramos se existe alguma janela que tenha o ID do remetente na URL
      const utilizadorJaEstaAVer = windowClients.some(client => {
        // Verifica se é a página do chat E se o ID do remetente está na URL
        return client.url.includes('InterChat.html') && 
               client.url.includes('chatId=' + idDoRemetente);
      });

      if (utilizadorJaEstaAVer) {
        console.log("Silenciando: O utilizador já tem o chat do " + idDoRemetente + " aberto.");
        return; // MATA A NOTIFICAÇÃO AQUI
      }

      // Se não estiver aberto, mostra a notificação
      return self.registration.showNotification(data.title || 'CB360 Mobile', {
        body: data.message || data.body || 'Nova mensagem',
        icon: '/icon-192.png',
        tag: 'chat-group',
        renotify: true,
        data: { url: data.url || '/InterChat.html' }
      });
    });

  event.waitUntil(promise);
});
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('InterChat.html') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url || '/');
      }
    })
  );
});
