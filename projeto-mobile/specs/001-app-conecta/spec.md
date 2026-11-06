# Feature Specification: Aplicativo CONECTA (Flutter)

**Feature Branch**: `001-app-conecta`

**Created**: 2026-10-13

**Status**: Draft

**Input**: Aplicativo mobile do CONECTA, em Flutter, para todos os usuários autenticados. Consome
exclusivamente a API REST descrita em
`projeto-api/specs/001-auth-perfil-turmas-avisos/contracts/api.md`. As telas estão desenhadas em
`design/mobile/` e os tokens visuais em `design/README.md`.

**Referências**

| Documento | Para quê |
|---|---|
| `projeto-api/specs/001-auth-perfil-turmas-avisos/spec.md` | Regras de negócio, perfis, visibilidade de avisos |
| `projeto-api/specs/001-auth-perfil-turmas-avisos/contracts/api.md` | Endpoints, campos, códigos de erro |
| `CONECTA_Arquitetura.md` | Papel do app no sistema |
| `design/mobile/*.png` | Telas desenhadas |
| `design/README.md` | Paleta, tipografia e regras visuais |

## 1. Escopo e Fases

O aplicativo é a interface de **consulta e recebimento** de informações acadêmicas. Nenhuma tela
de gestão existe aqui: publicar, editar, aprovar e administrar são da plataforma web.

### 1.1 Objetivos do TCC cobertos

| ID | Objetivo específico do TCC |
|---|---|
| O2 | Aplicação mobile para consulta e recebimento de informações |
| O3 | Mecanismo de autenticação, com acesso conforme o perfil |
| O4 | Perfis distintos de acesso |
| O5 | Agenda acadêmica (fase F2) |
| O6 | Consulta dos horários das turmas (fase F2) |
| O7, O8 | Avisos e comunicados direcionados a grupos (consulta) |
| O13, O14 | Qualidade e testes com evidências |

### 1.2 Fases

| Fase | Conteúdo | Depende de | Situação |
|---|---|---|---|
| **F1 — Núcleo** | Login e sessão, avisos (ativos, arquivados, detalhe), minhas turmas, turmas disponíveis, solicitação de inscrição, minhas solicitações, perfil, cache local | Endpoints **E1** da API (seções 1–9 do contrato), já especificados | **Detalhada nesta spec; é o que será implementado primeiro** |
| **F2 — Agenda e horários** | Agenda em lista e em mês, detalhe de evento, grade de horários da turma | Endpoints **E3**, especificados em `projeto-api/specs/002-agenda-horarios` | **Requisitos e telas definidos nesta spec; implementação começa quando a E3 estiver implementada na API** |

Regra de fase: nenhuma tela de F2 é implementada enquanto os endpoints E3 não estiverem
especificados e disponíveis. A navegação já prevê as abas de F2; até lá elas não são exibidas.

### 1.3 Fora de escopo

- Qualquer operação de gestão (`/gestao/*`): publicar, editar, arquivar, excluir avisos; criar
  turmas; aprovar solicitações; administrar usuários e perfis.
- Notificações push (previstas na arquitetura como possibilidade futura).
- Registro de leitura de aviso ("quem leu").
- Recuperação de senha e cadastro: a identidade vem do provedor externo (API de autenticação do
  IFSul ou mock).
- Tablet, modo paisagem e tema escuro.

## 2. Usuários do Aplicativo

Todos os quatro perfis entram no app; o que cada um vê decorre do perfil e dos vínculos, sempre
decididos pela API.

| Perfil | O que vê no app | O que **não** vê |
|---|---|---|
| `aluno` | Avisos que o alcançam, suas turmas, turmas disponíveis, suas solicitações, perfil | — |
| `docente` | Avisos que o alcançam (turmas em que leciona, destino `docentes`, `todos`), suas turmas, perfil | Turmas disponíveis e solicitação de inscrição |
| `coordenacao` | Avisos de destino `todos` (não possui vínculo), perfil | Turmas disponíveis, solicitação, lista de turmas (vem vazia) |
| `administrador` | Igual à coordenação | Igual à coordenação |

O app **não** decide essa matriz: ele esconde os controles que sabe serem inúteis para o perfil
corrente e trata `403 SEM_PERMISSAO` como resposta legítima sempre que estiver errado.

## 3. Navegação e Inventário de Telas

Cinco abas fixas na base. Agenda e Horários vieram com a F2 (01/11/2026).

```
[ Avisos ] [ Agenda* ] [ Turmas ] [ Horários* ] [ Perfil ]      * F2
```

