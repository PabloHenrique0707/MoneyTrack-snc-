let meuGrafico = null; // Guarda a instância do gráfico do Chart.js
let todasTransacoes = [];
let todasMetas = []; // Armazena as metas corretamente
let usuarioLogado = null;
let metaEditando = null;

// Variáveis globais auxiliares para o controle do modal de exclusão dinâmica
let itemParaExcluirId = null;
let itemParaExcluirTipo = null; // 'transacao', 'meta', ou 'conta'

// Função para validar e obter o usuário ativo de forma dinâmica, segura e padronizada
function obterUsuarioAtivo() {
    const usuarioNoStorage = localStorage.getItem('usuario');
    if (usuarioNoStorage) {
        try {
            const user = JSON.parse(usuarioNoStorage);
            
            // Força a detecção e mapeamento correto de ID do banco para o front-end
            let idReal = null;
            if (user.id !== undefined && user.id !== null) idReal = user.id;
            else if (user.id_usuario !== undefined && user.id_usuario !== null) idReal = user.id_usuario;
            else if (user.id_cliente !== undefined && user.id_cliente !== null) idReal = user.id_cliente;

            if (idReal) {
                user.id = Number(idReal); // Garante formato numérico puro
                return user;
            }
        } catch (e) {
            console.error("Erro ao ler dados da sessão:", e);
        }
    }
    return null;
}

// Inicializa o usuário ativo no carregamento do arquivo
usuarioLogado = obterUsuarioAtivo();

function formatarMoeda(valor) {
    return Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

/* MÁSCARA DE MOEDA */
function aplicarMascaraMoeda(campo) {
    let valor = campo.value.replace(/\D/g, "");
    valor = (Number(valor) / 100).toFixed(2).replace(".", ",");
    valor = valor.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    campo.value = "R$ " + valor;
}

/* LOGIN */
async function fazerLogin() {
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;

    try {
        const resposta = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });

        const resultado = await resposta.json();
        
        if (resultado.sucesso) {
            localStorage.setItem('usuario', JSON.stringify(resultado.usuario));
            usuarioLogado = obterUsuarioAtivo();
            window.location.href = 'dashboard.html';
        } else {
            mostrarPopup(resultado.mensagem || "Credenciais inválidas.");
        }
    } catch (error) {
        mostrarPopup("Erro ao realizar login no servidor.");
        console.error(error);
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

    try {
        const resposta = await fetch('http://localhost:3000/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha })
        });

        const resultado = await resposta.text();
        mostrarPopup(resultado);
        mostrarLogin();
    } catch (error) {
        mostrarPopup("Erro ao registrar novo usuário.");
        console.error(error);
    }
}

/* ADICIONAR TRANSAÇÃO */
async function adicionarTransacao(event) {
    if (event) event.preventDefault();

    usuarioLogado = obterUsuarioAtivo();
    if (!usuarioLogado) {
        mostrarPopup("Por favor, faça login para continuar.");
        return;
    }

    const campoDescricao = document.getElementById('descricao');
    const campoValor = document.getElementById('valor');
    const campoTipo = document.getElementById('tipo');
    const campoCategoria = document.getElementById('categoria');

    if (!campoDescricao || !campoValor) return;

    const descricao = campoDescricao.value;
    const valorRaw = campoValor.value.replace("R$", "").trim();
    const valor = valorRaw.replace(/\./g, '').replace(',', '.');

    const tipo = campoTipo ? campoTipo.value : 'receita';
    const categoria_gasto = campoCategoria ? campoCategoria.value : 'Geral';

    if (!descricao || !valor || isNaN(parseFloat(valor))) {
        mostrarPopup("Preencha a descrição e um valor válido!");
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/transacoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                descricao,
                valor: parseFloat(valor),
                tipo: tipo.toLowerCase(),
                categoria_gasto,
                usuario_id: usuarioLogado.id
            })
        });

        if (response.ok) {
            campoDescricao.value = '';
            campoValor.value = '';
            mostrarPopup('Transação adicionada!');
            await listarTransacoes();
        } else {
            const erroMsg = await response.text();
            mostrarPopup(erroMsg);
        }
    } catch (error) {
        console.error("Erro ao enviar transação:", error);
    }
}

