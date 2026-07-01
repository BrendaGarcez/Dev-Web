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
        const parceiroTexto = m.parceiro ? ` (${m.parceiro})` : '';
        html += `
            <li>
                <i class="fa-solid ${icones[m.tipo] || 'fa-circle'}"></i>
                <div>
                    <strong>${m.produtoNome}</strong>
                    <span>${m.observacao}${parceiroTexto} — ${formatarData(m.data)}</span>
                </div>
            </li>
        `;
    });
    html += '</ul>';
    container.innerHTML = html;
}

function exportarDados() {
    const dados = {
        produtos: getProdutos(),
        movimentacoes: getMovimentacoes(),
        contatos: getContatos(),
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
            if (dados.contatos) {
                salvarContatos(dados.contatos);
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

async function registrarVendaRapida() {
    const produtos = getProdutos();
    const contatos = getContatos();
    const clientes = contatos.filter(c => c.tipo === "Cliente");

    if (produtos.length === 0) {
        Swal.fire('Erro', 'Cadastre pelo menos um produto antes de realizar uma venda!', 'warning');
        return;
    }

    const optionsProdutos = produtos.map(p => 
        `<option value="${p.id}">${p.nome} (Estoque: ${p.quantidade})</option>`
    ).join('');

    const optionsClientes = clientes.map(c => 
        `<option value="${c.nome}">${c.nome}</option>`
    ).join('');

    const { value: formValues } = await Swal.fire({
        title: 'Registrar Saída / Venda',
        html:
            `<div style="text-align: left; margin-bottom: 8px;"><label style="font-size: 0.9em; font-weight: bold;">Cliente:</label></div>` +
            `<select id="swal-venda-cliente" class="swal2-input" style="margin-top: 0; margin-bottom: 15px; width: 100%; display: flex;">
                <option value="">Selecione um cliente (opcional)...</option>
                ${optionsClientes}
            </select>` +
            
            `<div style="text-align: left; margin-bottom: 8px;"><label style="font-size: 0.9em; font-weight: bold;">Produto:</label></div>` +
            `<select id="swal-venda-produto" class="swal2-input" style="margin-top: 0; margin-bottom: 15px; width: 100%; display: flex;">
                <option value="" disabled selected>Selecione o produto...</option>
                ${optionsProdutos}
            </select>` +
            
            `<div style="text-align: left; margin-bottom: 8px;"><label style="font-size: 0.9em; font-weight: bold;">Quantidade:</label></div>` +
            `<input id="swal-venda-qtd" type="number" min="1" class="swal2-input" style="margin-top: 0; margin-bottom: 15px;" placeholder="Quantidade" value="1">`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Confirmar Venda',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#10b981',
        preConfirm: () => {
            const cliente = document.getElementById('swal-venda-cliente').value;
            const produtoId = document.getElementById('swal-venda-produto').value;
            const quantidade = Number(document.getElementById('swal-venda-qtd').value);
            
            if (!produtoId) {
                Swal.showValidationMessage('Selecione um produto');
                return false;
            }
            if (isNaN(quantidade) || quantidade <= 0) {
                Swal.showValidationMessage('Quantidade inválida');
                return false;
            }
            
            const prod = produtos.find(p => p.id === Number(produtoId));
            if (prod.quantidade < quantidade) {
                Swal.showValidationMessage(`Estoque insuficiente! Disponível: ${prod.quantidade}`);
                return false;
            }

            return { cliente, produtoId: Number(produtoId), quantidade };
        }
    });

    if (formValues) {
        const { cliente, produtoId, quantidade } = formValues;
        const prod = produtos.find(p => p.id === produtoId);
        
        const atualizados = produtos.map(p => 
            p.id === produtoId ? { ...p, quantidade: p.quantidade - quantidade } : p
        );
        salvarProdutos(atualizados);

        registrarMovimentacao(
            prod.nome,
            'saida',
            quantidade,
            'Venda realizada via Painel Rápido',
            cliente
        );

        Swal.fire('Venda Registrada!', `Saída de ${quantidade} unidade(s) confirmada.`, 'success');
        atualizarDashboard();
    }
}

window.registrarVendaRapida = registrarVendaRapida;

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
