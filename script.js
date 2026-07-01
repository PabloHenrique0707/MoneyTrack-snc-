let todasTransacoes = [];
let usuarioLogado = JSON.parse(localStorage.getItem('usuario'));
const FALLBACK_USER_ID = 3; // ID do Emerson como garantia caso o login falhe

function formatarMoeda(valor) {
    return Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

/* LOGIN */
async function fazerLogin() {
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;

    const resposta = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
    });

    const resultado = await resposta.json();
    mostrarPopup(resultado.mensagem);

    if (resultado.sucesso) {
        localStorage.setItem('usuario', JSON.stringify(resultado.usuario));
        usuarioLogado = resultado.usuario;
        window.location.href = 'dashboard.html';
    }
}

/* CADASTRO */
function mostrarCadastro() {
    document.getElementById('loginBox').style.display = 'none';
    document.getElementById('cadastroBox').style.display = 'block';
}

function mostrarLogin() {
    document.getElementById('loginBox').style.display = 'block';
    document.getElementById('cadastroBox').style.display = 'none';
}

async function cadastrarNovoUsuario() {
    const nome = document.getElementById('nomeCadastro').value;
    const email = document.getElementById('emailCadastro').value;
    const senha = document.getElementById('senhaCadastro').value;

    const resposta = await fetch('http://localhost:3000/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, senha })
    });

    const resultado = await resposta.text();
    mostrarPopup(resultado);
    mostrarLogin();
}

/* ADICIONAR TRANSAÇÃO */
async function adicionarTransacao(event) {
    if (event) event.preventDefault();

    const campoDescricao = document.getElementById('descricao');
    const campoValor = document.getElementById('valor');
    const campoTipo = document.getElementById('tipo');
    const campoCategoria = document.getElementById('categoria');

    if (!campoDescricao || !campoValor) return;

    const descricao = campoDescricao.value;
    const valor = campoValor.value.replace(/\./g, '').replace(',', '.');
    const tipo = campoTipo ? campoTipo.value : 'receita';
    const categoria_gasto = campoCategoria ? campoCategoria.value : 'Geral';

    const usuario_id = usuarioLogado?.id || FALLBACK_USER_ID;

    try {
        const response = await fetch('http://localhost:3000/transacoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                descricao,
                valor,
                tipo: tipo.toLowerCase(),
                categoria_gasto,
                usuario_id
            })
        });

        if (response.ok) {
            campoDescricao.value = '';
            campoValor.value = '';
            mostrarPopup('Transação adicionada!');
            listarTransacoes();
        }
    } catch (error) {
        console.error("Erro ao enviar transação:", error);
    }
}

/* LISTAR TRANSAÇÕES NO FRONT-END */
async function listarTransacoes() {
    const usuario_id = usuarioLogado?.id || FALLBACK_USER_ID;

    try {
        const response = await fetch(`http://localhost:3000/transacoes?usuario_id=${usuario_id}`);
        const transacoes = await response.json();
        todasTransacoes = transacoes;
        
        console.log("Transações carregadas:", transacoes);

        const tabelaBody = document.getElementById('corpoTabela') || document.querySelector('table tbody');
        if (!tabelaBody) return;

        tabelaBody.innerHTML = '';

        const transacoesFiltradas = typeof aplicarFiltros === 'function' ? aplicarFiltros(transacoes) : transacoes;

        if (transacoesFiltradas.length === 0) {
            tabelaBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: white; padding: 15px;">Nenhuma transação cadastrada.</td></tr>`;
            atualizarResumosLocais(0, 0);
            return;
        }

        let receitas = 0;
        let despesas = 0;

        transacoesFiltradas.forEach(t => {
            const linha = document.createElement('tr');
            const dataFormatada = t.data_hora ? new Date(t.data_hora).toLocaleDateString('pt-BR') : '---';
            const valorNum = Number(t.valor);
            const valorFormatado = formatarMoeda(valorNum);
            const corTipo = String(t.tipo).toLowerCase() === 'receita' ? 'text-success' : 'text-danger';

            if (String(t.tipo).toLowerCase() === 'receita') {
                receitas += valorNum;
            } else {
                despesas += valorNum;
            }

            linha.innerHTML = `
                <td style="color: white;">${dataFormatada}</td>
                <td style="color: white;">${t.descricao || 'Sem descrição'}</td>
                <td class="${corTipo}" style="font-weight: bold;">${valorFormatado}</td>
                <td style="color: white;"><span class="badge bg-secondary">${t.categoria_gasto || 'Geral'}</span></td>
                <td style="color: white;">${t.metodo_pagamento || 'Não informado'}</td>
                <td><button class="btn btn-sm btn-danger" onclick="deletarTransacao(${t.id_transacao})">🗑️</button></td>
            `;
            tabelaBody.appendChild(linha);
        });

        atualizarResumo(receitas, despesas);
    } catch (error) {
        console.error("Erro ao listar transações no front:", error);
    }
}

