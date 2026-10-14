# Feature Specification: Plataforma Web de Gestão

**Feature Branch**: `001-plataforma-gestao`

**Created**: 2026-10-13

**Status**: Draft

**Input**: Plataforma web de gestão do CONECTA, para administração, coordenação e docentes.
Consome exclusivamente a API REST descrita em
`projeto-api/specs/001-auth-perfil-turmas-avisos/contracts/api.md` (seções 10 a 15, `/gestao/*`,
além de login e perfil). As telas estão desenhadas em `design/web/` e os tokens visuais em
`design/README.md`.

**Referências**

| Documento | Para quê |
|---|---|
| `projeto-api/specs/001-auth-perfil-turmas-avisos/spec.md` | Regras de negócio, matriz de permissões, ciclo de vida do aviso |
| `projeto-api/specs/001-auth-perfil-turmas-avisos/contracts/api.md` | Endpoints, campos, códigos de erro |
| `projeto-mobile/specs/001-app-conecta/spec.md` | Lado consumidor: o que o aluno recebe do que é publicado aqui |
| `design/web/*.png` | Telas desenhadas |
| `design/README.md` | Paleta, tipografia e regras visuais |

## 1. Escopo e Fases

A plataforma web é onde a informação **entra** no sistema. Tudo que ela publica é consumido pelo
aplicativo mobile. Ela não é usada por alunos: o perfil `aluno` recebe `403` em qualquer rota de
gestão e é orientado a usar o aplicativo.

### 1.1 Objetivos do TCC cobertos

| ID | Objetivo específico do TCC |
|---|---|
| O1 | Plataforma web para cadastro, edição, exclusão e gerenciamento das informações acadêmicas |
| O3 | Mecanismo de autenticação, com acesso conforme o perfil |
| O4 | Perfis distintos de acesso, com atribuição pela administração |
| O5 | Agenda acadêmica (fase F2) |
| O6 | Cadastro dos horários das turmas (fase F2) |
| O7, O8 | Publicação de avisos direcionados a grupos |
| O12 | Histórico, versões e rastreabilidade |
| O13, O14 | Estrutura modular e testes com evidências |

### 1.2 Fases

| Fase | Conteúdo | Depende de | Situação |
|---|---|---|---|
| **F1 — Gestão** | Login e sessão, painel, avisos (lista, editor com destinos e agendamento, histórico e versões, arquivar/desarquivar/excluir), turmas, vínculos, solicitações, usuários e perfis | Endpoints **E2** (seções 10–15 do contrato), já especificados | **Detalhada nesta spec; é o que será implementado primeiro** |
| **F2 — Agenda e horários** | Gestão de eventos e da grade de horários das turmas | Endpoints **E3**, especificados em `projeto-api/specs/002-agenda-horarios` | **Requisitos e telas definidos nesta spec; implementação começa quando a E3 estiver implementada na API** |

Regra de fase: nenhuma tela de F2 é implementada enquanto os endpoints E3 não existirem. A
navegação já prevê os itens de F2; até lá eles não são exibidos.

### 1.3 Fora de escopo

- Qualquer funcionalidade de aluno: consulta de avisos recebidos, solicitação de inscrição,
  minhas turmas. Isso é do aplicativo mobile.
- Notificações push e envio de e-mail.
- Relatórios, exportação de dados e estatísticas de leitura.
- Cadastro de usuário e recuperação de senha: a identidade vem do provedor externo.
- Uso em telefone. A plataforma é projetada para 1280 px ou mais; abaixo disso ela funciona, mas
  o desenho não é otimizado.

## 2. Usuários da Plataforma

| Perfil | O que faz aqui | Limites |
|---|---|---|
| `administrador` | Tudo que a coordenação faz, mais atribuir perfis e ativar/desativar usuários | Não pode desativar a si próprio nem rebaixar o último administrador ativo |
| `coordenacao` | Turmas, vínculos, solicitações, avisos para qualquer destino, consulta de usuários | Não altera perfil de ninguém |
| `docente` | Avisos das turmas em que leciona (criar, editar, arquivar, excluir os próprios), decidir solicitações dessas turmas, consultar suas turmas e vínculos | Não publica para `todos`, `semestre` ou `docentes`; não gere turmas, vínculos nem usuários |
| `aluno` | Nada | Recebe `403` e a orientação de usar o aplicativo |

A interface esconde o que não cabe ao perfil, mas a decisão é sempre da API (Princípio I).

## 3. Navegação e Inventário de Telas

Barra lateral fixa, agrupada por assunto. Os itens visíveis dependem do perfil; os de F2 só
aparecem quando a fase estiver liberada.

```
Acompanhar     Painel
Comunicação    Avisos · Agenda*
Acadêmico      Turmas · Horários* · Solicitações
Administração  Usuários                              * F2 · Administração: só administrador
```

