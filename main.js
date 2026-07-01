function getProdutos() {
    return JSON.parse(localStorage.getItem("produtos")) || [];
}

function salvarProdutos(produtos) {
    localStorage.setItem("produtos", JSON.stringify(produtos));
}

function getMovimentacoes() {
    return JSON.parse(localStorage.getItem("movimentacoes")) || [];
}

function registrarMovimentacao(produtoNome, tipo, quantidade, observacao) {
    const movimentacoes = getMovimentacoes();

    movimentacoes.unshift({
        id: Date.now(),
        produtoNome,
        tipo,
        quantidade: Number(quantidade),
        observacao,
        data: new Date().toISOString()
    });

    localStorage.setItem("movimentacoes", JSON.stringify(movimentacoes.slice(0, 100)));
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

// criando
function adicionarProduto(nome, quantidade, preco, categoria, estoqueMinimo) {
    const produtos = getProdutos();

    const novoProduto = {
        id: Date.now(),
        nome,
        quantidade: Number(quantidade),
        preco: Number(preco),
        categoria,
        estoqueMinimo: Number(estoqueMinimo) || 5
    };

    produtos.push(novoProduto);
    salvarProdutos(produtos);

    registrarMovimentacao(
        novoProduto.nome,
        'cadastro',
        novoProduto.quantidade,
        `Produto cadastrado com ${novoProduto.quantidade} unidade(s)`
    );
}

//atualizando
function atualizarProduto(id, novoNome, novaQuantidade, novoPreco, novaCategoria, novoEstoqueMinimo) {
    const produtos = getProdutos();
    const produtoAntigo = produtos.find(p => p.id === id);

    const atualizados = produtos.map(p => {
        if (p.id === id) {
            return {
                ...p,
                nome: novoNome,
                quantidade: Number(novaQuantidade),
                preco: Number(novoPreco),
                categoria: novaCategoria,
                estoqueMinimo: Number(novoEstoqueMinimo) || 5
            };
        }
        return p;
    });

    salvarProdutos(atualizados);

    if (produtoAntigo && produtoAntigo.quantidade !== Number(novaQuantidade)) {
        const diff = Number(novaQuantidade) - produtoAntigo.quantidade;
        const tipo = diff > 0 ? 'entrada' : 'saida';
        registrarMovimentacao(
            novoNome,
            tipo,
            Math.abs(diff),
            `Quantidade alterada de ${produtoAntigo.quantidade} para ${novaQuantidade}`
        );
    }
}

function ajustarEstoque(id, tipo, quantidade) {
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
        tipo === 'entrada' ? 'Entrada manual de estoque' : 'Saída manual de estoque'
    );

    return true;
}

//deletando
function removerProduto(id) {
    Swal.fire({
        title: 'Tem certeza?',
        text: "Você não poderá reverter esta ação!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: '<i class="fa-solid fa-trash"></i> Sim, excluir!',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            const produtos = getProdutos();
            const produto = produtos.find(p => p.id === id);
            const filtrados = produtos.filter(p => p.id !== id);
            salvarProdutos(filtrados);

            if (produto) {
                registrarMovimentacao(
                    produto.nome,
                    'exclusao',
                    produto.quantidade,
                    'Produto removido do estoque'
                );
            }

            Swal.fire(
                'Excluído!',
                'O produto foi removido do estoque.',
                'success'
            );

            renderizarProdutos();
            renderizarMovimentacoes();
            if (document.getElementById("dashboard")) atualizarDashboard();
        }
    });
}

