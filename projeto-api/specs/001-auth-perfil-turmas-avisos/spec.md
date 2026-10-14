# Feature Specification: Autenticação, Perfis, Turmas e Avisos (Entregas 1 e 2)

**Feature Branch**: `001-auth-perfil-turmas-avisos`

**Created**: 2026-09-22 | **Revisão (v2)**: 2026-09-30

**Status**: Draft v2 — revisada a partir do parecer do orientador sobre a v1

**Input**: API REST que serve o aplicativo mobile e a plataforma web do CONECTA. A validação de
credenciais vem de uma API externa (Moodle) ainda não acessível; o sistema fica pronto para plugar
a integração real e opera, por enquanto, com um provedor de autenticação simulado (mock).

> **O que mudou em relação à v1**: (1) escopo ligado aos objetivos específicos do TCC e dividido
> em três entregas; (2) perfis padronizados (administrador, coordenação, docente, aluno) com
> matriz de permissões e definição de quem as atribui; (3) vínculos de docentes e alunos com
> turmas definidos; (4) autoinscrição passa a ser **solicitação com aprovação**; (5) aviso passa a
> ter **N destinos** (todos, turmas, semestres, docentes); (6) ciclo de vida do aviso (editar,
> arquivar, excluir) e histórico definidos; (7) rastreabilidade entre requisitos, objetivos do TCC
> e testes, incluindo um cenário de ponta a ponta.

## 1. Escopo e Entregas

### 1.1 Objetivos específicos do TCC (referência)

| ID | Objetivo específico do TCC |
|---|---|
| O1 | Plataforma web para cadastro, edição, exclusão e gerenciamento das informações acadêmicas |
| O2 | Aplicação mobile para consulta e recebimento de informações por alunos, docentes e demais usuários |
| O3 | Mecanismo de autenticação, com acesso conforme o perfil do usuário |
| O4 | Perfis distintos de acesso: administrador, coordenação, docente e aluno |
| O5 | Agenda acadêmica com eventos, bancas, palestras, formaturas, reuniões e demais atividades |
| O6 | Cadastro e consulta dos horários das turmas |
| O7 | Módulo de avisos e comunicados direcionados a diferentes grupos de usuários |
| O8 | Avisos para grupos específicos: turmas, semestres, docentes ou todos os usuários |
| O9 | Comunicação entre web, mobile e servidor por meio de uma API REST |
| O10 | JSON como formato de troca de dados |
| O11 | Backend que processa requisições, aplica regras de negócio e acessa o banco de dados |
| O12 | Banco relacional com histórico, organização e rastreabilidade das informações |
| O13 | Estrutura modular e expansível |
| O14 | Testes funcionais e de integração, com evidências dos resultados |

### 1.2 Divisão em entregas

| Entrega | Conteúdo | Objetivos cobertos | Situação |
|---|---|---|---|
| **E1 — API + aplicativo** | Autenticação (mock), perfis e permissões, consulta de perfil, turmas (consulta, solicitação de inscrição), consulta de avisos com público-alvo por N destinos. Dados de gestão entram por seed. | O2, O3, O4 (modelo e verificação), O7 e O8 (leitura), O9, O10, O11, O12 (modelo base), O13, O14 | **Detalhada nesta especificação; é o que será implementado primeiro** |
| **E2 — Plataforma web + fluxo completo** | Endpoints de gestão (`/gestao/*`): usuários e perfis, turmas, vínculos, aprovação de solicitações, publicação/edição/arquivamento/exclusão de avisos com versões e auditoria; plataforma web que os consome; teste de ponta a ponta web → API → app. | O1, O4 (atribuição), O7 e O8 (publicação), O12 (versões, auditoria), O14 (E2E) | **Contrato de API detalhado nesta especificação**; interface web especificada em documento próprio |
| **E3 — Agenda e horários** | Eventos (palestras, bancas, reuniões, formaturas, provas, datas importantes e outros) com o mesmo mecanismo de destinos dos avisos; horários das turmas. | O5, O6 (e extensão de O1, O2, O12) | **Visão geral nesta especificação** (seção 8); detalhamento em especificação própria antes da implementação |