function atualizarResumosLocais(receitas, despesas) {
    if(typeof atualizarResumo === 'function') {
        atualizarResumo(receitas, despesas);
    }
}

/* EDITAR TRANSAÇÃO */
let transacaoEditando = null;

function editarTransacao(id, descricaoAtual, valorAtual, tipoAtual, categoriaAtual) {
    transacaoEditando = id;
    document.getElementById('editarDescricao').value = descricaoAtual;
    document.getElementById('editarValor').value = valorAtual;
    document.getElementById('editarTipo').value = tipoAtual;
    document.getElementById('editarCategoria').value = categoriaAtual;
    document.getElementById('modalTransacao').style.display = 'flex';
}

function fecharModalTransacao() {
    document.getElementById('modalTransacao').style.display = 'none';
}

async function salvarEdicaoTransacao() {
    const descricao = document.getElementById('editarDescricao').value;
    const valor = document.getElementById('editarValor').value;
    const tipo = document.getElementById('editarTipo').value;
    const categoria_gasto = document.getElementById('editarCategoria').value;

    await fetch(`http://localhost:3000/transacoes/${transacaoEditando}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            descricao,
            valor,
            tipo,
            categoria_gasto,
            usuario_id: usuarioLogado?.id || FALLBACK_USER_ID
        })
    });

    fecharModalTransacao();
    mostrarPopup('Transação atualizada!');
    listarTransacoes();
}

/* DELETAR TRANSAÇÃO */
async function deletarTransacao(id) {
    if(!confirm("Deseja realmente excluir esta transação?")) return;
    
    await fetch(`http://localhost:3000/transacoes/${id}`, {
        method: 'DELETE'
    });

    mostrarPopup('Transação excluída!');
    listarTransacoes();
}

/* PERFIL */
function carregarPerfil() {
    if (!usuarioLogado) return;

    const nomePerfil = document.getElementById('nomePerfil');
    const perfilNome = document.getElementById('perfilNome');
    const perfilEmail = document.getElementById('perfilEmail');

    if (nomePerfil) nomePerfil.innerHTML = `👤 ${usuarioLogado.nome}`;
    if (perfilNome) perfilNome.innerText = usuarioLogado.nome;
    if (perfilEmail) perfilEmail.innerText = usuarioLogado.email;
}

function abrirPerfil() {
    document.getElementById('dashboardArea').style.display = 'none';
    document.getElementById('perfilArea').style.display = 'block';
    document.getElementById('transacoesArea').style.display = 'none';
    document.getElementById('metasArea').style.display = 'none';
}
function abrirDashboard() {
    document.getElementById('dashboardArea').style.display = 'block';
    document.getElementById('perfilArea').style.display = 'none';
    document.getElementById('transacoesArea').style.display = 'none';
    document.getElementById('metasArea').style.display = 'none';
}
function abrirTransacoes() {
    document.getElementById('dashboardArea').style.display = 'none';
    document.getElementById('perfilArea').style.display = 'none';
    document.getElementById('transacoesArea').style.display = 'block';
    document.getElementById('metasArea').style.display = 'none';
}
function logout() {
    localStorage.removeItem('usuario');
    window.location.href = 'login.html';
}

