/* =========================================================
   CB360 Mobile - Service Worker Completo
   Otimizado para: Notificações Push + Navegação sem Barra
   ========================================================= */

const CACHE_NAME = 'cb360-cache-v1';

// Adiciona aqui os teus ficheiros principais para carregamento instantâneo
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  // Se tiveres um ficheiro CSS ou JS comum, coloca-o aqui:
  // '/style.css',
  // '/script.js'
];

// 1. Instalação e Cache Inicial
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: A guardar ficheiros essenciais na cache');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Ativação e Limpeza de Cache Antiga
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              console.log('SW: A remover cache antiga:', cache);
              return caches.delete(cache);
            }
          })
        );
      })
    ])
  );
});

// 3. O SEGREDO PARA MATAR A BARRA: Intercetar Pedidos (Fetch)
// Ele tenta entregar da cache primeiro. Se não tiver, vai à rede e guarda para a próxima.
self.addEventListener('fetch', (event) => {
  // Apenas intercetamos pedidos do nosso próprio domínio
  if (event.request.url.includes(self.location.origin)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Entrega imediata da cache (A barra não tem tempo de aparecer)
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          // Se for um ficheiro válido, guarda na cache para o próximo clique
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Se estiver offline e sem cache, podes retornar uma página de erro aqui
        });
      })
    );
  }
});

/* =========================================================
   GESTÃO DE NOTIFICAÇÕES PUSH (O teu código original)
   ========================================================= */

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
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: data.url || '/'
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