/* LISTAR TRANSAÇÕES NO FRONT-END */
async function listarTransacoes() {
    usuarioLogado = obterUsuarioAtivo();
    if (!usuarioLogado) return;

    try {
        const response = await fetch(`http://localhost:3000/transacoes?usuario_id=${usuarioLogado.id}`);
        
        if (!response.ok) {
            throw new Error(`Erro na requisição: Status ${response.status}`);
        }

        const transacoes = await response.json();
        todasTransacoes = transacoes; 
        
        renderizarTabelaTransacoes(todasTransacoes);

    } catch (error) {
        console.error("❌ Erro ao listar transações no front-end:", error);
    }
}

function renderizarTabelaTransacoes(listaFiltrada) {
    const tabelaBody = document.getElementById('corpoTabela');
    const tabelaResumoDashboard = document.getElementById('corpoResumoDashboard');

    if (tabelaBody) tabelaBody.innerHTML = '';
    if (tabelaResumoDashboard) tabelaResumoDashboard.innerHTML = '';

    let PiscinaReceitas = 0;
    let PiscinaDespesas = 0;

    todasTransacoes.forEach(t => {
        const v = Number(t.valor);
        const tipo = String(t.tipo_transacao || t.tipo || 'receita').toLowerCase();
        if (tipo === 'receita') PiscinaReceitas += v;
        else PiscinaDespesas += v;
    });

    if (listaFiltrada.length === 0) {
        if (tabelaBody) tabelaBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: #888; padding: 15px;">Nenhuma transação correspondente encontrada.</td></tr>`;
        if (tabelaResumoDashboard) tabelaResumoDashboard.innerHTML = `<tr><td colspan="2" style="text-align:center; color: #888; padding: 15px;">Nenhuma movimentação.</td></tr>`;
        atualizarResumo(PiscinaReceitas, PiscinaDespesas);
        return;
    }

    listaFiltrada.forEach(t => {
        const valorNum = Number(t.valor);
        const valorFormatated = formatarMoeda(valorNum);
        
        const tipoBruto = t.tipo_transacao || t.tipo || 'receita';
        const tipo = String(tipoBruto).toLowerCase();
        const eReceita = tipo === 'receita';

        const idAtual = t.id_transacao || t.id;

        if (tabelaBody) {
            const linha = document.createElement('tr');
            linha.innerHTML = `
                <td style="color: white; padding: 10px;">${t.descricao || 'Transação'}</td>
                <td style="color: ${eReceita ? '#2ecc71' : '#e74c3c'}; font-weight: bold; padding: 10px;">${eReceita ? '+' : '-'} ${valorFormatated}</td>
                <td style="color: white; padding: 10px;">${t.categoria_gasto || 'Geral'}</td>
                <td style="padding: 10px;">
                    <button style="background: none; border: none; cursor: pointer;" onclick="solicitarExclusao(${idAtual}, 'transacao')">🗑️</button>
                </td>
            `;
            tabelaBody.appendChild(linha);
        }

        if (tabelaResumoDashboard) {
            const linhaResumo = document.createElement('tr');
            linhaResumo.innerHTML = `
                <td style="color: white; padding: 10px;">${t.descricao || 'Transação'}</td>
                <td style="color: ${eReceita ? '#2ecc71' : '#e74c3c'}; font-weight: bold; padding: 10px;">${eReceita ? '+' : '-'} ${valorFormatated}</td>
            `;
            tabelaResumoDashboard.appendChild(linhaResumo);
        }
    });

    atualizarResumo(PiscinaReceitas, PiscinaDespesas);
}

