import uuid
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.aviso import Aviso
from src.models.aviso_evento import AvisoEvento
from src.models.aviso_versao import AvisoVersao


def destinos_canonicos(aviso: Aviso) -> list[dict]:
    """Destinos como JSON estável (ordem fixa) para versões e comparação de edições."""
    itens = [
        {
            "tipo": d.tipo,
            "turma_id": str(d.turma_id) if d.turma_id else None,
            "semestre": d.semestre,
        }
        for d in aviso.destinos
    ]
    return sorted(itens, key=lambda d: (d["tipo"], d["turma_id"] or "", d["semestre"] or 0))


class AuditoriaRepository:
    """Só insere: versões e eventos são imutáveis (o banco recusa UPDATE/DELETE)."""

    def __init__(self, session: AsyncSession):
        self.session = session

    def registrar_versao(self, aviso: Aviso, autor_id: uuid.UUID, quando: datetime) -> None:
        self.session.add(
            AvisoVersao(
                aviso_id=aviso.id,
                versao=aviso.versao_atual,
                titulo=aviso.titulo,
                conteudo=aviso.conteudo,
                destinos=destinos_canonicos(aviso),
                publicar_em=aviso.publicar_em,
                criada_por=autor_id,
                criada_em=quando,
            )
        )

    def registrar_evento(
        self,
        aviso: Aviso,
        tipo: str,
        usuario_id: uuid.UUID,
        quando: datetime,
        versao: int | None = None,
        alteracoes: dict | None = None,
    ) -> None:
        self.session.add(
            AvisoEvento(
                aviso_id=aviso.id,
                tipo=tipo,
                usuario_id=usuario_id,
                # Hora aplicada sob o lock do aviso: o histórico segue a ordem real das escritas.
                ocorrido_em=quando,
                versao=versao,
                alteracoes=alteracoes,
            )
        )
