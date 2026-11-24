# CONECTA

Sistema web e mobile para publicação e consulta de avisos, eventos e horários do curso de Análise
e Desenvolvimento de Sistemas do IFSul Câmpus Gravataí. Trabalho de Conclusão de Curso de Ruan
Bueno.

Avisos, prazos, bancas e mudanças de horário costumam se espalhar por murais, grupos de mensagem e
e-mail. No CONECTA, cada aviso ou evento é publicado com um **público explícito** (todos, um
semestre, os docentes ou turmas específicas), e cada pessoa vê exatamente o que a alcança, uma vez
só.

| Componente | Pasta | Para quem |
|---|---|---|
| **API REST** (FastAPI + PostgreSQL) | [`projeto-api/`](projeto-api/) | Os dois clientes. Concentra **todas** as regras: identificação, permissões, visibilidade e histórico |
| **Plataforma web** (React + Vite) | [`projeto-web/`](projeto-web/) | Administração, coordenação e docentes, cada perfil dentro das suas permissões, publicam e gerenciam avisos, eventos, horários, turmas, vínculos, solicitações e usuários |
| **Aplicativo** (Flutter, Android) | [`projeto-mobile/`](projeto-mobile/) | Todos os perfis consultam avisos, agenda, horários e turmas, inclusive sem rede; o aluno solicita inscrição em turmas |

## Guia rápido para a avaliação

1. **Entender as regras:** a matriz de permissões e as regras de negócio estão na
   [especificação da API](projeto-api/specs/001-auth-perfil-turmas-avisos/spec.md) (seções 2 e 3)
   e, para a agenda e os horários, na [especificação da E3](projeto-api/specs/002-agenda-horarios/spec.md).
   O trabalho foi dividido em três entregas: E1 (aplicativo: login, turmas e avisos), E2 (gestão
   pela plataforma web) e E3 (agenda e horários).
