let meuGrafico = null; // Guarda a instância do gráfico do Chart.js
let todasTransacoes = [];
let todasMetas = []; // Armazena as metas corretamente
let usuarioLogado = null;

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
            // Salva os dados do usuário retornado no localStorage
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
            listarTransacoes();
        } else {
            const erroMsg = await response.text();
            mostrarPopup(erroMsg);
            console.error(erroMsg);
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
            const valorFormatado = formatarMoeda(valorNum);
            
            const tipoBruto = t.tipo_transacao || t.tipo || 'receita';
            const tipo = String(tipoBruto).toLowerCase();
            const eReceita = tipo === 'receita';

            if (eReceita) {
                receitas += valorNum;
            } else {
                despesas += valorNum;
            }

            const idAtual = t.id_transacao || t.id;

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

/* GRÁFICO */
function renderizarGrafico(receitas, despesas) {
    const ctx = document.getElementById('graficoFinanceiro');
    if (!ctx) return;

    if (meuGrafico) {
        meuGrafico.destroy();
    }

    meuGrafico = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Receitas', 'Despesas'],
            datasets: [{
                data: [receitas, despesas],
                backgroundColor: ['#00e676', '#ff5252'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            }
        }
    });
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
    usuarioLogado = obterUsuarioAtivo();
    if (!usuarioLogado) return;

    const nomePerfil = document.getElementById('nomePerfil');
    const perfilNome = document.getElementById('perfilNome');
    const perfilEmail = document.getElementById('perfilEmail');

    if (nomePerfil) nomePerfil.innerHTML = `👤 ${usuarioLogado.nome}`;
    if (perfilNome) perfilNome.innerText = usuarioLogado.nome;
    if (perfilEmail) perfilEmail.innerText = usuarioLogado.email;
}

/* NAVEGAÇÃO */
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

/* INICIALIZAÇÃO */
document.addEventListener('DOMContentLoaded', () => {
    usuarioLogado = obterUsuarioAtivo();
    if (usuarioLogado) {
        carregarPerfil();
        listarTransacoes();
    } else {
        if (!window.location.pathname.includes('login.html')) {
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

let metaEditando = null;

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
                body: JSON.stringify({ nome, valor_meta, data_fim, usuario_id: usuarioLogado.id })
            });
            mostrarPopup('Meta criada!');
        }
        fecharModalMeta();
        listarMetas();
    } catch (error) {
        mostrarPopup("Erro ao salvar a meta.");
        console.error(error);
    }
}

async function listarMetas() {
    usuarioLogado = obterUsuarioAtivo();
    if (!usuarioLogado) return;
    
    try {
        const resposta = await fetch(`http://localhost:3000/metas?usuario_id=${usuarioLogado.id}`);
        const metas = await resposta.json();
        todasMetas = metas; 

        const lista = document.getElementById('listaMetas');
        if (!lista) return;
        lista.innerHTML = '';

        if (metas.length === 0) {
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
                    <button class="botao-excluir-meta" onclick="excluirMeta(${idMeta})">Excluir</button>
                </div>
            </div>`;
        });
    } catch (e) {
        console.error("Erro ao carregar lista de metas:", e);
    }
}

async function excluirMeta(id) {
    if(!confirm("Tem certeza que deseja excluir esta meta?")) return;
    try {
        await fetch(`http://localhost:3000/metas/${id}`, { method: 'DELETE' });
        mostrarPopup('Meta excluída!');
        listarMetas();
    } catch (error) {
        console.error("Erro ao deletar meta:", error);
    }
}

function editarMeta(id) {
    const metaSelecionada = todasMetas.find(m => (m.id === id || m.id_planejamento === id || m.id_meta === id));
    
    if (metaSelecionada) {
        metaEditando = id;
        document.getElementById('nomeMeta').value = metaSelecionada.nome;
        
        const valorReal = metaSelecionada.valor_meta || metaSelecionada.valor_alvo;
        const valorFormatado = Number(valorReal).toFixed(2).replace('.', ',');
        document.getElementById('valorMeta').value = "R$ " + valorFormatado;
        
        const dataCrua = metaSelecionada.data_fim || metaSelecionada.prazo;
        const dataFormatada = dataCrua.split('T')[0];
        document.getElementById('prazoMeta').value = dataFormatada;
        
        document.querySelector('#modalMeta h2').innerText = "Editar Meta";
        abrirModalMeta();
    }
}
