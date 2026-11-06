# Implementation Plan: Autenticação, Perfis, Turmas e Avisos (Entrega 1; E2 planejada)

> **Nota (06/11/2026, emenda v2.3 da spec):** onde este documento fala em integração "com o
> Moodle", o serviço real acabou sendo a **API de autenticação do IFSul** (Active Directory). O
> texto abaixo é o registro das decisões da época; o estado atual está na `spec.md` (emenda v2.3),
> em `contracts/api.md` e no `quickstart.md`.

**Branch**: `001-auth-perfil-turmas-avisos` | **Date**: 2026-09-22 (revisado em 2026-09-30, v2) | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-auth-perfil-turmas-avisos/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

API REST em FastAPI. **Esta implementação cobre a Entrega 1** (app Mobile: login, perfil,
turmas com solicitação de inscrição, consulta de avisos com N destinos); a E2 (gestão web,
`/gestao/*`) e a E3 (agenda/horários) estão contratadas em `spec.md`/`contracts/api.md` e terão
plano e tarefas próprios. O perfil do usuário (`administrador|coordenacao|docente|aluno`) é
atribuído pelo CONECTA, nunca pelo provedor. A validação de credenciais é isolada atrás de uma interface
`AuthProvider`; em desenvolvimento/enquanto o Moodle não está acessível, roda um
`MockMoodleAuthProvider` com usuários de teste em seed, mantendo a implementação real
(`MoodleAuthProvider`) como um stub plugável por configuração. A persistência usa PostgreSQL
acessado sempre via `DATABASE_URL`: em desenvolvimento aponta para um Postgres local via Docker
Compose; em produção aponta para o banco remoto do servidor da faculdade — o código da
aplicação nunca diferencia os dois ambientes, apenas a configuração externa muda.

## Technical Context

**Language/Version**: Python 3.12

**Primary Dependencies**: FastAPI, SQLAlchemy 2.0 (async) + Alembic (migrações), Pydantic v2,
PyJWT (emissão/validação de JWT), asyncpg (driver PostgreSQL assíncrono), Uvicorn (ASGI server)

**Storage**: PostgreSQL — remoto (servidor da faculdade) em produção/homologação; local via
Docker Compose em desenvolvimento. Endereço e credenciais sempre injetados por variável de
ambiente (`DATABASE_URL`), nunca hardcoded; schema versionado via Alembic.

**Testing**: pytest + pytest-asyncio + httpx.AsyncClient (testes de contrato e integração contra
a API em memória); banco de teste isolado (schema/containers descartáveis) para os testes de
integração

**Target Platform**: Servidor Linux (infraestrutura própria do IFSul), containerizável via
Docker

**Project Type**: web-service (API REST single-project; não há frontend neste repositório —
Web e Mobile são clientes externos)

**Performance Goals**: Sem meta formal de alto volume nesta fase (uso institucional); alvo
qualitativo de resposta percebida como instantânea em operações de leitura (perfil, turmas,
avisos)

**Constraints**: Token JWT com validade de 24h (Princípio III); nenhuma senha de usuário
armazenada pelo CONECTA (Princípio II); toda comunicação externa MUST usar HTTPS em produção;
provedor de autenticação MUST ser trocável (mock → real) sem alterar rotas nem contratos de
resposta

**Scale/Scope**: Escala institucional de uma faculdade (na ordem de milhares de usuários, não
milhões); escopo desta implementação (E1): módulos Auth, Perfil, Turmas/Solicitações e Avisos
(leitura) consumidos pelo Mobile; dados de gestão entram por seed

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Avaliação contra `.specify/memory/constitution.md` v2.0.0:

- **I. Backend Centralizado** — PASS. Toda regra de negócio (auth, perfil, turmas, avisos) vive
  na API; nenhuma lógica é delegada ao cliente Mobile.
- **II. Autenticação Desacoplada do Moodle (NON-NEGOTIABLE)** — PASS. Plano define uma
  interface `AuthProvider` com duas implementações (`MockMoodleAuthProvider` e um stub
  `MoodleAuthProvider` para integração futura), selecionável por configuração/injeção de
  dependência, sem tocar rotas ou contratos.