| # | Tela | Imagem | Perfis | Fase |
|---|---|---|---|---|
| T01 | Login | `design/web/w-01-login.png` | todos | F1 |
| T02 | Painel — coordenação | `w-02-painel-coordenacao.png` | admin, coordenação | F1 |
| T03 | Avisos — lista por situação | `w-03-avisos-lista.png` | todos de gestão | F1 |
| T04 | Aviso — editor | `w-04-aviso-editor.png` | admin, coordenação | F1 |
| T05 | Aviso — seletor de destinos | `w-05-aviso-destinos.png` | admin, coordenação | F1 |
| T06 | Aviso — histórico e versões | `w-06-aviso-historico.png` | todos de gestão | F1 |
| T07 | Turmas | `w-07-turmas.png` | admin, coordenação | F1 |
| T08 | Turma — detalhe e vínculos | `w-08-turma-detalhe.png` | admin, coordenação; docente (leitura) | F1 |
| T09 | Solicitações de inscrição | `w-09-solicitacoes.png` | admin, coordenação, docente | F1 |
| T10 | Usuários | `w-10-usuarios.png` | admin, coordenação (leitura) | F1 |
| T11 | Alterar perfil de acesso | `w-11-alterar-perfil.png` | somente admin | F1 |
| T12 | Agenda — eventos | `w-12-agenda.png` | admin, coordenação, docente | F2 |
| T13 | Horários da turma | `w-13-horarios.png` | admin, coordenação | F2 |
| T14 | Painel — docente | `w-14-painel-docente.png` | docente | F1 |
| T15 | Aviso — editor do docente | `w-15-aviso-editor-docente.png` | docente | F1 |
| T16 | Sem permissão | `w-16-sem-permissao.png` | todos | F1 |

Rotas: `/login`, `/painel`, `/avisos`, `/avisos/novo`, `/avisos/[id]`, `/avisos/[id]/editar`,
`/avisos/[id]/historico`, `/turmas`, `/turmas/[id]`, `/solicitacoes`, `/usuarios`,
`/eventos` e `/turmas/[id]/horarios` (F2), `/sem-permissao`.

## 4. User Scenarios & Testing *(mandatory)*

### User Story 1 — Entrar na plataforma (Priority: P1) — F1

**Independent Test**: entrar com cada perfil e verificar o destino; tentar entrar como aluno.

**Acceptance Scenarios**:

1. **Given** credenciais válidas de coordenação, **When** o usuário entra, **Then** a sessão é
   criada pela API em cookie `httpOnly`, inacessível ao JavaScript, e ele chega ao painel da
   coordenação.
2. **Given** credenciais válidas de docente, **When** entra, **Then** chega ao painel do docente,
   com a navegação restrita às suas turmas.
3. **Given** credenciais de aluno, **When** entra, **Then** vê a tela de sem permissão explicando
   que a gestão é para administração, coordenação e docentes, e que avisos e turmas ficam no
   aplicativo — e a sessão é encerrada.
4. **Given** credenciais inválidas, **When** tenta entrar, **Then** vê "Usuário ou senha
   incorretos", sem indicar se o usuário existe.
5. **Given** usuário desativado, **When** tenta entrar, **Then** vê a mensagem de acesso
   desativado e permanece no login.
6. **Given** sessão válida, **When** o usuário fecha e reabre o navegador dentro das 24 h,
   **Then** continua autenticado sem novo login.
7. **Given** token expirado ou revogado, **When** qualquer página ou ação chama a API e recebe
   `401`, **Then** o cookie é removido e o usuário volta ao login com "Sua sessão expirou".
8. **Given** um usuário sem sessão, **When** acessa `/avisos` diretamente pela URL, **Then** é
   levado ao login e, após entrar, segue para a página pedida.

---

### User Story 2 — Publicar um aviso para o público certo (Priority: P2) — F1

Valor central da plataforma: é aqui que nasce o que o aplicativo entrega.

**Independent Test**: como coordenação, publicar um aviso para três turmas e verificar, no
aplicativo ou na API, que só os alcançados o recebem.

**Acceptance Scenarios**:

1. **Given** coordenação autenticada, **When** abre o editor, preenche título e conteúdo, escolhe
   três turmas como destino e publica, **Then** a API cria o aviso na versão 1 e ele aparece na
   lista como `Ativo`.
2. **Given** o seletor de destinos aberto, **When** o usuário escolhe por turma, por semestre, por
   docentes ou todos, **Then** cada destino escolhido vira um chip removível, e o total respeita o
   limite de 20 destinos informado pela API.
3. **Given** um aviso sendo redigido, **When** o usuário escolhe agendar e informa data e hora no
   futuro, **Then** o aviso é criado com situação `Agendado` e não aparece no aplicativo até a
   data; **When** informa data no passado, **Then** a API recusa e o campo é marcado.
4. **Given** nenhum destino escolhido, **When** o usuário tenta publicar, **Then** a interface
   impede e explica que o aviso precisa de pelo menos um destino.
5. **Given** um docente autenticado, **When** abre o editor, **Then** só enxerga como destino as
   turmas em que leciona; `todos`, `semestre` e `docentes` aparecem desabilitados com a explicação
   de que são da coordenação.