function exportarDados() {
    const dados = {
        produtos: getProdutos(),
        movimentacoes: getMovimentacoes(),
        exportadoEm: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `estoque-backup-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

function importarDados(arquivo) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const dados = JSON.parse(e.target.result);
            if (!dados.produtos || !Array.isArray(dados.produtos)) {
                Swal.fire('Erro', 'Arquivo inválido!', 'error');
                return;
            }
            salvarProdutos(dados.produtos);
            if (dados.movimentacoes) {
                localStorage.setItem("movimentacoes", JSON.stringify(dados.movimentacoes));
            }
            Swal.fire('Sucesso', 'Dados importados com sucesso!', 'success').then(() => {
                window.location.reload();
            });
        } catch {
            Swal.fire('Erro', 'Não foi possível ler o arquivo.', 'error');
        }
    };
    reader.readAsText(arquivo);
}

//Dashboard 
function atualizarDashboard() {
    const produtos = getProdutos();
    const elTotalProdutos = document.getElementById("totalProdutos");
    const elTotalItens = document.getElementById("totalItens");
    const elValorTotal = document.getElementById("valorTotal");
    const elEstoqueBaixo = document.getElementById("totalEstoqueBaixo");

    if (elTotalProdutos) elTotalProdutos.textContent = produtos.length;
    if (elTotalItens) elTotalItens.textContent = produtos.reduce((soma, p) => soma + p.quantidade, 0);
    if (elValorTotal) {
        const valorTotal = produtos.reduce((soma, p) => soma + (p.quantidade * (p.preco || 0)), 0);
        elValorTotal.textContent = formatarMoeda(valorTotal);
    }

    const produtosBaixo = produtos.filter(p => getStatusEstoque(p) !== 'ok');
    if (elEstoqueBaixo) elEstoqueBaixo.textContent = produtosBaixo.length;

    renderizarAlertasEstoque(produtosBaixo);
    renderizarResumoCategorias(produtos);
    renderizarUltimasMovimentacoes();
}

function renderizarAlertasEstoque(produtosBaixo) {
    const container = document.getElementById("alertasEstoque");
    if (!container) return;

    if (produtosBaixo.length === 0) {
        container.innerHTML = '<p class="msg-vazia"><i class="fa-solid fa-circle-check"></i> Todos os produtos com estoque adequado.</p>';
        return;
    }

    let html = '<ul class="lista-alertas">';
    produtosBaixo.forEach(p => {
        const status = getStatusEstoque(p);
        const classe = status === 'critico' ? 'alerta-critico' : 'alerta-baixo';
        const icone = status === 'critico' ? 'fa-circle-xmark' : 'fa-triangle-exclamation';
        html += `
            <li class="${classe}">
                <i class="fa-solid ${icone}"></i>
                <span><strong>${p.nome}</strong> — ${p.quantidade} un. (mín: ${p.estoqueMinimo ?? 5})</span>
            </li>
        `;
    });
    html += '</ul>';
    container.innerHTML = html;
}

function renderizarResumoCategorias(produtos) {
    const container = document.getElementById("resumoCategorias");
    if (!container) return;

    const categorias = {};
    produtos.forEach(p => {
        const cat = p.categoria || 'Outros';
        if (!categorias[cat]) categorias[cat] = { qtd: 0, itens: 0 };
        categorias[cat].qtd++;
        categorias[cat].itens += p.quantidade;
    });

    const chaves = Object.keys(categorias);
    if (chaves.length === 0) {
        container.innerHTML = '<p class="msg-vazia">Nenhuma categoria registrada.</p>';
        return;
    }

    let html = '<div class="grid-categorias">';
    chaves.forEach(cat => {
        html += `
            <div class="card-categoria">
                <h4>${cat}</h4>
                <p>${categorias[cat].qtd} produto(s)</p>
                <p>${categorias[cat].itens} itens no total</p>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

function renderizarUltimasMovimentacoes() {
    const container = document.getElementById("ultimasMovimentacoes");
    if (!container) return;

    const movimentacoes = getMovimentacoes().slice(0, 5);
    if (movimentacoes.length === 0) {
        container.innerHTML = '<p class="msg-vazia">Nenhuma movimentação registrada.</p>';
        return;
    }

    const icones = {
        cadastro: 'fa-plus',
        entrada: 'fa-arrow-down',
        saida: 'fa-arrow-up',
        exclusao: 'fa-trash'
    };

    let html = '<ul class="lista-movimentacoes">';
    movimentacoes.forEach(m => {
        html += `
            <li>
                <i class="fa-solid ${icones[m.tipo] || 'fa-circle'}"></i>
                <div>
                    <strong>${m.produtoNome}</strong>
                    <span>${m.observacao} — ${formatarData(m.data)}</span>
                </div>
            </li>
        `;
    });
    html += '</ul>';
    container.innerHTML = html;
}

const campoBusca = document.getElementById("busca");

if (campoBusca) {
    atualizarDashboard();

    const buscaSalva = sessionStorage.getItem("buscaProduto");
    if (buscaSalva) campoBusca.value = buscaSalva;

    campoBusca.addEventListener("input", () => {
        sessionStorage.setItem("buscaProduto", campoBusca.value);
    });

    campoBusca.addEventListener("keypress", (e) => {
        if (e.key === "Enter") window.location.href = "produtos.html";
    });
}

const btnExportar = document.getElementById("btnExportar");
if (btnExportar) {
    btnExportar.addEventListener("click", exportarDados);
}

const inputImportar = document.getElementById("inputImportar");
if (inputImportar) {
    inputImportar.addEventListener("change", (e) => {
        if (e.target.files[0]) importarDados(e.target.files[0]);
    });
}

//formulario de cadastro
const form = document.getElementById("formProduto");

if (form) {
    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const nome = document.getElementById("nome").value.trim();
        const quantidade = Number(document.getElementById("quantidade").value);
        const preco = Number(document.getElementById("preco").value);
        const categoria = document.getElementById("categoria").value;
        const estoqueMinimo = Number(document.getElementById("estoqueMinimo").value) || 5;

        if (quantidade <= 0) {
            Swal.fire('Atenção', 'A quantidade deve ser maior que zero!', 'warning');
            return;
        }
        if (preco < 0) {
            Swal.fire('Atenção', 'O preço não pode ser negativo!', 'warning');
            return;
        }
        if (!categoria) {
            Swal.fire('Atenção', 'Selecione uma categoria!', 'warning');
            return;
        }

        const produtos = getProdutos();
        if (produtos.some(p => p.nome.toLowerCase() === nome.toLowerCase())) {
            Swal.fire('Erro', 'Este produto já está cadastrado!', 'error');
            return;
        }

        adicionarProduto(nome, quantidade, preco, categoria, estoqueMinimo);

        Swal.fire({
            title: 'Sucesso!',
            text: 'Produto cadastrado com sucesso!',
            icon: 'success',
            confirmButtonColor: '#3b82f6'
        });

        form.reset();
    });
}

