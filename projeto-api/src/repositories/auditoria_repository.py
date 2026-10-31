import uuid
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.aviso import Aviso
from src.models.aviso_evento import AvisoEvento
from src.models.aviso_versao import AvisoVersao
from src.models.evento import Evento
from src.models.evento_historico import EventoHistorico
from src.models.evento_versao import EventoVersao


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
                destinos=destinos_canonicos(aviso.destinos),
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


class AuditoriaEventoRepository:
    """Versões e histórico do evento, no mesmo padrão do aviso. Só insere."""

    def __init__(self, session: AsyncSession):
        self.session = session

    def registrar_versao(self, evento: Evento, autor_id: uuid.UUID, quando: datetime) -> None:
        self.session.add(
            EventoVersao(
                evento_id=evento.id,
                versao=evento.versao_atual,
                titulo=evento.titulo,
                descricao=evento.descricao,
                tipo=evento.tipo,
                inicio=evento.inicio,
                fim=evento.fim,
                local=evento.local,
                destinos=destinos_canonicos(evento.destinos),
                criada_por=autor_id,
                criada_em=quando,
            )
        )

    def registrar(
        self,
        evento: Evento,
        tipo: str,
        usuario_id: uuid.UUID,
        quando: datetime,
        versao: int | None = None,
        alteracoes: dict | None = None,
    ) -> None:
        self.session.add(
            EventoHistorico(
                evento_id=evento.id,
                tipo=tipo,
                usuario_id=usuario_id,
                ocorrido_em=quando,
                versao=versao,
                alteracoes=alteracoes,
            )
        )
