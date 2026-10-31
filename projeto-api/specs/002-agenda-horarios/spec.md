# Feature Specification: Agenda e Horários (Entrega 3)

**Feature Branch**: `002-agenda-horarios`

**Created**: 2026-10-13

**Status**: Draft

**Input**: Terceira entrega do CONECTA: agenda acadêmica (eventos, bancas, palestras, formaturas,
reuniões, provas e datas importantes) e horários das turmas. Reutiliza o mecanismo de destinos, de
permissões e de auditoria já definido em `001-auth-perfil-turmas-avisos`.

**Referências**

| Documento | Para quê |
|---|---|
| `specs/001-auth-perfil-turmas-avisos/spec.md` | Perfis, matriz de permissões, destinos, ciclo de vida e auditoria |
| `specs/001-auth-perfil-turmas-avisos/contracts/api.md` | Convenções de erro, paginação e autenticação |
| `projeto-mobile/specs/001-app-conecta/spec.md` | Fase F2 do aplicativo: agenda em lista e em mês, horários |
| `projeto-web/specs/001-plataforma-gestao/spec.md` | Fase F2 da plataforma: gestão de eventos e da grade |
| `design/mobile/m-10-agenda.png`, `m-10b-agenda-mes.png`, `m-11-evento-detalhe.png`, `m-12-horarios.png` | Telas do aplicativo |
| `design/web/w-12-agenda.png`, `w-13-horarios.png` | Telas da plataforma |

## 1. Escopo

Cobre os objetivos **O5** (agenda acadêmica) e **O6** (horários das turmas) do TCC, além de
estender O1, O2 e O12.

### 1.1 O que entra

- **Eventos**: criação, edição, arquivamento, desarquivamento e exclusão pela gestão; consulta
  pelos destinatários. Mesmo mecanismo de destinos dos avisos, com versões e histórico.
- **Horários de turma**: grade semanal cadastrada pela gestão e consultada por quem tem vínculo.

### 1.2 O que não entra

- Confirmação de presença, inscrição em evento e emissão de certificado.
- Notificação push ou por e-mail quando um evento muda.
- Exceções pontuais na grade de horários — cancelamento por feriado, reposição, troca de sala por
  uma semana. A grade é recorrência semanal pura; mudanças pontuais são comunicadas por aviso
  (decisão registrada na seção 7).
- Reserva de salas e verificação de disponibilidade de recursos.

### 1.3 Dependências

Esta entrega pressupõe implementadas as E1 e E2: autenticação, perfis, turmas, vínculos e o
mecanismo de destinos. Os clientes consomem esta entrega nas suas fases F2, hoje bloqueadas.

## 2. Regras de Negócio

### 2.1 Evento

- Todo evento possui **autor**, título, descrição, **tipo**, início, fim opcional, local e
  **1 a 20 destinos** — exatamente o mesmo conjunto de tipos dos avisos: `todos`, `turma`,
  `semestre`, `docentes`.
- Tipos de evento: `palestra`, `banca`, `reuniao`, `formatura`, `prova`, `data_importante`,
  `outro`. O tipo é informativo: não altera permissão nem visibilidade, apenas apresentação.
- Um evento é visível a um usuário quando **pelo menos um** destino o alcança — a mesma regra dos
  avisos, inclusive a entrega única quando vários destinos coincidem.
- Evento é visível apenas se estiver `ativo`; arquivados aparecem em lista própria; excluídos
  somem (exclusão lógica, preservada para auditoria).
- Diferentemente do aviso, o evento **não tem agendamento de publicação**: ele passa a existir
  para os destinatários assim que é criado. O que o situa no tempo é `inicio`, não a publicação.

### 2.2 Ciclo de vida e auditoria do evento

Idêntico ao do aviso (seção 3.4 da E1): criar gera versão 1 e evento `criado`; editar cria nova
versão preservando a anterior e registra `editado` com os campos alterados; arquivar, desarquivar
e excluir registram seus eventos. O log é imutável.

A decisão de manter versões completas — e não apenas `editado_em` — vem de um caso concreto:
mudança de data, horário ou local de uma banca precisa de rastro de quem mudou e do que havia
antes.

### 2.3 Permissões do evento

Seguem a matriz da E1, com a mesma lógica dos avisos:

| Ação | Administrador | Coordenação | Docente | Aluno |
|---|---|---|---|---|
| Consultar eventos que o alcançam | Sim | Sim | Sim | Sim |
| Criar evento para qualquer público | Sim | Sim | Não | Não |
| Criar evento para turma(s) em que leciona | Sim | Sim | Sim | Não |
| Editar, arquivar e excluir | Todos | Todos | Só os que criou | Não |
| Consultar versões e histórico | Todos | Todos | Só os que criou | Não |

### 2.4 Horário de turma

- Um horário liga uma **turma** a um **dia da semana** (1 = segunda … 7 = domingo), com hora de
  início, hora de fim, disciplina, local opcional e docente opcional.
- A grade é **recorrência semanal pura**: vale para todo o período letivo da turma. Não há
  exceção por data.
- O docente informado deve ser um usuário de perfil `docente`; não precisa estar vinculado à
  turma, porque a grade costuma ser montada antes dos vínculos.
- Horário pertence à turma: desativar a turma oculta a grade para os clientes, preservando os
  dados.
- Criar e editar horários é de administração e coordenação. Docentes e alunos com vínculo
  consultam.

### 2.5 Conflito de horário

Ao criar ou editar um horário, o sistema **detecta** conflitos e os **informa**, sem impedir a
operação (decisão da seção 7):

- mesma **sala** ocupada por duas turmas no mesmo dia com sobreposição de horário;
- mesmo **docente** em dois horários sobrepostos.

A resposta de sucesso inclui a lista de conflitos encontrados, para que a plataforma web os
apresente a quem está cadastrando. A coordenação decide o que fazer — há casos legítimos, como
duas turmas assistindo juntas a uma mesma aula.

### 2.6 Consulta pelos clientes

- O aplicativo consulta os eventos que alcançam o usuário, com filtro por intervalo de datas, e a
  grade das turmas em que tem vínculo.
- A consulta de eventos aceita **incluir os já encerrados**, porque a visão de mês do aplicativo
  precisa preencher os marcadores do mês inteiro, inclusive de dias passados.

## 3. User Scenarios & Testing *(mandatory)*

### User Story 1 — Publicar um evento para o público certo (Priority: P1)

**Independent Test**: criar um evento com destino em duas turmas e verificar que apenas alunos
dessas turmas o recebem.

**Acceptance Scenarios**:

1. **Given** coordenação autenticada, **When** cria um evento do tipo `palestra` com destino
   `todos`, **Then** ele é criado na versão 1 e passa a ser visível a todo usuário ativo.
2. **Given** um docente, **When** cria evento com destino em turma que leciona, **Then** é aceito;
   com destino `todos`, `semestre` ou turma alheia, **Then** 403 `DESTINO_NAO_PERMITIDO`.
3. **Given** um evento com destinos em três turmas, **When** um aluno de duas delas consulta,
   **Then** vê o evento uma única vez.
4. **Given** um evento com `fim` anterior ao `inicio`, **When** é criado, **Then** 422.
5. **Given** um aluno, **When** tenta criar evento, **Then** 403 `SEM_PERMISSAO`.

---

### User Story 2 — Consultar a agenda (Priority: P2)

**Acceptance Scenarios**:

1. **Given** eventos que alcançam o usuário, **When** consulta sem filtro, **Then** recebe os
   próximos, do mais próximo ao mais distante.
2. **Given** o intervalo de um mês, **When** consulta com `de` e `ate`, **Then** recebe apenas os
   eventos que tocam o intervalo — inclusive os de vários dias que começaram antes (emenda de
   31/10/2026, plano D-E3-3).
3. **Given** eventos já encerrados no intervalo, **When** consulta com `incluir_encerrados=true`,
   **Then** eles aparecem; com `false` ou omitido, não.
4. **Given** um evento arquivado, **When** o destinatário consulta a lista ativa, **Then** não
   aparece; na lista de arquivados, aparece.
5. **Given** um evento excluído, **When** qualquer usuário consulta, **Then** não aparece, e
   consultar o id retorna 404.
6. **Given** um usuário sem vínculo e sem eventos gerais, **When** consulta, **Then** lista vazia,
   não é erro.

---

### User Story 3 — Auditar mudanças em um evento (Priority: P3)

**Acceptance Scenarios**:

1. **Given** um evento, **When** a coordenação muda a data e o local, **Then** uma nova versão é
   criada e o histórico registra os dois campos, com valor anterior e novo.
2. **Given** um evento editado, **When** alguém com permissão consulta as versões, **Then** vê
   cada versão completa, com autor e data.