6. **Given** um docente que perdeu o vínculo com uma turma enquanto redigia, **When** publica e a
   API responde `403 DESTINO_NAO_PERMITIDO`, **Then** a interface explica e recarrega as turmas
   disponíveis, preservando o texto já escrito.
7. **Given** um aviso publicado, **When** o autor o edita, **Then** a API cria uma nova versão,
   `editado_em` é preenchido e a lista passa a exibir a marca de editado.
8. **Given** um aviso arquivado ou excluído, **When** alguém tenta editá-lo e a API responde
   `409 AVISO_NAO_EDITAVEL`, **Then** a interface explica a situação e oferece desarquivar, quando
   couber.

---

### User Story 3 — Acompanhar e auditar o que foi publicado (Priority: P3) — F1

**Acceptance Scenarios**:

1. **Given** avisos em situações diferentes, **When** a coordenação abre a lista, **Then** vê
   autor, destinos, data de publicação e situação, podendo alternar entre ativos, agendados,
   arquivados e excluídos.
2. **Given** um docente, **When** abre a lista, **Then** vê somente os avisos que publicou.
3. **Given** um aviso editado duas vezes, **When** alguém abre o histórico, **Then** vê a linha do
   tempo de eventos — criado, editado, arquivado, desarquivado, excluído — com autor, data e, nas
   edições, o que mudou de cada campo.
4. **Given** o mesmo aviso, **When** alguém abre as versões, **Then** vê cada versão com título,
   conteúdo, destinos e quem a criou, com a atual destacada.
5. **Given** um aviso excluído, **When** a coordenação filtra por excluídos, **Then** ele aparece
   e seu histórico continua consultável — a exclusão é lógica.
6. **Given** um aviso arquivado, **When** alguém o desarquiva, **Then** ele volta à lista de
   ativos e dois eventos ficam registrados.

---

### User Story 4 — Gerir turmas e vínculos (Priority: P4) — F1

**Acceptance Scenarios**:

1. **Given** coordenação, **When** cria uma turma com código, nome, semestre e período letivo,
   **Then** a turma passa a existir, ativa, e aparece na lista.
2. **Given** um código já usado, **When** tenta criar, **Then** a API responde
   `409 CODIGO_TURMA_DUPLICADO` e o campo de código é marcado com a explicação.
3. **Given** uma turma, **When** a coordenação vincula um docente ou um aluno, **Then** o vínculo
   aparece na lista da turma e passa a valer imediatamente para avisos.
4. **Given** um usuário cujo perfil não corresponde ao papel, **When** a coordenação tenta
   vincular e a API responde `409 PERFIL_INCOMPATIVEL`, **Then** a interface explica que o papel
   precisa corresponder ao perfil da pessoa.
5. **Given** um vínculo existente, **When** é removido, **Then** a pessoa perde acesso aos avisos
   da turma, e a interface alerta sobre esse efeito antes de confirmar.
6. **Given** uma turma ativa, **When** a coordenação fecha as inscrições, **Then** ela deixa de
   aparecer para o aluno solicitar, mas os vínculos permanecem.
7. **Given** uma turma, **When** é desativada, **Then** a interface alerta que os avisos por turma
   e por semestre deixam de ser entregues, e os vínculos são preservados.

---

### User Story 5 — Decidir solicitações de inscrição (Priority: P5) — F1

**Acceptance Scenarios**:

1. **Given** solicitações pendentes, **When** a coordenação abre a tela, **Then** vê aluno, turma
   e data de envio, com as mais antigas sinalizadas.
2. **Given** uma solicitação pendente, **When** é aprovada, **Then** o vínculo é criado na mesma
   operação e a lista é atualizada mostrando quem decidiu e quando.
3. **Given** uma solicitação pendente, **When** é recusada, **Then** a interface oferece registrar
   um motivo opcional, que o aluno verá no aplicativo.
4. **Given** um docente, **When** abre a tela, **Then** vê apenas as solicitações das turmas em
   que leciona; ao tentar decidir outra e receber `403`, vê a explicação.
5. **Given** uma solicitação já decidida por outra pessoa, **When** alguém tenta decidir de novo e
   a API responde `409 SOLICITACAO_NAO_PENDENTE`, **Then** a interface informa e recarrega.

---

### User Story 6 — Administrar usuários e perfis (Priority: P6) — F1

**Acceptance Scenarios**:

1. **Given** administrador, **When** abre Usuários, **Then** vê a lista com perfil, vínculos,
   último acesso e situação, podendo filtrar por perfil e por situação e buscar por nome.
2. **Given** um usuário, **When** o administrador altera o perfil, **Then** a mudança vale na
   requisição seguinte daquela pessoa, sem precisar que ela saia e entre de novo.
3. **Given** coordenação, **When** abre Usuários, **Then** consulta a lista, mas não vê a ação de
   alterar perfil; se tentar pela URL e receber `403`, vê a tela de sem permissão.
4. **Given** um usuário com vínculos incompatíveis com o novo perfil, **When** o administrador
   salva e a API responde `409 PERFIL_INCOMPATIVEL`, **Then** a interface explica o conflito.
