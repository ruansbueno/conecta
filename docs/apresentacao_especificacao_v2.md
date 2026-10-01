# 1. Visão Geral do Projeto

O CONECTA é um sistema híbrido de comunicação e gestão acadêmica, composto por uma **plataforma web** de gerenciamento (administração, coordenação e docentes) e um **aplicativo mobile** (todos os usuários do curso). Ambos consomem a mesma **API REST** em Python/FastAPI, que centraliza autenticação, autorização e regras de negócio, com dados em **PostgreSQL**.

Esta é a **versão 2** da especificação. Ela incorpora o parecer do orientador sobre a versão 1, que pediu: (a) relacionar a primeira entrega aos objetivos específicos do TCC e planejar as entregas restantes; (b) definir vínculos com turmas, autoinscrição e perfis; (c) ampliar o modelo de avisos; (d) detalhar endpoints; (e) separar testes com usuários simulados da validação real; (f) relacionar testes aos requisitos e demonstrar o fluxo completo.

> Uma lista objetiva do que foi decidido em cada ponto do parecer está no documento complementar **"CONECTA — Decisões de Revisão da Especificação (v2)"**.

# 2. Escopo: Objetivos do TCC e Entregas

## 2.1 Objetivos específicos do TCC

| ID | Objetivo específico |
|---|---|
| O1 | Plataforma web de cadastro, edição, exclusão e gestão das informações acadêmicas |
| O2 | Aplicação mobile de consulta e recebimento por alunos, docentes e demais usuários |
| O3 | Autenticação com acesso conforme o perfil |
| O4 | Perfis: administrador, coordenação, docente e aluno |
| O5 | Agenda acadêmica (eventos, bancas, palestras, formaturas, reuniões e outras atividades) |
| O6 | Cadastro e consulta dos horários das turmas |
| O7 | Módulo de avisos e comunicados direcionados a grupos |
| O8 | Avisos para turmas, semestres, docentes ou todos os usuários |
| O9 | API REST entre web, mobile e servidor |
| O10 | JSON como formato de troca de dados |
| O11 | Backend com regras de negócio e acesso ao banco |
| O12 | Banco relacional com histórico e rastreabilidade |
| O13 | Estrutura modular e expansível |
| O14 | Testes funcionais e de integração com evidências |

## 2.2 Divisão em três entregas

| Entrega | Conteúdo | Objetivos | Detalhamento |
|---|---|---|---|
| **E1 — API + aplicativo** | Login (provedor simulado), perfis e permissões, perfil do usuário, turmas, solicitação de inscrição, consulta de avisos com público por N destinos. Dados de gestão entram por seed. | O2, O3, O4, O7, O8 (leitura), O9–O14 | Completo nesta especificação; **primeira a ser implementada** |
| **E2 — Plataforma web + fluxo completo** | Endpoints `/gestao/*`: usuários e perfis, turmas, vínculos, aprovação de solicitações, publicar/editar/arquivar/excluir avisos com versões e auditoria; plataforma web; teste ponta a ponta web → API → app. | O1, O4, O7, O8 (publicação), O12, O14 | Contrato de API completo nesta especificação; interface web em documento próprio |
| **E3 — Agenda e horários** | Eventos (palestras, bancas, reuniões, formaturas, provas, datas importantes, outros) com o mesmo mecanismo de destinos dos avisos; horários das turmas. | O5, O6 | Visão geral nesta especificação; detalhada antes da implementação |

**Regra**: cada entrega só começa após a anterior estar validada pelos testes da seção 9.

# 3. Metodologia e Governança

O desenvolvimento segue **Spec-Driven Development** (GitHub Spec Kit): constituição → especificação → esclarecimento → plano técnico → tarefas → implementação. Nenhum código de aplicação é escrito sem especificação e plano aprovados.

A **constituição do projeto foi atualizada para a versão 2.0.0**, com três mudanças:

- **Princípio V** deixa de limitar a API ao mobile: passa a ser *API-First em entregas incrementais* (E1 mobile, E2 gestão web, E3 agenda/horários).
- **Princípio III**: perfis passam a ser `administrador`, `coordenacao`, `docente` e `aluno`; perfil e situação do usuário são reavaliados no banco a cada requisição.
- **Princípio II**: o provedor de autenticação apenas **identifica** o usuário; as permissões são atribuídas pelo CONECTA.

