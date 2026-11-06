"""Roteiro integrado contra a API real: a coordenação age como a web, os alunos como o app.

A coordenação entra e escreve como a web (cookie de sessão + cabeçalho X-CSRF-Token assinado); os
alunos consultam como o aplicativo (Authorization: Bearer). Usa o banco de desenvolvimento com o
seed e desfaz o que criou ao final: aviso e evento são excluídos (exclusão lógica) e o horário é
removido.

Uso: com a API no ar em http://localhost:8000 e o seed carregado,
    .venv/bin/python -m scripts.roteiro_integrado
"""

import sys
import time
from datetime import UTC, datetime, timedelta

import httpx

API = "http://localhost:8000"
SENHA = "senha-teste"
falhas: list[str] = []


def etapa(numero: str, descricao: str, ok: bool, detalhe: str = "") -> None:
    print(
        f"[{'OK ' if ok else 'FALHOU'}] {numero} {descricao}" + (f" — {detalhe}" if detalhe else "")
    )
    if not ok:
        falhas.append(numero)


class Web:
    """Cliente como a web: cookies devolvidos à mão (os __Host- exigem HTTPS no navegador)."""

    def __init__(self, http: httpx.Client, username: str) -> None:
        self.http = http
        r = http.post("/auth/login", json={"username": username, "password": SENHA})
        r.raise_for_status()
        self.cookies = {
            c.split("=", 1)[0]: c.split("=", 1)[1].split(";", 1)[0]
            for c in r.headers.get_list("set-cookie")
        }
        self.csrf = self.cookies["__Host-conecta_csrf"]

    def _h(self, escrita: bool) -> dict[str, str]:
        h = {"Cookie": "; ".join(f"{k}={v}" for k, v in self.cookies.items())}
        if escrita:
            h["X-CSRF-Token"] = self.csrf
        return h

    def get(self, url, **kw):
        return self.http.get(url, headers=self._h(False), **kw)

    def post(self, url, **kw):
        return self.http.post(url, headers=self._h(True), **kw)

    def patch(self, url, **kw):
        return self.http.patch(url, headers=self._h(True), **kw)

    def delete(self, url, **kw):
        return self.http.delete(url, headers=self._h(True), **kw)


class App:
    """Cliente como o aplicativo: token do corpo do login no cabeçalho Authorization."""

    def __init__(self, http: httpx.Client, username: str) -> None:
        self.http = http
        r = http.post("/auth/login", json={"username": username, "password": SENHA})
        r.raise_for_status()
        self.h = {"Authorization": f"Bearer {r.json()['access_token']}"}

    def get(self, url, **kw):
        return self.http.get(url, headers=self.h, **kw)


