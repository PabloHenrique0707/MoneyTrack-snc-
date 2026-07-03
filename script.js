let meuGrafico = null; // Guarda a instância do gráfico do Chart.js
let todasTransacoes = [];
let todasMetas = []; // CORRIGIDO: Variável global criada para armazenar as metas corretamente
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
    const usuario_id = usuarioLogado ? usuarioLogado.id : FALLBACK_USER_ID;

    try {
        const response = await fetch(`http://localhost:3000/transacoes?usuario_id=${usuario_id}`);
        
        if (!response.ok) {
            throw new Error(`Erro na requisição: Status ${response.status}`);
        }

        const transacoes = await response.json();
        todasTransacoes = transacoes; 
        
        console.log("Transações recebidas do banco:", transacoes);

        const tabelaBody = document.getElementById('corpoTabela');
        const tabelaResumoDashboard = document.getElementById('corpoResumoDashboard');

        if (tabelaBody) tabelaBody.innerHTML = '';
        if (tabelaResumoDashboard) tabelaResumoDashboard.innerHTML = '';

        let receitas = 0;
        let despesas = 0;

        if (transacoes.length === 0) {
            if (tabelaBody) tabelaBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: #888; padding: 15px;">Nenhuma transação cadastrada.</td></tr>`;
            if (tabelaResumoDashboard) tabelaResumoDashboard.innerHTML = `<tr><td colspan="2" style="text-align:center; color: #888; padding: 15px;">Nenhuma movimentação.</td></tr>`;
            atualizarResumo(0, 0);
            return;
        }

        transacoes.forEach(t => {
            const valorNum = Number(t.valor);
            const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorNum);
            
            const tipoBruto = t.tipo_transacao || t.tipo || 'receita';
            const tipo = String(tipoBruto).toLowerCase();
            const eReceita = tipo === 'receita';

            if (eReceita) {
                receitas += valorNum;
            } else {
                despesas += valorNum;
            }

            const idAtual = t.id_transacao || t.id;

            // 1. Alimenta a tabela COMPLETA na aba de Transações
            if (tabelaBody) {
                const linha = document.createElement('tr');
                linha.innerHTML = `
                    <td style="color: white; padding: 10px;">${t.nome || t.descricao || 'Transação'}</td>
                    <td style="color: ${eReceita ? '#2ecc71' : '#e74c3c'}; font-weight: bold; padding: 10px;">${valorFormatado}</td>
                    <td style="color: white; padding: 10px;">${t.categoria_gasto || 'Geral'}</td>
                    <td style="padding: 10px;">
                        <button style="background: none; border: none; cursor: pointer;" onclick="deletarTransacao(${idAtual})">🗑️</button>
                    </td>
                `;
                tabelaBody.appendChild(linha);
            }

            // 2. Alimenta a mini tabela de resumo na aba de Dashboard
            if (tabelaResumoDashboard) {
                const linhaResumo = document.createElement('tr');
                linhaResumo.innerHTML = `
                    <td style="color: white; padding: 10px;">${t.nome || t.descricao || 'Transação'}</td>
                    <td style="color: ${eReceita ? '#2ecc71' : '#e74c3c'}; font-weight: bold; padding: 10px;">${valorFormatado}</td>
                `;
                tabelaResumoDashboard.appendChild(linhaResumo);
            }
        });

        atualizarResumo(receitas, despesas);

    } catch (error) {
        console.error("❌ Erro ao listar transações no front-end:", error);
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
    mostrarPopup('Transação updated!');
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
    popup.innerText = mensagem; // CORRIGIDO: message alterado para mensagem
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
    
    // CORRIGIDO: Intercepta o clique do botão "Salvar" no HTML para acionar a função salvarMeta
    const botoes = document.querySelectorAll('#modalMeta button');
    botoes.forEach(btn => {
        if (btn.innerText.trim().toLowerCase() === 'salvar') {
            btn.onclick = salvarMeta;
        }
    });
}

function fecharModalMeta() {
    document.getElementById('modalMeta').style.display = 'none';
    document.querySelector('#modalMeta h2').innerText = "Nova Meta";
    metaEditando = null;
    document.getElementById('nomeMeta').value = '';
    document.getElementById('valorMeta').value = '';
    document.getElementById('prazoMeta').value = '';
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
    todasMetas = metas; // CORRIGIDO: Agora alimenta a lista global perfeitamente

    const lista = document.getElementById('listaMetas');
    if (!lista) return;
    lista.innerHTML = '';

    if (metas.length === 0) {
        lista.innerHTML = '<p style="color: #888; grid-column: 1/-1;">Nenhuma meta cadastrada ainda.</p>';
        return;
    }

    metas.forEach(meta => {
        const idMeta = meta.id || meta.id_meta; // CORRIGIDO: Suporta os dois padrões de retorno do banco
        
        // CORRIGIDO: Tratamento de fuso horário para a data do prazo não vir errada
        const dataObjeto = new Date(meta.data_fim);
        const dataFormatada = dataObjeto.toLocaleDateString('pt-BR', { timeZone: 'UTC' });

        lista.innerHTML += `
        <div class="card-meta">
            <h2>${meta.nome}</h2>
            <p>${formatarMoeda(meta.valor_meta)}</p>
            <small>Prazo: ${dataFormatada}</small>
            <div class="botoes-meta">
                <button onclick="editarMeta(${idMeta})">Editar</button>
                <button onclick="excluirMeta(${idMeta})">Excluir</button>
            </div>
        </div>`;
    });
}

