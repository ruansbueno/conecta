# Tasks: Correções da revisão de código (API)

**Input**: [plan.md](./plan.md).

**Tests**: escritos antes da correção e vistos falhando, em
`tests/integration/gestao/test_revisao_codigo.py`. A unificação (D-RV-8) não muda
comportamento: a suíte inteira é a sua rede.

## Fase 1: Reproduzir

- [x] R001 Testes de cada achado (1–5, D1, D2), vistos falhando pelo motivo do achado

## Fase 2: Corrigir

- [x] R002 D-RV-1: `vincular` e `aprovar` travam a linha do usuário
- [x] R003 D-RV-5: filtro de busca literal em `src/repositories/busca.py`, nas quatro buscas
- [x] R004 D-RV-6: destinos do docente numa consulta
- [x] R005 D-RV-7: decisores dos pedidos de acesso numa consulta

## Fase 3: Unificar avisos e eventos

- [x] R006 D-RV-8: `AuditoriaRepository` único e `publicacao_gestao.py`; serviços de aviso e de
      evento só com o que é próprio; `PUBLICADO_EM` só no repositório
- [x] R007 D-RV-2, D-RV-3 e D-RV-4 resolvidos pela parte comum (404 no excluído, UTC no
      histórico) e pela regra do agendamento

## Fase 4: Contrato e registro

- [x] R008 Emenda v2.4 na spec 001 e nos contratos (404 no excluído, `publicar_em`, `q` literal)
- [x] R009 Servidor falso da web: 404 ao arquivar ou desarquivar aviso excluído
- [x] R010 Registro datado em `evidencias/` (suíte completa da API e da web) e READMEs