//logica de produtos
const containerProdutos = document.getElementById("listaProdutos");

async function editarProduto(id) {
    const produtos = getProdutos();
    const produto = produtos.find(p => p.id === id);
    if (!produto) return;

    const categorias = ["Eletrônicos", "Vestuário", "Alimentos", "Papelaria", "Outros"];
    
    const optionsHtml = categorias.map(cat => 
        `<option value="${cat}" ${produto.categoria === cat ? 'selected' : ''}>${cat}</option>`
    ).join('');
    
    const { value: formValues } = await Swal.fire({
        title: 'Editar Produto',
        html:
        `<div style="text-align: left; margin-bottom: 8px;"><label style="font-size: 0.9em; font-weight: bold;">Nome:</label></div>` +
        `<input id="swal-nome" class="swal2-input" style="margin-top: 0; margin-bottom: 15px;" placeholder="Nome" value="${produto.nome}">` +
        
        `<div style="text-align: left; margin-bottom: 8px;"><label style="font-size: 0.9em; font-weight: bold;">Categoria:</label></div>` +
        `<select id="swal-categoria" class="swal2-input" style="margin-top: 0; margin-bottom: 15px; width: 100%; display: flex;">${optionsHtml}</select>` +
        
        `<div style="text-align: left; margin-bottom: 8px;"><label style="font-size: 0.9em; font-weight: bold;">Preço Unitário (R$):</label></div>` +
        `<input id="swal-preco" type="number" step="0.01" min="0" class="swal2-input" style="margin-top: 0; margin-bottom: 15px;" placeholder="Preço" value="${produto.preco || 0}">` +
        
        `<div style="text-align: left; margin-bottom: 8px;"><label style="font-size: 0.9em; font-weight: bold;">Estoque Mínimo:</label></div>` +
        `<input id="swal-minimo" type="number" min="0" class="swal2-input" style="margin-top: 0;" placeholder="Estoque Mínimo" value="${produto.estoqueMinimo ?? 5}">`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Salvar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3b82f6',
        preConfirm: () => ({
            nome: document.getElementById('swal-nome').value,
            categoria: document.getElementById('swal-categoria').value,
            preco: document.getElementById('swal-preco').value,
            quantidade: document.getElementById('swal-quant').value,
            estoqueMinimo: document.getElementById('swal-minimo').value
        })
    });

    if (formValues) {
        const { nome, categoria, preco, estoqueMinimo } = formValues;
        
        if (!nome || isNaN(preco) || preco < 0 || isNaN(estoqueMinimo) || estoqueMinimo < 0) {
            Swal.fire('Erro', 'Por favor, preencha todos os campos corretamente!', 'error');
            return;
        }

        const produtosAtualizados = produtos.map(p => {
            if (p.id === id) {
                return {
                    ...p,
                    nome,
                    categoria,
                    preco: Number(preco),
                    estoqueMinimo: Number(estoqueMinimo)
                };
            }
            return p;
        });

        salvarProdutos(produtosAtualizados);
        
        registrarMovimentacao(nome, 'entrada', 0, `Dados do produto editados via painel.`);

        Swal.fire('Atualizado!', 'O produto foi atualizado com sucesso.', 'success');
        
        if (typeof renderizarProdutos === 'function') renderizarProdutos();
        if (document.getElementById("dashboard") && typeof atualizarDashboard === 'function') atualizarDashboard();
    }
}