/* POPUP */
function mostrarPopup(mensagem) {
    const popup = document.getElementById('popup');
    if(!popup) return;
    popup.innerText = message = mensagem;
    popup.classList.add('mostrar');
    setTimeout(() => {
        popup.classList.remove('mostrar');
    }, 3000);
}

/* MODAL PERFIL */
function abrirModalPerfil() {
    document.getElementById('modalEditar').style.display = 'flex';
    document.getElementById('editarNome').value = usuarioLogado.nome;
    document.getElementById('editarEmail').value = usuarioLogado.email;
    document.getElementById('editarLimite').value = usuarioLogado.limite_gastos || 0;
}

function fecharModal() {
    document.getElementById('modalEditar').style.display = 'none';
}

async function salvarPerfil() {
    const nome = document.getElementById('editarNome').value;
    const email = document.getElementById('editarEmail').value;
    const senha = document.getElementById('editarSenha').value;
    const limite_gastos = Number(document.getElementById('editarLimite').value);

    await fetch(`http://localhost:3000/usuarios/${usuarioLogado.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, senha, limite_gastos })
    });

    usuarioLogado.nome = nome;
    usuarioLogado.email = email;
    usuarioLogado.limite_gastos = limite_gastos;

    localStorage.setItem('usuario', JSON.stringify(usuarioLogado));

    carregarPerfil();
    fecharModal();
    mostrarPopup('Perfil updated!');
}

/* METAS */
function abrirMetas() {
    document.getElementById('dashboardArea').style.display = 'none';
    document.getElementById('perfilArea').style.display = 'none';
    document.getElementById('transacoesArea').style.display = 'none';
    document.getElementById('metasArea').style.display = 'block';
    listarMetas();
}

function abrirModalMeta() {
    document.getElementById('modalMeta').style.display = 'flex';
}

function fecharModalMeta() {
    document.getElementById('modalMeta').style.display = 'none';
}

async function salvarMeta() {
    const nome = document.getElementById('nomeMeta').value;
    const valor_meta_input = document.getElementById('valorMeta').value;
    const data_fim = document.getElementById('prazoMeta').value;

    if (nome.trim() === '' || valor_meta_input.trim() === '' || data_fim.trim() === '') {
        mostrarPopup('Preencha todos os campos!');
        return;
    }

    const valor_meta = Number(valor_meta_input.replace(/\./g, '').replace(',', '.'));

    if (isNaN(valor_meta) || valor_meta <= 0) {
        mostrarPopup('O valor da meta deve ser maior que zero!');
        return;
    }

    if (metaEditando) {
        await fetch(`http://localhost:3000/metas/${metaEditando}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, valor_meta, data_fim })
        });
        mostrarPopup('Meta atualizada!');
        metaEditando = null;
    } else {
        await fetch('http://localhost:3000/metas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, valor_meta, data_fim, usuario_id: usuarioLogado?.id || FALLBACK_USER_ID })
        });
        mostrarPopup('Meta criada!');
    }

    fecharModalMeta();
    listarMetas();
}

async function listarMetas() {
    const usuario_id = usuarioLogado?.id || FALLBACK_USER_ID;
    const resposta = await fetch(`http://localhost:3000/metas?usuario_id=${usuario_id}`);
    const metas = await resposta.json();
    const lista = document.getElementById('listaMetas');

    if (!lista) return;
    lista.innerHTML = '';

    metas.forEach(meta => {
        lista.innerHTML += `
        <div class="card-meta">
            <h2>${meta.nome}</h2>
            <p>${formatarMoeda(meta.valor_meta)}</p>
            <small>Prazo: ${new Date(meta.data_fim).toLocaleDateString('pt-BR')}</small>
            <div class="botoes-meta">
                <button onclick="editarMeta(${meta.id})">Editar</button>
                <button onclick="excluirMeta(${meta.id})">Excluir</button>
            </div>
        </div>`;
    });
}