/* FILTRAR TRANSAÇÕES */
function filtrarTransacoes() {
    const filtroTipo = document.getElementById('filtroTipo').value;
    const filtroCategoria = document.getElementById('filtroCategoria').value;
    const filtroMin = document.getElementById('filtroMin').value;
    const filtroMax = document.getElementById('filtroMax').value;

    let filtradas = todasTransacoes.filter(t => {
        const tipo = String(t.tipo_transacao || t.tipo || 'receita').toLowerCase();
        const categoria = t.categoria_gasto || 'Geral';
        const valor = Number(t.valor);

        const bateTipo = !filtroTipo || tipo === filtroTipo.toLowerCase();
        const bateCategoria = !filtroCategoria || categoria === filtroCategoria;
        const bateMin = !filtroMin || valor >= Number(filtroMin);
        const bateMax = !filtroMax || valor <= Number(filtroMax);

        return bateTipo && bateCategoria && bateMin && bateMax;
    });

    renderizarTabelaTransacoes(filtradas);
}

function atualizarResumo(receitas, despesas) {
    const saldo = receitas - despesas;
    
    const divSaldo = document.getElementById('saldo');
    const divReceitas = document.getElementById('receitas');
    const divDespesas = document.getElementById('despesas');

    if (divSaldo) divSaldo.innerText = formatarMoeda(saldo);
    if (divReceitas) divReceitas.innerText = formatarMoeda(receitas);
    if (divDespesas) divDespesas.innerText = formatarMoeda(despesas);

    const rT = document.getElementById('receitasTransacoes');
    const dT = document.getElementById('despesasTransacoes');
    if (rT) rT.innerText = formatarMoeda(receitas);
    if (dT) dT.innerText = formatarMoeda(despesas);

    renderizarGrafico(receitas, despesas);
}

/* GRÁFICO DE DONUT COM RECEITA E DESPESA NO CENTRO */
function renderizarGrafico(receitas, despesas) {
    const ctx = document.getElementById('graficoFinanceiro');
    if (!ctx) return;

    if (meuGrafico) {
        meuGrafico.destroy();
    }

    // Plugin customizado para desenhar Receitas e Despesas no centro
    const textoCentralDonut = {
        id: 'textoCentralDonut',
        beforeDraw(chart) {
            const { width, height, ctx } = chart;
            ctx.save();

            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            // --- RECEITA (Linha de Cima) ---
            ctx.font = "bold 13px Arial";
            ctx.fillStyle = "#00e676"; // Verde
            ctx.fillText("Receita: " + formatarMoeda(receitas), width / 2, height / 2 - 12);

            // --- DESPESA (Linha de Baixo) ---
            ctx.font = "bold 13px Arial";
            ctx.fillStyle = "#ff5252"; // Vermelho
            ctx.fillText("Despesa: " + formatarMoeda(despesas), width / 2, height / 2 + 12);

            ctx.restore();
        }
    };

    meuGrafico = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Receitas', 'Despesas'],
            datasets: [{
                data: [receitas, despesas],
                backgroundColor: ['#00e676', '#ff5252'],
                borderWidth: 0,
                cutout: '75%' // Mantém o espaço perfeito no meio do donut
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#ffffff' }
                }
            }
        },
        plugins: [textoCentralDonut]
    });
}

/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */
function solicitarExclusao(id, tipo) {
    itemParaExcluirId = id;
    itemParaExcluirTipo = tipo;

    const titulo = document.getElementById('tituloModalConfirm');
    const texto = document.getElementById('textoModalConfirm');

    if (tipo === 'transacao') {
        titulo.innerText = "Excluir Transação?";
        texto.innerText = "Deseja realmente excluir esta transação do histórico?";
    } else if (tipo === 'meta') {
        titulo.innerText = "Excluir Meta?";
        texto.innerText = "Tem certeza que deseja excluir esta meta financeira?";
    }

    document.getElementById('modalConfirm').style.display = 'flex';
}

function abrirConfirmExclusaoConta() {
    itemParaExcluirId = usuarioLogado ? usuarioLogado.id : null;
    itemParaExcluirTipo = 'conta';
    
    document.getElementById('tituloModalConfirm').innerText = "Tem certeza?";
    document.getElementById('textoModalConfirm').innerText = "Essa ação não pode ser desfeita e deletará seu perfil permanentemente.";
    document.getElementById('modalConfirm').style.display = 'flex';
}