Os demais princípios permanecem: backend centralizado, segurança por padrão (OAuth2 + JWT de 24 h), separação de responsabilidades e simplicidade com PostgreSQL e migrações versionadas.

# 4. Perfis e Permissões

## 4.1 Perfis padronizados

| Perfil | Quem é | Vínculo com turmas |
|---|---|---|
| `administrador` | Responsável técnico/institucional | Nenhum |
| `coordenacao` | Coordenação do curso (servidores de gestão acadêmica) | Nenhum |
| `docente` | Professores | Turmas em que leciona (papel `docente`) |
| `aluno` | Estudantes | Turmas em que está matriculado (papel `aluno`) |

O antigo perfil "Servidor" deixa de existir.

## 4.2 Quem atribui as permissões

**Reconhecer o usuário no login é diferente de decidir o que ele pode fazer.** O Moodle (ou o provedor simulado) apenas identifica a pessoa (username e nome). No primeiro login o CONECTA cria o usuário como **aluno**; **somente o administrador** altera o perfil (pela plataforma web, E2). O primeiro administrador vem de seed. O perfil é reavaliado no banco a cada requisição, então promoções e desativações têm efeito imediato.

## 4.3 Matriz de permissões

| Ação | Administrador | Coordenação | Docente | Aluno |
|---|---|---|---|---|
| Consultar o próprio perfil, turmas e avisos | Sim | Sim | Sim | Sim |
| Solicitar inscrição / cancelar solicitação | Não | Não | Não | Sim |
| Atribuir perfil e ativar/desativar usuários | Sim | Não | Não | Não |
| Listar usuários | Sim | Sim | Não | Não |
| Criar, editar e desativar turmas | Sim | Sim | Não | Não |
| Vincular/desvincular docentes e alunos | Sim | Sim | Não | Não |
| Aprovar ou recusar solicitação de inscrição | Sim | Sim | Só nas suas turmas | Não |
| Publicar aviso para qualquer público | Sim | Sim | Não | Não |
| Publicar aviso para turma(s) em que leciona | Sim | Sim | Sim | Não |
| Editar, arquivar e excluir avisos | Todos | Todos | Só os seus | Não |
| Consultar versões e histórico de um aviso | Todos | Todos | Só os seus | Não |

# 5. Regras de Negócio

## 5.1 Turmas e vínculos

- Uma **turma** representa um **vínculo real do curso**, não um grupo aberto de comunicação. Tem código, nome, semestre do curso (1–12), período letivo, indicador de inscrições abertas e indicador de ativa.
- Um **vínculo** liga um usuário a uma turma com papel `aluno` ou `docente`. Administrador e coordenação não têm vínculos.
- Vínculos são criados e removidos **pela coordenação ou administração** (E2) ou resultam da **aprovação de uma solicitação**. O docente não altera o próprio vínculo.
- Remover um vínculo retira imediatamente o acesso aos avisos da turma.

## 5.2 Inscrição por solicitação

1. O aluno vê as turmas ativas, com inscrições abertas, em que não tem vínculo nem solicitação pendente.
2. Solicita inscrição: status **pendente** (nenhum acesso é concedido ainda).
3. **Coordenação, administrador ou docente da turma** aprovam ou recusam (E2). A aprovação cria o vínculo na mesma operação; a recusa registra decisor, data e motivo opcional.
4. O aluno acompanha o status (pendente, aprovada, recusada, cancelada) e pode cancelar pendentes.
5. Não há duas pendentes para a mesma turma; após recusa ou cancelamento, pode solicitar de novo.

## 5.3 Avisos com N destinos

Todo aviso tem autor, título, conteúdo, de 1 a 20 **destinos** e, opcionalmente, agendamento. Um aviso é visível a quem for alcançado por **ao menos um** destino:

| Tipo de destino | Quem recebe |
|---|---|
| `todos` | Todo usuário ativo |
| `turma` (id) | Usuários vinculados à turma (alunos e docentes) |
| `semestre` (1–12) | Usuários vinculados a turma ativa daquele semestre |
| `docentes` | Todos os usuários de perfil docente |

