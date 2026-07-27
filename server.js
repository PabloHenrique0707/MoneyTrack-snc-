const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

/* =====================
   USUÁRIOS
===================== */
app.get('/usuarios', (req, res) => {
    db.query('SELECT * FROM usuarios', (err, result) => {
        if (err) return res.status(500).send('Erro ao buscar usuários');
        res.json(result);
    });
});

app.post('/usuarios', (req, res) => {
    const { nome, email, senha } = req.body;
    
    db.query(
        'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
        [nome, email, senha],
        (err, result) => {
            if (err) return res.status(500).send('Erro ao cadastrar usuário');
            
            const novoUsuarioId = result.insertId;

            db.query(
                'INSERT INTO contas (nome_banco, saldo_atual, tipo_moeda, tipo_conta, usuario_id) VALUES (?, ?, ?, ?, ?)',
                ['Minha Carteira', 0.00, 'BRL', 'corrente', novoUsuarioId],
                (errConta) => {
                    if (errConta) console.error('Erro ao criar conta automática:', errConta);
                    res.send('Usuário cadastrado com sucesso e carteira inicial criada!');
                }
            );
        }
    );
});

app.put('/usuarios/:id', (req, res) => {
    const id = req.params.id;
    const { nome, email, senha, limite_gastos } = req.body;

    const sql = `
        UPDATE usuarios
        SET nome = ?, email = ?, senha = ?, limite_gastos = ?
        WHERE id = ?
    `;
    db.query(sql, [nome, email, senha, limite_gastos, id], (err) => {
        if (err) return res.status(500).send('Erro ao atualizar usuário');
        res.send('Usuário atualizado!');
    });
});

app.delete('/usuarios/:id', (req, res) => {
    const id = req.params.id;
    db.query('DELETE FROM usuarios WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).send('Erro ao excluir usuário');
        res.json({ sucesso: true, mensagem: 'Conta excluída com sucesso' });
    });
});

/* LOGIN */
app.post('/login', (req, res) => {
    const { email, senha } = req.body;
    db.query(
        'SELECT * FROM usuarios WHERE email = ? AND senha = ?',
        [email, senha],
        (err, result) => {
            if (err) return res.status(500).send('Erro ao processar login');
            if (result.length > 0) {
                res.json({ sucesso: true, mensagem: 'Login ok', usuario: result[0] });
            } else {
                res.json({ sucesso: false, mensagem: 'Credenciais inválidas' });
            }
        }
    );
});

/* =====================
   TRANSAÇÕES E RELATÓRIO
===================== */