def main() -> int:
    marca = time.strftime("%Y%m%d-%H%M%S")
    print(f"Roteiro integrado — {datetime.now().astimezone():%Y-%m-%d %H:%M %z} — API {API}")
    with httpx.Client(base_url=API, timeout=15) as http:
        coord = Web(http, "coord.teste")
        aluno_3a_3b = App(http, "aluno2.teste")  # vinculado às turmas 3A e 3B
        aluno_3c = App(http, "aluno3.teste")  # vinculado só à 3C

        turmas = {
            t["codigo"]: t
            for t in coord.get("/gestao/turmas", params={"limit": 100}).json()["items"]
        }
        t3a, t3b = turmas["TADS-3A-2026-2"]["id"], turmas["TADS-3B-2026-2"]["id"]

        # 1. Escrita sem CSRF é recusada (o cookie sozinho não basta).
        r = http.post(
            "/gestao/avisos",
            headers={"Cookie": coord._h(False)["Cookie"]},
            json={"titulo": "sem csrf", "conteudo": "x", "destinos": [{"tipo": "todos"}]},
        )
        etapa(
            "1",
            "web: publicar sem o cabeçalho CSRF",
            r.status_code == 403,
            f"{r.status_code} {r.json().get('code')}",
        )

        # 2. Publicação pela web para as turmas 3A e 3B.
        titulo = f"Roteiro integrado {marca}"
        r = coord.post(
            "/gestao/avisos",
            json={
                "titulo": titulo,
                "conteudo": "Aviso do roteiro integrado.",
                "destinos": [
                    {"tipo": "turma", "turma_id": t3a},
                    {"tipo": "turma", "turma_id": t3b},
                ],
            },
        )
        etapa(
            "2",
            "web: coordenação publica aviso para 3A e 3B",
            r.status_code == 201,
            str(r.status_code),
        )
        aviso_id = r.json()["id"]

        # 3. O app do aluno das duas turmas recebe uma vez; o da 3C não recebe e o id dá 404.
        itens = [
            a
            for a in aluno_3a_3b.get("/avisos", params={"limit": 100}).json()["items"]
            if a["id"] == aviso_id
        ]
        etapa(
            "3",
            "app: aluno de 3A e 3B vê o aviso uma única vez",
            len(itens) == 1,
            f"{len(itens)} ocorrência(s)",
        )
        vistos = [a["id"] for a in aluno_3c.get("/avisos", params={"limit": 100}).json()["items"]]
        r = aluno_3c.get(f"/avisos/{aviso_id}")
        etapa(
            "4",
            "app: aluno só da 3C não vê; consulta pelo id dá 404",
            aviso_id not in vistos and r.status_code == 404,
            str(r.status_code),
        )

        # 5. Edição pela web: o app passa a mostrar editado_em; a gestão vê 2 versões e o histórico.
        coord.patch(
            f"/gestao/avisos/{aviso_id}", json={"conteudo": "Aviso do roteiro integrado (editado)."}
        )
        a = aluno_3a_3b.get(f"/avisos/{aviso_id}").json()
        versoes = coord.get(f"/gestao/avisos/{aviso_id}/versoes").json()["total"]
        hist = [
            e["tipo"] for e in coord.get(f"/gestao/avisos/{aviso_id}/historico").json()["items"]
        ]
        etapa(
            "5",
            "edição na web aparece no app; 2 versões e histórico",
            a["editado_em"] is not None and versoes == 2 and {"criado", "editado"} <= set(hist),
            f"versões={versoes}, histórico={hist}",
        )

        # 6. Evento na web para a 3B: o app do aluno da 3B vê na agenda; o da 3C não.
        inicio = (datetime.now(UTC) + timedelta(days=3)).replace(microsecond=0)
        r = coord.post(
            "/gestao/eventos",
            json={
                "titulo": f"Evento {marca}",
                "tipo": "palestra",
                "inicio": inicio.isoformat(),
                "fim": (inicio + timedelta(hours=2)).isoformat(),
                "local": "Auditório",
                "destinos": [{"tipo": "turma", "turma_id": t3b}],
            },
        )
        evento_id = r.json()["id"]
        janela = {
            "de": datetime.now(UTC).isoformat(),
            "ate": (inicio + timedelta(days=1)).isoformat(),
            "limit": 100,
        }
        ve_3b = any(
            e["id"] == evento_id for e in aluno_3a_3b.get("/eventos", params=janela).json()["items"]
        )
        ve_3c = any(
            e["id"] == evento_id for e in aluno_3c.get("/eventos", params=janela).json()["items"]
        )
        etapa(
            "6",
            "web cria evento para a 3B; app: só quem tem vínculo vê na agenda",
            r.status_code == 201 and ve_3b and not ve_3c,
            f"{r.status_code}; 3B={ve_3b}, 3C={ve_3c}",
        )

        # 7. Horário na web, na mesma sala e hora de uma aula da 3A: grava e informa o conflito.
        aula = coord.get(f"/gestao/turmas/{t3a}/horarios").json()["items"][0]
        r = coord.post(
            f"/gestao/turmas/{t3b}/horarios",
            json={
                "dia_semana": aula["dia_semana"],
                "inicio": aula["inicio"],
                "fim": aula["fim"],
                "disciplina": f"Roteiro {marca}",
                "local": aula["local"],
            },
        )
        corpo = r.json()
        horario_id = corpo["horario"]["id"]
        tipos = sorted({c["tipo"] for c in corpo["conflitos"]})
        etapa(
            "7",
            "web cria horário com sala ocupada: grava e informa o conflito",
            r.status_code == 201 and "sala" in tipos,
            f"{r.status_code}; conflitos={tipos}",
        )
        grade = [h["id"] for h in aluno_3a_3b.get(f"/turmas/{t3b}/horarios").json()["items"]]
        r3c = aluno_3c.get(f"/turmas/{t3b}/horarios")
        etapa(
            "8",
            "app: aluno da 3B vê a aula na grade; aluno de fora não acessa",
            horario_id in grade and r3c.status_code in (403, 404),
            f"fora={r3c.status_code}",
        )

        # 9. Arquivar e excluir pela web: o aviso sai do app.
        coord.post(f"/gestao/avisos/{aviso_id}/arquivar")
        ativos = [
            x["id"] for x in aluno_3a_3b.get("/avisos", params={"limit": 100}).json()["items"]
        ]
        arquivados = [
            x["id"]
            for x in aluno_3a_3b.get(
                "/avisos", params={"situacao": "arquivado", "limit": 100}
            ).json()["items"]
        ]
        coord.delete(f"/gestao/avisos/{aviso_id}")
        r = aluno_3a_3b.get(f"/avisos/{aviso_id}")
        etapa(
            "9",
            "arquivado sai da lista ativa e vai aos arquivados; excluído dá 404 no app",
            aviso_id not in ativos and aviso_id in arquivados and r.status_code == 404,
            str(r.status_code),
        )

        # Limpeza: evento excluído (lógico) e horário removido.
        coord.delete(f"/gestao/eventos/{evento_id}")
        coord.delete(f"/gestao/turmas/{t3b}/horarios/{horario_id}")

    print(
        f"\nResultado: {9 - len(falhas)} de 9 etapas aprovadas"
        + (f"; falharam: {falhas}" if falhas else "")
    )
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
