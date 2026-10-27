import uuid
from datetime import datetime
from typing import Literal, get_args

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base

TipoEvento = Literal["criado", "editado", "arquivado", "desarquivado", "excluido"]
TIPOS_EVENTO: tuple[str, ...] = get_args(TipoEvento)


class AvisoEvento(Base):
    """Log de auditoria do aviso. Imutável: o banco recusa UPDATE e DELETE."""

    __tablename__ = "aviso_evento"
    __table_args__ = (
        CheckConstraint(
            "tipo IN (" + ", ".join(f"'{t}'" for t in TIPOS_EVENTO) + ")", name="tipo_valido"
        ),
        Index("ix_aviso_evento_aviso_ocorrido", "aviso_id", "ocorrido_em"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    aviso_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("aviso.id"))
    tipo: Mapped[str] = mapped_column(String(15))
    usuario_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuario.id"))
    ocorrido_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    versao: Mapped[int | None]
    # Em "editado": {campo: {"de": ..., "para": ...}}.
    alteracoes: Mapped[dict | None] = mapped_column(JSONB)
