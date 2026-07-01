const containerProdutos = document.getElementById("listaProdutos");
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
                <th style="cursor:pointer" onclick="ordenarPor('fornecedor')">Fornecedor${seta('fornecedor')}</th>
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
                <td><strong>${produto.nome}</strong></td>
                <td><span class="badge">${produto.categoria || 'Outros'}</span></td>
                <td>${produto.fornecedor || '<span style="color:#aaa; font-style:italic;">Não especificado</span>'}</td>
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

async function movimentarEstoque(id) {
    const produtos = getProdutos();
    const produto = produtos.find(p => p.id === id);
    if (!produto) return;

    const { value: formValues } = await Swal.fire({
        title: `Movimentar: ${produto.nome}`,
        html:
            `<div style="text-align: left; margin-bottom: 8px;"><label style="font-size: 0.9em; font-weight: bold;">Tipo de Movimentação:</label></div>` +
            `<select id="swal-tipo" class="swal2-input" style="margin-top: 0; margin-bottom: 15px;">
                <option value="entrada">Entrada (+)</option>
                <option value="saida">Saída (-)</option>
            </select>` +
            `<div style="text-align: left; margin-bottom: 8px;"><label style="font-size: 0.9em; font-weight: bold;">Quantidade:</label></div>` +
            `<input id="swal-qtd" type="number" min="1" class="swal2-input" style="margin-top: 0; margin-bottom: 15px;" placeholder="Quantidade" value="1">` +
            `<div style="text-align: left; margin-bottom: 8px;"><label style="font-size: 0.9em; font-weight: bold;" id="swal-label-contato">Fornecedor:</label></div>` +
            `<select id="swal-contato" class="swal2-input" style="margin-top: 0; margin-bottom: 15px; width: 100%; display: flex;"></select>` +
            `<p style="margin-top:8px;color:#666;">Estoque atual: <strong>${produto.quantidade}</strong></p>`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Confirmar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3b82f6',
        didOpen: () => {
            const tipoSelect = Swal.getPopup().querySelector('#swal-tipo');
            const contatoSelect = Swal.getPopup().querySelector('#swal-contato');
            const labelContato = Swal.getPopup().querySelector('#swal-label-contato');
            
            const atualizarContatos = () => {
                const tipo = tipoSelect.value;
                const contatos = getContatos();
                const filtrados = contatos.filter(c => c.tipo === (tipo === 'entrada' ? 'Fornecedor' : 'Cliente'));
                
                labelContato.textContent = tipo === 'entrada' ? 'Fornecedor:' : 'Cliente:';
                
                let options = `<option value="">Nenhum (opcional)</option>`;
                options += filtrados.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
                contatoSelect.innerHTML = options;
            };
            
            tipoSelect.addEventListener('change', atualizarContatos);
            atualizarContatos();
        },
        preConfirm: () => ({
            tipo: document.getElementById('swal-tipo').value,
            quantidade: document.getElementById('swal-qtd').value,
            contato: document.getElementById('swal-contato').value
        })
    });

    if (formValues) {
        const qtd = Number(formValues.quantidade);
        if (isNaN(qtd) || qtd <= 0) {
            Swal.fire('Erro', 'Quantidade inválida!', 'error');
            return;
        }

        const ok = ajustarEstoque(id, formValues.tipo, qtd, formValues.contato);
        if (!ok) {
            Swal.fire('Erro', 'Não há estoque suficiente para esta saída!', 'error');
            return;
        }

        Swal.fire('Sucesso!', 'Estoque atualizado.', 'success');
        renderizarProdutos();
    }
}

async function editarProduto(id) {
    const produtos = getProdutos();
    const produto = produtos.find(p => p.id === id);
    if (!produto) return;

    const categorias = ["Eletrônicos", "Vestuário", "Alimentos", "Papelaria", "Outros"];
    const optionsHtml = categorias.map(cat => 
        `<option value="${cat}" ${produto.categoria === cat ? 'selected' : ''}>${cat}</option>`
    ).join('');

    const contatos = getContatos();
    const fornecedores = contatos.filter(c => c.tipo === "Fornecedor");
    const optionsFornecedoresHtml = `<option value="">Nenhum (opcional)</option>` + fornecedores.map(f => 
        `<option value="${f.nome}" ${produto.fornecedor === f.nome ? 'selected' : ''}>${f.nome}</option>`
    ).join('');
    
    const { value: formValues } = await Swal.fire({
        title: 'Editar Produto',
        html:
        `<div style="text-align: left; margin-bottom: 8px;"><label style="font-size: 0.9em; font-weight: bold;">Nome:</label></div>` +
        `<input id="swal-nome" class="swal2-input" style="margin-top: 0; margin-bottom: 15px;" placeholder="Nome" value="${produto.nome}">` +
        
        `<div style="text-align: left; margin-bottom: 8px;"><label style="font-size: 0.9em; font-weight: bold;">Categoria:</label></div>` +
        `<select id="swal-categoria" class="swal2-input" style="margin-top: 0; margin-bottom: 15px; width: 100%; display: flex;">${optionsHtml}</select>` +

        `<div style="text-align: left; margin-bottom: 8px;"><label style="font-size: 0.9em; font-weight: bold;">Fornecedor:</label></div>` +
        `<select id="swal-fornecedor" class="swal2-input" style="margin-top: 0; margin-bottom: 15px; width: 100%; display: flex;">${optionsFornecedoresHtml}</select>` +
        
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
            fornecedor: document.getElementById('swal-fornecedor').value,
            preco: document.getElementById('swal-preco').value,
            estoqueMinimo: document.getElementById('swal-minimo').value
        })
    });

    if (formValues) {
        const { nome, categoria, fornecedor, preco, estoqueMinimo } = formValues;
        
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
                    fornecedor: fornecedor || "",
                    preco: Number(preco),
                    estoqueMinimo: Number(estoqueMinimo)
                };
            }
            return p;
        });

        salvarProdutos(produtosAtualizados);
        
        registrarMovimentacao(nome, 'entrada', 0, `Dados do produto editados via painel.`, fornecedor);

        Swal.fire('Atualizado!', 'O produto foi atualizado com sucesso.', 'success');
        renderizarProdutos();
    }
}

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

            Swal.fire('Excluído!', 'O produto foi removido do estoque.', 'success');
            renderizarProdutos();
        }
    });
}

window.ordenarPor = ordenarPor;
window.movimentarEstoque = movimentarEstoque;
window.editarProduto = editarProduto;
window.removerProduto = removerProduto;

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
