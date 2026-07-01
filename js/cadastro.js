const form = document.getElementById("formProduto");

if (form) {
    const selectFornecedor = document.getElementById("fornecedor");
    if (selectFornecedor) {
        const fornecedores = getContatos().filter(c => c.tipo === "Fornecedor");
        fornecedores.forEach(f => {
            const opt = document.createElement("option");
            opt.value = f.nome;
            opt.textContent = f.nome;
            selectFornecedor.appendChild(opt);
        });
    }

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const nome = document.getElementById("nome").value.trim();
        const quantidade = Number(document.getElementById("quantidade").value);
        const preco = Number(document.getElementById("preco").value);
        const categoria = document.getElementById("categoria").value;
        const estoqueMinimo = Number(document.getElementById("estoqueMinimo").value) || 5;
        const selectFornecedorElement = document.getElementById("fornecedor");
        const fornecedor = selectFornecedorElement ? selectFornecedorElement.value : "";

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

        adicionarProduto(nome, quantidade, preco, categoria, estoqueMinimo, fornecedor);

        Swal.fire({
            title: 'Sucesso!',
            text: 'Produto cadastrado com sucesso!',
            icon: 'success',
            confirmButtonColor: '#3b82f6'
        });

        form.reset();
    });
}
