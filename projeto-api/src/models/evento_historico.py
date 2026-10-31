import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base
from src.models.aviso_evento import TIPOS_EVENTO as OPERACOES


class EventoHistorico(Base):
    """Log de auditoria do evento, com as operações do aviso. Imutável no banco."""

    __tablename__ = "tb_evento_historico"
    __table_args__ = (
        CheckConstraint(
            "tp_operacao IN (" + ", ".join(f"'{t}'" for t in OPERACOES) + ")", name="tipo_valido"
        ),
        Index("ix_tb_evento_historico_evento_ocorrido", "id_evento", "dt_operacao"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        "id_evento_historico", primary_key=True, default=uuid.uuid4
    )
    evento_id: Mapped[uuid.UUID] = mapped_column("id_evento", ForeignKey("tb_evento.id_evento"))
    tipo: Mapped[str] = mapped_column("tp_operacao", String(15))
    usuario_id: Mapped[uuid.UUID] = mapped_column("id_usuario", ForeignKey("tb_usuario.id_usuario"))
    ocorrido_em: Mapped[datetime] = mapped_column(
        "dt_operacao", DateTime(timezone=True), server_default=func.now()
    )
    versao: Mapped[int | None] = mapped_column("nr_versao")
    # Em "editado": {campo: {"de": ..., "para": ...}}.
    alteracoes: Mapped[dict | None] = mapped_column("txt_alteracoes", JSONB)
