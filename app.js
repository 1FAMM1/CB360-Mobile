document.addEventListener('click', async (e) => {
  const link = e.target.closest('a');
  
  // Só intercetamos se for um link interno (da tua app)
  if (link && link.href.includes(window.location.origin) && !link.getAttribute('download')) {
    e.preventDefault(); // AQUI: Impede a barra de carregamento de aparecer!
    
    const url = link.href;
    try {
      const response = await fetch(url);
      const text = await response.text();
      const parser = new DOMParser();
      const newDoc = parser.parseFromString(text, 'text/html');

      // 1. Troca o conteúdo do <main> (ou da div onde está o teu conteúdo)
      document.querySelector('main').innerHTML = newDoc.querySelector('main').innerHTML;

      // 2. Atualiza o título no teu Header
      const novoTitulo = newDoc.querySelector('header h1').innerText;
      document.querySelector('header h1').innerText = novoTitulo;

      // 3. Atualiza a URL para o utilizador saber onde está
      window.history.pushState({}, '', url);
      
      // 4. Faz scroll para o topo automaticamente
      window.scrollTo(0, 0);
    } catch (err) {
      window.location.href = url; // Se der erro, carrega normal (fallback)
    }
  }
});

// Garante que o botão "Voltar" do telemóvel também funciona sem recarregar
window.onpopstate = () => location.reload();