3. **Given** um docente, **When** tenta ver o histórico de evento de outra pessoa, **Then** 403.
4. **Given** um evento excluído, **When** administração ou coordenação consulta seu histórico,
   **Then** continua disponível.

---

### User Story 4 — Montar a grade de horários (Priority: P4)

**Acceptance Scenarios**:

1. **Given** coordenação, **When** cadastra uma aula com dia, horário, disciplina, sala e docente,
   **Then** ela passa a constar na grade da turma.
2. **Given** uma aula que ocupa a mesma sala e horário de outra turma, **When** é cadastrada,
   **Then** é **aceita** e a resposta informa o conflito detectado.
3. **Given** o mesmo docente em dois horários sobrepostos, **When** o segundo é cadastrado,
   **Then** é aceito e o conflito é informado.
4. **Given** hora de fim anterior à de início, ou dia fora de 1–7, **When** é cadastrada,
   **Then** 422.
5. **Given** um docente informado que não tem perfil `docente`, **When** é cadastrado, **Then**
   409 `PERFIL_INCOMPATIVEL`.
6. **Given** um docente, **When** tenta cadastrar horário, **Then** 403 `SEM_PERMISSAO`.

---

### User Story 5 — Consultar os horários da turma (Priority: P5)

**Acceptance Scenarios**:

1. **Given** um aluno vinculado, **When** consulta a grade da turma, **Then** vê as aulas
   ordenadas por dia e hora.
2. **Given** um usuário sem vínculo na turma, **When** consulta, **Then** 403 `SEM_PERMISSAO` —
   exceto administração e coordenação, que consultam qualquer turma.
3. **Given** uma turma desativada, **When** um vinculado consulta, **Then** a grade não é
   devolvida aos clientes.

### Edge Cases

- Evento sem `fim` → tratado como pontual; os clientes exibem apenas o horário de início.
- Evento que cruza a meia-noite → `fim` em outro dia é válido.
- Intervalo de consulta invertido (`de` maior que `ate`) → 422.
- Intervalo muito grande → a paginação continua valendo; não há limite especial de intervalo.
- Turma sem grade cadastrada → lista vazia, não é erro.
- Docente desvinculado da turma depois de criar um evento para ela → o evento continua sendo dele
  e editável, mas a edição só pode manter destinos de turmas em que ainda leciona (mesma regra do
  aviso).
- Horário cujo docente é desativado → o horário permanece; os clientes exibem o nome normalmente,
  e a coordenação decide se troca.

## 4. Requirements *(mandatory)*

### Eventos

- **RF-35**: O sistema MUST permitir que administração e coordenação criem eventos com título,
  descrição, tipo, início, fim opcional, local opcional e 1 a 20 destinos.
- **RF-36**: Docentes MUST poder criar eventos apenas com destinos `turma` de turmas em que
  lecionam; qualquer outro destino MUST resultar em 403 `DESTINO_NAO_PERMITIDO`.
- **RF-37**: A consulta de eventos MUST retornar apenas os que alcançam o usuário, sem
  duplicidade, ordenados por `inicio`.
- **RF-38**: A consulta MUST aceitar filtro por intervalo (`de`, `ate`) e a opção de incluir
  eventos já encerrados.
- **RF-39**: Editar um evento MUST criar nova versão, preencher `editado_em` e preservar as
  versões anteriores.
- **RF-40**: Arquivar, desarquivar e excluir eventos MUST ser operações lógicas, com os mesmos
  efeitos definidos para avisos.
- **RF-41**: Cada operação sobre evento MUST gerar um evento de histórico imutável, com usuário,
  data/hora e, nas edições, os campos alterados.
- **RF-42**: Quem tem permissão MUST poder consultar versões e histórico de um evento, inclusive
  de excluídos (administração e coordenação).

### Horários

- **RF-43**: Administração e coordenação MUST poder criar, editar e remover horários de uma turma,
  com dia da semana (1–7), hora de início, hora de fim, disciplina, local e docente opcionais.
- **RF-44**: O sistema MUST detectar e **informar** conflitos de sala e de docente ao criar ou
  editar um horário, **sem impedir** a operação.
- **RF-45**: Usuários vinculados à turma MUST poder consultar sua grade; administração e
  coordenação MUST poder consultar a de qualquer turma.
