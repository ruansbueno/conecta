# Implementation Plan: Correções da revisão de código (API)

**Branch**: `040-correcoes-revisao-api` | **Date**: 2026-11-13 |
**Specs**: [001](../001-auth-perfil-turmas-avisos/spec.md) (emenda v2.4) e
[002](../002-agenda-horarios/spec.md) | **Tarefas**: [tasks.md](./tasks.md)

**Input**: uma revisão de código da API, feita depois das evidências finais de 12/11/2026,
apontou cinco defeitos, duas consultas repetidas e duplicação entre a gestão de avisos e a de
eventos. Cada achado foi reproduzido por um teste que falha antes da correção
(`tests/integration/gestao/test_revisao_codigo.py`).

## Summary

| # | Achado | Efeito | Decisão |
|---|---|---|---|
| 1 | `vincular` e `aprovar` (solicitação) leem o perfil sem travar a linha do usuário, enquanto `PATCH /gestao/usuarios` trava | Com as duas operações ao mesmo tempo, um docente pode ficar com vínculo de aluno | D-RV-1 |
| 2 | Arquivar ou desarquivar um aviso excluído responde 409 | Diferente de eventos (404); para o docente, diferente também do `GET` (404) | D-RV-2 |
| 3 | O histórico do aviso grava `publicar_em` no fuso em que veio | O dos eventos converte para UTC; o histórico do aviso mistura fusos | D-RV-3 |
| 4 | `publicar_em: null` num aviso publicado sem agendamento dá "nenhuma alteração" | O erro muda conforme o aviso foi criado | D-RV-4 |
| 5 | A busca `q` vai para o `ILIKE` sem escapar `%` e `_` | "100%" também encontra "1000"; "a_b" encontra "axb" | D-RV-5 |
| D1 | `exigir_destinos_do_docente` faz uma consulta por destino | Aviso para N turmas: N consultas | D-RV-6 |
| D2 | `GET /gestao/acessos` busca cada decisor separadamente (N+1) | Página de N pedidos: até N consultas a mais | D-RV-7 |
| R | `PUBLICADO_EM` definido duas vezes; `eventos_gestao_service` é quase uma cópia de `avisos_gestao_service` | As cópias já divergiram (origem dos itens 2 e 3) | D-RV-8 |

## Decisões

- **D-RV-1 — A linha do usuário trava antes de criar o vínculo.** `vincular` e `aprovar` passam
  a ler o usuário com `SELECT … FOR UPDATE` (`UsuarioRepository.get_for_update`), como
  `alterar` já faz. Quem chega depois espera o outro terminar e lê o perfil confirmado: ou o
  vínculo nasce antes e a troca de perfil o encontra (409 `PERFIL_INCOMPATIVEL`), ou a troca
  vem antes e o vínculo é recusado (409 `PERFIL_INCOMPATIVEL`). Sem risco de impasse: `vincular`
  e `aprovar` travam só essa linha (e `aprovar`, a solicitação, sempre antes do usuário).
- **D-RV-2 — Aviso excluído não existe para arquivar ou desarquivar: 404
  `AVISO_NAO_ENCONTRADO`** (decisão do autor, emenda v2.4), como nos eventos. Editar um aviso ou
  evento excluído continua 409 `*_NAO_EDITAVEL`, como o contrato já diz para os dois.
- **D-RV-3 — Datas do histórico em UTC.** Uma só função (`iso_utc`) serve avisos e eventos.
- **D-RV-4 — `publicar_em` enviado num aviso já publicado é sempre 422 "aviso já publicado não
  pode ser reagendado"** (decisão do autor, emenda v2.4), seja qual for o valor e seja como for
  que o aviso foi criado. A web só envia `publicar_em` para aviso ainda agendado, então nada
  muda para ela.
- **D-RV-5 — `q` é texto literal.** `%`, `_` e `\` são escapados (`ESCAPE '\'`) por um filtro
  único (`src/repositories/busca.py`), usado nas buscas de usuários, turmas, avisos e eventos.
- **D-RV-6 — Destinos do docente numa consulta.** Uma consulta traz, dentre as turmas dos
  destinos, aquelas em que o docente leciona.
- **D-RV-7 — Decisores dos pedidos numa consulta.** A lista de pedidos de acesso traz os
  decisores da página de uma vez; aprovar e recusar devolvem o próprio gestor como decisor, sem
  consultar.
- **D-RV-8 — Gestão comum a avisos e eventos.** O que é igual nos dois sai das cópias e passa
  a `src/services/publicacao_gestao.py`: carregar (com ou sem trava), autoria, obter, filtros
  comuns da lista, comparação de destinos, gravação da edição (versão e histórico), mudança de
  situação, versões e histórico. `AuditoriaRepository` vira uma classe só, parametrizada pelas
  tabelas de cada tipo. Os módulos `avisos_gestao_service` e `eventos_gestao_service` ficam
  com o que é próprio de cada um (agendamento do aviso; início, fim e janela do evento) e com
  as mesmas funções públicas: rotas e seed não mudam. `PUBLICADO_EM` fica só no repositório.

## Fora do escopo

- O comportamento de editar um item excluído (409, igual nos dois e no contrato).
- Os clientes: o app não usa as rotas alteradas; na web, o servidor falso dos testes passa a
  responder 404 ao arquivar ou desarquivar um aviso excluído, como a API (a interface nunca
  oferece essas ações para um excluído).
