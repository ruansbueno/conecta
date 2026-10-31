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

    __tablename__ = "tb_aviso_historico"
    __table_args__ = (
        CheckConstraint(
            "tp_operacao IN (" + ", ".join(f"'{t}'" for t in TIPOS_EVENTO) + ")", name="tipo_valido"
        ),
        Index("ix_tb_aviso_historico_aviso_ocorrido", "id_aviso", "dt_operacao"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        "id_aviso_historico", primary_key=True, default=uuid.uuid4
    )
    aviso_id: Mapped[uuid.UUID] = mapped_column("id_aviso", ForeignKey("tb_aviso.id_aviso"))
    tipo: Mapped[str] = mapped_column("tp_operacao", String(15))
    usuario_id: Mapped[uuid.UUID] = mapped_column("id_usuario", ForeignKey("tb_usuario.id_usuario"))
    ocorrido_em: Mapped[datetime] = mapped_column(
        "dt_operacao", DateTime(timezone=True), server_default=func.now()
    )
    versao: Mapped[int | None] = mapped_column("nr_versao")
    # Em "editado": {campo: {"de": ..., "para": ...}}.
    alteracoes: Mapped[dict | None] = mapped_column("txt_alteracoes", JSONB)
