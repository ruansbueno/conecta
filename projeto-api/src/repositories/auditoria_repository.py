"""Versões e histórico dos itens publicados pela gestão (avisos e eventos).

Só insere: versões e histórico são imutáveis (o banco recusa UPDATE e DELETE). Um repositório
só, parametrizado pelas tabelas de cada tipo (specs/003, D-RV-8).
"""

import uuid
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.aviso_evento import AvisoEvento
from src.models.aviso_versao import AvisoVersao
from src.models.evento_historico import EventoHistorico
from src.models.evento_versao import EventoVersao
from src.models.usuario import Usuario


def destinos_canonicos(destinos) -> list[dict]:
    """Destinos como JSON estável (ordem fixa) para versões e comparação de edições.

    Vale para os destinos de aviso e de evento, gravados ou novos.
    """
    itens = [
        {
            "tipo": d.tipo,
            "turma_id": str(d.turma_id) if d.turma_id else None,
            "semestre": d.semestre,
        }
        for d in destinos
    ]
    return sorted(itens, key=lambda d: (d["tipo"], d["turma_id"] or "", d["semestre"] or 0))


@dataclass(frozen=True)
class Auditado:
    """Tabelas de versões e de histórico de um tipo publicado."""

    chave: str  # coluna que aponta o item nas duas tabelas
    versao: type
    historico: type
    campos: tuple[str, ...]  # campos do item gravados em cada versão, além dos destinos


AVISO = Auditado("aviso_id", AvisoVersao, AvisoEvento, ("titulo", "conteudo", "publicar_em"))
EVENTO = Auditado(
    "evento_id",
    EventoVersao,
    EventoHistorico,
    ("titulo", "descricao", "tipo", "inicio", "fim", "local"),
)


class AuditoriaRepository:
    def __init__(self, session: AsyncSession, auditado: Auditado):
        self.session = session
        self.auditado = auditado

    def registrar_versao(self, item, autor_id: uuid.UUID, quando: datetime) -> None:
        a = self.auditado
        self.session.add(
            a.versao(
                **{a.chave: item.id},
                **{campo: getattr(item, campo) for campo in a.campos},
                versao=item.versao_atual,
                destinos=destinos_canonicos(item.destinos),
                criada_por=autor_id,
                criada_em=quando,
            )
        )

    def registrar(
        self,
        item,
        operacao: str,
        usuario_id: uuid.UUID,
        quando: datetime,
        versao: int | None = None,
        alteracoes: dict | None = None,
    ) -> None:
        self.session.add(
            self.auditado.historico(
                **{self.auditado.chave: item.id},
                tipo=operacao,
                usuario_id=usuario_id,
                # Hora aplicada sob o lock do item: o histórico segue a ordem real das escritas.
                ocorrido_em=quando,
                versao=versao,
                alteracoes=alteracoes,
            )
        )

    async def versoes(self, item_id: uuid.UUID, limit: int, offset: int):
        modelo = self.auditado.versao
        stmt = (
            select(modelo, Usuario)
            .join(Usuario, Usuario.id == modelo.criada_por)
            .where(getattr(modelo, self.auditado.chave) == item_id)
        )
        return await self._pagina(stmt, (modelo.versao.desc(),), limit, offset)

    async def historico(self, item_id: uuid.UUID, limit: int, offset: int):
        modelo = self.auditado.historico
        stmt = (
            select(modelo, Usuario)
            .join(Usuario, Usuario.id == modelo.usuario_id)
            .where(getattr(modelo, self.auditado.chave) == item_id)
        )
        ordem = (modelo.ocorrido_em.desc(), modelo.versao.desc().nulls_first())
        return await self._pagina(stmt, ordem, limit, offset)

    async def _pagina(self, stmt, ordem, limit: int, offset: int):
        total = await self.session.scalar(select(func.count()).select_from(stmt.subquery()))
        linhas = await self.session.execute(stmt.order_by(*ordem).limit(limit).offset(offset))
        return [(registro, usuario) for registro, usuario in linhas], total
