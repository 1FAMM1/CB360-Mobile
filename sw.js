/* =========================================================
    CB360 Mobile - Complete Service Worker
    Optimized for: Push Notifications + Bar-Free Navigation
    v2.8.1 - Com supressão de notificações em chats ativos
    ========================================================= */
const CACHE_NAME = 'cb360-cache-v2.8.1';
const ASSETS_TO_CACHE = [
  '/', '/index.html', '/MainPage.html', '/ScalesView.html', '/Swaps.html', 
  '/MainPageEl.html', '/PiqDisp.html', '/DecDisp.html', '/ExtDisp.html', 
  '/DispView.html', '/SolVacat.html', '/Attendance.html', '/OnGoingOcr.html', 
  '/FomioPage.html', '/Events.html', '/MissReport.html', '/Documents.html', 
  '/Comunic.html', '/MeteoAdv.html', '/NoHospital.html', '/MainPageVe.html', 
  '/VeicStat.html', '/VeicSitop.html', '/Tools.html', '/GCIncRural.html', 
  '/DecirTeam.html', '/InterChat.html', '/manifest.json'
];

// ✅ NOVO: Track de chats ativos por tab
let activeChats = new Map(); // {clientId: chatNint}

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
          // Silently fail
        });
      })
    );
  }
});

// ✅ NOVO: Receber mensagens do frontend sobre chat ativo
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHAT_FOCUS') {
    activeChats.set(event.source.id, event.data.chatNint);
    console.log('SW: Chat focado:', event.data.chatNint, 'ClientID:', event.source.id);
  }
  
  if (event.data && event.data.type === 'CHAT_BLUR') {
    activeChats.delete(event.source.id);
    console.log('SW: Chat desfocado, ClientID:', event.source.id);
  }
  
  // ✅ Limpar tabs fechadas
  if (event.data && event.data.type === 'CLEANUP') {
    activeChats.clear();
    console.log('SW: Todos os chats limpos');
  }
});

// ✅ MODIFICADO: Push com verificação de chat ativo
self.addEventListener('push', function(event) {
  let data = { title: 'CB360 Mobile', message: 'Nova atualização no sistema!' };
  
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (err) {
    data.message = event.data.text();
  }
  
  // ✅ NOVO: Verificar se user está no chat ativo
  const chatNint = data.chatNint; // API deve enviar isto
  
  if (chatNint) {
    const isActiveInAnyTab = Array.from(activeChats.values()).includes(chatNint);
    
    if (isActiveInAnyTab) {
      console.log('SW: Notificação suprimida - user está no chat', chatNint);
      // NÃO mostrar notificação
      return;
    }
  }
  
  // Mostrar notificação normalmente
  const options = {
    body: data.message || data.body || 'Tens uma nova mensagem.',
    icon: '/icon-192.png',
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: data.url || '/',
      chatNint: chatNint // ✅ Guardar para abrir chat correto
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
      // ✅ Tentar focar janela existente
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // ✅ NOVO: Enviar mensagem para abrir o chat correto
          if (event.notification.data.chatNint) {
            client.postMessage({
              type: 'OPEN_CHAT',
              chatNint: event.notification.data.chatNint
            });
          }
          return client.focus();
        }
      }
      
      // Se não há janela aberta, abrir nova
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url || '/');
      }
    })
  );
});
