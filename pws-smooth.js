// pwa-smooth.js - Sistema de Janela Única para PWA Multi-página
const cacheDePaginas = {};

// 1. Pré-carregamento automático em segundo plano
async function preCarregarPagina(url) {
  if (cacheDePaginas[url]) return;
  try {
    const resposta = await fetch(url);
    if (resposta.ok) {
      cacheDePaginas[url] = await resposta.text();
    }
  } catch (e) {
    console.warn("Não foi possível pré-carregar:", url);
  }
}

// 2. Deteta links na página atual e inicia o pré-carregamento ao passar o rato ou tocar
document.addEventListener('mouseover', (e) => {
  const link = e.target.closest('a');
  if (link && link.origin === window.location.origin) preCarregarPagina(link.href);
});
document.addEventListener('touchstart', (e) => {
  const link = e.target.closest('a');
  if (link && link.origin === window.location.origin) preCarregarPagina(link.href);
});

// 3. Interpeta o clique e troca o conteúdo sem fechar a janela (Elimina a Barra Branca)
document.addEventListener('click', async (event) => {
  const link = event.target.closest('a');
  
  if (link && link.href && link.origin === window.location.origin && !link.getAttribute('download') && link.target !== '_blank') {
    event.preventDefault();
    const url = link.href;
    let htmlBruto = cacheDePaginas[url];

    if (!htmlBruto) {
      try {
        const resposta = await fetch(url);
        htmlBruto = await resposta.text();
        cacheDePaginas[url] = htmlBruto;
      } catch (erro) {
        window.location.href = url; // Se falhar, navega normalmente como segurança
        return;
      }
    }

    const parser = new DOMParser();
    const novoDoc = parser.parseFromString(htmlBruto, 'text/html');

    // Altera o título da página no topo
    document.title = novoDoc.title || document.title;

    // Substitui todo o conteúdo do BODY (preservando a janela aberta)
    document.body.innerHTML = novoDoc.body.innerHTML;
    
    // Atualiza a barra de endereço da PWA sem recarregar
    history.pushState({ url }, '', url);
    window.scrollTo(0, 0);

    // Reexecuta os scripts da nova página (essencial para ficheiros híbridos)
    document.body.querySelectorAll('script').forEach(scriptAntigo => {
      const scriptNovo = document.createElement('script');
      Array.from(scriptAntigo.attributes).forEach(attr => scriptNovo.setAttribute(attr.name, attr.value));
      scriptNovo.appendChild(document.createTextNode(scriptAntigo.innerHTML));
      scriptAntigo.parentNode.replaceChild(scriptNovo, scriptAntigo);
    });
  }
});

// 4. Garante que o botão "Voltar" do telemóvel funciona instantaneamente
window.addEventListener('popstate', () => {
  window.location.reload(); 
});