function fecharModalConfirm() {
    itemParaExcluirId = null;
    itemParaExcluirTipo = null;
    document.getElementById('modalConfirm').style.display = 'none';
}

async function executarExclusaoConfirmada() {
    if (itemParaExcluirTipo === 'conta') {
        await excluirContaConfirmada();
    } else if (itemParaExcluirTipo === 'transacao') {
        await deletarTransacaoConfirmada(itemParaExcluirId);
    } else if (itemParaExcluirTipo === 'meta') {
        await excluirMetaConfirmada(itemParaExcluirId);
    }
}

async function deletarTransacaoConfirmada(id) {
    try {
        const resposta = await fetch(`http://localhost:3000/transacoes/${id}`, {
            method: 'DELETE'
        });
        if (resposta.ok) {
            fecharModalConfirm();
            mostrarPopup('Transação excluída!');
            await listarTransacoes();
        } else {
            mostrarPopup('Erro ao excluir transação no servidor.');
        }
    } catch (error) {
        console.error("Erro ao deletar transação:", error);
        mostrarPopup('Erro ao excluir transação.');
    }
}

async function excluirMetaConfirmada(id) {
    try {
        const resposta = await fetch(`http://localhost:3000/metas/${id}`, { method: 'DELETE' });
        if (resposta.ok) {
            fecharModalConfirm();
            mostrarPopup('Meta excluída!');
            await listarMetas();
        } else {
            mostrarPopup('Erro ao excluir meta no servidor.');
        }
    } catch (error) {
        console.error("Erro ao deletar meta:", error);
        mostrarPopup('Erro ao excluir meta.');
    }
}

async function excluirContaConfirmada() {
    usuarioLogado = obterUsuarioAtivo();
    if (!usuarioLogado) return;

    try {
        const resposta = await fetch(`http://localhost:3000/usuarios/${usuarioLogado.id}`, {
            method: 'DELETE'
        });
        const dados = await resposta.json();

        if (dados.sucesso) {
            fecharModalConfirm();
            localStorage.removeItem('usuario');
            window.location.href = 'login.html';
        } else {
            mostrarPopup('Não foi possível excluir a conta.');
        }
    } catch (e) {
        console.error(e);
        mostrarPopup('Erro interno ao tentar deletar conta.');
    }
}

/* GERAR RELATÓRIO */
function gerarRelatorio() {
    usuarioLogado = obterUsuarioAtivo();
    if (!usuarioLogado) {
        mostrarPopup("Faça login para gerar o relatório.");
        return;
    }
    window.open(`http://localhost:3000/transacoes/relatorio?usuario_id=${usuarioLogado.id}`, '_blank');
}

/* PERFIL */
function carregarPerfil() {
    usuarioLogado = obterUsuarioAtivo();
    if (!usuarioLogado) return;

    const nomePerfil = document.getElementById('nomePerfil');
    const perfilNome = document.getElementById('perfilNome');
    const perfilEmail = document.getElementById('perfilEmail');

    if (nomePerfil) nomePerfil.innerHTML = `👤 ${usuarioLogado.nome}`;
    if (perfilNome) perfilNome.innerText = usuarioLogado.nome;
    if (perfilEmail) perfilEmail.innerText = usuarioLogado.email;
}

function abrirModalPerfil() {
    usuarioLogado = obterUsuarioAtivo();
    if (!usuarioLogado) return;

    document.getElementById('editarNome').value = usuarioLogado.nome;
    document.getElementById('editarEmail').value = usuarioLogado.email;
    document.getElementById('editarSenha').value = '';
    
    document.getElementById('modalEditar').style.display = 'flex';
}

function fecharModal() {
    document.getElementById('modalEditar').style.display = 'none';
}