| # | Tela | Imagem | Fase |
|---|---|---|---|
| T01 | Login | `design/mobile/m-01-login.png` | F1 |
| T02 | Avisos — ativos | `m-02-avisos.png` | F1 |
| T03 | Aviso — detalhe | `m-03-aviso-detalhe.png` | F1 |
| T04 | Avisos — arquivados | `m-04-avisos-arquivados.png` | F1 |
| T05 | Avisos — lista vazia | `m-05-avisos-vazio.png` | F1 |
| T06 | Minhas turmas | `m-06-minhas-turmas.png` | F1 |
| T07 | Turmas disponíveis | `m-07-turmas-disponiveis.png` | F1 |
| T08 | Solicitação enviada (folha de confirmação) | `m-08-solicitacao-enviada.png` | F1 |
| T09 | Minhas solicitações | `m-09-minhas-solicitacoes.png` | F1 |
| T10 | Agenda — próximos | `m-10-agenda.png` | F2 |
| T11 | Agenda — mês | `m-10b-agenda-mes.png` | F2 |
| T12 | Evento — detalhe | `m-11-evento-detalhe.png` | F2 |
| T13 | Horários da turma | `m-12-horarios.png` | F2 |
| T14 | Perfil | `m-13-perfil.png` | F1 |

Rotas nomeadas: `/login`, `/` (casca com abas), `/avisos/:id`, `/turmas/disponiveis`,
`/solicitacoes`, `/eventos/:id` (F2).

## 4. User Scenarios & Testing *(mandatory)*

### User Story 1 — Entrar no aplicativo (Priority: P1) — F1

Um usuário informa suas credenciais e passa a ver o conteúdo que lhe cabe.

**Independent Test**: instalar o app, entrar com credenciais válidas e inválidas do provedor mock
e verificar o destino de cada caso.

**Acceptance Scenarios**:

1. **Given** credenciais válidas, **When** o usuário toca em Entrar, **Then** o app guarda o token
   em armazenamento seguro e abre a aba Avisos já com os dados do usuário.
2. **Given** credenciais inválidas (`401 CREDENCIAIS_INVALIDAS`), **When** tenta entrar,
   **Then** vê a mensagem "Usuário ou senha incorretos", permanece no login e o campo de senha é
   limpo — sem qualquer indicação de que o usuário existe.
3. **Given** usuário desativado (`403 USUARIO_INATIVO`), **When** tenta entrar, **Then** vê
   "Seu acesso está desativado. Procure a coordenação." e permanece no login.
4. **Given** aparelho sem rede, **When** tenta entrar, **Then** vê "Sem conexão. Verifique a rede e
   tente de novo." com ação de repetir, e nada é gravado.
5. **Given** campos vazios, **When** toca em Entrar, **Then** o app indica o campo faltante sem
   chamar a API.
6. **Given** um token guardado e ainda válido, **When** o app é aberto, **Then** vai direto para a
   aba Avisos, sem passar pela tela de login.
7. **Given** um token expirado ou revogado, **When** qualquer tela chama a API e recebe `401`,
   **Then** o app apaga a sessão e o cache, volta ao login e mostra "Sua sessão expirou. Entre de
   novo."

---

### User Story 2 — Ler os avisos que me alcançam (Priority: P2) — F1

**Independent Test**: com usuários de perfis diferentes no seed, abrir a aba Avisos e conferir que
cada um vê exatamente o que a API devolve, com seus destinos visíveis.

**Acceptance Scenarios**:

1. **Given** usuário autenticado, **When** abre a aba Avisos, **Then** vê a lista de avisos ativos,
   do mais recente ao mais antigo, cada item com autor, data relativa, título, trecho do conteúdo e
   os chips de destino.
2. **Given** um aviso alcançado por vários destinos, **When** a lista é exibida, **Then** ele
   aparece **uma única vez**, com todos os seus destinos listados.
3. **Given** um aviso editado, **When** o usuário o abre, **Then** vê o conteúdo atual e a linha
   "Publicado em … · editado em …".
4. **Given** a lista está vazia (`items: []`), **When** a tela carrega, **Then** mostra o estado
   vazio com explicação e um atalho para turmas disponíveis — isso não é erro.
5. **Given** o usuário alterna para Arquivados, **When** a lista carrega, **Then** vê somente
   avisos arquivados que o alcançam, com a explicação do que é essa lista.
6. **Given** uma lista com mais itens do que a página, **When** o usuário chega ao fim,
   **Then** a próxima página é carregada automaticamente (20 por vez).
7. **Given** o usuário puxa a lista para baixo, **When** solta, **Then** a lista é recarregada do
   servidor e a data de atualização do cache muda.
