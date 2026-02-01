/* =========================================================
CB360 Mobile - Complete Service Worker (v2.8.2)
Optimized for: Smart Push Filtering + Offline Cache
========================================================= */
const CACHE_NAME = 'cb360-cache-v2.8.4';
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
/* ============================ PUSH INTELIGENTE (Versão Blindada) ============================ */
self.addEventListener('push', function(event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { message: event.data ? event.data.text() : 'Nova mensagem' };
  }

  // 1. Pegamos o ID de quem enviou (do payload do servidor)
  // Garantimos que é uma string limpa
  const remetenteID = data.chatId ? String(data.chatId).trim() : "null";

  const promise = clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(windowClients => {
      
      // 2. Procuramos a janela do chat
      // Usamos .some() para verificar se existe ALGUMA janela que cumpra o critério
      const jaEstaNoChat = windowClients.some(client => {
        // Se não for a página do chat, ignora
        if (!client.url.includes('InterChat.html')) return false;

        // Extraímos o chatId da URL manualmente (mais seguro que URLSearchParams no Android)
        const urlParts = client.url.split('chatId=');
        if (urlParts.length > 1) {
          const idNaUrl = urlParts[1].split('&')[0]; // Pega o ID e ignora o resto
          
          // COMPARAÇÃO REAL:
          // Se o ID da Janela aberta for igual ao ID de quem enviou o Push...
          return String(idNaUrl).trim() === remetenteID;
        }
        return false;
      });

      // 3. SE já estiver no chat, RETORNAMOS aqui e não mostramos a notificação
      if (jaEstaNoChat) {
        console.log("Filtro Ativo: Utilizador já está a ler o chat " + remetenteID);
        return; 
      }

      // 4. Caso contrário, mostra a notificação normal
      const options = {
        body: data.message || data.body || 'Tens uma nova mensagem.',
        icon: '/icon-192.png',
        vibrate: [200, 100, 200],
        tag: 'chat-group', // Importante para não duplicar alertas
        renotify: true,
        data: { url: data.url || '/InterChat.html' }
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