**Exemplo — comunicado para três turmas**: um único aviso com três destinos `turma`. Quem pertence a uma ou mais dessas turmas o vê uma única vez; os demais não.

Docentes só publicam avisos cujos destinos sejam turmas em que lecionam. Novos tipos de grupo (ex.: curso) entram estendendo o tipo de destino.

## 5.4 Ciclo de vida do aviso

| Operação | Efeito | Registro |
|---|---|---|
| Criar | Visível a partir da data de publicação (ou imediatamente) | Versão 1 + evento `criado` |
| Editar | Mesmo aviso atualizado; mostra "editado em"; quem deixou de ser destinatário deixa de vê-lo | Nova versão (anterior preservada) + evento `editado` com o que mudou |
| Arquivar | Sai da lista ativa; segue na lista de arquivados dos destinatários | Evento `arquivado` |
| Desarquivar | Volta à lista ativa | Evento `desarquivado` |
| Excluir | Some do app e das listas de gestão (exclusão **lógica**; fica para auditoria) | Evento `excluido` |

Aviso arquivado ou excluído não pode ser editado.

## 5.5 Histórico e rastreabilidade

Cada aviso guarda: **autor e data de criação**; **todas as versões** (título, conteúdo, destinos, agendamento); e um **log imutável de eventos** (tipo, usuário, data/hora e, em edições, o campo alterado com valor anterior e novo). Eventos e versões nunca são alterados nem apagados e são gravados na mesma transação da operação.

# 6. Especificação Funcional

## 6.1 Histórias de usuário

| História | Prioridade | Entrega |
|---|---|---|
| US1 — Login e obtenção de acesso | P1 | E1 |
| US2 — Consulta do próprio perfil | P2 | E1 |
| US3 — Turmas e solicitação de inscrição (aprovação na E2) | P3 | E1 / E2 |
| US4 — Consulta de avisos por público | P4 | E1 |
| US5 — Gestão de usuários, turmas e vínculos | P5 | E2 |
| US6 — Publicação e ciclo de vida de avisos | P6 | E2 |

## 6.2 Requisitos funcionais (resumo)

| Grupo | Requisitos | Entrega |
|---|---|---|
| Autenticação e sessão | RF-01 a RF-07: login por provedor desacoplável, mock enquanto não há Moodle, token de 24 h, 401/403 padronizados, falha do provedor = erro genérico, usuário desativado bloqueado | E1 |
| Perfis | RF-08 (quatro perfis; 1º login = aluno), RF-09 (só administrador atribui), RF-10 (matriz), RF-11 (consulta do próprio perfil) | E1 / E2 |
| Turmas | RF-12 a RF-16 (listar disponíveis, solicitar, impedir duplicidade, acompanhar/cancelar, minhas turmas); RF-17 a RF-19 (aprovar/recusar, gerir turmas, gerir vínculos) | E1 / E2 |
| Avisos | RF-20 a RF-23 (N destinos, visibilidade sem duplicatas, agendamento, arquivados); RF-24 a RF-28 (publicar, versões, arquivar/excluir, eventos, consulta de histórico) | E1 / E2 |
| Qualidade da API | RF-29 (erro `{detail, code}` e paginação); RF-30 (fluxo completo publicar → receber) | E1 / E2 |
| Agenda e horários | RF-31 | E3 |

## 6.3 Critérios de sucesso

- Login e perfil em menos de 5 segundos.
- 100% das tentativas sem sessão válida negadas; 100% das ações fora da matriz de permissões retornam 403.
- Turma aprovada aparece em "minhas turmas" sem nova ação do aluno.
- 100% dos avisos exibidos respeitam destino, agendamento e situação, sem vazamento.
- Trocar o provedor simulado pelo Moodle não exige mudança no app nem nos módulos.
- Toda edição, arquivamento ou exclusão gera exatamente um evento com autor e data.
- O cenário de ponta a ponta da seção 9.3 passa integralmente.

## 6.4 Suposições

- Na E1 não há plataforma web: turmas, vínculos, decisões e avisos entram por seed.
- "Semestre" é o **semestre do curso** (1º a 12º); o período letivo (2026/2) é informativo.
- Sem limite de vagas, sem notificação push e sem registro de leitura nesta fase.
- Provas e datas importantes serão tipos de evento na E3.

