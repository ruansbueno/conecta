# Phase 0 Research: Autenticação, Perfis, Turmas e Avisos (Entregas 1 e 2)

> **Nota (06/11/2026, emenda v2.3 da spec):** onde este documento fala em integração "com o
> Moodle", o serviço real acabou sendo a **API de autenticação do IFSul** (Active Directory). O
> texto abaixo é o registro das decisões da época; o estado atual está na `spec.md` (emenda v2.3),
> em `contracts/api.md` e no `quickstart.md`.

Nenhum marcador `NEEDS CLARIFICATION` restou no Technical Context do plano — as decisões
estratégicas (provedor de auth mock/real, escopo mobile-only, banco remoto/local) já haviam
sido fechadas com o usuário antes do planejamento. Este documento registra as decisões técnicas
derivadas delas.

## Decisão: Interface `AuthProvider` + `MockMoodleAuthProvider`

- **Decision**: Definir um protocolo/interface `AuthProvider` com um único método essencial
  (`authenticate(username, password) -> AuthenticatedUser | None`, onde `AuthenticatedUser`
  carrega identificação e nome — **o perfil não vem do provedor, ver decisão v2 abaixo**). A
  aplicação depende apenas dessa interface, nunca de uma implementação concreta. Duas
  implementações:
  - `MockMoodleAuthProvider`: usuários de teste definidos em seed (ex.: arquivo/fixture com
    username, senha e nome; os perfis de teste são definidos no seed do banco), usada em desenvolvimento e
    enquanto o acesso à API real do Moodle não existir.
  - `MoodleAuthProvider`: stub criado desde já (assinatura implementada, corpo levantando
    `NotImplementedError` com mensagem explicativa, ou lendo config de endpoint ainda vazia),
    pronto para receber a implementação real quando o acesso ao Moodle for concedido.
  - A escolha de qual provider é instanciado é feita por uma variável de ambiente
    (`AUTH_PROVIDER=mock|moodle`) lida em `core/config.py` e injetada via dependência do
    FastAPI (`Depends`).
- **Rationale**: Atende diretamente o Princípio II (non-negotiable) da constituição — troca de
  provider sem alterar rotas, services ou contratos de resposta ao cliente.
- **Alternatives considered**:
  - Feature flag dentro do service de login (`if settings.use_mock: ...`) — rejeitada por
    violar a separação de responsabilidades (a decisão vazaria para dentro da regra de
    negócio em vez de ficar isolada na camada de integração).
  - Apostar tudo num provider único que já simula o Moodle via chamadas HTTP reais a um
    servidor de testes — rejeitada porque não há nenhum servidor Moodle acessível hoje, nem
    para testes.

## Decisão: Persistência local de usuário após autenticação externa

- **Decision**: No primeiro login bem-sucedido de um `username` (via qualquer `AuthProvider`),
  a aplicação faz *upsert* de um registro local `Usuario` (id interno, username, nome; perfil
  `aluno` apenas na criação). Logins seguintes atualizam só o nome. A senha nunca é
  persistida — apenas o resultado da autenticação.
- **Rationale**: Turmas, Inscrições e Avisos precisam referenciar um usuário de forma estável
  (chave estrangeira) independentemente de qual provider validou a senha; e a spec exige
  destinatários por turma/perfil, que só funcionam com um registro local de usuário.
- **Alternatives considered**: Buscar dados do usuário sempre em tempo real no provider e nunca
  persistir localmente — rejeitada porque impediria relacionamentos com Turma/Inscrição/Aviso
  no banco relacional e adicionaria uma chamada externa a cada requisição.

## Decisão: Configuração de banco de dados por ambiente via `DATABASE_URL`

- **Decision**: Uma única variável de ambiente `DATABASE_URL` (formato
  `postgresql+asyncpg://user:pass@host:port/dbname`) é a única fonte de conexão com o
  PostgreSQL, lida por `core/config.py` e usada tanto pela aplicação (SQLAlchemy async engine)
  quanto pelo Alembic (`alembic/env.py`). `docker-compose.yml` sobe um Postgres local **apenas
  para desenvolvimento**, com uma `DATABASE_URL` de exemplo em `.env.example` apontando para
  esse container. Em produção/homologação, a mesma variável aponta para o banco remoto do
  servidor da faculdade — nenhuma outra configuração muda.
- **Rationale**: Atende ao cenário descrito pelo usuário (Postgres remoto da faculdade em
  produção, Postgres local via Docker em desenvolvimento) sem introduzir branches de código por
  ambiente, mantendo o Princípio VI (simplicidade).
- **Alternatives considered**: Múltiplos arquivos de configuração por ambiente
  (`config.dev.py`, `config.prod.py`) — rejeitada por duplicar lógica quando uma única variável
  de ambiente já resolve o problema.

## Decisão: Stack técnica

- **Decision**: FastAPI + SQLAlchemy 2.0 (async) + Alembic + Pydantic v2 + PyJWT + asyncpg +
  pytest/pytest-asyncio/httpx para testes.
- **Rationale**: FastAPI e PostgreSQL já são mandatados pela arquitetura de referência do
  CONECTA e pela constituição. SQLAlchemy async + asyncpg são o par padrão de mercado para
  FastAPI assíncrono; Alembic é o gerenciador de migrações padrão do ecossistema SQLAlchemy,
  atendendo ao requisito de "migrações versionadas" do Princípio VI.
- **Alternatives considered**: ORM síncrono (SQLAlchemy sync + psycopg2) — rejeitado por não
  aproveitar a natureza assíncrona do FastAPI/Uvicorn sob carga concorrente. Tortoise ORM —
  rejeitado por ecossistema de migrações menos maduro que Alembic.