Regra de entrega: cada entrega só começa após a anterior estar validada pelos testes descritos
na seção 9. Nenhuma funcionalidade da E2/E3 é implementada durante a E1.

## 2. Perfis e Permissões

### 2.1 Perfis

O reconhecimento do usuário no login (Moodle ou mock) **apenas identifica** a pessoa (username e
nome). **O que a pessoa pode fazer dentro do CONECTA é decidido pelo próprio CONECTA**, por meio
do perfil armazenado localmente.

| Perfil (valor na API) | Quem é | Vínculo com turmas |
|---|---|---|
| `administrador` | Responsável técnico/institucional pelo sistema | Nenhum |
| `coordenacao` | Coordenação do curso (servidores com função de gestão acadêmica) | Nenhum |
| `docente` | Professores | Vinculado às turmas em que leciona (papel `docente`) |
| `aluno` | Estudantes do curso | Vinculado às turmas em que está matriculado (papel `aluno`) |

O antigo perfil "Servidor" deixa de existir: um servidor com função de gestão é `coordenacao` ou
`administrador`, conforme a atribuição.

### 2.2 Como o perfil é atribuído

- No primeiro login de um username, o CONECTA cria o usuário com perfil **`aluno`** (padrão de menor
  privilégio). O perfil **nunca** é lido do provedor de autenticação.
- Somente o **administrador** altera o perfil de um usuário (e o ativa/desativa) — via plataforma web (E2).
- O **primeiro administrador** é criado por seed/migração de implantação.
- Na E1 (sem plataforma web), perfis de teste são definidos por seed.
- O perfil é reavaliado pelo banco **a cada requisição** protegida: mudar o perfil ou desativar
  um usuário tem efeito imediato, sem esperar o token de 24 h expirar.

### 2.3 Matriz de permissões

| Ação | Administrador | Coordenação | Docente | Aluno |
|---|---|---|---|---|
| Consultar o próprio perfil, turmas e avisos | Sim | Sim | Sim | Sim |
| Solicitar inscrição em turma / cancelar solicitação | Não | Não | Não | Sim |
| Atribuir perfil e ativar/desativar usuários | Sim | Não | Não | Não |
| Listar usuários | Sim | Sim | Não | Não |
| Criar, editar e desativar turmas | Sim | Sim | Não | Não |
| Vincular/desvincular docentes e alunos a turmas | Sim | Sim | Não | Não |
| Aprovar ou recusar solicitação de inscrição | Sim | Sim | Só nas turmas em que leciona | Não |
| Publicar aviso para qualquer público (todos, semestre, docentes, qualquer turma) | Sim | Sim | Não | Não |
| Publicar aviso para turma(s) em que leciona | Sim | Sim | Sim | Não |
| Editar, arquivar e excluir avisos | Todos | Todos | Só os que publicou | Não |
| Consultar versões e histórico de um aviso | Todos | Todos | Só os que publicou | Não |

## 3. Regras de Negócio

### 3.1 Turmas e vínculos

- Uma **Turma** representa um **vínculo real do curso** (turma acadêmica oficial), não um grupo
  aberto de comunicação. Possui código, nome, semestre do curso (1 a 12), período letivo
  (ex.: `2026/2`), indicador de inscrições abertas e indicador de ativa.
- Um **Vínculo** liga um usuário a uma turma com um papel: `aluno` (usuário de perfil aluno) ou
  `docente` (usuário de perfil docente). Administrador e coordenação não possuem vínculos.
- Vínculos são criados e removidos **pela coordenação ou administração** (plataforma web, E2) ou
  resultam da **aprovação de uma solicitação de inscrição**. O docente não altera o próprio vínculo.
- Remover o vínculo retira imediatamente o acesso do usuário aos avisos da turma.
- Turma desativada: seus vínculos são preservados, mas deixa de aparecer para inscrição e seus
  avisos por turma/semestre deixam de ser entregues.

### 3.2 Inscrição por solicitação (substitui a autoinscrição livre da v1)

