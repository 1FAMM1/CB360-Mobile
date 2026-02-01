/* =========================================================
CB360 Mobile - Complete Service Worker (v2.8.2)
Optimized for: Smart Push Filtering + Offline Cache
========================================================= */
const CACHE_NAME = 'cb360-cache-v2.8.2';
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
/* ============================ PUSH INTELIGENTE ============================ */
self.addEventListener('push', function(event) {
  let data = { title: 'CB360 Mobile', message: 'Nova atualização no sistema!' };
  
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (err) {
    data.message = event.data.text();
  }

  // Pegamos o ID de quem enviou e garantimos que é String e não tem espaços
  const pushChatId = data.chatId ? String(data.chatId).trim() : null; 

  const promise = clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(windowClients => {
      // 1. Procurar janela de chat focada
      const activeChatWindow = windowClients.find(client => 
        client.url.indexOf('InterChat.html') !== -1 && client.focused
      );

      if (activeChatWindow && pushChatId) {
        // Tentativa 1: Via searchParams
        const urlObj = new URL(activeChatWindow.url);
        let activeIdInUrl = urlObj.searchParams.get('chatId');

        // Tentativa 2: Se o searchParams falhar (comum em PWAs), tentamos regex na URL
        if (!activeIdInUrl) {
          const match = activeChatWindow.url.match(/[?&]chatId=([^&]+)/);
          if (match) activeIdInUrl = match[1];
        }

        if (activeIdInUrl) {
          const cleanActiveId = String(activeIdInUrl).trim();
          
          console.log(`SW: Comparando Ativo(${cleanActiveId}) com Push(${pushChatId})`);

          if (cleanActiveId === pushChatId) {
            console.log("SW: IDs Iguais. Bloqueando notificação.");
            return; // PARA AQUI
          }
        }
      }

      // 2. Se não for igual, mostra a notificação
      const options = {
        body: data.message || data.body || 'Tens uma nova mensagem.',
        icon: '/icon-192.png',
        vibrate: [200, 100, 200, 100, 200],
        data: { url: data.url || '/InterChat.html' },
        tag: 'cb360-notification',
        renotify: true
      };

      return self.registration.showNotification(data.title || 'CB360 Mobile', options);
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
