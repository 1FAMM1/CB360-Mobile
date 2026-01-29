document.addEventListener('click', async (e) => {
    // 1. Procura se o clique foi num link <a>
    const link = e.target.closest('a');
    
    // 2. Filtra: tem de ser um link interno e não pode ser para abrir em nova aba
    if (!link || !link.href.includes(window.location.origin) || link.target === '_blank') return;

    // 3. PARA TUDO: Impede o browser de navegar (e de mostrar a barra!)
    e.preventDefault();

    const url = link.href;

    try {
        // 4. Vai buscar o HTML da nova página via rede (sempre fresco, sem cache)
        const response = await fetch(url);
        const html = await response.text();
        
        // 5. Transforma o texto em HTML real
        const parser = new DOMParser();
        const newDoc = parser.parseFromString(html, 'text/html');

        // 6. Troca o conteúdo (Mantém o Header/Footer se quiseres, ou troca tudo)
        // Se o teu conteúdo principal estiver numa div id="app", troca apenas essa
        document.body.innerHTML = newDoc.body.innerHTML;

        // 7. Atualiza a URL lá em cima para o utilizador saber onde está
        window.history.pushState({ path: url }, '', url);

        // 8. Move o scroll para o topo
        window.scrollTo(0, 0);

        console.log('Navegação concluída sem recarregamento de página.');

    } catch (err) {
        // Se a internet falhar, ele faz a navegação normal como segurança
        window.location.href = url;
    }
});

// Garante que o botão "Voltar" do telemóvel funciona corretamente
window.onpopstate = () => {
    window.location.reload(); 
};