- **III. Segurança por Padrão** — PASS. JWT de 24h, validação de assinatura/expiração em toda
  rota protegida, perfil/situação reavaliados no banco a cada requisição, respostas 401/403
  padronizadas com `code`, HTTPS assumido em produção.
- **IV. Separação de Responsabilidades** — PASS. Estrutura de código separa
  `api` (rotas/schemas), `services` (regras de negócio), `repositories` (persistência) e
  `providers/auth` (integração externa), conforme detalhado em Project Structure abaixo.
- **V. API-First em Entregas Incrementais** — PASS. Esta implementação (E1) entrega somente os
  endpoints do Mobile; os `/gestao/*` (E2) e agenda/horários (E3) não são implementados aqui.
- **VI. Simplicidade e Persistência Confiável** — PASS. Único banco relacional (PostgreSQL) com
  migrações versionadas via Alembic; a única abstração extra introduzida (`AuthProvider`) atende
  a uma necessidade concreta já identificada na constituição.

Nenhuma violação identificada. Seção "Complexity Tracking" permanece vazia.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── main.py                  # instancia FastAPI, registra routers e middlewares
├── core/
│   ├── config.py             # Settings (pydantic-settings) lidas de variáveis de ambiente,
│   │                          # incl. DATABASE_URL (local Docker em dev / remoto em prod)
│   └── security.py           # emissão/validação de JWT, dependências de auth (Bearer)
├── db/
│   ├── session.py            # engine/sessionmaker assíncronos (SQLAlchemy)
│   └── base.py                # Base declarativa + import central dos models p/ Alembic
├── models/                   # entidades SQLAlchemy: Usuario, Turma, VinculoTurma,
│                              # SolicitacaoInscricao, Aviso, AvisoDestino
│                              # (E2 acrescenta AvisoVersao e AvisoEvento)
├── schemas/                  # schemas Pydantic (request/response) por módulo
├── providers/
│   └── auth/
│       ├── base.py            # interface AuthProvider (contrato)
│       ├── mock_moodle.py      # MockMoodleAuthProvider (usuários de teste via seed/env)
│       └── moodle.py           # MoodleAuthProvider (stub — implementação real futura)
├── repositories/              # acesso a dados por entidade (usa apenas db/session)
├── services/                  # regras de negócio (login, perfil, turmas, avisos)
└── api/
    ├── errors.py              # exceções de domínio + handlers ({detail, code}; 422 com errors[])
    └── routes/                # routers FastAPI: auth, me, turmas, solicitacoes, avisos
                               # (E2 acrescenta o pacote gestao/)

alembic/
├── versions/
└── env.py                     # lê DATABASE_URL do mesmo Settings usado pela app

tests/
├── contract/                  # valida os contratos em specs/.../contracts/
├── integration/                # fluxos contra banco de teste
├── e2e/                       # (E2) fluxo publicar → receber, spec.md seção 9.3
└── unit/                      # services/providers isolados (inclui AuthProvider mock)
# marcadores pytest: `mock_auth` (depende do provedor simulado) e `moodle_real`
# (integração real; ignorado sem MOODLE_* configurado) — ver spec.md seção 9

docker-compose.yml              # Postgres local para desenvolvimento (não usado em produção)
Dockerfile                      # imagem da API (mesma para dev/staging/prod)
.env.example                    # variáveis esperadas, incl. DATABASE_URL e AUTH_PROVIDER
pyproject.toml
```

**Structure Decision**: Projeto único (web-service). Não há frontend neste repositório — Web e
Mobile são clientes externos que apenas consomem a API. A separação `api/ → services/ →
repositories/` implementa o Princípio IV (Separação de Responsabilidades); `providers/auth/`
isola a integração externa conforme o Princípio II. `docker-compose.yml` sobe **apenas** um
Postgres local para desenvolvimento — a aplicação em si roda igual em qualquer ambiente,
lendo `DATABASE_URL` de variável de ambiente (local via Docker em dev, remoto do servidor da
faculdade em produção/homologação), sem nenhum branching de código por ambiente.

## Complexity Tracking

*Nenhuma violação da constituição identificada — seção não aplicável.*
