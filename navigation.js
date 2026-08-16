// Função para navegar sem recarregar a janela (evita a barra branca)
function goToPage(url) {
  fetch(url)
    .then(response => response.text())
    .then(html => {
      // Adiciona a nova página ao histórico real do navegador
      history.pushState({ pageUrl: url }, '', url);

      // Atualiza o documento sem duplicar entradas no histórico
      document.open();
      document.write(html);
      document.close();
    })
    .catch(() => {
      window.location.href = url;
    });
}

// Escuta o botão "Voltar" do Android / Navegador
window.addEventListener('popstate', function (event) {
  // Se houver um estado registado ou URL no histórico, recarrega a página certa
  if (event.state && event.state.pageUrl) {
    location.reload();
  } else {
    // Se voltar até à MainPage sem estado, força o regresso limpo para a MainPage
    window.location.href = 'MainPage.html';
  }
});
