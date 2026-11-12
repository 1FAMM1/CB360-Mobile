    /* =========================================================
    CB360 Mobile - Complete Service Worker
    v6.3.0 - Notificações do chat: abre a conversa certa no shell (app aberta ou fechada);
    ignora chats "ativos" de páginas que já não existem.
    v6.1.0 - App num único index.html (todas as páginas embebidas).
    Navegações (index.html) vão primeiro à rede e só usam a cache offline,
    para que uma nova versão chegue sempre sem ser preciso limpar dados.
    v5.7.2 - Fix: catch() do fetch handler já não deixa a
    promise resolver para undefined (Failed to convert value
    to 'Response'); devolve sempre um Response válido, com
    fallback para index.html em navegações offline.
    ========================================================= */
    const CACHE_NAME = 'cb360-cache-v6.3.0';
    const ASSETS_TO_CACHE = ['/', '/index.html', '/manifest.json'];
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
      if (event.request.method !== 'GET') {
        return;
      }
      if (event.request.mode === 'navigate') {
        event.respondWith(
          fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
            }
            return networkResponse;
          }).catch(() => caches.match('/index.html').then((cached) => cached || new Response(
            'Sem ligação à rede e sem versão em cache.',
            { status: 503, statusText: 'Service Unavailable', headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
          )))
        );
        return;
      }
      if (new URL(event.request.url).pathname === '/manifest.json') {
        event.respondWith(
          fetch(event.request).catch(() => caches.match(event.request))
        );
        return;
      }
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
              if (event.request.mode === 'navigate') {
                return caches.match('/index.html').then((fallback) => {
                  return fallback || new Response(
                    'Sem ligação à rede e sem versão em cache desta página.',
                    {
                      status: 503,
                      statusText: 'Service Unavailable',
                      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                    }
                  );
                });
              }
              return new Response('', {
                status: 504,
                statusText: 'Gateway Timeout'
              });
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
      event.waitUntil((async () => {
        if (chatNint) {
          // esquece chats "ativos" de páginas que já não existem (ex.: iframe do chat removida pelo shell)
          const live = new Set((await clients.matchAll({ type: 'window', includeUncontrolled: true })).map(c => c.id));
          for (const id of Array.from(activeChats.keys())) {
            if (!live.has(id)) activeChats.delete(id);
          }
          if (Array.from(activeChats.values()).map(String).includes(chatNint)) return;
        }
        await self.registration.showNotification(data.title || 'CB360 Mobile', options);
      })());
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
            // app fechada: abre o shell e diz-lhe qual a conversa a abrir
            const nint = event.notification.data.chatNint;
            return clients.openWindow(nint ? '/?openChat=' + encodeURIComponent(nint) : (event.notification.data.url || '/'));
          }
        })
      );
    });
