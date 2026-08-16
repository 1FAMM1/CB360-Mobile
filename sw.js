   /* =========================================================
    CB360 Mobile - Complete Service Worker
    v5.2.9 - Bump de versão para forçar refresh de cache em todos
    os dispositivos (corrige páginas com dark mode inconsistente
    devido a falhas silenciosas de cache.add na v5.2.7). Adicionado
    retry automático (3 tentativas) para assets que falhem o
    pré-cache no install, para não ficarem permanentemente de fora.
    ========================================================= */
    const CACHE_NAME = 'cb360-cache-v5.2.9';
    const ASSETS_TO_CACHE = ['/', '/index.html', '/MainPage.html', '/ScalesView.html', '/Swaps.html', '/MainPageEl.html', '/PiqDisp.html', '/DecDisp.html', '/SBADisp.html', '/OPATDisp.html',
                             '/ExtDisp.html', '/DispView.html', '/SolVacat.html', '/SolFardam.html', '/Attendance.html', '/OnGoingOcr.html', '/FomioPage.html', '/Events.html', '/MissReport.html',
                             '/Documents.html', '/Comunic.html', '/MeteoAdv.html', '/NoHospital.html', '/MainPageVe.html', '/VeicStat.html', '/VeicSitop.html', '/VeicData.html', '/VeicAnomalies.html',
                             '/Tools.html', '/GCIncRural.html', '/DecirTeam.html', '/InterChat.html', '/PointJustif.html', '/manifest.json', '/nav-lock.js'];
    const CDN_DOMAINS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net'];
    const CACHE_ADD_RETRIES = 3;
    const CACHE_ADD_RETRY_DELAY_MS = 1000;
    let activeChats = new Map();

    function delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /* Tenta colocar um recurso em cache várias vezes antes de desistir,
       para evitar que uma rede instável no momento do install deixe
       páginas permanentemente fora do cache até ao próximo deploy. */
    async function cacheAddWithRetry(cache, url, attempt = 1) {
      try {
        await cache.add(url);
      } catch (err) {
        if (attempt < CACHE_ADD_RETRIES) {
          await delay(CACHE_ADD_RETRY_DELAY_MS * attempt);
          return cacheAddWithRetry(cache, url, attempt + 1);
        }
        console.warn(`[Service Worker] Falhou ao colocar em cache o recurso após ${CACHE_ADD_RETRIES} tentativas: ${url}`, err);
      }
    }

    self.addEventListener('install', (event) => {
      self.skipWaiting();
      event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
          await Promise.all(
            ASSETS_TO_CACHE.map((url) => cacheAddWithRetry(cache, url))
          );
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
      const requestUrl = new URL(event.request.url);
      const isOwnOrigin = requestUrl.origin === self.location.origin;
      const isCdnAsset = CDN_DOMAINS.includes(requestUrl.hostname);
      if (isOwnOrigin || isCdnAsset) {
        event.respondWith(
          caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return fetch(event.request).then((networkResponse) => {
              /* Pedidos cross-origin (CDN) costumam vir como 'opaque' (status 0)
                 devido a não usarem CORS explícito — mesmo assim são válidos para
                 cache, só não conseguimos ler o seu conteúdo/status. */
              const isCacheable = networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque');
              if (isCacheable) {
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
              if (event.notification.data && event.notification.data.chatNint) {
                client.postMessage({
                  type: 'OPEN_CHAT',
                  chatNint: event.notification.data.chatNint
                });
              }
              return client.focus();
            }
          }
          if (clients.openWindow) {
            const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';
            return clients.openWindow(targetUrl);
          }
        })
      );
    });