1. O aluno vê as turmas **ativas, com inscrições abertas, nas quais não possui vínculo nem solicitação pendente**.
2. O aluno envia uma **solicitação** → status `pendente`.
3. **Coordenação, administrador ou docente da própria turma** aprovam ou recusam (E2).
   - Aprovada: o vínculo (papel `aluno`) é criado na mesma operação.
   - Recusada: registra decisor, data e motivo opcional.
4. O aluno acompanha o status (`pendente`, `aprovada`, `recusada`, `cancelada`) e pode cancelar uma solicitação pendente.
5. Não pode haver duas solicitações pendentes do mesmo aluno para a mesma turma, nem solicitação
   para turma em que já é vinculado. Após `recusada` ou `cancelada`, o aluno pode solicitar novamente.

### 3.3 Avisos

- Todo aviso possui **autor**, título, conteúdo, **1 a 20 destinos** e, opcionalmente, data/hora
  de publicação agendada.
- **Destino** é um par (tipo, referência). Tipos:

| Tipo | Referência | Quem recebe |
|---|---|---|
| `todos` | — | Todo usuário autenticado e ativo |
| `turma` | id da turma | Usuários com vínculo (aluno ou docente) naquela turma |
| `semestre` | número do semestre do curso (1–12) | Usuários com vínculo em turma ativa daquele semestre |
| `docentes` | — | Todos os usuários de perfil `docente` |

- Um aviso é visível a um usuário quando **pelo menos um** destino o alcança.
  Exemplo — comunicado para três turmas: um aviso com três destinos `turma`.
- Novos tipos de grupo (ex.: curso) entram por extensão do tipo de destino, sem alterar o restante do modelo.
- Aviso é visível no aplicativo somente se estiver `ativo`, já publicado (`publicar_em` nulo ou
  passado) e o usuário for alcançado por algum destino.
- Docente só cria/edita avisos cujos destinos sejam todos `turma` de turmas em que leciona.

### 3.4 Ciclo de vida do aviso

| Operação | Efeito para os usuários | Registro |
|---|---|---|
| **Criar** | Visível a partir de `publicar_em` (ou imediatamente) | Versão 1 + evento `criado` |
| **Editar** (título, conteúdo, destinos, agendamento) | O mesmo aviso é atualizado; passa a exibir `editado_em`; quem deixou de ser destinatário deixa de vê-lo | Nova versão (a anterior é preservada) + evento `editado` com o que mudou |
| **Arquivar** | Sai da lista ativa; continua consultável na lista de arquivados dos destinatários | Evento `arquivado` |
| **Desarquivar** | Volta à lista ativa | Evento `desarquivado` |
| **Excluir** | Some do aplicativo e das listas de gestão; **exclusão lógica** — dados permanecem para auditoria (administração e coordenação ainda os consultam filtrando por situação `excluido`) | Evento `excluido` |

- Aviso excluído não pode ser recuperado pela API (permanece no banco apenas para auditoria).
- Aviso arquivado ou excluído não pode ser editado.

### 3.5 Histórico e rastreabilidade

Cada aviso mantém: **autor e data de criação**; **versões** completas (título, conteúdo, destinos
e agendamento de cada versão); e um **log de eventos imutável** com tipo, usuário, data/hora e,
em edições, os campos alterados (valor anterior e novo). Eventos nunca são alterados nem apagados.

### 3.6 Autenticação e provedor

- O provedor de credenciais é uma interface (`AuthProvider`) com duas implementações: **mock**
  (usuários de teste) e **Moodle** (real, futura). Retorna somente identidade (username e nome).
- O token de acesso (JWT) vale **24 h** e contém o identificador e o perfil do usuário.
- Falha ou indisponibilidade do provedor = falha de autenticação genérica (sem detalhes internos).
- Usuário desativado não consegue acessar (login retorna 403 com credenciais corretas; token em
  uso passa a ser rejeitado na requisição seguinte).

## 4. User Scenarios & Testing *(mandatory)*

### User Story 1 - Login e obtenção de acesso (Priority: P1) — E1

Um usuário informa usuário e senha e recebe acesso ao CONECTA com o seu perfil.

**Independent Test**: enviar credenciais válidas e inválidas e verificar acesso concedido/negado,
inclusive com o provedor externo indisponível.