async function movimentarEstoque(id) {
    const produtos = getProdutos();
    const produto = produtos.find(p => p.id === id);
    if (!produto) return;

    const { value: formValues } = await Swal.fire({
        title: `Movimentar: ${produto.nome}`,
        html:
            `<select id="swal-tipo" class="swal2-input">
                <option value="entrada">Entrada (+)</option>
                <option value="saida">Saída (-)</option>
            </select>` +
            `<input id="swal-qtd" type="number" min="1" class="swal2-input" placeholder="Quantidade" value="1">` +
            `<p style="margin-top:8px;color:#666;">Estoque atual: <strong>${produto.quantidade}</strong></p>`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Confirmar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3b82f6',
        preConfirm: () => ({
            tipo: document.getElementById('swal-tipo').value,
            quantidade: document.getElementById('swal-qtd').value
        })
    });

    if (formValues) {
        const qtd = Number(formValues.quantidade);
        if (isNaN(qtd) || qtd <= 0) {
            Swal.fire('Erro', 'Quantidade inválida!', 'error');
            return;
        }

        const ok = ajustarEstoque(id, formValues.tipo, qtd);
        if (!ok) {
            Swal.fire('Erro', 'Não há estoque suficiente para esta saída!', 'error');
            return;
        }

        Swal.fire('Sucesso!', 'Estoque atualizado.', 'success');
        renderizarProdutos();
    }
}

let ordenacaoAtual = { coluna: 'nome', direcao: 'asc' };
let filtroCategoriaAtual = '';

function ordenarPor(coluna) {
    if (ordenacaoAtual.coluna === coluna) {
        ordenacaoAtual.direcao = ordenacaoAtual.direcao === 'asc' ? 'desc' : 'asc';
    } else {
        ordenacaoAtual.coluna = coluna;
        ordenacaoAtual.direcao = 'asc';
    }
    renderizarProdutos();
}