- **RF-46**: A grade MUST ser recorrência semanal pura, sem exceções por data.
- **RF-47**: O docente informado em um horário MUST ter perfil `docente`; caso contrário, 409
  `PERFIL_INCOMPATIVEL`.

### Qualidade

- **RF-48**: Erros e paginação MUST seguir as mesmas convenções da E1 (`{detail, code}`,
  `limit`/`offset`/`total`).
- **RF-49**: Nenhum cliente MUST precisar de endpoint novo além dos definidos aqui para
  implementar as telas de agenda e horários já desenhadas.

### Key Entities

- **Evento**: título, descrição, tipo, início, fim, local, autor, situação, destinos.
- **Destino do evento**: reaproveita integralmente o modelo de destino do aviso.
- **Versão do evento**: cópia completa do conteúdo e dos destinos em cada edição.
- **Evento de histórico**: registro imutável de cada operação.
- **Horário de turma**: turma, dia da semana, início, fim, disciplina, local, docente.
- **Conflito de horário**: resultado calculado, não armazenado — tipo (`sala` ou `docente`), o
  horário conflitante e a turma dele.

## 5. Success Criteria *(mandatory)*

- **SC-E3-001**: 100% dos eventos exibidos a um usuário correspondem às regras de destino e
  situação; zero vazamento a quem não é alcançado.
- **SC-E3-002**: A visão de mês do aplicativo consegue, com uma única chamada por mês, obter todos
  os eventos necessários para marcar os dias — inclusive os já encerrados.
- **SC-E3-003**: Toda edição, arquivamento e exclusão de evento gera exatamente um registro de
  histórico, com autor e data.
- **SC-E3-004**: Conflitos de sala e de docente são detectados em 100% dos casos de sobreposição e
  nunca impedem o cadastro.
- **SC-E3-005**: As telas de agenda e horários já desenhadas são implementáveis sem endpoint
  adicional.

## 6. Assumptions

- O período letivo da turma delimita a validade da grade; não há data de início e fim por aula.
- Local é texto livre: não existe cadastro de salas nesta fase, o que torna a detecção de conflito
  de sala uma comparação textual normalizada.
- Feriados e calendário acadêmico não são modelados; a ausência de aula em um feriado é
  comunicada por aviso.
- Eventos não têm agendamento de publicação, diferentemente dos avisos.

## 7. Decisões registradas

Decididas em 13/10/2026, antes da especificação; registradas aqui com o motivo.

- **Filtro por intervalo com encerrados** (RF-38). A visão de mês do aplicativo precisa marcar
  dias passados do mês corrente. Sem o filtro, o cliente teria de pedir páginas até achar o que
  cabe no mês — e quebraria ao navegar para trás.
- **Versões e histórico completos para eventos** (RF-39, RF-41). Dobra o modelo, mas mudança de
  data ou local de banca é exatamente o caso em que alguém pergunta "quem mudou e o que era
  antes". Se o prazo apertar, corta-se a exibição no cliente, nunca o registro na API: dado não
  gravado não se recupera.
- **Conflito avisa, não recusa** (RF-44). Recusar trataria casos legítimos — duas turmas juntas na
  mesma sala — como erro, e colocaria a API para decidir algo que é da coordenação. Informar
  preserva a autoridade de quem cadastra.
- **Recorrência semanal pura** (RF-46). Exceções por data acrescentariam um segundo conceito,
  telas novas e sincronização com o calendário acadêmico. A mudança pontual já tem um caminho
  natural no produto: um aviso para a turma, que a plataforma oferece ao salvar a grade.

## 8. Rastreabilidade

| Requisito | Objetivo TCC | Testes previstos |
|---|---|---|
| RF-35, RF-36 | O5, O8 | contrato `test_eventos_criar`; integração `test_evento_destino_docente` |
| RF-37, RF-38 | O2, O5 | contrato `test_eventos_listar`; integração `test_evento_visibilidade`, `test_evento_intervalo` |
| RF-39 a RF-42 | O12 | contrato `test_eventos_ciclo_de_vida`; integração `test_evento_versoes_historico` |
| RF-43, RF-45, RF-46, RF-47 | O6 | contrato `test_horarios_crud`; integração `test_horario_acesso_por_vinculo` |
| RF-44 | O6 | unitário `test_conflito_horario`; contrato `test_horarios_conflito` |
| RF-48, RF-49 | O9, O10, O13 | contrato `test_erro_padrao`, `test_paginacao` |
