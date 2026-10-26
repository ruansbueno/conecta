import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class SolicitacaoInscricao(Base):
    """Pedido do aluno para entrar numa turma: pendente → aprovada | recusada | cancelada."""

    __tablename__ = "solicitacao_inscricao"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pendente', 'aprovada', 'recusada', 'cancelada')", name="status_valido"
        ),
        CheckConstraint("(status = 'pendente') = (decidida_em IS NULL)", name="decisao_coerente"),
        CheckConstraint("motivo_recusa IS NULL OR status = 'recusada'", name="motivo_so_em_recusa"),
        # No máximo uma pendente por aluno e turma (RF-14).
        Index(
            "uq_solicitacao_inscricao_pendente",
            "turma_id",
            "aluno_id",
            unique=True,
            postgresql_where=text("status = 'pendente'"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    turma_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("turma.id"))
    aluno_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuario.id"), index=True)
    status: Mapped[str] = mapped_column(String(10), default="pendente", server_default="pendente")
    solicitada_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    decidida_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    decidida_por: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("usuario.id"))
    motivo_recusa: Mapped[str | None] = mapped_column(String(300))