5. **Given** o próprio administrador, **When** tenta desativar a si mesmo ou rebaixar o último
   administrador ativo, **Then** a API recusa e a interface explica o motivo.
6. **Given** um usuário desativado, **When** a situação é salva, **Then** a lista o mostra como
   inativo e ele perde o acesso imediatamente.

---

### User Story 7 — Gerir agenda e horários (Priority: P7) — F2

**Acceptance Scenarios**:

1. **Given** coordenação, **When** cria um evento com tipo, data, local e destinos, **Then** ele
   passa a constar na agenda de quem é alcançado, com o mesmo mecanismo de destinos dos avisos.
2. **Given** um evento, **When** é editado ou arquivado, **Then** vale a mesma política de versões
   e histórico dos avisos.
3. **Given** uma turma, **When** a coordenação monta a grade semanal, **Then** cada aula registra
   dia, horário, disciplina, local e docente, e os alunos vinculados passam a ver a grade no
   aplicativo.
4. **Given** uma mudança na grade, **When** é salva, **Then** a interface lembra que isso não gera
   aviso automático e oferece criar um aviso para a turma.

### Edge Cases

- **Sessão encerrada no meio de um formulário**: o `401` leva ao login; ao reentrar, o usuário
  volta à página em que estava. O conteúdo não salvo é preservado em rascunho local, sem o token.
- **Dois editores no mesmo aviso**: a segunda gravação vence; o histórico registra as duas
  edições, e a interface mostra a versão atualizada após salvar.
- **Edição sem mudança real**: a API responde `422` ("nenhuma alteração") e a interface informa
  que nada foi alterado, sem tratar como falha.
- **Lista vazia**: cada tela tem estado vazio próprio, com a ação mais provável — "Nenhuma
  solicitação pendente", "Nenhuma turma cadastrada", "Nenhum aviso nesta situação".
- **Erro do servidor (5xx)**: mensagem de indisponibilidade com ação de tentar de novo, sem perder
  o que foi digitado.
- **Rede caindo durante uma ação de escrita**: a interface informa que não foi possível concluir e
  mantém o formulário intacto; nada é dado como salvo sem resposta da API.
- **`code` desconhecido**: mensagem genérica, registro em log do servidor e a tela permanece
  utilizável.
- **Acesso direto por URL a uma tela sem permissão**: o servidor responde com a tela de sem
  permissão, sem expor dados.
- **Turma inativa referenciada como destino**: a API recusa com `422`; a interface marca o destino
  problemático em vez de recusar o formulário inteiro.

## 5. Requirements *(mandatory)*

Fase entre colchetes. A coluna de rastreabilidade liga cada requisito ao da API.

### Sessão e acesso

- **RW-01 [F1]**: A plataforma MUST autenticar por `POST /auth/login` enviando
  `credentials: 'include'`, e a **API** MUST responder com o cookie de sessão `httpOnly`,
  `Secure`, `SameSite=Strict`, válido por 24 h (RF-01, RF-04, RF-32).
- **RW-02 [F1]**: O token MUST NOT ser lido, guardado ou manipulado por código do navegador em
  nenhuma hipótese (Princípio III).
- **RW-03 [F1]**: Toda chamada à API MUST ser feita com `credentials: 'include'` e, nos métodos
  de escrita, MUST carregar a proteção CSRF definida pela API (RF-32).
- **RW-04 [F1]**: Ao receber `401`, a plataforma MUST remover o cookie e levar ao login com aviso
  de sessão expirada, preservando o destino pretendido (RF-05).
- **RW-05 [F1]**: Ao receber `403 USUARIO_INATIVO`, MUST encerrar a sessão com mensagem própria
  (RF-07).
- **RW-06 [F1]**: Usuário de perfil `aluno` MUST ver a tela de sem permissão com orientação para
  usar o aplicativo, e a sessão MUST ser encerrada (RF-10).
- **RW-07 [F1]**: Rota acessada sem sessão MUST levar ao login e, após autenticar, seguir para a
  rota pretendida.
- **RW-08 [F1]**: A plataforma MUST decidir comportamento pelo campo `code`, nunca pelo texto de
  `detail`.
- **RW-09 [F1]**: A plataforma MUST oferecer encerrar a sessão, removendo o cookie.

### Navegação e perfil

- **RW-10 [F1]**: O perfil do usuário MUST ser obtido por `GET /me` a cada carregamento de página
  no servidor, de modo que mudança de perfil valha imediatamente (RF-04).
- **RW-11 [F1]**: A navegação MUST exibir apenas os itens compatíveis com o perfil corrente; o
  item Usuários MUST aparecer somente para administração e coordenação, e a ação de alterar perfil
  somente para administração (RF-09, RF-10).
- **RW-12 [F1]**: Toda tela MUST tratar `403 SEM_PERMISSAO` exibindo a tela de sem permissão, sem
  revelar dados (Princípio I).

### Avisos

- **RW-13 [F1]**: A plataforma MUST listar avisos por `GET /gestao/avisos`, com filtro por
  situação (ativo, agendado, arquivado, excluído), autor, turma e busca textual (RF-24).