8. **Given** um aviso que deixou de alcançar o usuário entre a lista e o toque, **When** ele é
   aberto e a API responde `404 AVISO_NAO_ENCONTRADO`, **Then** o app mostra "Este aviso não está
   mais disponível" e volta para a lista atualizada.

---

### User Story 3 — Acompanhar minhas turmas (Priority: P3) — F1

**Independent Test**: como aluno com vínculos e como coordenação sem vínculo, abrir a aba Turmas.

**Acceptance Scenarios**:

1. **Given** usuário com vínculos, **When** abre a aba Turmas, **Then** vê suas turmas com código,
   nome, semestre e o seu papel em cada uma.
2. **Given** usuário sem vínculo (coordenação, administração ou aluno novo), **When** abre a aba,
   **Then** vê o estado vazio com a explicação e, se for aluno, o atalho para turmas disponíveis.
3. **Given** aluno autenticado, **When** abre Turmas disponíveis, **Then** vê somente as turmas que
   a API devolve — ativas, com inscrições abertas, sem vínculo e sem solicitação pendente dele.
4. **Given** usuário que não é aluno, **When** está na aba Turmas, **Then** não vê o atalho para
   turmas disponíveis; e se a API responder `403 SEM_PERMISSAO`, o app explica que só alunos podem
   solicitar inscrição.

---

### User Story 4 — Solicitar inscrição em uma turma (Priority: P4) — F1

**Independent Test**: como aluno, solicitar inscrição, ver a solicitação pendente, cancelá-la e
solicitar de novo.

**Acceptance Scenarios**:

1. **Given** uma turma disponível, **When** o aluno toca em Solicitar, **Then** o app chama a API,
   mostra a folha de confirmação ("Solicitação enviada… fica pendente de aprovação") e a turma sai
   da lista de disponíveis.
2. **Given** a solicitação foi criada, **When** o aluno abre Minhas solicitações, **Then** vê o
   item com status `Pendente` e a data de envio.
3. **Given** uma solicitação pendente, **When** o aluno toca em Cancelar solicitação e confirma,
   **Then** o status passa a `Cancelada` e a turma volta a aparecer em disponíveis.
4. **Given** uma solicitação já decidida, **When** o app tenta cancelar e a API responde
   `409 SOLICITACAO_NAO_PENDENTE`, **Then** mostra "Esta solicitação já foi decidida" e recarrega a
   lista.
5. **Given** duas solicitações para a mesma turma (`409 SOLICITACAO_DUPLICADA`) ou aluno já
   vinculado (`409 JA_VINCULADO`), **When** a API recusa, **Then** o app mostra a mensagem
   correspondente e recarrega a lista de disponíveis.
6. **Given** a turma foi desativada ou fechou inscrições (`404 TURMA_INDISPONIVEL`), **When** o
   aluno solicita, **Then** vê "Esta turma não está mais aceitando inscrições" e a lista é
   recarregada.
7. **Given** uma solicitação recusada, **When** o aluno a consulta, **Then** vê o status
   `Recusada`, a data da decisão e o motivo, quando houver.
8. **Given** uma solicitação aprovada, **When** o aluno volta a Minhas turmas, **Then** a turma
   aparece ali — sem nenhuma ação extra além de recarregar.

---

### User Story 5 — Consultar meu perfil (Priority: P5) — F1

**Acceptance Scenarios**:

1. **Given** usuário autenticado, **When** abre a aba Perfil, **Then** vê nome, usuário, perfil de
   acesso e as turmas em que tem vínculo.
2. **Given** a administração mudou seu perfil, **When** o app recarrega o perfil, **Then** o novo
   perfil aparece e os controles da interface se ajustam na mesma sessão.
3. **Given** o usuário toca em Sair, **When** confirma, **Then** o token e todo o cache local são
   apagados e o app volta ao login.

---

### User Story 6 — Ver a agenda e os horários (Priority: P6) — F2

**Acceptance Scenarios**:

1. **Given** eventos que alcançam o usuário, **When** abre a aba Agenda, **Then** vê a lista dos
   próximos, agrupados por data, com tipo, horário, local e destinos.
2. **Given** a visão de mês, **When** o usuário alterna para Mês, **Then** vê a grade do mês com um
   marcador em cada dia que tem atividade, o dia de hoje destacado e, abaixo, as atividades do dia
   selecionado.
3. **Given** um dia sem atividade, **When** é selecionado, **Then** a área inferior mostra "Nenhuma
   atividade neste dia".
