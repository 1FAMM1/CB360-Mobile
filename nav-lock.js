/* =========================================================
   CB360 Mobile - Nav Lock & Smooth Transition
   1. Impede duplo clique rápido.
   2. Intercepta navegação entre .html para ELIMINAR o Flash Branco
      buscando a página do Service Worker Cache em 0ms.
   ========================================================= */
(function() {
  let isNavigating = false;

  window.addEventListener('pageshow', function() {
    isNavigating = false;
  });

  document.addEventListener('click', async function(e) {
    const trigger = e.target.closest('a[href]');
    if (!trigger) return;

    const href = trigger.getAttribute('href');

    // Ignora links externos, âncoras ou links que abrem em nova aba
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || trigger.target === '_blank' || href.startsWith('http')) {
      return;
    }

    // 1. Proteção contra duplo clique rápido (A sua lógica original)
    if (isNavigating) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }

    // 2. INTERCEPTA A NAVEGAÇÃO PARA EVITAR O FLASH BRANCO
    e.preventDefault(); // Impede a WebView de recarregar/destruir a página!
    isNavigating = true;

    try {
      // Como o seu Service Worker já tem as páginas em cache, isso responde em 0ms
      const response = await fetch(href);
      if (!response.ok) throw new Error('Falha ao carregar página');
      
      const htmlText = await response.text();

      // Transforma o texto do HTML num DOM navegável
      const parser = new DOMParser();
      const newDoc = parser.parseFromString(htmlText, 'text/html');

      // Preserva a classe dark-mode no <html> ou <body> se ela existir
      const isDarkMode = document.documentElement.classList.contains('dark-mode') || document.body.classList.contains('dark-mode');

      // Substitui o conteúdo da página sem apagar o ecrã
      document.title = newDoc.title || document.title;
      document.body.innerHTML = newDoc.body.innerHTML;

      // Re-aplica a classe dark mode imediatamente para garantir zero flash de light mode
      if (isDarkMode) {
        document.documentElement.classList.add('dark-mode');
        document.body.classList.add('dark-mode');
      }

      // Atualiza o URL da barra do navegador (para o botão Voltar do telemóvel funcionar)
      window.history.pushState({ href: href }, '', href);

      // Re-executa os scripts específicos da nova página
      const scripts = document.body.querySelectorAll('script');
      scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
        newScript.appendChild(document.createTextNode(oldScript.innerHTML));
        oldScript.parentNode.replaceChild(newScript, oldScript);
      });

      // Rola a página suavemente para o topo
      window.scrollTo(0, 0);

    } catch (err) {
      console.warn('[Nav Lock] Fallback para navegação tradicional devido a erro:', err);
      window.location.href = href; // Se algo falhar, faz a navegação normal como segurança
    } finally {
      isNavigating = false;
    }
  }, true);

  // Suporte ao botão "Voltar" do Android/Telemóvel
  window.addEventListener('popstate', function(e) {
    if (e.state && e.state.href) {
      window.location.href = e.state.href;
    } else {
      window.location.reload();
    }
  });
})();
