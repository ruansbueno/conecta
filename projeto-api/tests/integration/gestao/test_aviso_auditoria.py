"""Auditoria do aviso (RF-27; spec §3.5; plan-e2 D-E2-4)."""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select

from src.models.aviso import Aviso
from src.models.aviso_evento import AvisoEvento
from src.models.aviso_versao import AvisoVersao
from src.repositories.auditoria_repository import AuditoriaRepository
from tests.helpers import bearer, criar_turma, criar_usuario


async def _contar(db, modelo):
    return await db.scalar(select(func.count()).select_from(modelo))


async def test_cada_operacao_gera_um_evento_com_usuario_e_data(client, db):
    coord = await criar_usuario(db, username="c.aud", perfil="coordenacao")
    admin = await criar_usuario(db, username="adm.aud", perfil="administrador")
    aviso = (
        await client.post(
            "/gestao/avisos",
            headers=bearer(coord),
            json={"titulo": "Auditado", "conteudo": "x", "destinos": [{"tipo": "todos"}]},
        )
    ).json()
    rota = f"/gestao/avisos/{aviso['id']}"

    await client.patch(rota, headers=bearer(admin), json={"titulo": "Auditado 2"})
    await client.post(f"{rota}/arquivar", headers=bearer(coord))
    await client.post(f"{rota}/desarquivar", headers=bearer(admin))
    await client.delete(rota, headers=bearer(coord))

    eventos = (
        await db.execute(
            select(AvisoEvento.tipo, AvisoEvento.usuario_id).order_by(AvisoEvento.ocorrido_em)
        )
    ).all()
    assert [e.tipo for e in eventos] == [
        "criado",
        "editado",
        "arquivado",
        "desarquivado",
        "excluido",
    ]
    assert [e.usuario_id for e in eventos] == [coord.id, admin.id, coord.id, admin.id, coord.id]
    assert await _contar(db, AvisoVersao) == 2  # só criar e editar geram versão


async def test_edicao_registra_so_os_campos_alterados_com_de_e_para(client, db):
    coord = await criar_usuario(db, username="c.aud", perfil="coordenacao")
    a, b = await criar_turma(db), await criar_turma(db)
    aviso = (
        await client.post(
            "/gestao/avisos",
            headers=bearer(coord),
            json={
                "titulo": "Mesmo",
                "conteudo": "Antes",
                "destinos": [{"tipo": "turma", "turma_id": str(a.id)}],
            },
        )
    ).json()

    await client.patch(
        f"/gestao/avisos/{aviso['id']}",
        headers=bearer(coord),
        json={
            "titulo": "Mesmo",
            "conteudo": "Depois",
            "destinos": [{"tipo": "turma", "turma_id": str(b.id)}],
        },
    )

    editado = await db.scalar(select(AvisoEvento).where(AvisoEvento.tipo == "editado"))
    assert set(editado.alteracoes) == {"conteudo", "destinos"}
    assert editado.alteracoes["conteudo"] == {"de": "Antes", "para": "Depois"}
    assert editado.alteracoes["destinos"]["de"][0]["turma_id"] == str(a.id)
    assert editado.alteracoes["destinos"]["para"][0]["turma_id"] == str(b.id)


async def test_versoes_preservam_o_conteudo_de_cada_versao(client, db):
    coord = await criar_usuario(db, username="c.aud", perfil="coordenacao")
    aviso = (
        await client.post(
            "/gestao/avisos",
            headers=bearer(coord),
            json={"titulo": "Original", "conteudo": "Texto 1", "destinos": [{"tipo": "todos"}]},
        )
    ).json()

    await client.patch(
        f"/gestao/avisos/{aviso['id']}",
        headers=bearer(coord),
        json={"conteudo": "Texto 2", "destinos": [{"tipo": "docentes"}]},
    )

    versoes = (await db.scalars(select(AvisoVersao).order_by(AvisoVersao.versao))).all()
    assert [(v.versao, v.conteudo, v.destinos[0]["tipo"]) for v in versoes] == [
        (1, "Texto 1", "todos"),
        (2, "Texto 2", "docentes"),
    ]


@pytest.mark.parametrize("operacao", ["criar", "editar"])
async def test_falha_ao_gravar_o_evento_desfaz_a_operacao_inteira(app, db, monkeypatch, operacao):
    coord = await criar_usuario(db, username="c.aud", perfil="coordenacao")
    transporte = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transporte, base_url="https://test") as c:
        aviso = None
        if operacao == "editar":
            aviso = (
                await c.post(
                    "/gestao/avisos",
                    headers=bearer(coord),
                    json={"titulo": "Base", "conteudo": "x", "destinos": [{"tipo": "todos"}]},
                )
            ).json()

        def falhar(*_, **__):
            raise RuntimeError("disco cheio")

        monkeypatch.setattr(AuditoriaRepository, "registrar", falhar)
        if operacao == "criar":
            r = await c.post(
                "/gestao/avisos",
                headers=bearer(coord),
                json={"titulo": "Novo", "conteudo": "x", "destinos": [{"tipo": "todos"}]},
            )
        else:
            r = await c.patch(
                f"/gestao/avisos/{aviso['id']}", headers=bearer(coord), json={"titulo": "Editado"}
            )

    assert r.status_code == 500
    esperado_avisos, esperado_versoes = (0, 0) if operacao == "criar" else (1, 1)
    assert await _contar(db, Aviso) == esperado_avisos
    assert await _contar(db, AvisoVersao) == esperado_versoes
    if aviso:
        titulo = await db.scalar(select(Aviso.titulo))
        assert titulo == "Base"