- **RW-14 [F1]**: A lista MUST exibir, para cada aviso, título, autor, destinos, data de
  publicação, situação e número da versão atual.
- **RW-15 [F1]**: A plataforma MUST criar avisos por `POST /gestao/avisos` com título, conteúdo, 1
  a 20 destinos e agendamento opcional (RF-20, RF-24).
- **RW-16 [F1]**: O seletor de destinos MUST permitir escolher turmas, semestres, docentes e
  todos, mostrando cada escolha como chip removível e impedindo repetição (RF-20).
- **RW-17 [F1]**: Para o perfil `docente`, o seletor MUST oferecer apenas as turmas em que ele
  leciona e apresentar os demais tipos como indisponíveis, com explicação (3.3 da spec da API).
- **RW-18 [F1]**: A plataforma MUST editar avisos por `PATCH /gestao/avisos/{id}`, enviando a
  lista completa de destinos quando ela mudar, e MUST informar que a edição cria nova versão
  (RF-25).
- **RW-19 [F1]**: A plataforma MUST arquivar, desarquivar e excluir avisos pelos endpoints
  correspondentes, pedindo confirmação em arquivar e excluir e explicando o efeito de cada um
  (RF-26).
- **RW-20 [F1]**: A plataforma MUST exibir o histórico de eventos (`GET …/historico`) como linha
  do tempo com tipo, autor, data e, nas edições, os campos alterados com valor anterior e novo
  (RF-27, RF-28).
- **RW-21 [F1]**: A plataforma MUST exibir as versões (`GET …/versoes`) com título, conteúdo,
  destinos, autor e data, destacando a atual (RF-28).
- **RW-22 [F1]**: A plataforma MUST deixar claro, antes de publicar, quem será alcançado pelo
  aviso, mostrando os destinos escolhidos e uma prévia do cartão como aparece no aplicativo.

### Turmas e vínculos

- **RW-23 [F1]**: A plataforma MUST listar turmas por `GET /gestao/turmas` com filtros de
  situação, semestre e período letivo e busca textual (RF-18).
- **RW-24 [F1]**: A plataforma MUST criar e editar turmas pelos endpoints correspondentes,
  validando código único, semestre de 1 a 12 e período no formato `AAAA/N` (RF-18).
- **RW-25 [F1]**: A plataforma MUST permitir abrir e fechar inscrições e desativar a turma,
  explicando o efeito de cada operação antes de confirmar (RF-18).
- **RW-26 [F1]**: A plataforma MUST listar, criar e remover vínculos de uma turma, indicando o
  papel e a origem de cada um (RF-19).
- **RW-27 [F1]**: Antes de remover um vínculo, MUST alertar que a pessoa perde o acesso imediato
  aos avisos da turma (3.1 da spec da API).

### Solicitações

- **RW-28 [F1]**: A plataforma MUST listar solicitações por `GET /gestao/solicitacoes`, com filtro
  por status e turma, destacando as pendentes há mais tempo (RF-17).
- **RW-29 [F1]**: A plataforma MUST aprovar e recusar solicitações pelos endpoints próprios,
  oferecendo motivo opcional na recusa (RF-17).
- **RW-30 [F1]**: Após decidir, a lista MUST ser atualizada mostrando quem decidiu e quando.

### Usuários e perfis

- **RW-31 [F1]**: A plataforma MUST listar usuários por `GET /gestao/usuarios`, com busca e
  filtros de perfil e situação (RF-09).
- **RW-32 [F1]**: Somente para administração, a plataforma MUST permitir alterar perfil e
  ativar/desativar por `PATCH /gestao/usuarios/{id}`, explicando que a mudança é imediata (RF-09).
- **RW-33 [F1]**: A plataforma MUST apresentar, no seletor de perfil, o que cada perfil pode
  fazer, conforme a matriz de permissões da API.

### Agenda e horários (F2)

- **RW-34 [F2]**: A plataforma MUST permitir criar, editar, arquivar e excluir eventos com tipo,
  data, local e destinos, com versões e histórico iguais aos dos avisos (RF-31).
- **RW-35 [F2]**: A plataforma MUST permitir montar a grade semanal de uma turma, com dia,
  horário, disciplina, local e docente (RF-31).
- **RW-36 [F2]**: Ao salvar mudança de horário, MUST oferecer criar um aviso para a turma,
  deixando claro que a alteração não notifica ninguém sozinha.
- **RW-46 [F2]**: Ao criar ou editar um horário, a plataforma MUST exibir os conflitos de sala e
  de docente devolvidos pela API, sem tratá-los como erro — a decisão de manter ou ajustar é de
  quem cadastra (RF-44 da E3).

### Interface, acessibilidade e qualidade

- **RW-37 [F1]**: Toda tela MUST ter os estados definidos: carregando, conteúdo, vazio e erro.
- **RW-38 [F1]**: Cores, tipografia e espaçamento MUST vir do tema derivado de `design/README.md`,
  compartilhando a linguagem visual do aplicativo (Princípio V).
- **RW-39 [F1]**: Toda funcionalidade MUST ser operável por teclado, com foco visível, e modais
  MUST prender o foco, fechar com `Esc` e devolver o foco à origem.
