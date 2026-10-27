import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class AvisoVersao(Base):
    """Cópia completa de cada versão de um aviso. Imutável: o banco recusa UPDATE e DELETE."""

    __tablename__ = "aviso_versao"
    __table_args__ = (UniqueConstraint("aviso_id", "versao", name="uq_aviso_versao_aviso_versao"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    aviso_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("aviso.id"), index=True)
    versao: Mapped[int]
    titulo: Mapped[str] = mapped_column(String(150))
    conteudo: Mapped[str] = mapped_column(Text)
    # Lista [{tipo, turma_id, semestre}] como estava naquela versão.
    destinos: Mapped[list] = mapped_column(JSONB)
    publicar_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    criada_por: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuario.id"))
    criada_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