## Decisão: Agendamento de avisos (publicação futura)

- **Decision**: Um `Aviso` possui um campo `publicar_em` (timestamp opcional). A consulta de
  avisos para um usuário (além dos destinos e da situação, ver v2) filtra `publicar_em IS NULL OR publicar_em <= now()`. Não há job
  assíncrono/cron nesta fase — a filtragem é feita na própria query de leitura.
- **Rationale**: Atende FR-012/FR-013 e o edge case de agendamento sem introduzir
  infraestrutura de filas/cron ainda não necessária (Princípio VI — YAGNI).
- **Alternatives considered**: Job agendado que "publica" avisos ativando uma flag — rejeitado
  por ser complexidade desnecessária quando um filtro por timestamp na leitura resolve o mesmo
  requisito.

## Decisão (v2): O provedor identifica; o CONECTA autoriza

- **Decision**: `AuthenticatedUser` passa a carregar apenas `username` e `nome`. O perfil
  (`administrador`, `coordenacao`, `docente`, `aluno`) é um atributo local de `Usuario`: nasce
  `aluno`, e só o administrador (E2) ou o seed (E1) o altera. O upsert do login nunca toca o perfil.
- **Rationale**: o parecer do orientador distingue reconhecer o usuário (login) de decidir o que ele
  pode fazer (permissão). Mapear roles do Moodle para perfis acoplaria autorização ao Moodle
  (contra o Princípio II) e daria a terceiros poder de promover usuários.
- **Alternatives considered**: mapear roles do Moodle automaticamente — rejeitada pelo motivo
  acima; pode ser reavaliada como *sugestão* de perfil na E2, nunca como atribuição automática.

## Decisão (v2): Perfil e situação reavaliados no banco a cada requisição

- **Decision**: o JWT leva `sub` (id do usuário) e `perfil` informativo, mas a dependência
  `get_current_user` recarrega o `Usuario` do banco e usa **o perfil e o `ativo` do banco**.
- **Rationale**: o token vale 24 h; sem isso, rebaixar ou desativar alguém só teria efeito no dia
  seguinte. Custo: uma consulta por requisição (adequado à escala institucional).
- **Alternatives considered**: confiar apenas nas claims — rejeitada por segurança; lista de
  revogação de tokens — rejeitada por complexidade (Princípio VI).

## Decisão (v2): Vínculo único com papel, e inscrição por solicitação

- **Decision**: `VinculoTurma(turma, usuario, papel)` substitui `Inscricao` e atende alunos e
  docentes. Entrada de aluno por `SolicitacaoInscricao` com aprovação (coordenação, administrador
  ou docente da turma); a aprovação cria o vínculo na mesma transação.
- **Rationale**: turmas representam vínculos reais do curso; entrada livre daria acesso a avisos a
  quem não pertence à turma.
- **Alternatives considered**: tabelas separadas para docente e aluno — rejeitada por duplicar
  regras de visibilidade; autoinscrição livre — rejeitada pelo parecer.

## Decisão (v2): Público do aviso como N destinos tipados

- **Decision**: `AvisoDestino(aviso, tipo, turma_id?, semestre?)` com tipos `todos`, `turma`,
  `semestre`, `docentes`; visível se **qualquer** destino alcança o usuário (consulta com `EXISTS`
  e `DISTINCT`, sem duplicatas). O mesmo mecanismo será reutilizado por eventos na E3.
- **Rationale**: um comunicado para três turmas = um aviso com três destinos, sem copiar o aviso.
- **Alternatives considered**: ligação N:N apenas com turmas — não cobre `docentes` nem
  `semestre` sem expandir na publicação (e a expansão ficaria desatualizada quando vínculos mudam);
  entidade "Grupo" reutilizável — YAGNI nesta fase.

## Decisão (v2): Versões completas + log de eventos imutável

- **Decision**: cada edição grava uma `AvisoVersao` (snapshot de título, conteúdo, destinos e
  agendamento) e um `AvisoEvento` com o diff; arquivar/desarquivar/excluir geram evento. Exclusão
  é lógica. Versões e eventos nunca sofrem `UPDATE`/`DELETE` pela aplicação e são gravados na mesma
  transação da operação.
- **Rationale**: atende ao objetivo de histórico e rastreabilidade (O12) e permite reconstruir
  "o que o aluno viu" em qualquer data.
- **Alternatives considered**: sobrescrever e guardar só `editado_em` — perde rastreabilidade;
  exclusão física — impede auditoria.

## Decisão (v2): Contrato de erro com `code` e listas paginadas

- **Decision**: erros `{detail, code}` (e `errors[]` em 422, com handler customizado para
  `RequestValidationError`); listas `{items, total, limit, offset}`.
- **Rationale**: o app e a web decidem comportamento por código estável, não por texto; paginação
  evita respostas ilimitadas.

## Decisão (v2): Estratégia de teste mock × real

- **Decision**: marcadores pytest `mock_auth` (depende do provedor simulado) e `moodle_real`
  (integração real; ignorado sem `MOODLE_*` configurado). O relatório separa os dois grupos. A
  suíte de contrato do `AuthProvider` é parametrizada para rodar contra os dois provedores.
- **Rationale**: o parecer pede distinguir testes com usuários simulados da validação real.

**Output**: Todas as decisões acima resolvem os pontos relevantes do Technical Context; nenhum
`NEEDS CLARIFICATION` permanece.