**Acceptance Scenarios**:

1. **Given** credenciais válidas no provedor (real ou mock), **When** o usuário faz login, **Then**
   recebe token (24 h) e seus dados com o perfil armazenado no CONECTA.
2. **Given** é o primeiro login desse username, **When** o login é bem-sucedido, **Then** o usuário
   é criado com perfil `aluno`.
3. **Given** senha incorreta, **When** tenta acessar, **Then** acesso negado com mensagem genérica,
   sem revelar se o usuário existe.
4. **Given** o provedor externo indisponível, **When** tenta acessar, **Then** a resposta é a mesma
   de credenciais inválidas.
5. **Given** token expirado, ausente ou inválido, **When** acessa recurso protegido, **Then** recebe 401.
6. **Given** usuário desativado, **When** faz login ou usa um token anterior, **Then** recebe 403.

---

### User Story 2 - Consulta do próprio perfil (Priority: P2) — E1

**Independent Test**: autenticar e verificar que os dados retornados são os do usuário logado.

**Acceptance Scenarios**:

1. **Given** usuário autenticado, **When** consulta seu perfil, **Then** recebe nome, perfil,
   identificação e as turmas em que está vinculado, sem dados de outros usuários.
2. **Given** usuário não autenticado, **When** consulta, **Then** recebe 401.
3. **Given** o administrador mudou seu perfil, **When** consulta de novo, **Then** vê o novo perfil
   imediatamente.

---

### User Story 3 - Turmas e solicitação de inscrição (Priority: P3) — E1 (consulta/solicitação) e E2 (aprovação)

**Independent Test**: como aluno, listar turmas disponíveis, solicitar inscrição, ver a solicitação
pendente; após aprovação (seed na E1, endpoint na E2), ver a turma em "minhas turmas".

**Acceptance Scenarios**:

1. **Given** aluno autenticado, **When** lista turmas disponíveis, **Then** vê apenas turmas ativas,
   com inscrições abertas, sem vínculo e sem solicitação pendente dele.
2. **Given** turma disponível, **When** solicita inscrição, **Then** é criada solicitação `pendente`
   — e **nenhum vínculo** ainda existe.
3. **Given** solicitação pendente, **When** solicita de novo a mesma turma, **Then** 409.
4. **Given** solicitação pendente, **When** o aluno cancela, **Then** status `cancelada`.
5. **Given** solicitação pendente, **When** coordenação, administrador ou docente da turma aprova,
   **Then** o vínculo é criado e a turma aparece em "minhas turmas" (E2).
6. **Given** solicitação pendente, **When** é recusada, **Then** o aluno vê status `recusada` e o motivo (E2).
7. **Given** usuário não aluno, **When** tenta solicitar inscrição, **Then** 403.
8. **Given** qualquer usuário vinculado, **When** consulta "minhas turmas", **Then** vê só as suas, com o papel em cada uma.

---

### User Story 4 - Consulta de avisos (Priority: P4) — E1

**Independent Test**: com avisos de vários destinos (seed), verificar que cada usuário vê exatamente o que o alcança.

**Acceptance Scenarios**:

1. **Given** aviso com destino `todos`, **When** qualquer usuário ativo consulta, **Then** o vê.
2. **Given** aviso com destinos `turma` A, B e C, **When** um usuário vinculado a B consulta, **Then** o vê uma única vez.
3. **Given** o mesmo aviso, **When** um usuário vinculado só à turma D consulta, **Then** não o vê.
4. **Given** aviso com destino `semestre` 3, **When** usuário vinculado a turma ativa do 3º semestre consulta, **Then** o vê.
5. **Given** aviso com destino `docentes`, **When** um aluno consulta, **Then** não o vê; um docente vê.
6. **Given** aviso agendado para o futuro, **When** a data não chegou, **Then** ninguém o vê; ao chegar, os destinatários passam a vê-lo.
7. **Given** aviso arquivado, **When** o destinatário lista avisos ativos, **Then** não aparece; na lista de arquivados, aparece.
8. **Given** aviso excluído, **When** qualquer usuário consulta, **Then** não aparece em nenhuma lista, e consultar o id retorna 404.
9. **Given** aviso editado, **When** o destinatário o consulta, **Then** vê o conteúdo atual e `editado_em`.
10. **Given** coordenação/administração (sem vínculo), **When** consulta avisos, **Then** vê apenas os de destino `todos`.