4. **Given** um usuário vinculado a mais de uma turma, **When** abre Horários, **Then** escolhe a
   turma e vê a grade semanal com disciplina, horário, sala e docente.
5. **Given** um usuário sem vínculo, **When** abre Horários, **Then** vê o estado vazio explicando
   que a grade aparece depois do vínculo com uma turma.

### Edge Cases

- **Sem rede com cache**: a tela abre com o conteúdo guardado e uma faixa "Mostrando dados de
  {data/hora}. Sem conexão." com ação de tentar de novo.
- **Sem rede sem cache**: estado de erro com explicação e ação de tentar de novo; nunca tela em
  branco.
- **Erro do servidor (5xx)**: "Não foi possível carregar agora. Tente de novo em instantes."
- **Resposta lenta**: esqueleto de carregamento nas listas a partir de 300 ms; nada de diálogo
  bloqueante em leitura.
- **Token válido mas usuário desativado durante a sessão**: a primeira resposta `403
  USUARIO_INATIVO` encerra a sessão com a mensagem própria.
- **Código de erro desconhecido**: mensagem genérica, o `code` é registrado no log local e a tela
  permanece utilizável.
- **Relógio do aparelho adiantado**: o app não decide validade de token por conta própria; quem
  decide é a API, pelo `401`.
- **Conteúdo muito longo**: título de aviso com até 3 linhas na lista e reticências; o detalhe
  mostra o conteúdo inteiro, rolável.
- **Fonte ampliada pelo sistema**: layouts acompanham a escala até 200% sem cortar texto.

## 5. Requirements *(mandatory)*

Fase indicada entre colchetes. A coluna de rastreabilidade liga cada requisito ao da API.

### Sessão e identidade

- **RM-01 [F1]**: O app MUST autenticar o usuário por usuário e senha em `POST /auth/login` e
  guardar o token em armazenamento seguro do sistema (RF-01).
- **RM-02 [F1]**: O app MUST NOT persistir a senha do usuário em nenhuma forma (Princípio III).
- **RM-03 [F1]**: O app MUST enviar `Authorization: Bearer <token>` em toda chamada a recurso
  protegido (RF-04).
- **RM-04 [F1]**: Ao receber `401` em qualquer chamada, o app MUST encerrar a sessão, limpar o
  cache e levar ao login com aviso de sessão expirada (RF-05).
- **RM-05 [F1]**: Ao receber `403 USUARIO_INATIVO`, o app MUST encerrar a sessão com mensagem
  específica (RF-07).
- **RM-06 [F1]**: O app MUST decidir comportamento pelo campo `code` da resposta, nunca pelo texto
  de `detail` (contrato, "Formato de erro").
- **RM-07 [F1]**: Na abertura, havendo token guardado, o app MUST validar a sessão chamando
  `GET /me` antes de mostrar conteúdo, e seguir para o login se a chamada falhar com `401`/`403`.

### Perfil

- **RM-08 [F1]**: O app MUST exibir nome, usuário, perfil e turmas vinculadas obtidos em `GET /me`
  (RF-11).
- **RM-09 [F1]**: O app MUST reavaliar o perfil a cada abertura e a cada recarga do perfil,
  ajustando os controles visíveis sem exigir novo login (RF-04).
- **RM-10 [F1]**: O app MUST oferecer saída da conta, apagando token e cache local.

### Avisos

- **RM-11 [F1]**: O app MUST listar os avisos de `GET /avisos?situacao=ativo`, na ordem recebida,
  exibindo autor, data, título, trecho e todos os destinos de cada aviso (RF-21).
- **RM-12 [F1]**: O app MUST oferecer a lista de arquivados (`situacao=arquivado`) em alternância
  com a de ativos (RF-23).
- **RM-13 [F1]**: O app MUST abrir o detalhe por `GET /avisos/{id}` e mostrar conteúdo completo,
  autor, data de publicação e, quando houver, data de edição (RF-23, RF-25).
- **RM-14 [F1]**: O app MUST paginar as listas com `limit=20` e `offset`, carregando a próxima
  página ao fim da rolagem, e MUST exibir "nada mais a carregar" ao esgotar `total`.
- **RM-15 [F1]**: O app MUST oferecer recarregar puxando a lista para baixo.
- **RM-16 [F1]**: O app MUST apresentar o tipo de cada destino com rótulo e cor próprios — turma,
  semestre, docentes e todos (RF-20).
- **RM-17 [F1]**: O app MUST tratar `404 AVISO_NAO_ENCONTRADO` como "não está mais disponível",
  voltando à lista recarregada (RF-23).

