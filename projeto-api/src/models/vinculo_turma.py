import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class VinculoTurma(Base):
    """Liga um usuário a uma turma. O papel coincide com o perfil (validado no serviço)."""

    __tablename__ = "tb_usuario_turma"
    __table_args__ = (
        UniqueConstraint("id_turma", "id_usuario", name="uq_tb_usuario_turma_turma_usuario"),
        CheckConstraint("tp_papel IN ('aluno', 'docente')", name="papel_valido"),
        CheckConstraint("tp_origem IN ('solicitacao', 'gestao', 'seed')", name="origem_valida"),
    )

    id: Mapped[uuid.UUID] = mapped_column("id_usuario_turma", primary_key=True, default=uuid.uuid4)
    turma_id: Mapped[uuid.UUID] = mapped_column("id_turma", ForeignKey("tb_turma.id_turma"))
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        "id_usuario", ForeignKey("tb_usuario.id_usuario"), index=True
    )
    papel: Mapped[str] = mapped_column("tp_papel", String(10))
    origem: Mapped[str] = mapped_column("tp_origem", String(15))
    criado_em: Mapped[datetime] = mapped_column(
        "dt_vinculo", DateTime(timezone=True), server_default=func.now()
    )
    criado_por: Mapped[uuid.UUID | None] = mapped_column(
        "id_usuario_criador", ForeignKey("tb_usuario.id_usuario")
    )