/* ATUALIZAÇÃO DE PERFIL */
async function salvarPerfil() {
    usuarioLogado = obterUsuarioAtivo();
    if (!usuarioLogado) return;

    const nome = document.getElementById('editarNome').value;
    const email = document.getElementById('editarEmail').value;
    const senhaNova = document.getElementById('editarSenha').value;

    const senha = senhaNova ? senhaNova : usuarioLogado.senha;

    try {
        const resposta = await fetch(`http://localhost:3000/usuarios/${usuarioLogado.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha })
        });

        const dados = await resposta.json();

        if (resposta.ok && dados.sucesso) {
            usuarioLogado.nome = nome;
            usuarioLogado.email = email;
            usuarioLogado.senha = senha;
            localStorage.setItem('usuario', JSON.stringify(usuarioLogado));
            
            mostrarPopup('Perfil atualizado com sucesso!');
            fecharModal();
            carregarPerfil();
        } else {
            mostrarPopup(dados.mensagem || 'Erro ao atualizar dados no servidor.');
        }
    } catch (e) {
        console.error("Erro no fetch de perfil:", e);
        mostrarPopup('Falha na comunicação com o servidor.');
    }
}

/* NAVEGAÇÃO */
function abrirPerfil() {
    document.getElementById('dashboardArea').style.display = 'none';
    document.getElementById('perfilArea').style.display = 'block';
    document.getElementById('transacoesArea').style.display = 'none';
    document.getElementById('metasArea').style.display = 'none';
    carregarPerfil();
}

function abrirDashboard() {
    document.getElementById('dashboardArea').style.display = 'block';
    document.getElementById('perfilArea').style.display = 'none';
    document.getElementById('transacoesArea').style.display = 'none';
    document.getElementById('metasArea').style.display = 'none';
    listarTransacoes();
}

function abrirTransacoes() {
    document.getElementById('dashboardArea').style.display = 'none';
    document.getElementById('perfilArea').style.display = 'none';
    document.getElementById('transacoesArea').style.display = 'block';
    document.getElementById('metasArea').style.display = 'none';
    listarTransacoes();
}

function logout() {
    localStorage.removeItem('usuario');
    window.location.href = 'login.html';
}

/* POPUP AVISO RÁPIDO */
function mostrarPopup(mensagem) {
    const popup = document.getElementById('popup');
    if(!popup) return;
    
    popup.innerText = mensagem; 
    
    popup.classList.add('mostrar');
    setTimeout(() => {
        popup.classList.remove('mostrar');
    }, 3000);
}

/* INICIALIZAÇÃO E PROTEÇÃO DE ROTAS */
document.addEventListener('DOMContentLoaded', () => {
    usuarioLogado = obterUsuarioAtivo();
    const linkAtual = window.location.pathname;

    if (usuarioLogado) {
        if (linkAtual.includes('login.html') || linkAtual.includes('index.html')) {
            window.location.href = 'dashboard.html';
        } else {
            carregarPerfil();
            listarTransacoes();
        }
    } else {
        if (!linkAtual.includes('login.html') && !linkAtual.includes('index.html')) {
            window.location.href = 'login.html';
        }
    }
});

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
    document.querySelector('#modalMeta h2').innerText = "Nova Meta";
    metaEditando = null;
    document.getElementById('nomeMeta').value = '';
    document.getElementById('valorMeta').value = '';
    document.getElementById('prazoMeta').value = '';
}

/* SALVAR META CORRIGIDO */
async function salvarMeta() {
    usuarioLogado = obterUsuarioAtivo();
    if (!usuarioLogado) {
        mostrarPopup("Faça login para salvar suas metas.");
        return;
    }

    const nome = document.getElementById('nomeMeta').value;
    const valor_meta_input = document.getElementById('valorMeta').value;
    const data_fim = document.getElementById('prazoMeta').value;

    if (nome.trim() === '' || valor_meta_input.trim() === '' || data_fim.trim() === '') {
        mostrarPopup('Preencha todos os campos!');
        return;
    }

    const valor_meta = Number(valor_meta_input.replace("R$", "").replace(/\./g, '').replace(',', '.').trim());
    if (isNaN(valor_meta) || valor_meta <= 0) {
        mostrarPopup('O valor da meta deve ser maior que zero!');
        return;
    }

    try {
        let resposta;
        if (metaEditando) {
            resposta = await fetch(`http://localhost:3000/metas/${metaEditando}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, valor_meta, data_fim })
            });
        } else {
            resposta = await fetch('http://localhost:3000/metas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, valor_meta, data_fim, usuario_id: usuarioLogado.id })
            });
        }

        if (resposta.ok) {
            mostrarPopup(metaEditando ? 'Meta atualizada!' : 'Meta criada!');
            metaEditando = null;
            fecharModalMeta();
            await listarMetas();
        } else {
            const erroTxt = await resposta.text();
            mostrarPopup('Erro no servidor: ' + erroTxt);
        }
    } catch (error) {
        mostrarPopup("Erro de comunicação com o servidor.");
        console.error(error);
    }
}

