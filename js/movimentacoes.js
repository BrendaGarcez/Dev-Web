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
                <th>Cliente/Fornecedor</th>
                <th>Observação</th>
            </tr>
    `;

    movimentacoes.forEach(m => {
        html += `
            <tr>
                <td>${formatarData(m.data)}</td>
                <td><strong>${m.produtoNome}</strong></td>
                <td><span class="tipo-${m.tipo}">${labels[m.tipo] || m.tipo}</span></td>
                <td>${m.quantidade}</td>
                <td>${m.parceiro || '<span style="color:#aaa;">-</span>'}</td>
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