2. **Ver onde cada regra está no código:** tabela [Onde ler o código](#onde-ler-o-código), abaixo.
3. **Conferir os testes:** os registros citados no Apêndice B do TCC estão em
   [Evidências dos testes](#evidências-dos-testes), cada um com a data e o commit em que rodou.
4. **Executar o sistema:** [Como baixar e rodar](#como-baixar-e-rodar) e
   [Como rodar os testes](#como-rodar-os-testes). O roteiro foi testado num clone limpo.

## Onde ler o código

| O que | Onde |
|---|---|
| Quem recebe um aviso ou evento: uma só regra de alcance para os dois | [`projeto-api/src/repositories/alcance.py`](projeto-api/src/repositories/alcance.py) |
| Aviso agendado só aparece a partir da data de publicação | [`projeto-api/src/repositories/aviso_repository.py`](projeto-api/src/repositories/aviso_repository.py) |
| Docente só publica para as turmas em que leciona | [`projeto-api/src/services/destinos.py`](projeto-api/src/services/destinos.py) e [`permissoes.py`](projeto-api/src/services/permissoes.py) |
| Publicar e editar geram uma versão; toda operação (inclusive arquivar e excluir) grava um registro no histórico, na mesma transação (o mesmo código para avisos e eventos) | [`projeto-api/src/services/publicacao_gestao.py`](projeto-api/src/services/publicacao_gestao.py); o que é só do aviso, em [`avisos_gestao_service.py`](projeto-api/src/services/avisos_gestao_service.py) |
| O banco recusa alterar ou apagar versões e histórico (*trigger*) | Avisos: [`20261026_9e05f46bf9bf_cria_aviso_versao_e_aviso_evento.py`](projeto-api/alembic/versions/20261026_9e05f46bf9bf_cria_aviso_versao_e_aviso_evento.py); eventos: [`20261031_321cb139e662_cria_evento_e_horario.py`](projeto-api/alembic/versions/20261031_321cb139e662_cria_evento_e_horario.py) (em `projeto-api/alembic/versions/`) |
| Conflito de sala e de docente na grade: informado, sem impedir | Regra em [`projeto-api/src/services/conflitos.py`](projeto-api/src/services/conflitos.py); gravação com os conflitos na resposta em [`horarios_service.py`](projeto-api/src/services/horarios_service.py) |
| Sessão: token validado e usuário (perfil e situação) relido no banco a cada requisição | [`projeto-api/src/core/security.py`](projeto-api/src/core/security.py) |
| CSRF assinado e preso à sessão da web | [`projeto-api/src/api/deps/csrf.py`](projeto-api/src/api/deps/csrf.py) |
| Erros com código estável (`{detail, code}`) | [`projeto-api/src/api/errors.py`](projeto-api/src/api/errors.py) |
| Identificação pela API de autenticação do IFSul, atrás de uma interface | [`projeto-api/src/providers/auth/`](projeto-api/src/providers/auth/) (`base.py`, `ifsul.py`, `mock.py`) |
| Web: cliente HTTP (cookie de sessão e cabeçalho CSRF) | [`projeto-web/src/api/cliente.ts`](projeto-web/src/api/cliente.ts) |
| Web: seletor de destinos dos avisos e eventos | [`projeto-web/src/componentes/comum/seletor-destinos.tsx`](projeto-web/src/componentes/comum/seletor-destinos.tsx) |
| Web: configuração de referência do servidor nginx (HTTPS, `/api` na mesma origem, cabeçalhos de segurança) | [`projeto-web/deploy/nginx.conf`](projeto-web/deploy/nginx.conf) |
| App: cliente HTTP, token no armazenamento seguro e cache para abrir sem rede | [`projeto-mobile/lib/services/`](projeto-mobile/lib/services/) |
| App: listas paginadas (resposta antiga não sobrescreve a nova) | [`projeto-mobile/lib/state/lista_paginada.dart`](projeto-mobile/lib/state/lista_paginada.dart) |
| Web: modo noturno (paleta escura nos mesmos tokens do tema; escolha guardada no navegador e aplicada antes da primeira pintura) | [`projeto-web/src/estilos/globals.css`](projeto-web/src/estilos/globals.css) e [`src/lib/tema.ts`](projeto-web/src/lib/tema.ts) |
| App: modo noturno (paletas clara e escura; escolha guardada no aparelho) | [`projeto-mobile/lib/theme/cores.dart`](projeto-mobile/lib/theme/cores.dart) e [`lib/state/tema_controller.dart`](projeto-mobile/lib/state/tema_controller.dart) |
| Fluxo de ponta a ponta da especificação (publicar na gestão e receber no app) | [`projeto-api/tests/e2e/test_fluxo_publicar_receber.py`](projeto-api/tests/e2e/test_fluxo_publicar_receber.py) |

Cada componente segue camadas separadas. Na API: `src/api` (rotas) → `src/services` (regras) →
`src/repositories` (consultas) → `src/models` (tabelas). Os princípios de cada componente estão na
sua constituição (`projeto-*/.specify/memory/constitution.md`), e o planejamento de cada entrega,
em `projeto-*/specs/` (especificação, plano e tarefas).

## Estrutura do repositório

| Caminho | Conteúdo |
|---|---|
| [`projeto-api/`](projeto-api/) | Código (`src/`), migrações (`alembic/`), testes (`tests/`), scripts (`scripts/`), especificações (`specs/`) e evidências (`evidencias/`) |
| [`projeto-web/`](projeto-web/) | Código (`src/`), testes de unidade e componente (`tests/`), de ponta a ponta (`e2e/`), implantação (`deploy/`), especificações e evidências com capturas |
| [`projeto-mobile/`](projeto-mobile/) | Código (`lib/`), testes de unidade e widget (`test/`), de integração (`integration_test/`), especificações e evidências com capturas |
| [`scripts/`](scripts/) | O comando `conecta`, que sobe o ambiente local (banco, API e web) |
| [`design/`](design/) | As 30 telas desenhadas (14 do aplicativo, 16 da web), com a paleta e a tipografia, e as capturas no tema escuro (`web-escuro/`, `mobile-escuro/`) |
| [`CONECTA_Arquitetura.md`](CONECTA_Arquitetura.md) | Arquitetura do sistema: componentes, autenticação, módulos e regras |
| [`docs/modelo-de-dados/`](docs/modelo-de-dados/) | Modelo de dados no SQL Power Architect (`ER.architect`) |
| [`docs/HISTORICO.md`](docs/HISTORICO.md) | Como o projeto foi construído: ordem das entregas e os pull requests |
| [`docs/historico/`](docs/historico/) | Versões superadas da especificação (v1 e v2), guardadas como registro |

## Como baixar e rodar

### Pré-requisitos

| Ferramenta | Para quê |
|---|---|
| Git | Baixar o repositório |
| Docker | Banco PostgreSQL 16 local (e o nginx da verificação da implantação) |
| [uv](https://docs.astral.sh/uv/) | API: instala o Python 3.12 e as dependências |
| Node.js 24 e npm | Plataforma web |
| Flutter 3.41 e Android SDK com um emulador | Aplicativo (verificado no Android 16) |

### 1. Baixar

```bash
git clone https://github.com/ruansbueno/conecta.git
cd conecta
```

### 2. API (porta 8000)

```bash
cd projeto-api
docker compose up -d --wait db          # PostgreSQL na porta 5433
cp .env.example .env
uv run python - <<'PY'                  # gera os dois segredos locais no .env
import re, secrets, pathlib
p = pathlib.Path('.env'); s = p.read_text()
for k in ('JWT_SECRET', 'CSRF_SECRET'):
    s = re.sub(rf'^{k}=.*$', f'{k}={secrets.token_urlsafe(48)}', s, flags=re.M)
p.write_text(s)
PY
uv run alembic upgrade head             # cria as tabelas
uv run python -m scripts.seed_dev_data  # dados fictícios de demonstração
uv run uvicorn src.main:app --reload    # http://localhost:8000/docs
```

A API se recusa a subir com os segredos de exemplo do `.env.example`; o trecho acima os troca. O
login usa o provedor simulado (`AUTH_PROVIDER=mock`), com os usuários da tabela abaixo.

### 3. Plataforma web (porta 5173)

Em outro terminal, com a API no ar:

```bash
cd projeto-web
npm ci
npm run dev                             # http://localhost:5173
```

O servidor de desenvolvimento encaminha `/api` para a API em `localhost:8000`, reproduzindo a
mesma origem de produção.

### Atalho: o comando `conecta`

Depois da primeira configuração (passos 2 e 3), [`scripts/conecta`](scripts/conecta) sobe tudo de
uma vez: banco, migrações, API e web. O que já estiver no ar é mantido; no fim, abre a web no
navegador e mostra os logs da API e da web no mesmo terminal. Ctrl+C para o que ele subiu (o banco
continua no Docker). Para chamá-lo de qualquer pasta:

```bash
ln -s "$PWD/scripts/conecta" ~/.local/bin/conecta   # uma vez, na raiz; ~/.local/bin no PATH
conecta
```

A API fica só nesta máquina, o que basta para o emulador e para o celular por USB. Para um celular
pelo Wi-Fi: `CONECTA_API_HOST=0.0.0.0 conecta`.

### 4. Aplicativo

Com a API no ar e um emulador Android aberto:

```bash
cd projeto-mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000
```

`10.0.2.2` é o endereço com que o emulador enxerga o computador. Num celular Android ligado por
USB, use `adb reverse tcp:8000 tcp:8000` e `--dart-define=API_BASE_URL=http://localhost:8000`: o
aplicativo só aceita HTTP sem TLS para o emulador e para `localhost`.

### Usuários de demonstração

Todos com a senha `senha-teste`. Os dados são fictícios.

| Usuário | Perfil | Para ver |
|---|---|---|
| `admin.teste` | administrador | Usuários, perfis, ativar e desativar; pedidos de acesso |
| `coord.teste` | coordenação | Toda a gestão: avisos, agenda, horários, turmas, solicitações |
| `docente.teste` | docente (turmas 3A e 5A) | Publicação restrita às próprias turmas; decisão de solicitações delas |
| `aluno.teste` | aluno (3A; pedido pendente na 3B) | O aplicativo completo e uma solicitação pendente |
| `aluno2.teste` | aluno (3A e 3B) | Aviso para as duas turmas aparece uma vez só |
| `aluno3.teste` | aluno (3C; pedido recusado na 3B) | O motivo da recusa |
| `aluno.sem.turma` | aluno, sem turma | Os estados vazios |
| `servidor.aguardando` | — | Um pedido de acesso pendente, para a gestão aprovar ou recusar |
| `aluno.novo`, `servidor.novo` | — (não estão no seed) | O primeiro login: aluno entra como aluno; servidor vira um pedido de acesso |
| `aluno.novo2` | — (não está no seed) | Outro primeiro login de aluno, reservado para o vídeo de demonstração |
| `servidor.novo2` | — (não está no seed) | Outro primeiro login de servidor: vira um pedido de acesso, aprovado na aba Aguardando acesso |

## Como rodar os testes

| Componente | Comando | Observação |
|---|---|---|
| API | `cd projeto-api && uv run pytest` | Usa o banco `conecta_test`, criado pelo `docker compose`; os 3 testes da integração real com o IFSul são pulados sem uma conta institucional |
| Web, unidade e componente | `cd projeto-web && npm test` | — |
| Web, ponta a ponta | `npx playwright install chromium` e `npm run test:e2e` | Usa um servidor falso que segue o contrato da API; não precisa da API no ar |
| Web, implantação | `deploy/verificar.sh` | Sobe o nginx em Docker, com HTTPS, contra a API local em `localhost:8000` (com o seed); usa o Chromium do Playwright |
| App, unidade e widget | `cd projeto-mobile && flutter test` | — |
| App, integração | `flutter test integration_test -d <id do emulador>` | Precisa de um emulador aberto; usa um servidor falso que segue o contrato da API |

Verificações de estilo: `uv run ruff check .` (API), `npm run lint` e `npm run typecheck` (web),
`flutter analyze` (app).

## Evidências dos testes

Os registros são as saídas das execuções citadas no TCC, menos o de 11/11 (modo noturno) e os de
13/11, que registraram as correções de uma revisão de código (emenda v2.4 da API) e foram
substituídos, no TCC, pelos de 15/11: a execução final depois dos PRs #42 a #46. Cada arquivo
traz a data, a versão do código (commit) e os comandos executados; o roteiro do IFSul rodou no
commit `59f05d5`.

| Execução | Registro |
|---|---|
| API, entregas E1, E2 e E3 (25/10, 26/10 e 31/10) | [`testes-e1-2026-10-25.txt`](projeto-api/evidencias/testes-e1-2026-10-25.txt), [`testes-e2-2026-10-26.txt`](projeto-api/evidencias/testes-e2-2026-10-26.txt), [`testes-e3-2026-10-31.txt`](projeto-api/evidencias/testes-e3-2026-10-31.txt) |
| Fechamento (01/11): API, web, aplicativo e roteiro integrado | [API](projeto-api/evidencias/testes-final-2026-11-01.txt), [web](projeto-web/evidencias/testes-web-final-2026-11-01.txt), [app](projeto-mobile/evidencias/testes-app-final-2026-11-01.txt), [roteiro](projeto-api/evidencias/roteiro-integrado-2026-11-01.txt) |
| Final (06/11): API, web (com a implantação), aplicativo (com a integração no emulador) e roteiro integrado | [API](projeto-api/evidencias/testes-final-2026-11-06.txt), [web](projeto-web/evidencias/testes-web-final-2026-11-06.txt), [app](projeto-mobile/evidencias/testes-app-final-2026-11-06.txt), [roteiro](projeto-api/evidencias/roteiro-integrado-2026-11-06.txt) |
| Roteiro contra a API de autenticação do IFSul, com conta real de aluno (06/11) | [`roteiro-ifsul-2026-11-06.md`](projeto-api/evidencias/roteiro-ifsul-2026-11-06.md) |
| Web e aplicativo com cada teste pelo nome (10/11) | [web](projeto-web/evidencias/testes-web-por-teste-2026-11-10.txt), [app](projeto-mobile/evidencias/testes-app-por-teste-2026-11-10.txt) |
| Modo noturno e fim de lista (11/11): web (com a implantação) e aplicativo (com a integração no emulador) | [web](projeto-web/evidencias/testes-web-2026-11-11.txt), [app](projeto-mobile/evidencias/testes-app-2026-11-11.txt) |
| Final (12/11), depois do modo noturno, do modelo de dados e das restrições do banco: API, web (com a implantação), aplicativo (com a integração no emulador) e roteiro integrado, cada teste pelo nome | [API](projeto-api/evidencias/testes-final-2026-11-12.txt), [web](projeto-web/evidencias/testes-web-final-2026-11-12.txt), [app](projeto-mobile/evidencias/testes-app-final-2026-11-12.txt), [roteiro](projeto-api/evidencias/roteiro-integrado-2026-11-12.txt) |
| Correções da revisão de código (13/11): API, roteiro integrado e web (com a implantação) | [API](projeto-api/evidencias/testes-revisao-2026-11-13.txt), [roteiro](projeto-api/evidencias/roteiro-integrado-revisao-2026-11-13.txt), [web](projeto-web/evidencias/testes-web-revisao-2026-11-13.txt) |
| Final (15/11), depois do puxar para atualizar, dos pedidos na aba, das provas e aulas do docente e dos usuários de primeiro login (PRs #42 a #46): API, web (com a implantação), aplicativo (com a integração no emulador) e roteiro integrado, cada teste pelo nome | [API](projeto-api/evidencias/testes-final-2026-11-15.txt), [web](projeto-web/evidencias/testes-web-final-2026-11-15.txt), [app](projeto-mobile/evidencias/testes-app-final-2026-11-15.txt), [roteiro](projeto-api/evidencias/roteiro-integrado-2026-11-15.txt) |
| Responsividade da web (23/11), depois do PR #49: web com a implantação, cada teste pelo nome, e capturas das telas em 390 e 768 px | [web](projeto-web/evidencias/testes-web-final-2026-11-23.txt), [capturas](projeto-web/evidencias/telas-responsivas/) |

O roteiro integrado (`projeto-api/scripts/roteiro_integrado.py`) exercita a API real como a web
(cookie de sessão e CSRF) e como o aplicativo (token no cabeçalho). Os relatórios de cada fase dos
clientes, com as capturas das telas ao lado do design e as diferenças deliberadas, estão em
`projeto-web/evidencias/` e `projeto-mobile/evidencias/` (`RELATORIO.md` e `RELATORIO-F2.md`).

Até 06/11/2026, a integração real prevista para o login era com o Moodle; por isso os registros
anteriores a essa data citam `MOODLE_URL`, e os 3 testes pulados neles são os dessa integração. A
partir de 06/11, os pulados são os da integração real com o IFSul.

Depois da execução final de 12/11, a `main` mudou com as correções da revisão de código (PR #40),
registradas em 13/11, e com os PRs #42 a #46, registrados em 15/11. A API passou de 1011 para 1028
e depois para 1043 testes aprovados (3 pulados); a web, de 465 para 468 de unidade e componente; o
aplicativo, de 408 + 22 para 425 + 23. Em 15/11, o aplicativo e o roteiro integrado rodaram no
commit `b1fde87` (#43), a web no `e8982f2` (#44, que só corrigiu um teste instável do painel) e a
API no `5b9ecb2` (#46, que acrescentou os usuários de primeiro login `aluno.novo2` e
`servidor.novo2`; o registro da API no `b1fde87`, com 1041, foi substituído).
Para repetir uma execução exatamente como registrada, use o commit indicado no registro
(`git checkout <commit>`).

## Arquitetura em uma página

```
┌──────────────────────┐      ┌──────────────────────┐
│  Plataforma web      │      │  Aplicativo          │
│  administração,      │      │  todos os perfis     │
│  coordenação,        │      │                      │
│  docentes            │      │  consulta            │
└──────────┬───────────┘      └──────────┬───────────┘
   cookie + CSRF, /api             token no cabeçalho
           └──────────────┬──────────────┘
                          ▼
              ┌───────────────────────┐        ┌──────────────────┐
              │   API (FastAPI)       │───────▶│  API de          │
              │   regras, permissões, │        │  autenticação    │
              │   visibilidade,       │        │  do IFSul        │
              │   histórico           │        └──────────────────┘
              └───────────┬───────────┘
                          ▼
                   ┌─────────────┐
                   │ PostgreSQL  │
                   └─────────────┘
```

1. **Toda regra fica na API.** Web e aplicativo apresentam o que ela devolve; o bloqueio vale para
   qualquer cliente.
2. **O provedor só identifica.** A API de autenticação do IFSul confere usuário e senha; o perfil
   de cada pessoa é atribuído e mantido pelo CONECTA. Aluno entra como aluno; servidor que entra pela
   primeira vez vira um pedido de acesso, que a gestão aprova definindo o perfil.
3. **Um aviso tem N destinos.** Um comunicado para três turmas é um aviso com três destinos, visto
   uma vez por quem pertence a mais de uma delas. Os eventos da agenda seguem a mesma regra.
4. **Nada se perde.** Editar cria uma versão nova; arquivar e excluir são lógicos; cada operação
   gera um registro que o próprio banco impede de alterar.

| Camada | Tecnologia |
|---|---|
| API | Python 3.12, FastAPI, SQLAlchemy 2 (assíncrono), Alembic, PostgreSQL 16 |
| Sessão | JWT de 24 h, relido no banco a cada requisição; na web, em cookie `__Host-` `HttpOnly`, `Secure` e `SameSite=Strict`, com CSRF assinado; no app, no armazenamento seguro do Android |
| Web | React 19, TypeScript, Vite, Tailwind CSS, React Router, zod; build estático servido pelo nginx |
| App | Flutter, provider, http, flutter_secure_storage, shared_preferences |
| Testes | pytest e httpx; Vitest, Testing Library, Playwright e axe-core; flutter_test e integration_test |
| Processo | Spec Kit (Spec-Driven Development): constituição → especificação → plano → tarefas → código |

## Limitações conhecidas

- **Login pelo IFSul:** validado contra o serviço real com uma conta de aluno; o caso de conta de
  servidor (pedido de acesso, aprovação e novo login) não foi executado contra o serviço real, só
  nos testes com o provedor simulado.
- **HTTPS do serviço do IFSul:** o endereço atual da API de autenticação da instituição usa HTTP.
  A API do CONECTA só o aceita com `IFSUL_AUTH_PERMITIR_HTTP=true`, para teste; em produção, o
  endereço precisa ser HTTPS.
- **Implantação:** verificada localmente (nginx em Docker, HTTPS com certificado autoassinado, 11
  testes). A instalação no IFSul depende da instituição; o que ajustar está no topo de
  [`projeto-web/deploy/nginx.conf`](projeto-web/deploy/nginx.conf). A documentação interativa da
  API só é bloqueada no nginx: a porta da API não deve ficar acessível fora do servidor.
- **Aplicativo:** verificado só no Android. A aba Horários lista a primeira página das turmas da
  pessoa (20 turmas).
- **Diferenças em relação ao design:** onde a API não tem o dado, a interface não o mostra (turno da
  turma, tipo de aula). Estão nos relatórios de evidências de cada fase.
- **Avaliação:** os testes verificam regras e roteiros predefinidos, com dados fictícios; não houve
  avaliação com usuários.
- **Fora do escopo:** notificações push, registro de leitura, anexos e exceções pontuais na grade.

## Licença

Código sob a licença [MIT](LICENSE). As fontes Inter incluídas no projeto são distribuídas sob a
SIL Open Font License 1.1 (`Inter-LICENSE.txt` ao lado de cada cópia).
