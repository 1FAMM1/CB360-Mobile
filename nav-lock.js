/* =========================================================
   CB360 Mobile - Nav Lock
   Evita transições de navegação sobrepostas (cross-document
   View Transitions) quando o utilizador toca demasiado rápido
   em links/botões de navegação. Sem isto, uma segunda navegação
   pode começar antes da classe dark-mode ser aplicada na página
   seguinte, causando um flash breve de lightmode.
   ========================================================= */
(function() {
  let isNavigating = false;
  window.addEventListener('pageshow', function() {
    isNavigating = false;
  }); 
  document.addEventListener('click', function(e) {
    const trigger = e.target.closest('a[href], .mbtn, [data-module]');
    if (!trigger) return;
    if (trigger.tagName === 'A') {
      const href = trigger.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || trigger.target === '_blank') return;
    } 
    if (isNavigating) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    isNavigating = true;
  }, true);
})();