- **RW-40 [F1]**: Tabelas MUST associar cabeçalhos às células e anunciar mudanças de carregamento
  a leitores de tela; nenhuma informação MUST depender só de cor.
- **RW-41 [F1]**: Toda ação destrutiva ou de efeito amplo — excluir, desativar turma, remover
  vínculo, desativar usuário — MUST pedir confirmação explicando a consequência.
- **RW-42 [F1]**: Formulários MUST preservar o que foi digitado diante de erro da API ou queda de
  rede, e marcar os campos devolvidos em `errors[]` de `VALIDATION_ERROR`.
- **RW-43 [F1]**: Nenhuma regra de visibilidade, permissão ou elegibilidade MUST ser
  reimplementada na plataforma (Princípio I).
- **RW-44 [F1]**: O build MUST NOT conter segredo de qualquer natureza — chave, credencial ou
  token. A única configuração embutida é a URL base da API, que é pública por natureza
  (Princípio IV).
- **RW-45 [F1]**: A plataforma MUST ser distribuída como arquivos estáticos, servida na mesma
  origem da API, e MUST funcionar em qualquer servidor web com o redirecionamento de rotas
  desconhecidas para `index.html` (Princípio IV).

### Key Entities

Espelham o contrato da API; a plataforma não cria entidade própria de negócio.

- **Sessão**: cookie com o token, usuário autenticado e perfil corrente.
- **Usuário de gestão**: id, username, nome, perfil, ativo, último acesso, vínculos.
- **Turma**: código, nome, semestre do curso, período letivo, inscrições abertas, ativa, totais de
  alunos e docentes.
- **Vínculo**: usuário, papel, origem (manual ou solicitação), data de criação.
- **Solicitação**: aluno, turma, status, datas, quem decidiu, motivo da recusa.
- **Aviso de gestão**: título, conteúdo, autor, situação, agendamento, versão atual, datas de
  criação, edição, arquivamento e exclusão, destinos.
- **Versão do aviso**: número, título, conteúdo, destinos, autor e data.
- **Evento do histórico**: tipo, usuário, data, versão e campos alterados.
- **Evento de agenda** e **horário de turma** (F2).

## 6. Mapa Tela → Endpoint → Estados

Estados: **C** carregando · **V** vazio · **E** erro · **401** sessão encerrada ·
**403** sem permissão · **404** não encontrado · **409** conflito · **422** validação.

| Tela | Endpoint(s) | Estados | Observações |
|---|---|---|---|
| T01 Login | `POST /auth/login`, `GET /me` | C, E, 401, 403 | `aluno` autenticado cai em T16 e a sessão é encerrada |
| T02 Painel coordenação | `GET /gestao/avisos?limit=5`, `GET /gestao/solicitacoes?status=pendente&limit=4`, `GET /gestao/turmas?ativa=true&limit=1` | C, V, E, 401 | Contadores vêm do `total` de cada lista, sem endpoint de resumo |
| T14 Painel docente | os mesmos, filtrados pela API conforme o perfil | C, V, E, 401 | A API já restringe; a plataforma não filtra |
| T03 Avisos lista | `GET /gestao/avisos` (`situacao`, `autor_id`, `turma_id`, `q`) | C, V, E, 401, 403 | Abas de situação; docente vê só os próprios, por decisão da API |
| T04/T15 Editor | `POST /gestao/avisos`, `PATCH /gestao/avisos/{id}`, `GET /gestao/turmas?ativa=true` | C, E, 403 `DESTINO_NAO_PERMITIDO`, 404, 409 `AVISO_NAO_EDITAVEL`, 422 | Rascunho preservado em erro; prévia do cartão do aplicativo |
| T05 Seletor de destinos | `GET /gestao/turmas?ativa=true&q=` | C, V, E | Semestres de 1 a 12 e os grupos são fixos do contrato |
| T06 Histórico e versões | `GET …/historico`, `GET …/versoes`, `GET /gestao/avisos/{id}` | C, E, 401, 403, 404 | Também para avisos excluídos (admin e coordenação) |
| — Ações do aviso | `POST …/arquivar`, `POST …/desarquivar`, `DELETE …` | C, E, 403, 404, 409 `AVISO_SITUACAO_INVALIDA` | Confirmação antes de arquivar e excluir |
| T07 Turmas | `GET /gestao/turmas`, `POST /gestao/turmas`, `PATCH`, `DELETE` | C, V, E, 401, 403, 409 `CODIGO_TURMA_DUPLICADO`, 422 | Desativar é lógico |
| T08 Turma detalhe | `GET /gestao/turmas/{id}`, `GET …/vinculos`, `POST …/vinculos`, `DELETE …/vinculos/{usuario_id}`, `GET /gestao/usuarios?q=` | C, V, E, 403, 404, 409 `JA_VINCULADO`, 409 `PERFIL_INCOMPATIVEL` | Busca de pessoa ao vincular; docente só lê |
| T09 Solicitações | `GET /gestao/solicitacoes`, `POST …/aprovar`, `POST …/recusar` | C, V, E, 403, 404, 409 `SOLICITACAO_NAO_PENDENTE`, 409 `JA_VINCULADO` | Motivo opcional na recusa |
| T10 Usuários | `GET /gestao/usuarios`, `GET /gestao/usuarios/{id}` | C, V, E, 401, 403 | Coordenação só lê |
| T11 Alterar perfil | `PATCH /gestao/usuarios/{id}` | C, E, 403, 404, 409 `PERFIL_INCOMPATIVEL`, 422 | 422 cobre autodesativação e último administrador |
| T16 Sem permissão | — | — | Resposta do servidor a `403`; não expõe dados |
| T12 Agenda (F2) | `/gestao/eventos` (E3) | C, V, E, 401, 403 | Bloqueada até a spec E3 |
| T13 Horários (F2) | `/gestao/turmas/{id}/horarios` (E3) | C, V, E, 401, 403 | Bloqueada até a spec E3 |

