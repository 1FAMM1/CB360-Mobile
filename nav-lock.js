/* =========================================================
   CB360 Mobile - Nav Lock & Smooth Transition
   1. Impede duplo clique rápido.
   2. Intercepta navegação entre .html para ELIMINAR o Flash Branco
      buscando a página do Service Worker Cache em 0ms.
   ========================================================= */
(function() {
  let isNavigating = false;

  // Converte onclick="location.href='X'" em onclick="navegar('X'); return false;"
  // Extraído para função própria para poder ser chamado outra vez após cada navegação SPA-style.
  function converterLinksOnClick() {
    document.querySelectorAll('[onclick*="location.href"]').forEach(el => {
      const attrOnClick = el.getAttribute('onclick');
      const match = attrOnClick.match(/location\.href=['"]([^'"]+)['"]/);
      if (match && match[1]) {
        const url = match[1];
        el.setAttribute('onclick', `navegar('${url}'); return false;`);
      }
    });
  }

  // Navega para 'href' através do Service Worker Cache, sem recarregar a página (sem flash branco)
  async function navegarSuave(href) {
    if (isNavigating) return;
    isNavigating = true;
    try {
      const response = await fetch(href);
      if (!response.ok) throw new Error('Falha ao carregar página');

      const htmlText = await response.text();
      const parser = new DOMParser();
      const newDoc = parser.parseFromString(htmlText, 'text/html');

      const isDarkMode = document.documentElement.classList.contains('dark-mode') || document.body.classList.contains('dark-mode');

      document.title = newDoc.title || document.title;
      document.body.innerHTML = newDoc.body.innerHTML;

      if (isDarkMode) {
        document.documentElement.classList.add('dark-mode');
        document.body.classList.add('dark-mode');
      }

      window.history.pushState({ href: href }, '', href);

      const scripts = document.body.querySelectorAll('script');
      scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
        newScript.appendChild(document.createTextNode(oldScript.innerHTML));
        oldScript.parentNode.replaceChild(newScript, oldScript);
      });

      window.scrollTo(0, 0);

      // Reprocessa os onclick="location.href=...' da nova página recém-carregada
      converterLinksOnClick();
    } catch (err) {
      console.warn('[Nav Lock] Fallback para navegação tradicional devido a erro:', err);
      window.location.href = href;
    } finally {
      isNavigating = false;
    }
  }

  // Função global chamada pelos onclick convertidos
  window.navegar = function(href) {
    navegarSuave(href);
  };

  document.addEventListener('DOMContentLoaded', () => {
    converterLinksOnClick();
  });

  window.addEventListener('pageshow', function() {
    isNavigating = false;
  });

  document.addEventListener('click', async function(e) {
    const trigger = e.target.closest('a[href]');
    if (!trigger) return;
    const href = trigger.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || trigger.target === '_blank' || href.startsWith('http')) {
      return;
    }
    if (isNavigating) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    e.preventDefault();
    await navegarSuave(href);
  }, true);

  // Suporte ao botão "Voltar" do Android/Telemóvel — agora também suave, sem flash branco
  window.addEventListener('popstate', function(e) {
    if (e.state && e.state.href) {
      navegarSuave(e.state.href);
    } else {
      window.location.reload();
    }
  });
})();
