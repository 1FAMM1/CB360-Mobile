/* =========================================================
    CB360 Mobile - Complete Service Worker
    v2.8.4 - Com supressão de notificações em chats ativos
    ========================================================= */
    const CACHE_NAME = 'cb360-cache-v2.8.4';
    const ASSETS_TO_CACHE = ['/', '/index.html', '/MainPage.html', '/ScalesView.html', '/Swaps.html',
                             '/MainPageEl.html', '/PiqDisp.html', '/DecDisp.html', '/ExtDisp.html',
                             '/DispView.html', '/SolVacat.html', '/Attendance.html', '/OnGoingOcr.html',
                             '/FomioPage.html', '/Events.html', '/MissReport.html', '/Documents.html',
                             '/Comunic.html', '/MeteoAdv.html', '/NoHospital.html', '/MainPageVe.html',
                             '/VeicStat.html', '/VeicSitop.html', '/Tools.html', '/GCIncRural.html',
                             '/DecirTeam.html', '/InterChat.html', '/manifest.json'];
    let activeChats = new Map();
    self.addEventListener('install', (event) => {
      self.skipWaiting();
      event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
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
    self.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SET_ACTIVE_CHAT') {
        activeChats.set(event.source.id, String(event.data.chatId));
      }  
      if (event.data && event.data.type === 'CLEAR_ACTIVE_CHAT') {
        activeChats.delete(event.source.id);
      }  
      if (event.data && event.data.type === 'CLEANUP') {
        activeChats.clear();
      }
    });
    self.addEventListener('push', function(event) {
      let data = { title: 'CB360 Mobile', message: 'Nova atualização no sistema!' };
      try {
        if (event.data) {
          data = event.data.json();
        }
      } catch (err) {
        data.message = event.data.text();
      }
      const chatNint = String(data.chatNint || data.chatId || '');
      if (chatNint) {
        const isActiveInAnyTab = Array.from(activeChats.values())
        .map(id => String(id))
        .includes(chatNint);
        if (isActiveInAnyTab) {
          return;
        }
      }
      const options = {
        body: data.message || data.body || 'Tens uma nova mensagem.',
        icon: '/icon-192.png',
        vibrate: [200, 100, 200, 100, 200],
        data: {
          url: data.url || '/',
          chatNint: chatNint
        },
        tag: 'cb360-notification',
        renotify: true
      };
      event.waitUntil(
        self.registration.showNotification(data.title || 'CB360 Mobile', options)
      );
    });
    self.addEventListener('notificationclick', function(event) {
      event.notification.close();
      event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
          for (const client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              if (event.notification.data.chatNint) {
                client.postMessage({
                  type: 'OPEN_CHAT',
                  chatNint: event.notification.data.chatNint
                });
              }
              return client.focus();
            }
          }
          if (clients.openWindow) {
            return clients.openWindow(event.notification.data.url || '/');
          }
        })
      );
    });