---

### User Story 5 - Gestão de usuários, turmas e vínculos (Priority: P5) — E2

Administrador atribui perfis; administração e coordenação gerem turmas, vínculos e aprovações.

**Acceptance Scenarios**:

1. **Given** administrador, **When** altera o perfil de um usuário, **Then** a mudança vale na requisição seguinte.
2. **Given** coordenação, **When** tenta alterar perfil, **Then** 403.
3. **Given** coordenação, **When** cria turma e vincula um docente, **Then** o docente passa a receber avisos da turma e pode aprovar as solicitações dessa turma.
4. **Given** docente, **When** tenta vincular um aluno diretamente, **Then** 403.
5. **Given** docente da turma A, **When** tenta aprovar solicitação da turma B, **Then** 403.

---

### User Story 6 - Publicação e ciclo de vida de avisos (Priority: P6) — E2

Quem tem permissão publica, edita, arquiva e exclui avisos pela web; o aluno recebe no aplicativo respeitando o público.

**Acceptance Scenarios**:

1. **Given** coordenação, **When** publica aviso para 3 turmas, **Then** os alunos dessas turmas o recebem no app e os demais não.
2. **Given** docente, **When** publica para turma em que leciona, **Then** é aceito; para turma alheia, `todos`, `semestre` ou `docentes`, **Then** 403.
3. **Given** aviso publicado, **When** o autor edita, **Then** nova versão é criada, `editado_em` é preenchido e o evento registra o que mudou.
4. **Given** aviso, **When** é arquivado e desarquivado, **Then** os destinatários o perdem e recuperam na lista ativa, e dois eventos são registrados.
5. **Given** aviso, **When** é excluído, **Then** some para todos; versões e eventos permanecem consultáveis por quem tem permissão de gestão.
6. **Given** docente, **When** tenta editar aviso de outra pessoa, **Then** 403.

### Edge Cases

- Provedor de credenciais indisponível ou com erro → falha de autenticação genérica.
- Usuário que deixa de existir no provedor mas tem token válido → o token continua valendo até expirar (24 h) ou até o administrador desativá-lo; a desativação é o mecanismo de corte imediato.
- Turma sem inscrições abertas ou inativa → `404 TURMA_INDISPONIVEL` na solicitação.
- Perfil desconhecido → não é possível (o perfil nasce `aluno` e só muda para valores do conjunto fixo).
- Aviso com destino repetido, turma inexistente/inativa ou semestre fora de 1–12 → 422.
- `publicar_em` no passado na criação → 422 (omitir o campo publica imediatamente).
- Edição de aviso arquivado ou excluído → 409.
- Usuário sem turma e sem avisos gerais → lista vazia (`items: []`), não é erro.
- Docente desvinculado de turma → perde imediatamente poder de aprovar e de publicar para ela; avisos que já publicou continuam seus e editáveis, porém a edição só pode manter destinos de turmas em que ainda leciona.

## 5. Requirements *(mandatory)*

### Functional Requirements

Entrega indicada entre colchetes.

**Autenticação e sessão**
- **RF-01 [E1]**: O sistema MUST autenticar usuário por username e senha através do provedor de credenciais configurado.
- **RF-02 [E1]**: O provedor MUST ser desacoplável (mock ↔ Moodle) por configuração, sem alterar rotas, regras ou contratos.
- **RF-03 [E1]**: Enquanto o Moodle não estiver disponível, o sistema MUST operar com usuários de teste do provedor mock, cobrindo os quatro perfis.
- **RF-04 [E1]**: O acesso concedido MUST ter validade de 24 h; perfil e situação (ativo/inativo) MUST ser reavaliados no banco a cada requisição protegida.
- **RF-05 [E1]**: O sistema MUST negar recursos protegidos sem credencial válida (401) e sem permissão (403), com `code` padronizado.
- **RF-06 [E1]**: Falha ou indisponibilidade do provedor MUST resultar em falha de autenticação genérica.
- **RF-07 [E1]**: Usuário desativado MUST ter acesso negado (403 `USUARIO_INATIVO`).