### Mensagens por código

| code | Mensagem | Efeito |
|---|---|---|
| `CREDENCIAIS_INVALIDAS` | Usuário ou senha incorretos. | Permanece no login |
| `USUARIO_INATIVO` | Este acesso está desativado. Procure a administração. | Encerra a sessão |
| `NAO_AUTENTICADO` | Sua sessão expirou. Entre de novo. | Encerra a sessão, guarda o destino |
| `SEM_PERMISSAO` | Esta área não está disponível para o seu perfil. | Tela de sem permissão |
| `DESTINO_NAO_PERMITIDO` | Você só pode publicar para as turmas em que leciona. | Recarrega as turmas, mantém o texto |
| `CODIGO_TURMA_DUPLICADO` | Já existe uma turma com este código. | Marca o campo código |
| `JA_VINCULADO` | Esta pessoa já está vinculada à turma. | Recarrega os vínculos |
| `PERFIL_INCOMPATIVEL` | O papel precisa corresponder ao perfil da pessoa. | Explica no formulário |
| `SOLICITACAO_NAO_PENDENTE` | Esta solicitação já foi decidida. | Recarrega a lista |
| `AVISO_NAO_EDITAVEL` | Avisos arquivados ou excluídos não podem ser editados. | Oferece desarquivar |
| `AVISO_SITUACAO_INVALIDA` | Este aviso já está nessa situação. | Recarrega o aviso |
| `AVISO_NAO_ENCONTRADO` | Este aviso não está mais disponível. | Volta à lista |
| `VALIDATION_ERROR` | Confira os campos destacados. | Marca os campos de `errors[]` |
| 5xx ou desconhecido | Não foi possível concluir agora. Tente de novo em instantes. | Mantém o formulário |

## 7. Design System

Origem única: `design/README.md` e as telas em `design/web/`. Os tokens são os mesmos do
aplicativo — é o que faz web e mobile parecerem o mesmo produto.

| Token | Valor | Uso na web |
|---|---|---|
| `navy` | `#132A4E` | Títulos, marca, números do painel |
| `navySoft` | `#2A4374` | Texto de apoio, itens da navegação |
| `blue` | `#2563EB` | Ação primária, item ativo, destino turma |
| `blueSurface` | `#EFF4FF` | Item de navegação ativo, chips, seleção |
| `pageBg` | `#F5F8FC` | Fundo da área de conteúdo |
| `line` / `lineSoft` | `#E4E9F2` / `#EFF2F7` | Bordas de cartão e linhas de tabela |
| `muted` / `faint` | `#5B6B86` / `#8A99B0` | Texto secundário, cabeçalho de tabela |
| `warning` | `#B45309` sobre `#FDF4E6` | Agendado, pendente |
| `success` | `#15803D` sobre `#E9F6EE` | Ativo, aprovado |
| `danger` | `#B91C1C` sobre `#FCECEC` | Excluído, recusado, ação destrutiva |

- Tipografia Inter, sem serifa; títulos com entreletra −0,02 em.
- Barra lateral de 252 px, barra superior de 68 px, conteúdo com 28 px de margem.
- Superfícies brancas com borda de 1 px; sombra apenas em modal.
- Componentes: chip de destino, selo de situação, tabela, cartão de número, linha do tempo,
  modal, estado vazio, confirmação destrutiva.

## 8. Success Criteria *(mandatory)*

- **SC-001**: O fluxo completo — coordenação publica pela web, a API registra e o aluno recebe no
  aplicativo respeitando o público — é demonstrável de ponta a ponta (RF-30 da API).
- **SC-002**: 100% das ações fora da matriz de permissões resultam em recusa visível e
  compreensível, sem vazamento de dados.
- **SC-003**: O token não aparece em nenhum ponto acessível ao JavaScript — verificável por
  inspeção de `document.cookie`, `localStorage`, `sessionStorage` e do pacote servido.
- **SC-004**: Toda tela é operável apenas com teclado, do login à exclusão de um aviso.
- **SC-005**: 100% das telas passam na verificação de contraste AA.
- **SC-006**: Nenhuma edição perde o que foi digitado por erro da API ou queda de rede.
- **SC-007**: Toda operação de ciclo de vida do aviso gera exatamente um evento no histórico,
  verificável na própria interface.
