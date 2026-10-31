import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class EventoVersao(Base):
    """Cópia completa de cada versão de um evento. Imutável: o banco recusa UPDATE e DELETE."""

    __tablename__ = "tb_evento_versao"
    __table_args__ = (
        UniqueConstraint("id_evento", "nr_versao", name="uq_tb_evento_versao_evento_versao"),
    )

    id: Mapped[uuid.UUID] = mapped_column("id_evento_versao", primary_key=True, default=uuid.uuid4)
    evento_id: Mapped[uuid.UUID] = mapped_column(
        "id_evento", ForeignKey("tb_evento.id_evento"), index=True
    )
    versao: Mapped[int] = mapped_column("nr_versao")
    titulo: Mapped[str] = mapped_column("nm_evento", String(150))
    descricao: Mapped[str | None] = mapped_column("txt_evento", Text)
    tipo: Mapped[str] = mapped_column("tp_evento", String(20))
    inicio: Mapped[datetime] = mapped_column("dt_inicio", DateTime(timezone=True))
    fim: Mapped[datetime | None] = mapped_column("dt_fim", DateTime(timezone=True))
    local: Mapped[str | None] = mapped_column("nm_local", String(120))
    # Lista [{tipo, turma_id, semestre}] como estava naquela versão.
    destinos: Mapped[list] = mapped_column("txt_destinos", JSONB)
    criada_por: Mapped[uuid.UUID] = mapped_column("id_usuario", ForeignKey("tb_usuario.id_usuario"))
    criada_em: Mapped[datetime] = mapped_column(
        "dt_versao", DateTime(timezone=True), server_default=func.now()
    )
