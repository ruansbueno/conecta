# Implementation Plan: Gestão — Entrega 2 (API)

**Branch**: `002-gestao-e2` | **Date**: 2026-10-26 | **Spec**: [spec.md](./spec.md) (v2.1) |
**Contrato**: [contracts/api.md](./contracts/api.md) §10–15 | **Modelo**: [data-model.md](./data-model.md)

**Input**: E1 implementada e integrada (PR #1). Este plano cobre a **Entrega 2**: os endpoints
`/gestao/*` consumidos pela plataforma web, as versões e o histórico imutável dos avisos e o
teste de ponta a ponta da `spec.md` §9.3. A E3 (agenda e horários) tem spec própria
(`specs/002-agenda-horarios`).

## Summary

Acrescentar à API em FastAPI o pacote `api/routes/gestao/` com cinco áreas — usuários e perfis,
turmas, vínculos, solicitações e avisos (com versões e histórico) — sobre as mesmas camadas da E1
(`routes → services → repositories → models`). Toda escrita de aviso grava, **na mesma
transação**, a nova versão (`aviso_versao`) e o evento de auditoria (`aviso_evento`). A matriz de
permissões da `spec.md` §2.3 é aplicada no serviço, com o perfil e a situação relidos do banco a
cada requisição (como na E1).

## Technical Context

Igual ao da E1 ([plan.md](./plan.md)): Python 3.12, FastAPI, SQLAlchemy 2 assíncrono, asyncpg,
Alembic, Pydantic v2, pytest + httpx contra Postgres de teste (`conecta_test`), `uv`.

**Novidades da E2**
- Duas tabelas novas: `aviso_versao` e `aviso_evento` (data-model.md), com colunas JSONB
  (`destinos` da versão, `alteracoes` do evento).
- Imutabilidade de versões e eventos garantida **também no banco**, por trigger que rejeita
  `UPDATE` e `DELETE` (D-E2-3).
- Nenhuma dependência nova.

**Constraints** (além das da E1): toda resposta de lista é paginada; todo erro segue o catálogo do
contrato; docente nunca recebe dado de turma ou aviso fora do seu alcance — responde 403
`SEM_PERMISSAO` (ou `DESTINO_NAO_PERMITIDO` nos destinos), sem vazar existência além do contrato.

## Constitution Check

Avaliação contra `.specify/memory/constitution.md` v2.0.0:

- **I. Backend Centralizado** — PASS. Toda regra de gestão (permissões, restrição de destinos do
  docente, ciclo do aviso, auditoria) vive no serviço; a web só exibe.
- **II. Autenticação Desacoplada** — PASS. Nada da E2 toca o `AuthProvider`; o perfil continua
  sendo do CONECTA e só o administrador o altera (RF-09).
- **III. Segurança por Padrão** — PASS. Perfil/ativo relidos a cada requisição; CSRF por cookie
  já vale para todas as escritas `/gestao/*` (a web usa cookie); 403 com `code` em toda recusa.
- **IV. Separação de Responsabilidades** — PASS. Novo pacote de rotas `gestao/`, serviços por área
  e repositórios para versões e eventos.
- **V. API-First em Entregas Incrementais** — PASS. Implementa exatamente §10–15 do contrato.
- **VI. Simplicidade** — PASS. Versões como cópia completa e eventos como log; sem event sourcing,
  sem filas. A única peça extra — o trigger de imutabilidade — atende a uma regra explícita do
  modelo de dados.

## Decisões da E2

- **D-E2-1 — Docente lê só as suas turmas na gestão.** O contrato não fixa quem lê
  `GET /gestao/turmas` e `GET /gestao/turmas/{id}`; a web usa a lista para o seletor de destinos.
  Administração e coordenação leem todas; docente recebe **apenas as turmas em que leciona**
  (lista filtrada; detalhe de turma alheia → 403 `SEM_PERMISSAO`). Criar, editar e desativar
  seguem só para administração e coordenação (matriz §2.3).
- **D-E2-2 — `situacao=agendado` é da API (RF-34).** A plataforma web planejava filtrar
  agendados no cliente; a emenda v2.1 do contrato da API fixou o filtro no servidor e prevalece:
  `agendado` = `situacao='ativo' AND publicar_em > now()`; `ativo` = já publicados. Sem
  `situacao`, a lista devolve tudo exceto excluídos. `excluido` só para administração e
  coordenação (docente → 403).
- **D-E2-3 — Imutabilidade no banco.** `aviso_versao` e `aviso_evento` recebem trigger
  `BEFORE UPDATE OR DELETE` que levanta exceção. A aplicação só insere. A FK para `aviso` não usa
  `ON DELETE CASCADE` (avisos nunca são apagados — exclusão é lógica).
- **D-E2-4 — Versão e evento na mesma transação.** O serviço de avisos abre uma transação por
  operação: altera `aviso`/`aviso_destino`, insere a versão (quando cria/edita) e o evento, e só
  então faz commit. Falha em qualquer passo desfaz tudo.
- **D-E2-5 — "Nenhuma alteração" é comparada com a versão atual.** O `PATCH` normaliza os
  destinos (conjunto, sem ordem) e compara `titulo`, `conteudo`, `publicar_em` e `destinos` com o
  estado atual; nada diferente → 422 `VALIDATION_ERROR` com
  `errors: [{"campo": "body", "mensagem": "nenhuma alteração"}]`. `alteracoes` do evento registra só os campos que mudaram,
  com `de`/`para`.
- **D-E2-6 — `publicar_em` no PATCH.** Pode ser alterado enquanto o aviso ainda não foi publicado;
  o novo valor precisa ser futuro (como no `POST`). Enviar `publicar_em: null` num agendado publica
  imediatamente. Aviso já publicado não volta a ser agendado (422).
- **D-E2-7 — Concorrência.** Decisões sobre solicitações e escritas em aviso travam a linha
  (`SELECT … FOR UPDATE`), como as decisões da E1. A próxima `versao` é `versao_atual + 1` lida
  sob esse lock; o índice único (`aviso_id`, `versao`) é a última defesa.
- **D-E2-8 — Auto-recusa por `JA_VINCULADO`.** Ao aprovar, se o aluno já tem vínculo (criado por
  gestão entre o pedido e a decisão), a solicitação é marcada `recusada` com motivo fixo
  "Aluno já vinculado à turma" e a resposta é 409 `JA_VINCULADO` (contrato §13). A recusa
  automática é gravada mesmo com o 409 (commit antes de levantar o erro).
- **D-E2-9 — Último administrador.** `PATCH /gestao/usuarios/{id}` recusa com 422 desativar a si
  próprio e qualquer mudança que deixe zero administradores ativos (rebaixar ou desativar o último),
  verificado sob lock da tabela de administradores ativos.
- **D-E2-10 — Script de aprovação da E1.** `scripts/aprovar_solicitacao.py` passa a usar o mesmo
  serviço de decisão da E2 (mesmas regras); continua útil em desenvolvimento.

## Project Structure (acréscimos)

```text
src/
├── models/
│   ├── aviso_versao.py        # AvisoVersao (destinos JSONB)
│   └── aviso_evento.py        # AvisoEvento (alteracoes JSONB)
├── schemas/gestao/            # schemas de entrada e saída de /gestao/*
├── repositories/
│   ├── aviso_versao_repository.py
│   └── aviso_evento_repository.py
├── services/
│   ├── permissoes.py          # leciona(), exigir_gestao(), regras do docente
│   ├── usuarios_gestao_service.py
│   ├── turmas_gestao_service.py
│   ├── vinculos_service.py
│   ├── solicitacoes_gestao_service.py
│   └── avisos_gestao_service.py   # criar/editar/arquivar/desarquivar/excluir + versão + evento
└── api/routes/gestao/
    ├── usuarios.py · turmas.py · vinculos.py · solicitacoes.py · avisos.py

alembic/versions/              # migração de aviso_versao + aviso_evento + triggers
tests/
├── contract/gestao/           # um arquivo por seção do contrato (10–15)
├── integration/gestao/        # regras: docente, último admin, auditoria, concorrência
└── e2e/test_fluxo_publicar_receber.py   # spec.md §9.3 (RF-30)
```

## Testes

Mesma estratégia da E1 (spec §9.1): contrato por endpoint, integração por regra, todos com o
provedor mock, contra `conecta_test`. A E2 acrescenta a camada **E2E de API** (`tests/e2e/`): o
roteiro da §9.3 executado inteiro pelos endpoints públicos, com logins reais pelo mock, sem
atalhos no banco além da massa inicial.

## Complexity Tracking

Sem violações. O trigger de imutabilidade é a única peça além do mínimo e está justificado em
D-E2-3.