### Turmas e solicitações

- **RM-18 [F1]**: O app MUST listar as turmas do usuário por `GET /turmas/minhas`, com o papel em
  cada uma (RF-16).
- **RM-19 [F1]**: Para o perfil `aluno`, o app MUST listar `GET /turmas/disponiveis` e permitir
  solicitar inscrição por `POST /turmas/{turma_id}/solicitacoes` (RF-12, RF-13).
- **RM-20 [F1]**: O app MUST NOT oferecer solicitação de inscrição a perfis diferentes de `aluno`,
  e MUST explicar a recusa caso receba `403 SEM_PERMISSAO` (RF-10).
- **RM-21 [F1]**: O app MUST listar `GET /solicitacoes/minhas` com status, data de envio, data de
  decisão e motivo de recusa quando houver (RF-15).
- **RM-22 [F1]**: O app MUST permitir cancelar solicitação pendente por
  `DELETE /solicitacoes/{id}`, com confirmação do usuário antes de chamar a API (RF-15).
- **RM-23 [F1]**: O app MUST tratar `409 SOLICITACAO_DUPLICADA`, `409 JA_VINCULADO`,
  `409 SOLICITACAO_NAO_PENDENTE` e `404 TURMA_INDISPONIVEL` com mensagens próprias e recarga da
  lista afetada (RF-14).

### Agenda e horários (F2)

- **RM-24 [F2]**: O app MUST listar os próximos eventos por `GET /eventos`, agrupados por data,
  com tipo, horário, local e destinos (RF-31).
- **RM-25 [F2]**: O app MUST oferecer a visão de mês, com marcador nos dias que têm atividade,
  destaque do dia atual e lista das atividades do dia selecionado (RF-31).
- **RM-26 [F2]**: O app MUST abrir o detalhe do evento por `GET /eventos/{id}` (RF-31).
- **RM-27 [F2]**: O app MUST exibir a grade semanal da turma por `GET /turmas/{id}/horarios`,
  permitindo trocar de turma quando houver mais de um vínculo (RF-31).

### Dados locais e disponibilidade

- **RM-28 [F1]**: O app MUST guardar localmente a última resposta bem-sucedida de perfil, avisos
  ativos (primeira página) e turmas do usuário, com a data e hora da coleta.
- **RM-29 [F1]**: Sem conexão, o app MUST exibir o conteúdo guardado com faixa informando a data
  dos dados; havendo conexão, MUST revalidar ao abrir a tela.
- **RM-30 [F1]**: O app MUST apagar todo o conteúdo guardado ao encerrar a sessão, por saída do
  usuário ou por `401`/`403 USUARIO_INATIVO`.
- **RM-31 [F1]**: O app MUST NOT guardar localmente o conteúdo de telas de outro usuário: o cache é
  associado ao `id` do usuário autenticado.

### Interface e acessibilidade

- **RM-32 [F1]**: Toda tela MUST ter os quatro estados definidos: carregando, conteúdo, vazio e
  erro, conforme a tabela da seção 6.
- **RM-33 [F1]**: Cores, tipografia, espaçamento e raios MUST vir do tema central derivado de
  `design/README.md`, sem valores soltos nas telas.
- **RM-34 [F1]**: Todo alvo de toque MUST ter no mínimo 48 dp e todo texto MUST atingir contraste
  AA (4.5:1; 3:1 para texto grande).
- **RM-35 [F1]**: Ícones e elementos sem texto visível MUST ter rótulo semântico em português para
  leitor de tela; a ordem de foco MUST seguir a ordem visual.
- **RM-36 [F1]**: As telas MUST acomodar a escala de fonte do sistema até 200% sem perda de
  conteúdo ou função.
- **RM-37 [F1]**: A interface MUST estar inteiramente em português do Brasil, com datas e horas no
  fuso do aparelho.

### Qualidade

- **RM-38 [F1]**: O app MUST registrar em log local (sem dados pessoais) o `code` e o endpoint de
  toda falha de API, para apoiar as evidências de teste.
- **RM-39 [F1]**: Nenhuma regra de visibilidade, permissão ou elegibilidade MUST ser reimplementada
  no app (Princípio I).
- **RM-40 [F1]**: Trocar o provedor de autenticação da API (mock → API de autenticação do IFSul)
  MUST NOT exigir alteração no app além das mensagens dos códigos de acesso (SC-005 da API).
- **RM-41 [emenda 06/11/2026]**: Ao receber `403 ACESSO_PENDENTE` ou `403 ACESSO_RECUSADO` no
  login (servidor que entrou pela primeira vez pela API do IFSul, emenda v2.3 da API), o app MUST
  permanecer no login com a mensagem própria de cada código, sem criar sessão.

