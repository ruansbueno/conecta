import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class VinculoTurma(Base):
    """Liga um usuário a uma turma. O papel coincide com o perfil (validado no serviço)."""

    __tablename__ = "vinculo_turma"
    __table_args__ = (
        UniqueConstraint("turma_id", "usuario_id", name="uq_vinculo_turma_turma_usuario"),
        CheckConstraint("papel IN ('aluno', 'docente')", name="papel_valido"),
        CheckConstraint("origem IN ('solicitacao', 'gestao', 'seed')", name="origem_valida"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    turma_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("turma.id"))
    usuario_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuario.id"), index=True)
    papel: Mapped[str] = mapped_column(String(10))
    origem: Mapped[str] = mapped_column(String(15))
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    criado_por: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("usuario.id"))
