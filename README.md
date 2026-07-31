1. IDENTIFICAÇÃO DO PROJETO
Nome do Sistema: MoneyTrack
Slogan / Breve Descrição: Gestão financeira pessoal simples, intuitiva e eficiente.
Autores / Equipe: Pablo Henrique Braz dos Santos
Curso / Disciplina: Desenvolvimento Web
Professor Orientador: Evandro Vasconcelos

2. VISÃO GERAL E CONCEITO (UX)
2.1. Problema
A falta de organização e controle sobre os gastos diários é uma dor comum entre jovens e adultos. Sem uma ferramenta centralizada e acessível, a navegação entre receitas, despesas e metas de economia torna-se confusa, resultando em descontrole financeiro.

2.2. Análise de Similares
Sistema Similar
Pontos Fortes
Pontos Fracos / O que o nosso melhora
Mobills
Bastante completo e com relatórios avançados.
Interface poluída na versão gratuita e excesso de anúncios/funções pagas. O MoneyTrack foca em uma experiência direta, sem distrações.
Organizze
Design limpo e fácil de usar.
Recursos essenciais como gráficos e metas limitados na versão paga. O MoneyTrack oferece controle visual de metas e gráficos de forma nativa e gratuita.



2.3. Persona e Cenário de Uso
Persona: Lucas, 24 anos, estudante e estagiário.
Cenário de Uso: Lucas precisa acompanhar suas despesas mensais (faculdade, lazer, alimentação) e poupar dinheiro para comprar um notebook novo. Ele acessa o MoneyTrack ao final do dia para lançar seus gastos e verificar se está perto de atingir sua meta.
2.4. Fluxo do Usuário (User Flow)

Plaintext
[ Tela de Login / Cadastro ]
             │
             ▼ (Autenticação Válida)
      ┌──────┴──────────────────────────────────┐
      │          Menu Lateral (Sidebar)         │
      ├──────────────┬──────────────┬───────────┤
      ▼              ▼              ▼           ▼
[ Dashboard ]  [ Transações ]   [ Metas ]   [ Perfil ]
      │              │              │           │
      └──────────────┴──────┬───────┴───────────┘
                            ▼
                        [ Logout ] ──► [ Tela de Login ]


3. ESPECIFICAÇÃO DE REQUISITOS
3.1. Requisitos Funcionais (RF)
[RF01] Autenticação de Usuário: O sistema deve permitir que o usuário faça login e cadastro seguro com e-mail e senha.
[RF02] Gestão de Saldo e Totais: O sistema deve calcular automaticamente o saldo atual, o total de receitas e o total de despesas.
[RF03] Lançamento de Transações: O sistema deve permitir cadastrar novas transações informando descrição, valor, tipo (receita/despesa) e categoria.
[RF04] Histórico e Filtragem: O sistema deve exibir e permitir filtrar o histórico de transações por tipo, categoria e faixa de valor.
[RF05] Gestão de Metas: O sistema deve permitir criar, editar e excluir metas financeiras com valor alvo e data limite.
[RF06] Visualização Gráfica: O sistema deve exibir um gráfico em rosca (Chart.js) comparando receitas e despesas.
[RF07] Gestão de Perfil: O sistema deve permitir visualizar/editar dados cadastrais do usuário e excluir a conta.
[RF08] Emissão de Relatório: O sistema deve disponibilizar funcionalidade para gerar relatórios financeiros.

3.2. Requisitos Não-Funcionais (RNF)
[RNF01] Responsividade: A interface deve adaptar-se perfeitamente a diferentes tamanhos de tela (desktop e mobile).
[RNF02] Padrões W3C: O código HTML5 e CSS3 deve seguir as especificações semânticas e passar sem erros nos validadores do W3C.
[RNF03] Persistência de Dados: Os dados devem ser armazenados de forma persistente em um banco de dados relacional MySQL.
[RNF04] Usabilidade: Layout moderno em Dark Mode com navegação fluida em aba ativa (SPA).

