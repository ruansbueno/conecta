# Phase 1 Data Model: Autenticação, Perfis, Turmas e Avisos (Entregas 1 e 2)

Entidades derivadas de `spec.md` (seções 2, 3 e 5) e das decisões em `research.md`.

**Entrega**: as tabelas `usuario`, `turma`, `vinculo_turma`, `solicitacao_inscricao`, `aviso` e
`aviso_destino` são criadas na **E1**. `aviso_versao` e `aviso_evento` são criadas na **E2**
(migração própria). A E3 acrescenta as tabelas da agenda e dos horários (seção final), já com os
nomes físicos da seção [Nomes físicos](#nomes-físicos).

Convenções: chaves UUID; timestamps com fuso (UTC); enums como `VARCHAR` + `CHECK`; nomes em
`snake_case` sem acento. As seções abaixo usam os nomes do domínio, que são também os atributos
dos models e os campos do JSON; os nomes **no banco** seguem a nomenclatura da seção
[Nomes físicos](#nomes-físicos).

## Usuario (E1)

Pessoa identificada no sistema; criada no primeiro login bem-sucedido, ou antecipadamente por seed
(E1) / administração (E2).

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID (PK) | Gerado pelo CONECTA |
| username | string, único | Vem do provedor de credenciais |
| nome | string | Sincronizado do provedor a cada login |
| perfil | enum (`administrador`, `coordenacao`, `docente`, `aluno`) | Padrão `aluno`; **nunca** sobrescrito pelo login; só o administrador altera (E2) ou seed |
| ativo | boolean, padrão `true` | `false` bloqueia login e uso de tokens existentes |
| criado_em | timestamp | Primeiro login |
| atualizado_em | timestamp | Última alteração de nome, perfil ou ativo |
| ultimo_login_em | timestamp, nulo | |

**Regras**: nenhuma senha é armazenada; `username` único; o upsert do login atualiza apenas `nome`
e `ultimo_login_em`.

## Turma (E1)

Turma acadêmica real do curso.

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID (PK) | |
| codigo | string, único | Ex.: `TADS-3A-2026-2` |
| nome | string | Nome de exibição |
| semestre_curso | smallint | 1 a 12 (`CHECK`) — usado pelo destino `semestre` |
| periodo_letivo | string | Ex.: `2026/2` (informativo) |
| inscricoes_abertas | boolean, padrão `false` | Controla a listagem para solicitação |
| ativa | boolean, padrão `true` | `false`: sai das listagens e suspende a entrega de avisos por turma/semestre |
| criado_em / atualizado_em | timestamp | |

## VinculoTurma (E1)

Liga um usuário a uma turma. Substitui a antiga `Inscricao`.

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID (PK) | |
| turma_id | UUID (FK → Turma) | |
| usuario_id | UUID (FK → Usuario) | |
| papel | enum (`aluno`, `docente`) | Deve coincidir com o perfil do usuário (validado no serviço) |
| origem | enum (`solicitacao`, `gestao`, `seed`) | Como o vínculo nasceu |
| criado_em | timestamp | |
| criado_por | UUID (FK → Usuario), nulo | Quem criou (decisor/gestor); nulo em seed |

**Regras**:
- Único (`turma_id`, `usuario_id`).
- Só usuários de perfil `aluno` (papel `aluno`) ou `docente` (papel `docente`); `administrador` e
  `coordenacao` não têm vínculos.
- Removido por gestão (E2): a linha é apagada (a trilha fica em log de aplicação; vínculos não
  possuem auditoria própria nesta fase).
- Mudar o perfil de um usuário que possui vínculos incompatíveis é rejeitado (E2) até removê-los.

## SolicitacaoInscricao (E1)

Pedido do aluno para entrar em uma turma.

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID (PK) | |
| turma_id | UUID (FK → Turma) | |
| aluno_id | UUID (FK → Usuario) | Perfil `aluno` |
| status | enum (`pendente`, `aprovada`, `recusada`, `cancelada`) | Padrão `pendente` |
| solicitada_em | timestamp | |
| decidida_em | timestamp, nulo | Preenchido ao aprovar/recusar/cancelar |
| decidida_por | UUID (FK → Usuario), nulo | Decisor; no cancelamento, o próprio aluno |
| motivo_recusa | string(300), nulo | Opcional, só em `recusada` |

**Regras**:
- Índice único parcial (`turma_id`, `aluno_id`) onde `status = 'pendente'` — impede duas pendentes.
- Não é criada se já existe `VinculoTurma` (turma, aluno).
- Só pode ser criada se `Turma.ativa` e `Turma.inscricoes_abertas`.
- Transições permitidas: `pendente → aprovada | recusada | cancelada`. Estados finais não mudam.
- `aprovada` cria o `VinculoTurma` (origem `solicitacao`) na **mesma transação**.

## Aviso (E1)

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID (PK) | |
| titulo | string(3..150) | |
| conteudo | text (1..5000) | |
| autor_id | UUID (FK → Usuario) | Quem publicou |
| situacao | enum (`ativo`, `arquivado`, `excluido`) | Padrão `ativo` |
| publicar_em | timestamp, nulo | Nulo = publicado na criação |
| versao_atual | integer, padrão 1 | Incrementa a cada edição (E2) |
| criado_em | timestamp | |
| editado_em | timestamp, nulo | Preenchido na primeira edição e atualizado nas seguintes |
| arquivado_em / excluido_em | timestamp, nulo | |

**Derivado**: `publicado_em = COALESCE(publicar_em, criado_em)` (exposto na API).

## AvisoDestino (E1)

Um aviso tem de 1 a 20 destinos; é visível a quem for alcançado por **qualquer** um.

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID (PK) | |
| aviso_id | UUID (FK → Aviso) | |
| tipo | enum (`todos`, `turma`, `semestre`, `docentes`) | |
| turma_id | UUID (FK → Turma), nulo | Obrigatório se `tipo = turma`; nulo nos demais |
| semestre | smallint, nulo | 1..12; obrigatório se `tipo = semestre`; nulo nos demais |

**Regras** (`CHECK`): consistência tipo/referência acima. Unicidade de (`aviso_id`, `tipo`,
`turma_id`, `semestre`) tratando nulos como iguais (sem destino repetido). Turma referenciada
deve estar ativa no momento da criação/edição.

### Regra de visibilidade (consulta do app)

Um aviso `A` é visível ao usuário `U` quando:

1. `U.ativo` **e** `A.situacao = 'ativo'` (ou `'arquivado'` na lista de arquivados);
2. `COALESCE(A.publicar_em, A.criado_em) <= agora`;
3. existe destino `D` de `A` tal que:
   - `D.tipo = 'todos'`; **ou**
   - `D.tipo = 'turma'` **e** `U` tem `VinculoTurma` em `D.turma_id` **e** a turma está ativa; **ou**
   - `D.tipo = 'semestre'` **e** `U` tem `VinculoTurma` em alguma turma ativa com `semestre_curso = D.semestre`; **ou**
   - `D.tipo = 'docentes'` **e** `U.perfil = 'docente'`.

O resultado não contém duplicatas (um aviso aparece uma vez mesmo alcançando o usuário por vários destinos).

## AvisoVersao (E2)

Cópia completa de cada versão do aviso (a versão 1 nasce na criação).

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID (PK) | |
| aviso_id | UUID (FK → Aviso) | |
| versao | integer | Único com `aviso_id`; 1, 2, 3… |
| titulo, conteudo | string / text | Conteúdo naquela versão |
| destinos | JSONB | Lista `[{tipo, turma_id, semestre}]` naquela versão |
| publicar_em | timestamp, nulo | Agendamento naquela versão |
| criada_por | UUID (FK → Usuario) | |
| criada_em | timestamp | |

Imutável: sem `UPDATE`/`DELETE` pela aplicação.

## AvisoEvento (E2)

Log de auditoria imutável.

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID (PK) | |
| aviso_id | UUID (FK → Aviso) | |
| tipo | enum (`criado`, `editado`, `arquivado`, `desarquivado`, `excluido`) | |
| usuario_id | UUID (FK → Usuario) | Quem executou |
| ocorrido_em | timestamp | |
| versao | integer, nulo | Versão resultante (em `criado`/`editado`) |
| alteracoes | JSONB, nulo | Em `editado`: `{campo: {"de": ..., "para": ...}}` para `titulo`, `conteudo`, `destinos`, `publicar_em` |

Imutável: sem `UPDATE`/`DELETE` pela aplicação. Todo evento é gravado **na mesma transação** da operação que o originou.

## Nomes físicos

Desde a migração `5b7d2e9a4c13` (31/10/2026), o banco segue a nomenclatura do diagrama ER do
projeto: toda tabela começa com `tb_`, e toda coluna tem um prefixo que diz o que ela guarda.

| Prefixo | Uso | Exemplos |
|---|---|---|
| `id_` | chave primária e estrangeira | `id_usuario`, `id_turma`, `id_usuario_decisor` |
| `nm_` | nome ou título curto | `nm_usuario`, `nm_turma`, `nm_aviso` |
| `cod_` | código ou identificador textual | `cod_usuario` (login do Moodle), `cod_turma`, `cod_periodo_letivo` |
| `txt_` | texto longo ou estruturado | `txt_aviso`, `txt_motivo_recusa`, `txt_destinos`, `txt_alteracoes` |
| `fl_` | sim/não | `fl_ativo`, `fl_ativa`, `fl_inscricoes_abertas` |
| `dt_` | data e hora | `dt_cadastro`, `dt_publicacao`, `dt_ultimo_acesso` |
| `hr_` | hora sem data | (horários da E3) |
| `nr_` | número | `nr_semestre`, `nr_versao` |
| `st_` | situação de um ciclo de vida | `st_aviso`, `st_solicitacao` |
| `tp_` | tipo ou categoria | `tp_perfil`, `tp_papel`, `tp_destino`, `tp_operacao` |

Decisões: a data de criação é `dt_cadastro` em todas as tabelas (a de atualização, `dt_atualizacao`);
o vínculo usa o nome do ER, `tb_usuario_turma`; o log do aviso passa a ser `tb_aviso_historico`,
o que deixa "evento" livre para a agenda. A **estrutura** continua a desta página (destino com
tipo, vínculo com papel e origem); o ER foi seguido só nos nomes.

Restrições e índices começam pelo tipo e pela tabela, como manda a `NAMING_CONVENTION` de
`src/db/base.py` (`pk_tb_usuario`, `fk_tb_aviso_id_usuario_tb_usuario`). Os sufixos dados à mão
mantêm os termos do domínio (`ck_tb_turma_semestre_curso_valido`,
`uq_tb_usuario_turma_turma_usuario`): quem precisar do nome de uma restrição consulta o model, não
a convenção. `tests/integration/test_nomenclatura_banco.py` confere no banco migrado o padrão das
tabelas e colunas, os nomes de restrições e triggers e que o autogenerate não vê diferença entre
models e migrações.

**Usuario** → `tb_usuario`

| Atributo | Coluna |
|---|---|
| `id` | `id_usuario` |
| `username` | `cod_usuario` |
| `nome` | `nm_usuario` |
| `perfil` | `tp_perfil` |
| `ativo` | `fl_ativo` |
| `criado_em` | `dt_cadastro` |
| `atualizado_em` | `dt_atualizacao` |
| `ultimo_login_em` | `dt_ultimo_acesso` |

**Turma** → `tb_turma`

| Atributo | Coluna |
|---|---|
| `id` | `id_turma` |
| `codigo` | `cod_turma` |
| `nome` | `nm_turma` |
| `semestre_curso` | `nr_semestre` |
| `periodo_letivo` | `cod_periodo_letivo` |
| `inscricoes_abertas` | `fl_inscricoes_abertas` |
| `ativa` | `fl_ativa` |
| `criado_em` | `dt_cadastro` |
| `atualizado_em` | `dt_atualizacao` |

**VinculoTurma** → `tb_usuario_turma`

| Atributo | Coluna |
|---|---|
| `id` | `id_usuario_turma` |
| `turma_id` | `id_turma` |
| `usuario_id` | `id_usuario` |
| `papel` | `tp_papel` |
| `origem` | `tp_origem` |
| `criado_em` | `dt_vinculo` |
| `criado_por` | `id_usuario_criador` |

**SolicitacaoInscricao** → `tb_solicitacao_inscricao`

| Atributo | Coluna |
|---|---|
| `id` | `id_solicitacao` |
| `turma_id` | `id_turma` |
| `aluno_id` | `id_usuario` |
| `status` | `st_solicitacao` |
| `solicitada_em` | `dt_solicitacao` |
| `decidida_em` | `dt_decisao` |
| `decidida_por` | `id_usuario_decisor` |
| `motivo_recusa` | `txt_motivo_recusa` |

**Aviso** → `tb_aviso`

| Atributo | Coluna |
|---|---|
| `id` | `id_aviso` |
| `titulo` | `nm_aviso` |
| `conteudo` | `txt_aviso` |
| `autor_id` | `id_usuario` |
| `situacao` | `st_aviso` |
| `publicar_em` | `dt_publicacao` |
| `versao_atual` | `nr_versao` |
| `criado_em` | `dt_cadastro` |
| `editado_em` | `dt_edicao` |
| `arquivado_em` | `dt_arquivamento` |
| `excluido_em` | `dt_exclusao` |

**AvisoDestino** → `tb_aviso_destino`

| Atributo | Coluna |
|---|---|
| `id` | `id_aviso_destino` |
| `aviso_id` | `id_aviso` |
| `tipo` | `tp_destino` |
| `turma_id` | `id_turma` |
| `semestre` | `nr_semestre` |

**AvisoVersao** → `tb_aviso_versao`

| Atributo | Coluna |
|---|---|
| `id` | `id_aviso_versao` |
| `aviso_id` | `id_aviso` |
| `versao` | `nr_versao` |
| `titulo` | `nm_aviso` |
| `conteudo` | `txt_aviso` |
| `destinos` | `txt_destinos` |
| `publicar_em` | `dt_publicacao` |
| `criada_por` | `id_usuario` |
| `criada_em` | `dt_versao` |

**AvisoEvento** → `tb_aviso_historico`

| Atributo | Coluna |
|---|---|
| `id` | `id_aviso_historico` |
| `aviso_id` | `id_aviso` |
| `tipo` | `tp_operacao` |
| `usuario_id` | `id_usuario` |
| `ocorrido_em` | `dt_operacao` |
| `versao` | `nr_versao` |
| `alteracoes` | `txt_alteracoes` |

## Diagrama de relacionamento (textual)

```text
Usuario 1 ──< VinculoTurma >── 1 Turma
Usuario 1 ──< SolicitacaoInscricao >── 1 Turma        (status: pendente → aprovada → cria VinculoTurma)

Usuario 1 ──< Aviso 1 ──< AvisoDestino >── (Turma | semestre | todos | docentes)
                 │
                 ├──< AvisoVersao   (E2)
                 └──< AvisoEvento   (E2)
```

## Entrega 3 — entidades previstas (visão geral)

- `evento` (título, descrição, tipo, início, fim, local, autor, situação) + `evento_destino`
  (mesma estrutura de `aviso_destino`; a lógica de visibilidade é reutilizada).
- `horario_turma` (turma, dia da semana, hora início/fim, disciplina, local, docente).
- Versões e eventos de auditoria seguem o mesmo padrão dos avisos.

## Fora do escopo desta fase

- Limite de vagas por turma.
- Registro de leitura de aviso (quem leu).
- Notificação push.
- Auditoria de vínculos e de alterações de perfil (apenas log de aplicação).
