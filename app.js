document.addEventListener('click', async (e) => {
    const link = e.target.closest('a');
    
    // Verifica se o link é válido e interno
    if (!link || !link.href || !link.href.startsWith(window.location.origin) || link.target === '_blank') return;

    e.preventDefault(); 
    e.stopPropagation(); // Impede que outros scripts forcem a navegação

    const url = link.href;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Falha ao carregar');
        
        const text = await response.text();
        const parser = new DOMParser();
        const newDoc = parser.parseFromString(text, 'text/html');

        // Em vez de mudar o BODY todo (que causa o piscar/barra)
        // Muda apenas o que está dentro do teu container de conteúdo
        // Se usas uma div para o conteúdo, troca 'main' pelo ID dela
        const oldContent = document.querySelector('main'); 
        const newContent = newDoc.querySelector('main');

        if (oldContent && newContent) {
            oldContent.innerHTML = newContent.innerHTML;
            
            // Atualiza o título do Header sem destruir o Header
            const newTitle = newDoc.querySelector('.header h1');
            if (newTitle) document.querySelector('.header h1').innerText = newTitle.innerText;
        } else {
            // Se não encontrar os seletores, troca o body como plano B
            document.body.innerHTML = newDoc.body.innerHTML;
        }

        window.history.pushState({}, '', url);
        window.scrollTo(0, 0);

    } catch (err) {
        console.error('Erro na transição:', err);
        window.location.href = url; // Se falhar, faz a navegação normal
    }
}, true); // O 'true' aqui é importante para capturar o clique antes de outros
