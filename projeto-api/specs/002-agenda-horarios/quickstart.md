# Quickstart: Agenda e Horários (Entrega 3)

Valida à mão os fluxos da E3 contra a API local. Ambiente, migrações e seed: siga as seções 1–4
do [quickstart da E1/E2](../001-auth-perfil-turmas-avisos/quickstart.md). O seed já traz sete
eventos (um de vários dias em andamento, próximos, um encerrado, um remarcado com histórico, um
arquivado e um pontual) e a grade das turmas 3A, 3B e 5A, com um conflito de sala de propósito.

> As datas dos eventos são fixadas na **primeira** execução do seed (relativas àquele dia) e não se
> renovam depois: num banco semeado há semanas, a agenda de "próximos" pode vir vazia. Para
> recriar a agenda, esvazie as tabelas dela (`TRUNCATE tb_evento, tb_evento_destino,
> tb_evento_versao, tb_evento_historico`) e rode o seed de novo.

```bash
entrar() {  # entrar <usuário> → imprime o cabeçalho Authorization
  curl -s -X POST http://localhost:8000/auth/login -H "Content-Type: application/json" \
    -d "{\"username\": \"$1\", \"password\": \"senha-teste\"}" \
    | python3 -c 'import sys,json;print("Authorization: Bearer " + json.load(sys.stdin)["access_token"])'
}
COORD=$(entrar coord.teste); ALUNO=$(entrar aluno.teste); OUTRO=$(entrar aluno3.teste)
J="Content-Type: application/json"
```

## 1. Agenda pelo aplicativo

```bash
curl "http://localhost:8000/eventos" -H "$ALUNO"            # próximos e em andamento
curl "http://localhost:8000/eventos?de=2026-11-01T03:00:00Z&ate=2026-12-01T03:00:00Z&incluir_encerrados=true" -H "$ALUNO"
curl "http://localhost:8000/eventos?situacao=arquivado" -H "$ALUNO"
```

Esperado: só eventos que alcançam a pessoa, por `inicio` crescente, sem duplicatas. A "Semana
acadêmica" (vários dias) aparece em toda janela que ela toca; a "Reunião de colegiado" (encerrada,
só docentes) não aparece para alunos. A "Prova de Banco de Dados II" aparece para `aluno.teste`
(turma 3A) e não para `aluno3.teste` (3C).

## 2. Gestão de um evento — como `coord.teste`

```bash
ID=$(curl -s -X POST http://localhost:8000/gestao/eventos -H "$COORD" -H "$J" -d '{
  "titulo": "Banca extra", "tipo": "banca",
  "inicio": "2026-12-03T22:00:00Z", "fim": "2026-12-04T00:00:00Z", "local": "Sala 203",
  "destinos": [{"tipo": "todos"}]}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
curl -X PATCH http://localhost:8000/gestao/eventos/$ID -H "$COORD" -H "$J" -d '{"local": "Lab 4"}'
curl http://localhost:8000/gestao/eventos/$ID/historico -H "$COORD"    # editado (local), criado
curl http://localhost:8000/gestao/eventos/$ID/versoes -H "$COORD"      # versões 2 e 1, completas
curl -X POST http://localhost:8000/gestao/eventos/$ID/arquivar -H "$COORD"
curl -X DELETE http://localhost:8000/gestao/eventos/$ID -H "$COORD"     # 204; some da agenda
```

Esperado: `PATCH` devolve `versao_atual: 2`; o histórico registra `local` de "Sala 203" para
"Lab 4"; depois de excluído, `GET /eventos/$ID` dá 404 e a gestão ainda abre versões e histórico.
`docente.teste` cria só para as turmas em que leciona (3A, 5A): `todos` → 403
`DESTINO_NAO_PERMITIDO`.

## 3. Grade de horários

```bash
TURMA=$(curl -s "http://localhost:8000/turmas/minhas" -H "$ALUNO" \
  | python3 -c 'import sys,json;print(next(t["id"] for t in json.load(sys.stdin)["items"] if t["codigo"]=="TADS-3A-2026-2"))')
curl http://localhost:8000/turmas/$TURMA/horarios -H "$ALUNO"           # aulas por dia e hora
curl http://localhost:8000/turmas/$TURMA/horarios -H "$OUTRO"           # 403: sem vínculo
curl -X POST http://localhost:8000/gestao/turmas/$TURMA/horarios -H "$COORD" -H "$J" -d '{
  "dia_semana": 1, "inicio": "20:00", "fim": "21:40", "disciplina": "Monitoria", "local": "LAB 4"}'
```

Esperado: a grade da 3A vem ordenada por dia e hora, com o docente de cada aula; quem não tem
vínculo recebe 403. O `POST` é aceito (201) e informa dois conflitos de sala no Lab 4: a aula de
Banco de Dados II da própria 3A e a de Algoritmos da 3B. Docente e aluno recebem 403 em
`/gestao/turmas/{id}/horarios`. O `POST` não é idempotente: repetido, a 3A ganha outra aula e a
contagem de conflitos muda; remova a aula com `DELETE /gestao/turmas/$TURMA/horarios/<id>`.

## 4. Suíte automatizada

```bash
.venv/bin/pytest -q                       # inclui tests/e2e/test_fluxo_agenda.py
```