### Key Entities

Espelham o contrato da API; o app não cria entidade própria de negócio.

- **Sessão**: token, data de expiração informada (`expires_in`) e usuário autenticado.
- **Usuário**: id, username, nome, perfil, turmas vinculadas com papel.
- **Turma**: id, código, nome, semestre do curso, período letivo e, quando vinculada, o papel.
- **Solicitação**: id, turma, status, data de envio, data de decisão, motivo de recusa.
- **Aviso**: id, título, conteúdo, autor, data de publicação, data de edição, situação, destinos.
- **Destino**: tipo (`todos`, `turma`, `semestre`, `docentes`) e referência.
- **Evento** (F2): título, descrição, tipo, início, fim, local, destinos.
- **Horário de turma** (F2): dia da semana, início, fim, disciplina, local, docente.
- **Conteúdo guardado**: resposta bruta de um endpoint, o usuário dono e a data da coleta.

## 6. Mapa Tela → Endpoint → Estados

Estados: **C** carregando · **V** vazio · **E** erro de rede/servidor · **401** sessão encerrada ·
**403** sem permissão · **404** não encontrado.

| Tela | Endpoint(s) | Estados tratados | Observações |
|---|---|---|---|
| T01 Login | `POST /auth/login` | C, E, 401 `CREDENCIAIS_INVALIDAS`, 403 `USUARIO_INATIVO`, 403 `ACESSO_PENDENTE`, 403 `ACESSO_RECUSADO`, 422 | Erro exibido acima do botão; senha limpa a cada falha |
| T02 Avisos ativos | `GET /avisos?situacao=ativo&limit=20&offset=` | C, V, E, 401 | Puxar para recarregar; rolagem infinita; usa cache quando offline |
| T03 Aviso detalhe | `GET /avisos/{id}` | C, E, 401, 404 | 404 → "não está mais disponível" e volta à lista |
| T04 Avisos arquivados | `GET /avisos?situacao=arquivado` | C, V, E, 401 | Mesma lista, outro filtro |
| T05 Avisos vazio | — | V | Atalho para turmas disponíveis apenas para `aluno` |
| T06 Minhas turmas | `GET /turmas/minhas` + `GET /solicitacoes/minhas?limit=3` | C, V, E, 401 | Solicitações recentes aparecem no rodapé da tela |
| T07 Turmas disponíveis | `GET /turmas/disponiveis` | C, V, E, 401, 403 `SEM_PERMISSAO` | Só alcançável por `aluno` |
| T08 Solicitação enviada | `POST /turmas/{id}/solicitacoes` | C (no botão), E, 403, 404 `TURMA_INDISPONIVEL`, 409 `JA_VINCULADO`, 409 `SOLICITACAO_DUPLICADA` | Folha de confirmação ao receber 201 |
| T09 Minhas solicitações | `GET /solicitacoes/minhas`, `DELETE /solicitacoes/{id}` | C, V, E, 401, 403, 404, 409 `SOLICITACAO_NAO_PENDENTE` | Cancelar pede confirmação |
| T14 Perfil | `GET /me` | C, E, 401, 403 `USUARIO_INATIVO` | Sair apaga token e cache |
| T10/T11 Agenda (F2) | `GET /eventos` | C, V, E, 401 | Visão de lista e de mês sobre a mesma coleção |
| T12 Evento (F2) | `GET /eventos/{id}` | C, E, 401, 404 | |
| T13 Horários (F2) | `GET /turmas/{id}/horarios` | C, V, E, 401, 403, 404 | Seletor de turma a partir de `GET /turmas/minhas` |

### Mensagens por código