# 7. Plano Técnico e Decisões de Arquitetura

## 7.1 Stack

| Camada | Tecnologia |
|---|---|
| Linguagem / framework | Python 3.12, FastAPI |
| Banco de dados | PostgreSQL via SQLAlchemy 2.0 (assíncrono) + Alembic (migrações) |
| Autenticação | OAuth2 + JWT (PyJWT), 24 h |
| Testes | pytest, pytest-asyncio, httpx |
| Clientes | Flutter (mobile); React/Next.js (web, a partir da E2) |
| Infraestrutura | Docker; infraestrutura própria do IFSul |

## 7.2 Autenticação desacoplada do Moodle

A aplicação depende de uma interface `AuthProvider` com duas implementações: o **provedor simulado (mock)**, com usuários de teste, e o **provedor Moodle**, já projetado como esqueleto. A escolha é feita por uma variável de configuração (`AUTH_PROVIDER`). O provedor devolve apenas **username e nome**; o perfil é do CONECTA. Nenhuma senha é armazenada.

## 7.3 Decisões da revisão

- **Perfil e situação reavaliados no banco a cada requisição** (efeito imediato de promoções e desativações).
- **Vínculo único com papel** (`VinculoTurma`) para alunos e docentes; entrada de aluno por **solicitação com aprovação**.
- **Destinos tipados** (`AvisoDestino`) em vez de aviso preso a uma turma; mesma estrutura será reutilizada por eventos na E3.
- **Versões completas + log imutável** para avisos; exclusão lógica.
- **Erros com `code` estável** e **listas paginadas**.

## 7.4 Estrutura de código

`api/` (rotas e schemas) → `services/` (regras de negócio) → `repositories/` (acesso a dados); `providers/auth/` (mock e Moodle); `models/` (entidades); `core/` (configuração e segurança). A E2 acrescenta o pacote `api/routes/gestao/`.

# 8. Modelo de Dados

| Entidade | Descrição | Entrega |
|---|---|---|
| Usuario | username, nome, **perfil** (4 valores, padrão aluno), **ativo**, último login. Sem senha. | E1 |
| Turma | código, nome, semestre do curso, período letivo, inscrições abertas, ativa | E1 |
| VinculoTurma | usuário ↔ turma com papel (`aluno` ou `docente`); único por par | E1 |
| SolicitacaoInscricao | aluno ↔ turma; status (pendente, aprovada, recusada, cancelada), decisor, data, motivo | E1 |
| Aviso | título, conteúdo, autor, situação (ativo, arquivado, excluído), agendamento, editado em | E1 |
| AvisoDestino | tipo (`todos`, `turma`, `semestre`, `docentes`) e referência (turma ou semestre) | E1 |
| AvisoVersao | cópia completa do conteúdo e dos destinos a cada edição | E2 |
| AvisoEvento | registro imutável: criado, editado, arquivado, desarquivado, excluído | E2 |

```text
Usuario 1 ──< VinculoTurma >── 1 Turma
Usuario 1 ──< SolicitacaoInscricao >── 1 Turma   (aprovada → cria VinculoTurma)
Usuario 1 ──< Aviso 1 ──< AvisoDestino >── (Turma | semestre | todos | docentes)
                  ├──< AvisoVersao   (E2)
                  └──< AvisoEvento   (E2)
```

**Regra de visibilidade**: o aviso é visível ao usuário ativo se estiver `ativo` (ou `arquivado`, na lista de arquivados), já publicado, e **algum destino** o alcançar: `todos`; `turma` em que tem vínculo (turma ativa); `semestre` de alguma turma ativa em que tem vínculo; ou `docentes` se for docente. O resultado não repete avisos.

# 9. Contratos da API

## 9.1 Convenções

- JSON; datas ISO-8601 UTC; `Authorization: Bearer <token>` nos protegidos.
- **Erro**: `{ "detail": "mensagem", "code": "CODIGO_ESTAVEL" }`. Validação (422) acrescenta `errors: [{ "campo", "mensagem" }]`. O app decide por `code`.
- **Listas**: `limit` (1–100, padrão 20) e `offset`; resposta `{ items, total, limit, offset }`.

