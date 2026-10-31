import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class AvisoVersao(Base):
    """Cópia completa de cada versão de um aviso. Imutável: o banco recusa UPDATE e DELETE."""

    __tablename__ = "tb_aviso_versao"
    __table_args__ = (
        UniqueConstraint("id_aviso", "nr_versao", name="uq_tb_aviso_versao_aviso_versao"),
    )

    id: Mapped[uuid.UUID] = mapped_column("id_aviso_versao", primary_key=True, default=uuid.uuid4)
    aviso_id: Mapped[uuid.UUID] = mapped_column(
        "id_aviso", ForeignKey("tb_aviso.id_aviso"), index=True
    )
    versao: Mapped[int] = mapped_column("nr_versao")
    titulo: Mapped[str] = mapped_column("nm_aviso", String(150))
    conteudo: Mapped[str] = mapped_column("txt_aviso", Text)
    # Lista [{tipo, turma_id, semestre}] como estava naquela versão.
    destinos: Mapped[list] = mapped_column("txt_destinos", JSONB)
    publicar_em: Mapped[datetime | None] = mapped_column("dt_publicacao", DateTime(timezone=True))
    criada_por: Mapped[uuid.UUID] = mapped_column("id_usuario", ForeignKey("tb_usuario.id_usuario"))
    criada_em: Mapped[datetime] = mapped_column(
        "dt_versao", DateTime(timezone=True), server_default=func.now()
    )
