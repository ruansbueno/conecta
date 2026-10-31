# Implementation Plan: Agenda e Horários — Entrega 3 (API)

**Branch**: `020-agenda-plano` (plano) | **Date**: 2026-10-31 | **Spec**: [spec.md](./spec.md) |
**Contrato**: [contracts/api.md](./contracts/api.md) | **Modelo**: [data-model.md](./data-model.md)

**Input**: E1 e E2 implementadas e integradas; CSRF assinado (PR #19) e nomenclatura do banco
(PR #20) na `main`. Este plano cobre a **Entrega 3** na API: eventos da agenda, com destinos,
versões e histórico, e a grade semanal de horários das turmas. Os clientes consomem esta entrega
nas suas fases F2 (app: m-10 a m-12; web: w-12, w-13), que têm planos próprios.

## Summary

Acrescentar duas áreas sobre as mesmas camadas da E1/E2 (`routes → services → repositories →
models`):

- **Eventos**: o mesmo ciclo de vida dos avisos (criar, editar, arquivar, desarquivar, excluir),
  com versão completa e histórico imutável gravados na mesma transação, e a mesma regra de
  destinos. Diferem do aviso por não terem agendamento de publicação e por serem situados no tempo
  por `inicio`/`fim`.
- **Horários**: CRUD da grade semanal pela gestão, consulta por quem tem vínculo e detecção de
  conflitos de sala e de docente, informados na resposta sem impedir a gravação.

A regra de "quem é alcançado" e a validação de destinos do docente deixam de ser do aviso e
passam a um módulo comum, usado pelos dois (D-E3-1): o sistema continua com uma única definição.

## Technical Context

Igual ao da E1/E2: Python 3.12, FastAPI, SQLAlchemy 2 assíncrono, asyncpg, Alembic, Pydantic v2,
pytest + httpx contra Postgres de teste (`conecta_test`), `uv`. Nenhuma dependência nova.

**Novidades da E3**
- Cinco tabelas novas (D-E3-2): `tb_evento`, `tb_evento_destino`, `tb_evento_versao`,
  `tb_evento_historico` e `tb_horario`, já na nomenclatura do banco.
- Os triggers de imutabilidade da E2 passam a valer também para `tb_evento_versao` e
  `tb_evento_historico`, com a mesma função `conecta_auditoria_imutavel`.
- Colunas de hora sem data (`TIME`) pela primeira vez: `hr_inicio` e `hr_fim` do horário.

**Constraints** (além das da E1/E2): nenhum evento chega a quem não é alcançado (SC-E3-001);
toda escrita de evento gera exatamente um registro de histórico (SC-E3-003); conflito de horário
nunca bloqueia (SC-E3-004); nenhum endpoint além dos do contrato (RF-49).

## Constitution Check

Avaliação contra `.specify/memory/constitution.md` v2.0.0:

- **I. Backend Centralizado** — PASS. Visibilidade, permissões, ciclo de vida, auditoria e
  detecção de conflitos vivem nos serviços; os clientes só exibem.
- **II. Autenticação Desacoplada** — PASS. Nada da E3 toca o `AuthProvider`.
- **III. Segurança por Padrão** — PASS. Perfil e situação relidos a cada requisição; CSRF
  assinado já vale para as escritas por cookie; 403 com `code` em toda recusa; consulta de grade
  só com vínculo.
- **IV. Separação de Responsabilidades** — PASS. Novos models, repositórios, serviços e rotas por
  área; a regra comum de destinos ganha módulo próprio em vez de ficar dentro do aviso.
- **V. API-First em Entregas Incrementais** — PASS. Implementa exatamente as seções 1–13 do
  contrato da E3.
- **VI. Simplicidade** — PASS. Eventos copiam o padrão já provado dos avisos; conflito é calculado
  na escrita, não armazenado; sem cadastro de salas nem de disciplinas (spec §6).

## Decisões da E3

- **D-E3-1 — Destinos e alcance num módulo comum.** `_alcanca` sai de
  `repositories/aviso_repository.py` para `repositories/alcance.py`, parametrizado pela tabela de
  destinos (`AvisoDestino` ou `EventoDestino`) e pela coluna que a liga ao dono. A validação de
  destinos (`_validar_destinos`, `_exigir_destinos_do_docente`) sai de
  `services/avisos_gestao_service.py` para `services/destinos.py`, e `destinos_canonicos` passa a
  receber a lista de destinos em vez do aviso. `DestinoIn` vai para `schemas/destino.py`. Os testes
  de avisos, sem mudança, protegem a refatoração, feita antes de qualquer código de evento.
- **D-E3-2 — Nomes físicos.** Seguem a seção "Nomes físicos" da E1:
  - `tb_evento`: `id_evento`, `nm_evento` (título), `txt_evento` (descrição, opcional),
    `tp_evento`, `dt_inicio`, `dt_fim`, `nm_local`, `id_usuario` (autor), `st_evento`,
    `nr_versao`, `dt_cadastro`, `dt_edicao`, `dt_arquivamento`, `dt_exclusao`.
  - `tb_evento_destino`: `id_evento_destino`, `id_evento`, `tp_destino`, `id_turma`,
    `nr_semestre`, com as mesmas restrições de `tb_aviso_destino`.
  - `tb_evento_versao`: `id_evento_versao`, `id_evento`, `nr_versao`, `nm_evento`, `txt_evento`,
    `tp_evento`, `dt_inicio`, `dt_fim`, `nm_local`, `txt_destinos`, `id_usuario`, `dt_versao`.
  - `tb_evento_historico`: `id_evento_historico`, `id_evento`, `tp_operacao`, `id_usuario`,
    `dt_operacao`, `nr_versao`, `txt_alteracoes`.
  - `tb_horario`: `id_horario`, `id_turma` (cascata com a turma), `nr_dia_semana`, `hr_inicio`,
    `hr_fim`, `nm_disciplina` (texto, como na spec), `nm_local`, `id_usuario_docente`.

  Nos models, os atributos usam os nomes do contrato (`titulo`, `inicio`, `disciplina`…).
- **D-E3-3 — Intervalo da consulta (RF-38).** `de` e `ate` formam a janela semiaberta `[de, ate)`,
  para que a visão de mês peça "do dia 1 ao dia 1 do mês seguinte". **Emenda de 31/10/2026**: entra
  todo evento que **toca** a janela (`inicio < ate` e, com `fim`, `fim > de`; sem `fim`,
  `inicio >= de`), e não só os que começam nela — uma semana acadêmica aparece em cada dia e em
  cada mês que cobre. A gestão usa a mesma regra. Só `de` ou só `ate` valem sozinhos. `ate < de`
  dá 422; `ate == de` é intervalo vazio, não erro.
- **D-E3-4 — Encerrado.** Um evento está encerrado quando `COALESCE(fim, inicio) < now()`. Com
  `incluir_encerrados=false` (padrão), a consulta tira os encerrados. Um evento em andamento
  (começou e ainda não terminou) **aparece**. Sem `de` nem `ate`, a lista é "a partir de agora":
  só esse filtro. A situação `arquivado` ignora `incluir_encerrados`: a lista de arquivados é
  histórica por natureza.
- **D-E3-5 — Ordem.** A consulta dos clientes e a lista de gestão ordenam por `inicio` crescente e,
  no empate, por `id` (paginação estável). Versões, da mais nova para a mais antiga; histórico, como
  o do aviso.
- **D-E3-6 — Evento no passado.** Criar ou mover um evento para uma data passada é aceito: a
  gestão pode registrar o que já aconteceu (uma banca que não foi cadastrada a tempo). Só vale
  `fim > inicio`, conferido também no `PATCH`, com os valores resultantes (enviar só `inicio` depois
  do `fim` atual dá 422). `fim: null` no `PATCH` torna o evento pontual.
- **D-E3-7 — Visibilidade do detalhe.** `GET /eventos/{id}` devolve ativos e arquivados que alcançam
  o usuário (como no aviso); excluído ou fora do alcance dá 404 `EVENTO_NAO_ENCONTRADO`.
- **D-E3-8 — Docente e eventos.** As mesmas regras do aviso: cria só com destinos `turma` em que
  leciona; edita, arquiva, exclui e audita só os que criou; editar sem mandar `destinos`, ou
  desarquivar, exige que os destinos atuais ainda sejam turmas em que leciona (spec, casos de
  borda). A lista de gestão do docente traz só os seus.
- **D-E3-9 — Conflito de horário (RF-44).** Outro horário conflita quando está no mesmo
  `dia_semana`, com sobreposição estrita (`inicio_a < fim_b` e `inicio_b < fim_a`; encostar não
  conflita), numa turma **ativa** do **mesmo período letivo** da turma do horário gravado
  (decisão de 31/10/2026, emenda ao `data-model.md`), e:
  - **sala**: `local` equivalente pela normalização do contrato (sem acento, sem diferença de
    caixa, espaços colapsados); horário sem local nunca conflita por sala;
  - **docente**: mesmo `docente_id`; horário sem docente nunca conflita por docente.

  O próprio horário fica de fora da comparação na edição. Um mesmo horário pode aparecer duas vezes
  na lista, uma por tipo. A normalização é feita em Python sobre os candidatos já filtrados no SQL
  por dia, período e sobreposição (a grade de um período é pequena), sem extensão `unaccent`.
- **D-E3-10 — Grade de turma inativa.** `GET /turmas/{id}/horarios` de turma inativa dá 404
  `TURMA_NAO_ENCONTRADA` para todos os perfis (decisão de 31/10/2026); a gestão continua vendo a
  grade por `/gestao/turmas/{id}/horarios`. Vínculo de qualquer papel dá acesso; administração e
  coordenação consultam qualquer turma ativa. Todas as rotas de `/gestao/turmas/{id}/horarios`,
  inclusive a leitura, são só de administração e coordenação: o docente consulta a grade pela rota
  dos clientes, como os alunos.
- **D-E3-11 — Docente do horário.** `docente_id` precisa existir (404 `USUARIO_NAO_ENCONTRADO`) e
  ter perfil `docente` (409 `PERFIL_INCOMPATIVEL`, RF-47). Um docente desativado continua aceito: o
  que a regra pede é o perfil, e a coordenação decide se troca (spec, casos de borda).
- **D-E3-12 — Horário não tem auditoria.** Como no contrato: remoção física, sem versões e sem
  histórico. `PATCH` com corpo vazio ou sem mudança dá 422, como nas demais rotas de gestão.
- **D-E3-13 — Concorrência.** Escritas de evento travam a linha (`SELECT … FOR UPDATE`), como as
  do aviso (D-E2-7). Horários não travam: o conflito é informativo, e duas gravações simultâneas que
  se sobreponham apenas deixam de citar uma à outra na resposta.

## Project Structure (acréscimos)

```text
src/
├── models/
│   ├── evento.py               # Evento, EventoDestino
│   ├── evento_versao.py        # EventoVersao (txt_destinos JSONB)
│   ├── evento_historico.py     # EventoHistorico (txt_alteracoes JSONB)
│   └── horario.py              # Horario
├── schemas/
│   ├── destino.py              # DestinoIn, DestinoOut (saem de aviso/gestão de avisos)
│   ├── evento.py               # EventoOut (consulta)
│   ├── horario.py              # HorarioOut, ConflitoOut
│   └── gestao/eventos.py · gestao/horarios.py
├── repositories/
│   ├── alcance.py              # alcanca(destino, usuario): única regra de visibilidade
│   ├── evento_repository.py
│   └── horario_repository.py   # candidatos a conflito
├── services/
│   ├── destinos.py             # validar destinos, regra do docente, destinos canônicos
│   ├── evento_service.py       # consulta (RF-37, RF-38)
│   ├── eventos_gestao_service.py   # ciclo de vida + versão + histórico
│   ├── horarios_service.py     # consulta por vínculo, CRUD e conflitos
│   └── conflitos.py            # normalização do local e sobreposição (puro, testável)
└── api/routes/
    ├── eventos.py · horarios.py
    └── gestao/eventos.py · gestao/horarios.py

alembic/versions/              # uma migração: 5 tabelas + triggers de imutabilidade
tests/
├── unit/test_conflito_horario.py
├── contract/ (eventos, horários) e contract/gestao/ (eventos, horários)
├── integration/ (visibilidade, intervalo, versões/histórico, acesso à grade, conflitos)
└── e2e/test_fluxo_agenda.py   # coordenação cria evento e grade → aluno consulta
```

## Testes

Mesma estratégia da E1/E2: contrato por endpoint, integração por regra, todos com o provedor mock,
contra `conecta_test`, escritos antes do código. Os nomes previstos na rastreabilidade da spec (§8)
são mantidos. O teste de nomenclatura da E1 passa a cobrir as tabelas novas sem mudança (ele lê o
catálogo inteiro), e a matriz de permissões ganha as rotas da E3.

## Fora deste plano

- Telas do app (F2: m-10, m-10b, m-11, m-12) e da web (F2: w-12, w-13): planos próprios.
- Atualização do `ER.architect` com as tabelas novas: feita no fim da implementação, pelo gerador
  usado no PR #20; o arquivo continua fora dos commits.

## Complexity Tracking

Sem violações. A refatoração do D-E3-1 é a única mudança em código da E2, e existe para não haver
duas definições de alcance.