| Status | code (principais) |
|---|---|
| 401 | `NAO_AUTENTICADO`, `CREDENCIAIS_INVALIDAS` |
| 403 | `USUARIO_INATIVO`, `SEM_PERMISSAO`, `DESTINO_NAO_PERMITIDO` |
| 404 | `TURMA_INDISPONIVEL`, `TURMA_NAO_ENCONTRADA`, `AVISO_NAO_ENCONTRADO`, `SOLICITACAO_NAO_ENCONTRADA` |
| 409 | `JA_VINCULADO`, `SOLICITACAO_DUPLICADA`, `SOLICITACAO_NAO_PENDENTE`, `AVISO_NAO_EDITAVEL`, `PERFIL_INCOMPATIVEL` |
| 422 | `VALIDATION_ERROR` |

## 9.2 Endpoints do aplicativo (E1)

| Endpoint | Descrição | Acesso |
|---|---|---|
| POST /auth/login | Autentica e emite o token de 24 h | Público |
| GET /me | Dados do usuário e suas turmas | Todos |
| GET /turmas/disponiveis | Turmas abertas para solicitação | Aluno |
| GET /turmas/minhas | Turmas em que o usuário é vinculado | Todos |
| POST /turmas/{id}/solicitacoes | Solicita inscrição | Aluno |
| GET /solicitacoes/minhas | Solicitações e status | Aluno |
| DELETE /solicitacoes/{id} | Cancela solicitação pendente | Aluno |
| GET /avisos | Avisos visíveis (`situacao`, `turma_id`, paginação) | Todos |
| GET /avisos/{id} | Um aviso visível | Todos |

## 9.3 Endpoints de gestão (E2)

| Endpoint | Descrição | Acesso |
|---|---|---|
| GET /gestao/usuarios, GET /gestao/usuarios/{id} | Consulta de usuários | Administrador, coordenação |
| PATCH /gestao/usuarios/{id} | Altera perfil e ativo | Administrador |
| POST/GET /gestao/turmas, GET/PATCH/DELETE /gestao/turmas/{id} | Gestão de turmas (DELETE = desativação) | Administrador, coordenação |
| GET/POST /gestao/turmas/{id}/vinculos, DELETE …/vinculos/{usuario_id} | Gestão de vínculos | Administrador, coordenação (docente só lê) |
| GET /gestao/solicitacoes | Solicitações (docente: só das suas turmas) | Administrador, coordenação, docente |
| POST /gestao/solicitacoes/{id}/aprovar e …/recusar | Decide a solicitação | Administrador, coordenação, docente da turma |
| POST /gestao/avisos, GET /gestao/avisos, GET/PATCH/DELETE /gestao/avisos/{id} | Publica, lista, consulta, edita e exclui avisos | Administrador, coordenação; docente (os seus) |
| POST /gestao/avisos/{id}/arquivar e …/desarquivar | Arquiva e desarquiva | idem |
| GET /gestao/avisos/{id}/versoes, …/historico | Versões e eventos do aviso | idem |

## 9.4 Exemplo: login

Requisição `POST /auth/login` — campos obrigatórios `username` (1–100) e `password` (1–200):

```json
{ "username": "aluno.teste", "password": "senha-teste" }
```

Resposta `200`:

```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "expires_in": 86400,
  "usuario": { "id": "7b1c…", "username": "aluno.teste", "nome": "Aluno de Teste", "perfil": "aluno" }
}
```

Erros: `401 CREDENCIAIS_INVALIDAS` (senha errada, usuário inexistente **ou** provedor indisponível — mesma resposta), `403 USUARIO_INATIVO`, `422 VALIDATION_ERROR`.

## 9.5 Exemplo: publicar um aviso para três turmas (E2)

Requisição `POST /gestao/avisos` — obrigatórios: `titulo` (3–150), `conteudo` (1–5000), `destinos` (1–20, sem repetição); opcional: `publicar_em` (futuro):