function renderizarProdutos() {
    if (!containerProdutos) return;

    const produtos = getProdutos();
    const filtroInput = document.getElementById("filtroProdutos");
    let termo = "";

    if (filtroInput) {
        termo = filtroInput.value.toLowerCase();
    } else {
        termo = (sessionStorage.getItem("buscaProduto") || "").toLowerCase();
    }

    let filtrados = produtos.filter(p => {
        const matchNome = p.nome.toLowerCase().includes(termo);
        const matchCat = !filtroCategoriaAtual || p.categoria === filtroCategoriaAtual;
        return matchNome && matchCat;
    });

    filtrados.sort((a, b) => {
        let valorA = a[ordenacaoAtual.coluna];
        let valorB = b[ordenacaoAtual.coluna];

        if (valorA === undefined) valorA = '';
        if (valorB === undefined) valorB = '';

        if (typeof valorA === 'string') valorA = valorA.toLowerCase();
        if (typeof valorB === 'string') valorB = valorB.toLowerCase();

        if (valorA < valorB) return ordenacaoAtual.direcao === 'asc' ? -1 : 1;
        if (valorA > valorB) return ordenacaoAtual.direcao === 'asc' ? 1 : -1;
        return 0;
    });

    containerProdutos.innerHTML = "";

    const elContador = document.getElementById("contadorProdutos");
    if (elContador) {
        elContador.textContent = `${filtrados.length} de ${produtos.length} produto(s)`;
    }

    if (filtrados.length === 0) {
        containerProdutos.innerHTML = "<p class='msg-vazia'>Nenhum produto encontrado.</p>";
        return;
    }

    const seta = (col) => ordenacaoAtual.coluna === col
        ? (ordenacaoAtual.direcao === 'asc' ? ' <i class="fa-solid fa-sort-up"></i>' : ' <i class="fa-solid fa-sort-down"></i>')
        : ' <i class="fa-solid fa-sort" style="color:#aaa"></i>';

    const statusLabel = { ok: 'Normal', baixo: 'Baixo', critico: 'Crítico' };

    let html = `
        <table>
            <tr>
                <th style="cursor:pointer" onclick="ordenarPor('nome')">Produto${seta('nome')}</th>
                <th style="cursor:pointer" onclick="ordenarPor('categoria')">Categoria${seta('categoria')}</th>
                <th style="cursor:pointer" onclick="ordenarPor('preco')">Preço${seta('preco')}</th>
                <th style="cursor:pointer" onclick="ordenarPor('quantidade')">Quantidade${seta('quantidade')}</th>
                <th>Status</th>
                <th style="width: 160px; text-align: center;">Ações</th>
            </tr>
    `;

    filtrados.forEach(produto => {
        const status = getStatusEstoque(produto);
        html += `
            <tr>
                <td>${produto.nome}</td>
                <td><span class="badge">${produto.categoria || 'Outros'}</span></td>
                <td>${formatarMoeda(produto.preco)}</td>
                <td>${produto.quantidade}</td>
                <td><span class="status-${status}">${statusLabel[status]}</span></td>
                <td style="text-align: center;">
                    <button class="btn-mov" onclick="movimentarEstoque(${produto.id})" title="Movimentar"><i class="fa-solid fa-arrows-rotate"></i></button>
                    <button class="btn-edit" onclick="editarProduto(${produto.id})" title="Editar"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-delete" onclick="removerProduto(${produto.id})" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });

    html += `</table>`;
    containerProdutos.innerHTML = html;
}

if (containerProdutos) {
    const filtroInput = document.getElementById("filtroProdutos");
    if (filtroInput) {
        const buscaSalva = sessionStorage.getItem("buscaProduto");
        if (buscaSalva) filtroInput.value = buscaSalva;

        filtroInput.addEventListener("input", () => {
            sessionStorage.setItem("buscaProduto", filtroInput.value);
            renderizarProdutos();
        });
    }

    const selectCategoria = document.getElementById("filtroCategoria");
    if (selectCategoria) {
        const categorias = [...new Set(getProdutos().map(p => p.categoria || 'Outros'))];
        categorias.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            selectCategoria.appendChild(opt);
        });

        selectCategoria.addEventListener("change", () => {
            filtroCategoriaAtual = selectCategoria.value;
            renderizarProdutos();
        });
    }

    renderizarProdutos();
}

//movimentações
function renderizarMovimentacoes() {
    const container = document.getElementById("listaMovimentacoes");
    if (!container) return;

    const filtroTipo = document.getElementById("filtroTipo");
    const tipo = filtroTipo ? filtroTipo.value : '';

    let movimentacoes = getMovimentacoes();
    if (tipo) movimentacoes = movimentacoes.filter(m => m.tipo === tipo);

    if (movimentacoes.length === 0) {
        container.innerHTML = '<p class="msg-vazia">Nenhuma movimentação encontrada.</p>';
        return;
    }

    const labels = {
        cadastro: 'Cadastro',
        entrada: 'Entrada',
        saida: 'Saída',
        exclusao: 'Exclusão'
    };

    let html = `
        <table>
            <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>Tipo</th>
                <th>Quantidade</th>
                <th>Observação</th>
            </tr>
    `;

    movimentacoes.forEach(m => {
        html += `
            <tr>
                <td>${formatarData(m.data)}</td>
                <td>${m.produtoNome}</td>
                <td><span class="tipo-${m.tipo}">${labels[m.tipo] || m.tipo}</span></td>
                <td>${m.quantidade}</td>
                <td>${m.observacao}</td>
            </tr>
        `;
    });

    html += '</table>';
    container.innerHTML = html;
}

const listaMovimentacoes = document.getElementById("listaMovimentacoes");
if (listaMovimentacoes) {
    const filtroTipo = document.getElementById("filtroTipo");
    if (filtroTipo) {
        filtroTipo.addEventListener("change", renderizarMovimentacoes);
    }
    renderizarMovimentacoes();
}