- **SC-008**: Mudança de perfil feita pela administração vale na navegação seguinte da pessoa
  afetada, sem novo login.

## 9. Assumptions

- A plataforma e a API são servidas no **mesmo domínio**, com a API atrás de um caminho reservado
  (`/api`), por proxy reverso na infraestrutura do IFSul — confirmado em 13/10/2026. É o que
  viabiliza o cookie de sessão com `SameSite=Strict`.
- A API emite o cookie de sessão no login e aceita autenticação por cookie nos endpoints de
  gestão, mantendo o cabeçalho `Bearer` para o aplicativo mobile (RF-32).
- O contrato E2 é o que está em `contracts/api.md`; mudanças exigem revisão desta spec.
- Não existe endpoint de resumo para o painel: os números vêm do campo `total` de listas
  consultadas com `limit` pequeno.
- Os endpoints de agenda e horários seguem o mesmo padrão, conforme
  `projeto-api/specs/002-agenda-horarios/contracts/api.md`; a F2 começa quando a E3 estiver
  implementada na API.
- Uso em desktop, a partir de 1280 px; não há projeto para telefone.
- A plataforma é um build estático: não há servidor de aplicação próprio, e portanto não há lugar
  para segredo em tempo de execução.
- O provedor de autenticação é o mesmo da API (mock hoje, Moodle depois) e é indiferente para a
  plataforma.

## 10. Clarifications

### Sessão 2026-10-13

- **P: Onde fica o token?**
  R: Em cookie `httpOnly` emitido **pela própria API** no login. O JavaScript da página nunca o
  alcança; o navegador o envia automaticamente em cada chamada. Isso exige mesma origem entre web
  e API e proteção CSRF nas escritas (RW-01 a RW-03, Princípio III).
  *Revisto em 13/10/2026*: a versão anterior previa um servidor Next guardando o cookie. A
  infraestrutura do IFSul hospeda a API em Python e serve a plataforma como arquivos estáticos,
  sem servidor Node — daí a mudança, que manteve o objetivo (token fora do alcance do JavaScript)
  trocando o meio.
- **P: O que acontece quando um aluno entra na web?**
  R: A autenticação funciona — a API aceita as credenciais —, mas a plataforma mostra a tela de
  sem permissão com orientação para usar o aplicativo e encerra a sessão (RW-06).
- **P: Docentes usam a mesma interface que a coordenação?**
  R: Sim, com menos itens: painel próprio, seus avisos, suas turmas (leitura) e as solicitações
  das turmas em que leciona. A restrição vem da API; a interface apenas a reflete.
- **P: Como o painel obtém os números se não há endpoint de resumo?**
  R: Consultando as listas com `limit` pequeno e usando o `total` de cada resposta. Está
  registrado como suposição para que a API possa oferecer um resumo no futuro, se valer a pena.
- **P: A edição de um aviso mostra o que mudou?**
  R: Sim, no histórico: a API devolve `alteracoes` com valor anterior e novo, e a linha do tempo
  os apresenta lado a lado (RW-20).
- **P: A plataforma precisa funcionar em telefone?**
  R: Não. É ferramenta de trabalho em computador; o telefone é atendido pelo aplicativo.
- **P: Agenda e horários entram já?**
  R: Entram como fase F2, com requisitos e telas definidos. *Atualizado em 13/10/2026*: a spec E3
  foi publicada (`002-agenda-horarios`) e resolveu as duas pendências que esta plataforma havia
  registrado — filtro por intervalo de datas e tratamento de conflito de horário, que a API
  informa sem recusar. A fase F2 aguarda agora a implementação da E3.

## 11. Rastreabilidade

| Requisito da web | Requisito da API | Tela | Teste |
|---|---|---|---|
| RW-01 a RW-09 | RF-01, RF-04, RF-05, RF-07 | T01, T16 | unidade `sessao.test`; e2e `login.spec` |
| RW-10 a RW-12 | RF-04, RF-09, RF-10 | todas | e2e `permissoes.spec` |
| RW-13 a RW-22 | RF-20, RF-24 a RF-28 | T03–T06, T15 | componente `editor.test`, `historico.test`; e2e `aviso-ciclo-de-vida.spec` |
| RW-23 a RW-27 | RF-18, RF-19 | T07, T08 | componente `turma-form.test`; e2e `turmas-vinculos.spec` |
| RW-28 a RW-30 | RF-17 | T09 | e2e `solicitacoes.spec` |
| RW-31 a RW-33 | RF-09 | T10, T11 | componente `perfil-modal.test`; e2e `usuarios.spec` |
| RW-34 a RW-36, RW-46 | RF-35 a RF-47 (E3) | T12, T13 | planejados na F2 |
| RW-37 a RW-42 | — | todas | componente `estados.test`; auditoria de acessibilidade por tela |
| RW-43, RW-44 | RF-10, RF-30 | todas | revisão de código; e2e `sem-vazamento.spec` |