// ROTA DINÂMICA DE RELATÓRIO FINANCEIRO (Abre e gera PDF impresso na nova aba)
app.get('/transacoes/relatorio', (req, res) => {
    const { usuario_id } = req.query;

    if (!usuario_id || usuario_id === 'undefined' || usuario_id === 'null') {
        return res.status(400).send('<h1>Erro: Usuário não identificado.</h1>');
    }

    const query = `
        SELECT t.valor, t.data_hora, t.descricao, t.tipo_transacao AS tipo, t.categoria_gasto 
        FROM transacao t
        INNER JOIN contas c ON t.conta_id = c.id_conta
        WHERE c.usuario_id = ?
        ORDER BY t.data_hora DESC
    `;

    db.query(query, [usuario_id], (err, results) => {
        if (err) return res.status(500).send('Erro ao compilar dados do relatório.');

        let html = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>Relatório Financeiro - MoneyTrack</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 30px; background-color: #ffffff; color: #333; }
                    .header { border-bottom: 2px solid #00c853; padding-bottom: 15px; margin-bottom: 20px; }
                    h1 { color: #0f172a; margin: 0; font-size: 22pt; }
                    p { color: #666; margin: 5px 0 0 0; font-size: 11pt; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; }
                    th { background-color: #0f172a; color: white; font-weight: bold; }
                    tr:nth-child(even) { background-color: #f8fafc; }
                    .receita { color: #00c853; font-weight: bold; }
                    .despesa { color: #ff5252; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>MoneyTrack — Extrato e Relatório</h1>
                    <p>Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Descrição</th>
                            <th>Categoria</th>
                            <th>Operação</th>
                            <th>Valor</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (results.length === 0) {
            html += `<tr><td colspan="5" style="text-align:center; color:#94a3b8;">Nenhuma movimentação financeira encontrada.</td></tr>`;
        } else {
            results.forEach(t => {
                const dataFormatada = new Date(t.data_hora).toLocaleDateString('pt-BR');
                const tipo = String(t.tipo).toLowerCase();
                const classeTipo = tipo === 'receita' ? 'receita' : 'despesa';
                const sinal = tipo === 'receita' ? '+' : '-';
                
                html += `
                    <tr>
                        <td>${dataFormatada}</td>
                        <td>${t.descricao || 'Sem descrição'}</td>
                        <td>${t.categoria_gasto || 'Geral'}</td>
                        <td class="${classeTipo}">${tipo.toUpperCase()}</td>
                        <td class="${classeTipo}">${sinal} R$ ${parseFloat(t.valor).toFixed(2)}</td>
                    </tr>
                `;
            });
        }

        html += `
                    </tbody>
                </table>
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;
        res.send(html);
    });
});

app.post('/transacoes', (req, res) => {
    const { descricao, valor, tipo, categoria_gasto, usuario_id } = req.body;

    if (!usuario_id || usuario_id === 'undefined' || usuario_id === 'null') {
        return res.status(400).send('Erro: Usuário não identificado no front-end.');
    }

    db.query('SELECT id_conta FROM contas WHERE usuario_id = ? LIMIT 1', [usuario_id], (err, contaResult) => {
        if (err) return res.status(500).send('Erro ao buscar conta: ' + err.message);

        const realizarInsercao = (contaId) => {
            const metodo_pagamento = 'Não Informado';
            const grau_essencialidade = 'importante'; 
            const fonte_renda = tipo === 'receita' ? 'Geral' : null;

            const query = `
                INSERT INTO transacao 
                (valor, descricao, metodo_pagamento, tipo_transacao, fonte_renda, categoria_gasto, grau_essencialidade, conta_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            db.query(
                query,
                [valor, descricao, metodo_pagamento, tipo, fonte_renda, categoria_gasto, grau_essencialidade, contaId],
                (errInsert) => {
                    if (errInsert) return res.status(500).send('Erro ao salvar transação: ' + errInsert.message);
                    res.send('Transação criada com sucesso!');
                }
            );
        };

        if (contaResult.length === 0) {
            db.query(
                'INSERT INTO contas (nome_banco, saldo_atual, tipo_moeda, tipo_conta, usuario_id) VALUES (?, ?, ?, ?, ?)',
                ['Minha Carteira', 0.00, 'BRL', 'corrente', usuario_id],
                (errConta, resultConta) => {
                    if (errConta) return res.status(500).send('Erro ao criar conta: ' + errConta.message);
                    realizarInsercao(resultConta.insertId);
                }
            );
        } else {
            realizarInsercao(contaResult[0].id_conta);
        }
    });
});

app.get('/transacoes', (req, res) => {
    const { usuario_id } = req.query;
    if (!usuario_id || usuario_id === 'undefined' || usuario_id === 'null') return res.json([]); 

    const query = `
        SELECT t.id_transacao, t.valor, t.data_hora, t.descricao, t.metodo_pagamento, 
               t.tipo_transacao AS tipo, t.fonte_renda, t.categoria_gasto, 
               t.grau_essencialidade, t.conta_id 
        FROM transacao t
        INNER JOIN contas c ON t.conta_id = c.id_conta
        WHERE c.usuario_id = ?
        ORDER BY t.data_hora DESC
    `;
    db.query(query, [usuario_id], (err, results) => {
        if (err) return res.json([]); 
        res.json(results);
    });
});

app.delete('/transacoes/:id', (req, res) => {
    db.query('DELETE FROM transacao WHERE id_transacao = ?', [req.params.id], (err) => {
        if (err) return res.status(500).send('Erro ao deletar transação');
        res.send('Transação deletada');
    });
});

app.put('/transacoes/:id', (req, res) => {
    const { id } = req.params;
    const { descricao, valor, tipo, categoria_gasto } = req.body;

    const query = `
        UPDATE transacao 
        SET descricao = ?, valor = ?, tipo_transacao = ?, categoria_gasto = ? 
        WHERE id_transacao = ?
    `;
    db.query(query, [descricao, valor, tipo, categoria_gasto, id], (err) => {
        if (err) return res.status(500).send('Erro ao atualizar transação');
        res.send('Transação atualizada com sucesso!');
    });
});

/* =====================
   METAS
===================== */
app.get('/metas', (req, res) => {
    db.query(
        'SELECT * FROM planejamento_financeiro WHERE usuario_id = ?',
        [req.query.usuario_id],
        (err, result) => {
            if (err) return res.status(500).send('Erro ao buscar metas');
            res.json(result);
        }
    );
});

app.post('/metas', (req, res) => {
    const { nome, valor_meta, data_fim, usuario_id } = req.body;
    db.query(
        `INSERT INTO planejamento_financeiro (nome, valor_meta, data_fim, usuario_id) VALUES (?, ?, ?, ?)`,
        [nome, valor_meta, data_fim, usuario_id],
        (err) => {
            if (err) return res.status(500).send('Erro ao criar meta: ' + err.message);
            res.send('Meta criada!');
        }
    );
});

app.put('/metas/:id', (req, res) => {
    const { nome, valor_meta, data_fim } = req.body;
    db.query(
        `UPDATE planejamento_financeiro SET nome=?, valor_meta=?, data_fim=? WHERE id=?`,
        [nome, valor_meta, data_fim, req.params.id],
        (err) => {
            if (err) return res.status(500).send('Erro ao atualizar meta');
            res.send('Meta atualizada!');
        }
    );
});

app.delete('/metas/:id', (req, res) => {
    db.query('DELETE FROM planejamento_financeiro WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).send('Erro ao deletar meta');
        res.send('Meta deletada');
    });
});

/* START SERVER */
app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