**Perfis e permissões**
- **RF-08 [E1]**: Existem exatamente quatro perfis: `administrador`, `coordenacao`, `docente`, `aluno`. O primeiro login cria o usuário como `aluno`; o perfil nunca vem do provedor.
- **RF-09 [E2]**: Somente o administrador MUST poder alterar perfil e ativar/desativar usuários.
- **RF-10 [E1/E2]**: Toda ação MUST respeitar a matriz de permissões da seção 2.3.
- **RF-11 [E1]**: O usuário autenticado MUST poder consultar seus próprios dados (nome, perfil, turmas e papel em cada uma).

**Turmas e vínculos**
- **RF-12 [E1]**: O sistema MUST listar ao aluno as turmas ativas, com inscrições abertas, sem vínculo e sem solicitação pendente.
- **RF-13 [E1]**: O aluno MUST poder solicitar inscrição, gerando solicitação `pendente` sem criar vínculo.
- **RF-14 [E1]**: O sistema MUST impedir solicitação duplicada pendente e solicitação para turma em que o aluno já é vinculado.
- **RF-15 [E1]**: O aluno MUST poder listar suas solicitações (com status) e cancelar as pendentes.
- **RF-16 [E1]**: Todo usuário vinculado MUST poder listar suas turmas.
- **RF-17 [E2]**: Coordenação, administrador e docente da turma MUST poder aprovar ou recusar solicitações; a aprovação cria o vínculo na mesma operação.
- **RF-18 [E2]**: Administração e coordenação MUST poder criar, editar e desativar turmas.
- **RF-19 [E2]**: Administração e coordenação MUST poder criar e remover vínculos de docentes e alunos.

**Avisos**
- **RF-20 [E1]**: Um aviso MUST ter de 1 a 20 destinos dos tipos `todos`, `turma`, `semestre`, `docentes`.
- **RF-21 [E1]**: A consulta de avisos MUST retornar somente avisos ativos, já publicados e alcançados por algum destino do usuário, sem duplicidade.
- **RF-22 [E1]**: O sistema MUST ocultar avisos agendados até a data/hora de publicação.
- **RF-23 [E1]**: O sistema MUST permitir listar avisos arquivados dos quais o usuário é destinatário e consultar um aviso por id (404 se não alcançado ou excluído).
- **RF-24 [E2]**: Usuários autorizados MUST poder publicar avisos pela plataforma web, respeitando a matriz de permissões e a restrição de destinos do docente.
- **RF-25 [E2]**: Editar um aviso MUST criar nova versão, marcar `editado_em` e preservar versões anteriores.
- **RF-26 [E2]**: Arquivar, desarquivar e excluir MUST ser operações lógicas com os efeitos da seção 3.4.
- **RF-27 [E2]**: Cada criação, edição, arquivamento, desarquivamento e exclusão MUST gerar evento imutável com usuário, data/hora e (em edições) campos alterados.
- **RF-28 [E2]**: Quem tem permissão MUST poder consultar as versões e o histórico de eventos de um aviso.

**Qualidade da API**
- **RF-29 [E1]**: Erros MUST seguir o formato `{detail, code}` e listas MUST ser paginadas (`limit`/`offset`, com `total`).
- **RF-30 [E2]**: O fluxo completo — alguém autorizado publica pela web, a API registra e o aluno recebe no aplicativo respeitando o público — MUST ser demonstrado por teste de ponta a ponta (seção 9.3).

**Agenda e horários (visão geral — E3)**
- **RF-31 [E3]**: Eventos e horários de turma MUST ser cadastrados pela gestão e consultados pelos destinatários, reutilizando o mecanismo de destinos.

### Key Entities

