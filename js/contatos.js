const formContato = document.getElementById("formContato");
const containerContatos = document.getElementById("listaContatos");

function renderizarContatos() {
    if (!containerContatos) return;

    const contatos = getContatos();
    const filtroInput = document.getElementById("filtroContatos");
    const filtroTipo = document.getElementById("filtroTipoContato");
    
    let termo = filtroInput ? filtroInput.value.toLowerCase() : "";
    let tipo = filtroTipo ? filtroTipo.value : "";

    let filtrados = contatos.filter(c => {
        const matchNome = c.nome.toLowerCase().includes(termo);
        const matchTipo = !tipo || c.tipo === tipo;
        return matchNome && matchTipo;
    });

    filtrados.sort((a, b) => a.nome.localeCompare(b.nome));

    containerContatos.innerHTML = "";

    const elContador = document.getElementById("contadorContatos");
    if (elContador) {
        elContador.textContent = `${filtrados.length} de ${contatos.length} contato(s)`;
    }

    if (filtrados.length === 0) {
        containerContatos.innerHTML = "<p class='msg-vazia'>Nenhum contato encontrado.</p>";
        return;
    }

    let html = `
        <table>
            <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Telefone</th>
                <th>E-mail</th>
                <th style="width: 80px; text-align: center;">Ações</th>
            </tr>
    `;

    filtrados.forEach(contato => {
        const classeBadge = contato.tipo === 'Cliente' ? 'badge-cliente' : 'badge-fornecedor';
        html += `
            <tr>
                <td><strong>${contato.nome}</strong></td>
                <td><span class="${classeBadge}">${contato.tipo}</span></td>
                <td>${contato.telefone || '<span style="color:#aaa;">-</span>'}</td>
                <td>${contato.email || '<span style="color:#aaa;">-</span>'}</td>
                <td style="text-align: center;">
                    <button class="btn-delete" onclick="removerContato(${contato.id})" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });

    html += `</table>`;
    containerContatos.innerHTML = html;
}

function removerContato(id) {
    Swal.fire({
        title: 'Tem certeza?',
        text: "Excluir o contato não apagará seu histórico de movimentações, mas ele deixará de aparecer nas opções de novos lançamentos.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: '<i class="fa-solid fa-trash"></i> Sim, excluir!',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            const contatos = getContatos();
            const filtrados = contatos.filter(c => c.id !== id);
            salvarContatos(filtrados);

            Swal.fire(
                'Excluído!',
                'O contato foi removido com sucesso.',
                'success'
            );

            renderizarContatos();
        }
    });
}

window.removerContato = removerContato;

if (formContato) {
    formContato.addEventListener("submit", function(e) {
        e.preventDefault();

        const nome = document.getElementById("contatoNome").value.trim();
        const tipo = document.getElementById("contatoTipo").value;
        const telefone = document.getElementById("contatoTelefone").value.trim();
        const email = document.getElementById("contatoEmail").value.trim();

        if (!nome || !tipo) {
            Swal.fire('Atenção', 'Nome e Tipo são campos obrigatórios!', 'warning');
            return;
        }

        const contatos = getContatos();
        if (contatos.some(c => c.nome.toLowerCase() === nome.toLowerCase() && c.tipo === tipo)) {
            Swal.fire('Erro', `Já existe um ${tipo.toLowerCase()} cadastrado com este nome!`, 'error');
            return;
        }

        adicionarContato(nome, tipo, telefone, email);

        Swal.fire({
            title: 'Sucesso!',
            text: 'Contato cadastrado com sucesso!',
            icon: 'success',
            confirmButtonColor: '#3b82f6'
        });

        formContato.reset();
        renderizarContatos();
    });
}

if (containerContatos) {
    const filtroInput = document.getElementById("filtroContatos");
    if (filtroInput) {
        filtroInput.addEventListener("input", renderizarContatos);
    }

    const filtroTipo = document.getElementById("filtroTipoContato");
    if (filtroTipo) {
        filtroTipo.addEventListener("change", renderizarContatos);
    }

    renderizarContatos();
}