async function excluirMeta(id) {
    await fetch(`http://localhost:3000/metas/${id}`, { method: 'DELETE' });
    mostrarPopup('Meta excluída!');
    listarMetas();
}

let metaEditando = null;
function editarMeta(id) {
    metaEditando = id;
    document.getElementById('modalMeta').style.display = 'flex';
}

function aplicarMascaraMoeda(input) {
    let valor = input.value.replace(/\D/g, '');
    valor = (valor / 100).toFixed(2) + '';
    valor = valor.replace('.', ',');
    valor = valor.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    input.value = valor;
}

async function excluirContaConfirmada() {
    await fetch(`http://localhost:3000/usuarios/${usuarioLogado.id}`, { method: 'DELETE' });
    localStorage.removeItem('usuario');
    mostrarPopup("Conta excluída!");
    window.location.href = "login.html";
}

function abrirConfirmExclusaoConta() {
    document.getElementById('modalConfirm').style.display = 'flex';
}
function fecharModalConfirm() {
    document.getElementById('modalConfirm').style.display = 'none';
}

/* RELATÓRIO */
async function gerarRelatorio() {
    const usuario_id = usuarioLogado?.id || FALLBACK_USER_ID;
    const resposta = await fetch(`http://localhost:3000/transacoes?usuario_id=${usuario_id}`);
    const transacoes = await resposta.json();

    let receitas = 0, despesas = 0;
    transacoes.forEach(t => {
        const valor = Number(t.valor);
        if (String(t.tipo).toLowerCase() === 'receita') receitas += valor;
        else despesas += valor;
    });

    const saldo = receitas - despesas;
    let situacao = receitas > despesas ? 'POSITIVO' : (despesas > receitas ? 'NEGATIVO' : 'EQUILIBRADO');
    let analise = receitas > despesas ? 'Fluxo financeiro saudável.' : 'Revisão de gastos necessária.';

    const janela = window.open('', '_blank');
    janela.document.write(`<html><body><h1>📊 Relatório Financeiro</h1><div>Receitas: R$ ${receitas.toFixed(2)}</div><div>Despesas: R$ ${despesas.toFixed(2)}</div><div><strong>Saldo: R$ ${saldo.toFixed(2)}</strong></div><br><div>Situação: ${situacao}</div></body></html>`);
    janela.document.close();
    janela.print();
}

function atualizarResumo(receitas, despesas) {
    const saldo = receitas - despesas;
    const campos = ['receitas', 'despesas', 'saldo', 'receitasTransacoes', 'despesasTransacoes'];
    
    campos.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id.includes('receitas')) el.innerText = formatarMoeda(receitas);
            else if (id.includes('despesas')) el.innerText = formatarMoeda(despesas);
            else el.innerText = formatarMoeda(saldo);
        }
    });
}

function aplicarFiltros(transacoes) {
    const tipo = document.getElementById('filtroTipo')?.value;
    const categoria = document.getElementById('filtroCategoria')?.value;
    const min = Number(document.getElementById('filtroMin')?.value) || 0;
    const max = Number(document.getElementById('filtroMax')?.value) || Infinity;

    return transacoes.filter(t => {
        const valor = Number(t.valor);
        const tipoOk = !tipo || String(t.tipo).toLowerCase() === tipo.toLowerCase();
        const catOk = !categoria || t.categoria_gasto === categoria;
        const minOk = valor >= min;
        const maxOk = valor <= max;
        return tipoOk && catOk && minOk && maxOk;
    });
}

function filtrarTransacoes() {
    listarTransacoes();
}

/* EVENTOS DE INICIALIZAÇÃO */
document.addEventListener('DOMContentLoaded', () => {
    if (usuarioLogado) {
        carregarPerfil();
        listarTransacoes();
    } else {
        listarTransacoes(); // Roda fallback com ID 3 de forma segura
    }

    const form = document.getElementById('formTransacao') || document.querySelector('form');
    if (form) form.addEventListener('submit', adicionarTransacao);
});