async function excluirMeta(id) {
    if(!confirm("Tem certeza que deseja excluir esta meta?")) return;
    await fetch(`http://localhost:3000/metas/${id}`, { method: 'DELETE' });
    mostrarPopup('Meta excluída!');
    listarMetas();
}

let metaEditando = null;
function editarMeta(id) {
    // CORRIGIDO: Busca a meta selecionada da variável global agora populada corretamente
    const metaSelecionada = todasMetas.find(m => (m.id === id || m.id_meta === id));
    
    if (metaSelecionada) {
        metaEditando = id;
        document.getElementById('nomeMeta').value = metaSelecionada.nome;
        
        const valorFormatado = Number(metaSelecionada.valor_meta).toFixed(2).replace('.', ',');
        document.getElementById('valorMeta').value = valorFormatado;
        
        const dataFormatada = metaSelecionada.data_fim.split('T')[0];
        document.getElementById('prazoMeta').value = dataFormatada;
        
        document.querySelector('#modalMeta h2').innerText = "Editar Meta";
    }
    
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

    const janela = window.open('', '_blank');
    janela.document.write(`<html><body><h1>📊 Relatório Financeiro</h1><div>Receitas: R$ ${receitas.toFixed(2)}</div><div>Despesas: R$ ${despesas.toFixed(2)}</div><div><strong>Saldo: R$ ${saldo.toFixed(2)}</strong></div><br><div>Situação: ${situacao}</div></body></html>`);
    janela.document.close();
    janela.print();
}

/* ATUALIZAR RESUMO E GRÁFICO */
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

    const ctx = document.getElementById('graficoFinanceiro');
    if (!ctx) return; 

    if (meuGrafico) {
        meuGrafico.data.datasets[0].data = [receitas, despesas];
        meuGrafico.update();
    } else {
        meuGrafico = new Chart(ctx, {
            type: 'doughnut', 
            data: {
                labels: ['Receitas', 'Despesas'],
                datasets: [{
                    data: [receitas, despesas],
                    backgroundColor: ['#2ecc71', '#e74c3c'], 
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#ffffff', 
                            font: { size: 14 }
                        }
                    }
                }
            }
        });
    }
}

function aplicarFiltros(transacoes) {
    const tipo = document.getElementById('filtroTipo')?.value;
    const category = document.getElementById('filtroCategoria')?.value;
    const min = Number(document.getElementById('filtroMin')?.value) || 0;
    const max = Number(document.getElementById('filtroMax')?.value) || Infinity;

    return transacoes.filter(t => {
        const valor = Number(t.valor);
        const tipoOk = !tipo || String(t.tipo).toLowerCase() === tipo.toLowerCase();
        const catOk = !category || t.categoria_gasto === category;
        const minOk = valor >= min;
        const maxOk = valor <= max;
        return tipoOk && catOk && minOk && maxOk;
    });
}

function filtrarTransacoes() {
    const tipoFiltro = document.getElementById('filtroTipo').value;
    const categoriaFiltro = document.getElementById('filtroCategoria').value;
    const minFiltro = document.getElementById('filtroMin').value;
    const maxFiltro = document.getElementById('filtroMax').value;

    const tabelaBody = document.getElementById('corpoTabela');
    if (!tabelaBody) return;

    tabelaBody.innerHTML = '';

    const filtradas = todasTransacoes.filter(t => {
        const bateTipo = !tipoFiltro || String(t.tipo_transacao).toLowerCase() === tipoFiltro.toLowerCase();
        const bateCategoria = !categoriaFiltro || t.categoria_gasto === categoriaFiltro;
        const valorNum = Number(t.valor);
        const bateMin = !minFiltro || valorNum >= Number(minFiltro);
        const bateMax = !maxFiltro || valorNum <= Number(maxFiltro);

        return bateTipo && bateCategoria && bateMin && bateMax;
    });

    filtradas.forEach(t => {
        const linha = document.createElement('tr');
        const valorNum = Number(t.valor);
        const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorNum);
        const eReceita = String(t.tipo_transacao).toLowerCase() === 'receita';

        linha.innerHTML = `
            <td style="color: white; padding: 10px;">${t.nome || t.descricao || 'Sem descrição'}</td>
            <td style="color: ${eReceita ? '#2ecc71' : '#e74c3c'}; font-weight: bold; padding: 10px;">${valorFormatado}</td>
            <td style="color: white; padding: 10px;">${t.categoria_gasto || 'Geral'}</td>
            <td style="padding: 10px;">
                <button style="background: none; border: none; cursor: pointer;" onclick="deletarTransacao(${t.id})">🗑️</button>
            </td>
        `;
        tabelaBody.appendChild(linha);
    });
}

/* EVENTOS DE INICIALIZAÇÃO */
document.addEventListener('DOMContentLoaded', () => {
    if (usuarioLogado) {
        carregarPerfil();
        listarTransacoes();
    } else {
        listarTransacoes(); 
    }

    const form = document.getElementById('formTransacao') || document.querySelector('form');
    if (form) form.addEventListener('submit', adicionarTransacao);
});
