/* =========================================================
CB360 Mobile - Service Worker (v2.9.1)
Correção: Filtro de Notificações ultra-preciso
========================================================= */
const CACHE_NAME = 'cb360-cache-v2.9.1';
const ASSETS_TO_CACHE = [
  '/', '/index.html', '/MainPage.html', '/ScalesView.html', '/Swaps.html', 
  '/MainPageEl.html', '/PiqDisp.html', '/DecDisp.html', '/ExtDisp.html', 
  '/DispView.html', '/SolVacat.html', '/Attendance.html', '/OnGoingOcr.html', 
  '/FomioPage.html', '/Events.html', '/MissReport.html', '/Documents.html', 
  '/Comunic.html', '/MeteoAdv.html', '/NoHospital.html', '/MainPageVe.html', 
  '/VeicStat.html', '/VeicSitop.html', '/Tools.html', '/GCIncRural.html', 
  '/DecirTeam.html', '/InterChat.html', '/manifest.json',
];

/* =========================================================
CB360 Mobile - Service Worker (v2.9.1)
Correção: Filtro de Notificações ultra-preciso
========================================================= */
// OUVIR MENSAGENS (Opcional, mas mantemos para compatibilidade)
let activeChatId = null;
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_ACTIVE_CHAT') {
    activeChatId = event.data.chatId ? String(event.data.chatId).trim() : null;
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
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => { if (key !== CACHE_NAME) return caches.delete(key); })
    )).then(() => self.clients.claim())
  );
});
/* ============================ PUSH CORRIGIDO ============================ */
self.addEventListener('push', function(event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { message: event.data ? event.data.text() : 'Nova mensagem' };
  }

  const idDoRemetente = data.chatId ? String(data.chatId).trim() : null;

  const promise = clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(windowClients => {
      
      // 1. Procuramos APENAS a janela que o utilizador está a usar agora (focused: true)
      const janelaAtiva = windowClients.find(c => c.focused === true);

      if (janelaAtiva && idDoRemetente) {
        // Se a janela ativa for o InterChat, verificamos o ID na URL
        if (janelaAtiva.url.includes('InterChat.html')) {
          const urlObj = new URL(janelaAtiva.url);
          const idNaUrl = urlObj.searchParams.get('chatId');

          // BLOQUEIO: Só se estiver no chat da mesma pessoa que enviou
          if (idNaUrl === idDoRemetente) {
            console.log("SW: Silenciando push porque já estás a ler esta conversa.");
            return; 
          }
        }
      }

      // 2. MOSTRAR NOTIFICAÇÃO (Se a app estiver fechada, em segundo plano, ou noutro chat)
      return self.registration.showNotification(data.title || 'CB360 Mobile', {
        body: data.message || data.body || 'Nova mensagem',
        icon: '/icon-192.png',
        // 'tag' única por chat permite que mensagens de pessoas diferentes não se apaguem
        tag: idDoRemetente ? `chat-${idDoRemetente}` : 'geral',
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
      if (clients.openWindow) return clients.openWindow(event.notification.data.url || '/InterChat.html');
    })
  );
});
