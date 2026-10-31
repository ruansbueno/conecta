"""Ponta a ponta da E3 (SC-E3-001, SC-E3-005): a gestão monta a agenda e a grade → o app consulta.

Só pelos endpoints que as telas usam (contracts E3, "Resumo para os clientes"), com logins pelo
provedor simulado. Massa: atores e turmas de tests/e2e/conftest.py (a1 em A, a2 em B, d1
leciona em A).
"""

import pytest

pytestmark = pytest.mark.mock_auth


async def test_agenda_e_grade_do_cadastro_a_consulta(atores, turmas):
    a = atores
    c1, d1 = a["c1"], a["d1"]

    # 1. c1 marca uma banca de três dias para as turmas A e B.
    r = await c1.post(
        "/gestao/eventos",
        {
            "titulo": "Semana de bancas",
            "tipo": "banca",
            "inicio": "2030-09-02T22:00:00Z",
            "fim": "2030-09-05T01:00:00Z",
            "local": "Auditório",
            "destinos": [{"tipo": "turma", "turma_id": turmas[t]} for t in "AB"],
        },
    )
    assert r.status_code == 201, r.text
    evento = r.json()["id"]

    # 2. a1 e a2 veem a banca uma vez no mês e em cada dia dela; a3 e a4 não.
    setembro = "de=2030-09-01T03:00:00Z&ate=2030-10-01T03:00:00Z&incluir_encerrados=true"
    for quem in ("a1", "a2", "d1"):
        itens = (await a[quem].get(f"/eventos?{setembro}")).json()["items"]
        assert [i["id"] for i in itens] == [evento], quem
    quarta = "de=2030-09-04T03:00:00Z&ate=2030-09-05T03:00:00Z"
    assert [i["id"] for i in (await a["a1"].get(f"/eventos?{quarta}")).json()["items"]] == [evento]
    for quem in ("a3", "a4"):
        assert (await a[quem].get(f"/eventos?{setembro}")).json()["total"] == 0, quem
        assert (await a[quem].get(f"/eventos/{evento}")).status_code == 404, quem

    # 3. c1 muda o local: o detalhe mostra o novo, e o histórico guarda o antigo.
    r = await c1.patch(f"/gestao/eventos/{evento}", {"local": "Sala 203"})
    assert (r.status_code, r.json()["versao_atual"]) == (200, 2)
    detalhe = (await a["a1"].get(f"/eventos/{evento}")).json()
    assert (detalhe["local"], detalhe["editado_em"] is not None) == ("Sala 203", True)
    historico = (await c1.get(f"/gestao/eventos/{evento}/historico")).json()["items"]
    assert historico[0]["alteracoes"] == {"local": {"de": "Auditório", "para": "Sala 203"}}

    # 4. c1 monta a grade de A com d1; uma aula de B na mesma sala e hora é aceita com conflito.
    aula = {"dia_semana": 1, "inicio": "19:10", "fim": "20:50", "local": "Lab 4"}
    r = await c1.post(
        f"/gestao/turmas/{turmas['A']}/horarios",
        aula | {"disciplina": "Banco de Dados II", "docente_id": d1.id},
    )
    assert (r.status_code, r.json()["conflitos"]) == (201, [])
    r = await c1.post(f"/gestao/turmas/{turmas['B']}/horarios", aula | {"disciplina": "Redes"})
    assert r.status_code == 201
    assert [c["tipo"] for c in r.json()["conflitos"]] == ["sala"]

    # 5. a1 e d1 consultam a grade de A; a2 (de B) não tem acesso a ela.
    for quem in ("a1", "d1"):
        r = await a[quem].get(f"/turmas/{turmas['A']}/horarios")
        assert r.status_code == 200, quem
        (item,) = r.json()["items"]
        assert (item["disciplina"], item["docente"]["id"]) == ("Banco de Dados II", d1.id)
    r = await a["a2"].get(f"/turmas/{turmas['A']}/horarios")
    assert (r.status_code, r.json()["code"]) == (403, "SEM_PERMISSAO")

    # 6. c1 desativa A: a grade some para os clientes; a gestão continua vendo.
    assert (await c1.delete(f"/gestao/turmas/{turmas['A']}")).status_code == 204
    assert (await a["a1"].get(f"/turmas/{turmas['A']}/horarios")).status_code == 404
    assert (await c1.get(f"/gestao/turmas/{turmas['A']}/horarios")).json()["total"] == 1
