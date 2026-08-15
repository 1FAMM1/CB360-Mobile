(function () {
  // Evita que este script corra mais que uma vez, mesmo que seja
  // re-injetado por engano numa troca de página.
  if (window.__cb360NavInit) return;
  window.__cb360NavInit = true;

  async function loadPage(url, push = true) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('fetch falhou: ' + res.status);
      const html = await res.text();
      const newDoc = new DOMParser().parseFromString(html, 'text/html');

      // 1. título
      document.title = newDoc.title;

      // 2. troca o <style> específico da página (cada módulo tem o seu)
      const oldStyle = document.querySelector('style');
      const newStyle = newDoc.querySelector('style');
      if (oldStyle && newStyle) oldStyle.textContent = newStyle.textContent;

      // 3. troca o <body> inteiro
      document.body.innerHTML = newDoc.body.innerHTML;
      document.body.className = newDoc.body.className;

      // 4. re-executa os <script> da página nova, isolados em IIFE
      //    — exceto o próprio app-nav.js, que já está a correr e não
      //    deve ser duplicado (evitaria listeners repetidos)
      newDoc.querySelectorAll('script').forEach(oldScript => {
        if (oldScript.src && oldScript.src.includes('app-nav.js')) return;
        const s = document.createElement('script');
        if (oldScript.src) {
          s.src = oldScript.src;
        } else {
          s.textContent = `(function(){ ${oldScript.textContent} })();`;
        }
        document.body.appendChild(s);
      });

      // 5. dispara o init manualmente (ver ponto 2 do plano anterior)
      document.dispatchEvent(new CustomEvent('pageReady'));

      if (push) history.pushState({ url }, '', url);
      window.scrollTo(0, 0);
    } catch (err) {
      console.error('Navegação falhou, a recarregar normalmente:', err);
      window.location.href = url; // fallback seguro: navegação normal
    }
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    const url = a.getAttribute('href');
    if (!url || url.startsWith('http') || url.startsWith('#') || a.target === '_blank') return;
    if (!url.endsWith('.html')) return;
    e.preventDefault();
    loadPage(url);
  });

  window.addEventListener('popstate', () => {
    loadPage(location.pathname.split('/').pop() || 'MainPage.html', false);
  });
})();