| code | Mensagem ao usuário | Efeito |
|---|---|---|
| `CREDENCIAIS_INVALIDAS` | Usuário ou senha incorretos. | Permanece no login |
| `USUARIO_INATIVO` | Seu acesso está desativado. Procure a coordenação. | Encerra a sessão |
| `ACESSO_PENDENTE` | Seu acesso está aguardando liberação da coordenação ou da administração. | Encerra a sessão (no login, permanece) |
| `ACESSO_RECUSADO` | Seu acesso não foi liberado. Procure a coordenação do curso. | Encerra a sessão (no login, permanece) |
| `NAO_AUTENTICADO` | Sua sessão expirou. Entre de novo. | Encerra a sessão |
| `SEM_PERMISSAO` | Esta ação não está disponível para o seu perfil. | Permanece na tela |
| `TURMA_INDISPONIVEL` | Esta turma não está mais aceitando inscrições. | Recarrega disponíveis |
| `JA_VINCULADO` | Você já faz parte desta turma. | Recarrega disponíveis |
| `SOLICITACAO_DUPLICADA` | Você já tem uma solicitação pendente para esta turma. | Abre Minhas solicitações |
| `SOLICITACAO_NAO_PENDENTE` | Esta solicitação já foi decidida. | Recarrega a lista |
| `SOLICITACAO_NAO_ENCONTRADA` | Esta solicitação não existe mais. | Recarrega a lista |
| `AVISO_NAO_ENCONTRADO` | Este aviso não está mais disponível. | Volta à lista |
| `EVENTO_NAO_ENCONTRADO` | Este evento não está mais disponível. | Volta à agenda (F2) |
| `VALIDATION_ERROR` | Confira os campos destacados. | Marca os campos de `errors[]` |
| sem rede | Sem conexão. Verifique a rede e tente de novo. | Oferece repetir |
| 5xx ou `code` desconhecido | Não foi possível carregar agora. Tente de novo em instantes. | Oferece repetir |

## 7. Design System

Origem única: `design/README.md` e as telas em `design/mobile/`.

| Token | Valor | Uso |
|---|---|---|
| `navy` | `#132A4E` | Títulos, textos fortes, marca, seleção de dia |
| `navySoft` | `#2A4374` | Textos de apoio em destaque, prazos |
| `blue` | `#2563EB` | Ações, links, aba ativa, destino turma |
| `blueSurface` | `#EFF4FF` | Fundos de chip e de seleção |
| `pageBg` | `#F5F8FC` | Fundo de listas em cartões |
| `line` / `lineSoft` | `#E4E9F2` / `#EFF2F7` | Bordas e separadores |
| `muted` / `faint` | `#5B6B86` / `#8A99B0` | Texto secundário e metadados |
| `warning` | `#B45309` sobre `#FDF4E6` | Pendente, agendado, prova |
| `success` | `#15803D` sobre `#E9F6EE` | Aprovado, ativo, destino "todos" |
| `danger` | `#B91C1C` sobre `#FCECEC` | Recusado, sair, erro |

- Tipografia: **Inter**, pesos 400 a 800, sem serifa. Escala: 11, 12, 12,5, 13, 13,5, 14, 15, 17,
  20, 26. Títulos com entreletra −0,02 em.
- Superfícies brancas com borda de 1 px (sem sombra), raio 10–12 px; sombra só em folhas e
  diálogos.
- Componentes compartilhados: chip de destino, selo de situação, cartão de aviso, cartão de turma,
  linha de evento, estado vazio, faixa de dados em cache, barra de abas.
- O **chip de destino** é o elemento de identidade do produto: ponto colorido por tipo + rótulo.

## 8. Success Criteria *(mandatory)*

- **SC-001**: Do toque em Entrar até a lista de avisos visível, no máximo 5 s em rede normal
  (mesma meta da API).
- **SC-002**: 100% das telas de lista apresentam os quatro estados (carregando, conteúdo, vazio,
  erro) verificáveis em teste de widget.
- **SC-003**: Nenhum aviso é exibido fora do que a API devolveu — zero filtragem de visibilidade
  feita pelo app, verificável por teste de integração com respostas falsas.
- **SC-004**: Qualquer `401` leva ao login em até uma interação, sem tela quebrada, em 100% dos
  casos testados.
- **SC-005**: Com o aparelho em modo avião e cache preenchido, as abas Avisos, Turmas e Perfil
  abrem com conteúdo e faixa de data em 100% das tentativas.
- **SC-006**: O token não aparece em nenhum arquivo de preferências, log ou cache — verificável por
  inspeção do armazenamento após o login.
- **SC-007**: Todas as telas passam na verificação de contraste AA e de alvo de toque de 48 dp.
- **SC-008**: Trocar o provedor de autenticação na API não exige nenhuma alteração no app.

## 9. Assumptions

- A API está disponível em uma URL configurável por ambiente; em desenvolvimento, o app aponta para
  a instância local da API com o provedor mock.
- O contrato E1 é o que está em `contracts/api.md`; mudanças nele exigem revisão desta spec.
- Os endpoints de agenda e horários seguem o mesmo padrão de paginação, erro e destinos,
  conforme `projeto-api/specs/002-agenda-horarios/contracts/api.md`; a implementação de F2 começa
  quando a E3 estiver implementada na API.