/* LISTAR METAS CORRIGIDO */
async function listarMetas() {
    usuarioLogado = obterUsuarioAtivo();
    if (!usuarioLogado) return;

    try {
        const resposta = await fetch(`http://localhost:3000/metas?usuario_id=${usuarioLogado.id}`);
        if (!resposta.ok) {
            console.error("Erro ao buscar metas no servidor");
            return;
        }

        const metas = await resposta.json();
        todasMetas = metas; 

        const lista = document.getElementById('listaMetas');
        if (!lista) return;
        lista.innerHTML = '';

        if (!Array.isArray(metas) || metas.length === 0) {
            lista.innerHTML = '<p style="color: #888; grid-column: 1/-1;">Nenhuma meta cadastrada ainda.</p>';
            return;
        }

        metas.forEach(meta => {
            const idMeta = meta.id || meta.id_planejamento || meta.id_meta; 
            const dataObjeto = new Date(meta.data_fim || meta.prazo);
            const dataFormatada = dataObjeto.toLocaleDateString('pt-BR', { timeZone: 'UTC' });

            lista.innerHTML += `
            <div class="card-meta">
                <h2>${meta.nome}</h2>
                <p>${formatarMoeda(meta.valor_meta || meta.valor_alvo)}</p>
                <small>Prazo: ${dataFormatada}</small>
                <div class="botoes-meta">
                    <button class="botao-editar-meta" onclick="editarMeta(${idMeta})">Editar</button>
                    <button class="botao-excluir-meta" onclick="solicitarExclusao(${idMeta}, 'meta')">Excluir</button>
                </div>
            </div>`;
        });
    } catch (e) {
        console.error("Erro ao carregar lista de metas:", e);
    }
}

function editarMeta(id) {
    const meta = todasMetas.find(m => (m.id || m.id_planejamento || m.id_meta) === id);
    if (!meta) return;

    metaEditando = id;
    document.querySelector('#modalMeta h2').innerText = "Editar Meta";
    document.getElementById('nomeMeta').value = meta.nome;
    
    const valorPronto = formatarMoeda(meta.valor_meta || meta.valor_alvo);
    document.getElementById('valorMeta').value = valorPronto;

    const dataFimBruta = meta.data_fim || meta.prazo;
    if(dataFimBruta) {
        document.getElementById('prazoMeta').value = dataFimBruta.split('T')[0];
    }
    
    abrirModalMeta();
}

function alternarVisibilidadeSenha() {
    const campoSenha = document.getElementById('senha');
    const iconeOlho = document.getElementById('iconeOlho');

    if (campoSenha.type === 'password') {
        campoSenha.type = 'text';
        iconeOlho.innerHTML = `
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        `;
    } else {
        campoSenha.type = 'password';
        iconeOlho.innerHTML = `
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
        `;
    }
}

// Seleciona todos os itens da sidebar
const itensSidebar = document.querySelectorAll('.sidebar li');

itensSidebar.forEach(item => {
    item.addEventListener('click', () => {
        itensSidebar.forEach(i => i.classList.remove('ativo'));
        item.classList.add('ativo');
    });
});
