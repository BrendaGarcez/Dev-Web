function getProdutos() {
    return JSON.parse(localStorage.getItem("produtos")) || [];
}

function salvarProdutos(produtos) {
    localStorage.setItem("produtos", JSON.stringify(produtos));
}

function adicionarProduto(nome, quantidade, preco, categoria, estoqueMinimo, fornecedor) {
    const produtos = getProdutos();

    const novoProduto = {
        id: Date.now(),
        nome,
        quantidade: Number(quantidade),
        preco: Number(preco),
        categoria,
        estoqueMinimo: Number(estoqueMinimo) || 5,
        fornecedor: fornecedor || ""
    };

    produtos.push(novoProduto);
    salvarProdutos(produtos);

    registrarMovimentacao(
        novoProduto.nome,
        'cadastro',
        novoProduto.quantidade,
        `Produto cadastrado com ${novoProduto.quantidade} unidade(s)`,
        fornecedor
    );
}

function getMovimentacoes() {
    return JSON.parse(localStorage.getItem("movimentacoes")) || [];
}

function getContatos() {
    return JSON.parse(localStorage.getItem("contatos")) || [];
}

function salvarContatos(contatos) {
    localStorage.setItem("contatos", JSON.stringify(contatos));
}

function adicionarContato(nome, tipo, telefone, email) {
    const contatos = getContatos();
    const novoContato = {
        id: Date.now(),
        nome,
        tipo,
        telefone: telefone || "",
        email: email || ""
    };
    contatos.push(novoContato);
    salvarContatos(contatos);
}

function registrarMovimentacao(produtoNome, tipo, quantidade, observacao, parceiro) {
    const movimentacoes = getMovimentacoes();

    movimentacoes.unshift({
        id: Date.now(),
        produtoNome,
        tipo,
        quantidade: Number(quantidade),
        observacao,
        parceiro: parceiro || "",
        data: new Date().toISOString()
    });

    localStorage.setItem("movimentacoes", JSON.stringify(movimentacoes.slice(0, 100)));
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function ajustarEstoque(id, tipo, quantidade, parceiro) {
    const produtos = getProdutos();
    const produto = produtos.find(p => p.id === id);
    if (!produto) return false;

    const qtd = Number(quantidade);
    if (qtd <= 0) return false;

    let novaQuantidade = produto.quantidade;
    if (tipo === 'entrada') {
        novaQuantidade += qtd;
    } else {
        if (produto.quantidade < qtd) return false;
        novaQuantidade -= qtd;
    }

    const atualizados = produtos.map(p =>
        p.id === id ? { ...p, quantidade: novaQuantidade } : p
    );
    salvarProdutos(atualizados);

    registrarMovimentacao(
        produto.nome,
        tipo,
        qtd,
        tipo === 'entrada' ? 'Entrada manual de estoque' : 'Saída manual de estoque',
        parceiro
    );

    return true;
}

function formatarData(iso) {
    return new Date(iso).toLocaleString('pt-BR');
}

function getStatusEstoque(produto) {
    const minimo = produto.estoqueMinimo ?? 5;
    if (produto.quantidade === 0) return 'critico';
    if (produto.quantidade <= minimo) return 'baixo';
    return 'ok';
}

window.getProdutos = getProdutos;
window.salvarProdutos = salvarProdutos;
window.adicionarProduto = adicionarProduto;
window.getMovimentacoes = getMovimentacoes;
window.getContatos = getContatos;
window.salvarContatos = salvarContatos;
window.adicionarContato = adicionarContato;
window.registrarMovimentacao = registrarMovimentacao;
window.formatarMoeda = formatarMoeda;
window.ajustarEstoque = ajustarEstoque;
window.formatarData = formatarData;
window.getStatusEstoque = getStatusEstoque;