- Não há limite de vagas por turma nesta fase, e o app não exibe contagem de vagas.
- A data e hora exibidas usam o fuso do aparelho a partir dos valores ISO-8601 UTC da API.
- Uso em telefone, orientação retrato; tablet e paisagem ficam para depois.

## 10. Clarifications

### Sessão 2026-10-13

- **P: O app revalida a sessão na abertura ou confia no token guardado?**
  R: Revalida chamando `GET /me` antes de exibir conteúdo. O perfil pode ter mudado e o usuário
  pode ter sido desativado; a API é quem decide (RM-07).
- **P: Coordenação e administração usam o app?**
  R: Sim, com acesso de leitura. Sem vínculo, recebem apenas avisos de destino `todos` e lista de
  turmas vazia. O app não esconde as abas, mostra os estados vazios explicando (seção 2).
- **P: O que fica guardado para uso offline?**
  R: Perfil, primeira página de avisos ativos e turmas do usuário, por usuário, com data da coleta.
  Nada é guardado de telas de gestão e nada sobrevive à saída da conta (RM-28 a RM-31).
- **P: O app aplica alguma regra de visibilidade própria?**
  R: Não. Ele pode esconder controles inúteis ao perfil corrente, mas a decisão é sempre da API, e
  `403` é tratado como resposta legítima (RM-39, Princípio I).
- **P: Agenda e horários entram já?**
  R: Entram como fase F2, com requisitos e telas definidos. *Atualizado em 13/10/2026*: a spec E3
  da API foi publicada (`002-agenda-horarios`), com `de`/`ate` e `incluir_encerrados` em
  `GET /eventos` — o que a visão de mês exigia. A fase F2 aguarda agora a implementação da E3.
- **P: Há notificação push?**
  R: Não nesta spec. O usuário vê os avisos ao abrir o app; push é possibilidade futura registrada
  na arquitetura.

## 11. Rastreabilidade

| Requisito do app | Requisito da API | Tela | Teste |
|---|---|---|---|
| RM-01 a RM-07 | RF-01, RF-04, RF-05, RF-07 | T01 | unidade `session_controller_test`, `auth_repository_test`, `cofre_sessao_test`, `api_client_test`; widget `login_test`, `app_test`; integração `sessao_test` |
| RM-41 | RF-50 (emenda v2.3) | T01 | unidade `api_failure_test`, `mensagens_spec_test`; widget `login_test` |
| RM-08 a RM-10 | RF-11 | T14 | unidade `session_controller_test`; widget `perfil_test`; integração `perfil_atualizado_test`, `sessao_test` |
| RM-11 a RM-17 | RF-20 a RF-23, RF-25 | T02–T05 | unidade `avisos_repository_test`, `avisos_controller_test`; widget `avisos_lista_test`, `aviso_detalhe_test`; integração `avisos_test` |
| RM-18 a RM-23 | RF-12 a RF-16 | T06–T09 | unidade `turmas_repository_test`, `turmas_controller_test`, `solicitacoes_repository_test`, `solicitacoes_controller_test`; widget `turmas_test`, `solicitacoes_test`; integração `solicitacao_fluxo_test` |
| RM-24 a RM-26 | RF-37, RF-38 (E3) | T10–T12 | unidade `evento_test`, `eventos_repository_test`, `calendario_test`; widget `agenda_page_test`, `mes_view_test`, `detalhe_evento_test`; integração `agenda_test` |
| RM-27 | RF-45 (E3) | T13 | unidade `aula_test`, `horarios_repository_test`; widget `horarios_page_test`; integração `horarios_test` |
| RM-28 a RM-31 | — | T02, T06, T10–T14 | unidade `cache_local_test`, `eventos_repository_test`, `horarios_repository_test`; widget `avisos_lista_test`, `turmas_test`, `perfil_test`, `agenda_page_test`, `mes_view_test`, `horarios_page_test`; integração `offline_test` (SC-005, também agenda, mês corrente, detalhe e grade), `token_seguro_test` (SC-006) |
| RM-32 a RM-37 | — | todas | widget `comum_test` (estados), `acessibilidade_test` (contraste, 48 dp, rótulos e ordem de leitura; SC-007), `escala_fonte_test` (200%) |
| RM-38 a RM-40 | SC-005 da API | todas | unidade `api_client_test` (registro de falhas), `api_failure_test`, `mensagens_spec_test` (tabela da seção 6); integração `erro_desconhecido_test` |

Relatórios de execução e comparação com o design: F1 em
[`evidencias/RELATORIO.md`](../../evidencias/RELATORIO.md), F2 em
[`evidencias/RELATORIO-F2.md`](../../evidencias/RELATORIO-F2.md).
