/* =========================================================
CB360 Mobile - Service Worker (v2.8.8)
Filtro por Comunicação Direta (postMessage)
========================================================= */
const CACHE_NAME = 'cb360-cache-v2.8.8'; // Atualizado para v2.8.8
const ASSETS_TO_CACHE = [
  '/', '/index.html', '/MainPage.html', '/ScalesView.html', '/Swaps.html', 
  '/MainPageEl.html', '/PiqDisp.html', '/DecDisp.html', '/ExtDisp.html', 
  '/DispView.html', '/SolVacat.html', '/Attendance.html', '/OnGoingOcr.html', 
  '/FomioPage.html', '/Events.html', '/MissReport.html', '/Documents.html', 
  '/Comunic.html', '/MeteoAdv.html', '/NoHospital.html', '/MainPageVe.html', 
  '/VeicStat.html', '/VeicSitop.html', '/Tools.html', '/GCIncRural.html', 
  '/DecirTeam.html', '/InterChat.html', '/manifest.json',
];

// VARIÁVEL GLOBAL NO SW PARA GUARDAR O CHAT ABERTO
let activeChatId = null;

// ESCUTAR MENSAGENS DO INTERCHAT.HTML
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_ACTIVE_CHAT') {
    activeChatId = event.data.chatId ? String(event.data.chatId).trim() : null;
    console.log("SW: Chat ativo na UI agora é:", activeChatId);
  }
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      );
    }).then(() => clients.claim())
  );
});

/* ============================ PUSH v2.8.8 ============================ */
self.addEventListener('push', function(event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { message: event.data.text() };
  }

  const idDoRemetente = data.chatId ? String(data.chatId).trim() : null;

  // VERIFICAÇÃO DUPLA: Pela variável global OU pela URL (segurança extra)
  const promise = clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(windowClients => {
      
      const jaEstaAVer = windowClients.some(client => {
        const urlMatch = client.url.includes('chatId=' + idDoRemetente);
        const msgMatch = (activeChatId === idDoRemetente);
        return (urlMatch || msgMatch);
      });

      if (jaEstaAVer && idDoRemetente) {
        console.log("SW: Bloqueando notificação. Chat " + idDoRemetente + " está aberto.");
        return; 
      }

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
        if (client.url.includes('InterChat.html') && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(event.notification.data.url || '/');
    })
  );
});