- **Usuário**: identificação, username, nome, perfil (4 valores), situação ativo/inativo. Sem senha.
- **Turma**: código, nome, semestre do curso, período letivo, inscrições abertas, ativa.
- **Vínculo**: usuário ↔ turma com papel (`aluno` ou `docente`).
- **Solicitação de inscrição**: aluno ↔ turma com status e decisão.
- **Aviso**: título, conteúdo, autor, situação (ativo/arquivado/excluído), agendamento, edição.
- **Destino do aviso**: tipo e referência (turma ou semestre).
- **Versão do aviso**: cópia completa do conteúdo e dos destinos em cada edição.
- **Evento do aviso**: registro imutável de cada operação.
- **Provedor de credenciais**: componente que identifica o usuário (mock ou Moodle).

## 6. Success Criteria *(mandatory)*

- **SC-001**: Login e perfil em menos de 5 s (envio das credenciais ao recebimento do perfil).
- **SC-002**: 100% das tentativas sem sessão válida são negadas; 100% das ações fora da matriz de permissões retornam 403.
- **SC-003**: Após aprovação, a turma aparece em "minhas turmas" sem nova ação do aluno.
- **SC-004**: 100% dos avisos exibidos correspondem às regras de destino, agendamento e situação; zero vazamento a quem não é alcançado por nenhum destino.
- **SC-005**: Trocar mock por Moodle não exige mudanças no app nem nos módulos de perfil, turmas e avisos.
- **SC-006**: Toda edição, arquivamento e exclusão de aviso gera exatamente um evento no histórico, com autor e data.
- **SC-007**: O cenário de ponta a ponta da seção 9.3 passa integralmente.

## 7. Assumptions

- A E1 não possui plataforma web: vínculos, aprovações, turmas e avisos são criados por seed. Os endpoints `/gestao/*` pertencem à E2.
- "Semestre" é o **semestre do curso** (1º a 12º), atributo da turma; "período letivo" (ex.: 2026/2) é separado e informativo.
- Não há limite de vagas por turma nesta fase.
- Não há notificação push nesta especificação (possibilidade futura prevista na arquitetura).
- Não há registro de leitura de aviso (quem leu) nesta especificação.
- Provas e datas importantes (previstas na arquitetura) serão tratadas como tipos de evento na E3.
- A integração real com o Moodle é validada à parte (seção 9.4) assim que houver acesso; até lá, todos os testes de autenticação usam o provedor mock e são identificados como tal.

## 8. Visão Geral da Entrega 3 (agenda e horários)

Não detalhada neste documento; será especificada antes de sua implementação.

- **Evento**: título, descrição, tipo (`palestra`, `banca`, `reuniao`, `formatura`, `prova`, `data_importante`, `outro`), início, fim, local, autor, situação e **destinos** (mesmo mecanismo dos avisos).
- **Horário de turma**: turma, dia da semana, hora de início/fim, disciplina, local e docente.
- Gestão pela web com as mesmas permissões e a mesma política de versões/auditoria; consulta pelo app respeitando destinos/vínculos.

## 9. Testes e Rastreabilidade

### 9.1 Estratégia

| Camada | Para quê | Provedor de autenticação |
|---|---|---|
| Unitários | Regras de serviço (visibilidade, permissões, ciclo do aviso) | Mock |
| Contrato | Cada endpoint: status, campos, validações, erros | Mock |
| Integração | Fluxos com banco de teste dedicado | Mock |
| Ponta a ponta (E2E de API) | Fluxo completo publicar → receber | Mock |
| **Integração real com Moodle** | Valida o `MoodleAuthProvider` | **Real — somente quando houver acesso** |

Testes que dependem do provedor simulado levam o marcador `mock_auth`; os da integração real,
`moodle_real` (ignorados automaticamente sem credenciais). O relatório de testes lista os dois
grupos separadamente — **aprovação com mock não é tratada como validação da integração real**.

### 9.2 Matriz de rastreabilidade