```json
{
  "titulo": "Reunião de pais e alunos",
  "conteudo": "Será realizada na sexta, às 19h, no auditório.",
  "destinos": [
    { "tipo": "turma", "turma_id": "c3f0…" },
    { "tipo": "turma", "turma_id": "d7a1…" },
    { "tipo": "turma", "turma_id": "f2b9…" }
  ]
}
```

Resposta `201`: o aviso com `situacao: "ativo"`, `versao_atual: 1` e os destinos. Erros: `403 DESTINO_NAO_PERMITIDO` (docente com destino fora das suas turmas), `403 SEM_PERMISSAO`, `404 TURMA_NAO_ENCONTRADA`, `422 VALIDATION_ERROR` (campos, data no passado, destino repetido, turma inativa).

## 9.6 Exemplo: aviso visto pelo aluno (E1)

`GET /avisos` — resposta `200`:

```json
{
  "items": [{
    "id": "e5d2…",
    "titulo": "Reunião de pais e alunos",
    "conteudo": "Será realizada na sexta, às 19h, no auditório.",
    "autor": { "id": "11aa…", "nome": "Maria Coordenadora" },
    "publicado_em": "2026-10-01T12:00:00Z",
    "editado_em": null,
    "situacao": "ativo",
    "destinos": [
      { "tipo": "turma", "turma": { "id": "c3f0…", "nome": "TADS 3º Sem A" }, "semestre": null }
    ]
  }],
  "total": 1, "limit": 20, "offset": 0
}
```

## 9.7 Exemplo: histórico de um aviso (E2)

`GET /gestao/avisos/{id}/historico` — o evento `editado` registra o que mudou:

```json
{
  "items": [
    { "tipo": "editado", "usuario": { "nome": "Maria Coordenadora" },
      "ocorrido_em": "2026-10-02T08:00:00Z", "versao": 2,
      "alteracoes": { "conteudo": { "de": "Será realizada na sexta…", "para": "Reunião transferida para sábado…" } } },
    { "tipo": "criado", "usuario": { "nome": "Maria Coordenadora" },
      "ocorrido_em": "2026-10-01T12:00:00Z", "versao": 1, "alteracoes": null }
  ],
  "total": 2, "limit": 20, "offset": 0
}
```

O contrato completo (todos os endpoints, campos, validações e erros) está em `contracts/api.md`.

# 10. Testes e Rastreabilidade

## 10.1 Estratégia: mock × integração real

| Camada | Para quê | Provedor de autenticação |
|---|---|---|
| Unitários | Regras de serviço | Mock |
| Contrato | Cada endpoint: status, campos, validações, erros | Mock |
| Integração | Fluxos com banco de teste dedicado | Mock |
| Ponta a ponta (API) | Fluxo completo publicar → receber | Mock |
| **Integração real com o Moodle** | Valida o `MoodleAuthProvider` | **Real — quando houver acesso** |

Testes que dependem do provedor simulado levam o marcador `mock_auth`; os da integração real, `moodle_real` (ignorados sem credenciais). O relatório lista os dois grupos separadamente: **aprovação com mock não é tratada como validação da integração real**. Um checklist de validação real (login válido, senha inválida, Moodle indisponível, sincronização de nome, ausência de senha em logs/banco) é executado quando o acesso existir.

## 10.2 Matriz de rastreabilidade

| Requisito | Objetivo TCC | Entrega | Testes |
|---|---|---|---|
| RF-01, RF-02, RF-03 | O3 | E1 | contrato `auth_login`; unitário `auth_provider` |
| RF-04, RF-05, RF-07 | O3, O4 | E1 | contrato `auth_login`, `me`; unitário `security`; integração `usuario_inativo` |
| RF-06 | O3 | E1 | integração `login_provider_indisponivel` |
| RF-08, RF-10 | O4 | E1 | integração `primeiro_login_aluno`; contrato `permissoes_matriz` |
| RF-09 | O1, O4 | E2 | contrato `gestao_usuarios`; integração `perfil_efeito_imediato` |
| RF-11 | O2 | E1 | contrato `me` |
| RF-12 a RF-16 | O2, O12 | E1 | contrato `turmas_disponiveis`, `solicitacoes`, `turmas_minhas`; integração `solicitacao_duplicada` |
| RF-17 a RF-19 | O1, O4 | E2 | contrato `gestao_turmas`, `gestao_vinculos`, `gestao_solicitacoes`; integração `aprovacao_cria_vinculo` |
| RF-20 a RF-23 | O7, O8 | E1 | contrato `avisos`; integração `avisos_visibilidade` |
| RF-24 | O1, O7, O8 | E2 | contrato `gestao_avisos_criar`; integração `docente_destinos_permitidos` |
| RF-25, RF-26 | O1, O7, O12 | E2 | integração `aviso_ciclo_de_vida` |
| RF-27, RF-28 | O12 | E2 | integração `aviso_auditoria`; unitário `evento_imutavel` |
| RF-29 | O9, O10 | E1 | contrato `erro_padrao`, `paginacao` |
| RF-30 | O2, O7, O8, O14 | E2 | E2E `fluxo_publicar_e_receber` |
| RF-31 | O5, O6 | E3 | definido na especificação da E3 |
| Estrutura modular | O13 | E1–E3 | revisão de arquitetura (camadas) |

