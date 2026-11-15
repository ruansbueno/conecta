# Tasks: Provas e aulas do docente (API)

**Plano**: [plan.md](./plan.md) | **Spec**: [002](../002-agenda-horarios/spec.md) (emenda E3.1)

- [x] T001 Testes que falham: provas do docente (`tests/integration/test_docente_provas_proprias.py`)
      — lista, `tipo=prova`, janela do mês, detalhe 404; aluno e coordenação inalterados.
- [x] T002 Testes que falham: `GET /horarios/minhas` (`tests/integration/test_horarios_minhas.py`)
      — só as aulas do docente, de turmas ativas, por dia e hora, com a turma; paginação; lista
      vazia; 403 para os outros perfis; 401 sem sessão.
- [x] T003 Regra das provas em `EventoRepository._visiveis` (D-DP-1).
- [x] T004 `HorarioRepository.listar_do_docente`, `horarios_service.minhas_aulas`,
      `AulaDoDocenteOut` e a rota `src/api/routes/horarios.py` (D-DP-3 a D-DP-5).
- [x] T005 Spec 002 (RF-53, RF-54, rastreabilidade) e contrato (seções 1, 2 e 3a).