| Requisito | Objetivo TCC | Entrega | Testes (tipo — arquivo) |
|---|---|---|---|
| RF-01, RF-02, RF-03 | O3 | E1 | contrato `test_auth_login`; unitário `test_auth_provider` (contrato do provedor, mock) |
| RF-04, RF-05, RF-07 | O3, O4 | E1 | contrato `test_auth_login`, `test_me`; unitário `test_security` (expiração, assinatura); integração `test_usuario_inativo` |
| RF-06 | O3 | E1 | integração `test_login_provider_indisponivel` |
| RF-08, RF-10 | O4 | E1 | integração `test_primeiro_login_aluno`; contrato `test_permissoes_matriz` |
| RF-09 | O1, O4 | E2 | contrato `test_gestao_usuarios`; integração `test_perfil_efeito_imediato` |
| RF-11 | O2 | E1 | contrato `test_me` |
| RF-12, RF-13, RF-14, RF-15, RF-16 | O2, O12 | E1 | contrato `test_turmas_disponiveis`, `test_solicitacoes`, `test_turmas_minhas`; integração `test_solicitacao_duplicada` |
| RF-17, RF-18, RF-19 | O1, O4 | E2 | contrato `test_gestao_turmas`, `test_gestao_vinculos`, `test_gestao_solicitacoes`; integração `test_aprovacao_cria_vinculo` |
| RF-20, RF-21, RF-22, RF-23 | O7, O8 | E1 | contrato `test_avisos`; integração `test_avisos_visibilidade` (todos, 3 turmas, semestre, docentes, agendado, arquivado, excluído) |
| RF-24 | O1, O7, O8 | E2 | contrato `test_gestao_avisos_criar`; integração `test_docente_destinos_permitidos` |
| RF-25, RF-26 | O1, O7, O12 | E2 | integração `test_aviso_ciclo_de_vida` |
| RF-27, RF-28 | O12 | E2 | integração `test_aviso_auditoria`; unitário `test_evento_imutavel` |
| RF-29 | O9, O10 | E1 | contrato `test_erro_padrao`, `test_paginacao` |
| RF-30 | O2, O7, O8, O14 | E2 | E2E `test_fluxo_publicar_e_receber` |
| RF-31 | O5, O6 | E3 | a definir na especificação da E3 |
| Estrutura modular | O13 | E1–E3 | revisão de arquitetura (camadas api/services/repositories/providers) |

### 9.3 Cenário de ponta a ponta (RF-30, SC-007)

**Massa de dados**: turmas A, B e C (3º semestre) e D (5º semestre); alunos `a1` (turma A), `a2` (B),
`a3` (C), `a4` (D) e `a5` (sem turma); docente `d1` (turma A); coordenação `c1`; administrador `adm`.
Todos autenticados via provedor mock.

1. `c1` publica aviso com destinos `turma` A, B e C → **201**.
2. `a1`, `a2`, `a3` e `d1` listam avisos → o aviso aparece (uma vez). `a4`, `a5` → **não** aparece.
3. `c1` edita o conteúdo e remove o destino C → `a1` e `a2` veem `editado_em`; `a3` **deixa de ver**.
4. `c1` arquiva o aviso → some da lista ativa de `a1` e aparece na lista de arquivados.
5. `c1` consulta versões (2) e histórico (`criado`, `editado`, `arquivado`) com usuário e data.
6. `c1` exclui → o aviso some de todas as listas; consulta por id retorna 404 ao aluno.
7. `d1` tenta publicar com destino `todos` → **403 DESTINO_NAO_PERMITIDO**; para a turma A → **201**.
8. `a5` solicita inscrição na turma A → `pendente`; `d1` aprova → `a5` passa a ver os avisos da turma A.

### 9.4 Checklist de validação da integração real (Moodle)

Executar quando houver acesso à API do Moodle; registrar data, ambiente e evidência.

- [ ] `AUTH_PROVIDER=moodle` configurado sem outra mudança de código/rotas.
- [ ] Login com usuário real válido retorna 200 e cria usuário com perfil `aluno`.
- [ ] Login com senha inválida retorna 401 genérico.
- [ ] Moodle indisponível/timeout retorna o mesmo 401 genérico, sem detalhes internos.
- [ ] Nome do usuário é sincronizado a cada login; perfil **não** é alterado pelo login.
- [ ] Nenhuma senha aparece em log, resposta ou banco.
- [ ] A suíte `mock_auth` continua passando com o provedor real (exceto o que depende de usuários de teste).