## 10.3 Cenário de ponta a ponta

**Massa de dados**: turmas A, B, C (3º semestre) e D (5º); alunos `a1` (A), `a2` (B), `a3` (C), `a4` (D), `a5` (sem turma); docente `d1` (A); coordenação `c1`; administrador `adm`. Todos autenticados pelo provedor simulado.

1. `c1` publica um aviso com destinos A, B e C → `201`.
2. `a1`, `a2`, `a3` e `d1` o veem (uma vez); `a4` e `a5` **não** o veem.
3. `c1` edita o conteúdo e remove o destino C → `a1` e `a2` veem "editado em"; `a3` **deixa de ver**.
4. `c1` arquiva → some da lista ativa de `a1` e aparece nos arquivados.
5. `c1` consulta versões (2) e histórico (`criado`, `editado`, `arquivado`), com usuário e data.
6. `c1` exclui → some de todas as listas; consulta por id retorna 404.
7. `d1` publica para `todos` → `403 DESTINO_NAO_PERMITIDO`; para a turma A → `201`.
8. `a5` solicita inscrição na turma A → pendente; `d1` aprova → `a5` passa a ver os avisos da turma A.

# 11. Plano de Tarefas da Entrega 1

O plano técnico da E1 foi decomposto em **72 tarefas** em 7 fases; cada história de usuário é implementada e validada de forma independente.

| Fase | Nº tarefas | Conteúdo |
|---|---|---|
| 1. Configuração inicial | 6 | Estrutura, dependências, Docker Compose, marcadores de teste `mock_auth`/`moodle_real` |
| 2. Base do sistema | 14 | Configuração, banco, migrações, provedores (mock e Moodle), JWT, entidade Usuário, erros padronizados, paginação, autorização por perfil |
| 3. US1 — Login | 10 | Testes (inclusive provedor indisponível e usuário inativo), serviço, endpoint, seed |
| 4. US2 — Perfil | 5 | Endpoint `/me`, efeito imediato de mudança de perfil |
| 5. US3 — Turmas | 17 | Turma, vínculo, solicitação; listagens, solicitar, cancelar; seed |
| 6. US4 — Avisos | 11 | Aviso e destinos, regra de visibilidade, endpoints, seed |
| 7. Refinamento | 9 | Testes unitários, formato de erro e paginação, relatório por marcador, revisão de segurança, checklist Moodle real |

As entregas E2 e E3 terão plano e tarefas próprios, gerados após a validação da E1.

# 12. Estado Atual e Próximos Passos

- Concluído: constituição v2.0.0; especificação v2 (escopo, perfis, regras, requisitos, rastreabilidade, E2E); plano técnico; modelo de dados e contratos (E1 e E2); tarefas da E1 (72).
- Próximo passo: **implementar a E1** (`/speckit-implement`), com banco local via Docker e provedor simulado.
- Depois: especificar e planejar a E2 (plataforma web e fluxo completo) e a E3 (agenda e horários); validar a integração real com o Moodle assim que houver acesso.

Os documentos-fonte (constituição, especificação, plano, modelo de dados, contratos e tarefas) estão versionados em `projeto-api/specs/001-auth-perfil-turmas-avisos/` e `projeto-api/.specify/memory/constitution.md`.
