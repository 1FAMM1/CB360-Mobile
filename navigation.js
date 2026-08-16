function goToPage(url) {
  fetch(url)
    .then(response => response.text())
    .then(html => {
      // Substitui o documento atual pelo novo HTML sem recarregar a janela
      document.open();
      document.write(html);
      document.close();
      
      // Atualiza o endereço no navegador sem acionar o reload
      history.pushState({}, '', url);
    })
    .catch(() => {
      // Fallback: se houver algum erro, navega de forma tradicional
      window.location.href = url;
    });
}
