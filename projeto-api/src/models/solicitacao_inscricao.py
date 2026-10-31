import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class SolicitacaoInscricao(Base):
    """Pedido do aluno para entrar numa turma: pendente → aprovada | recusada | cancelada."""

    __tablename__ = "tb_solicitacao_inscricao"
    __table_args__ = (
        CheckConstraint(
            "st_solicitacao IN ('pendente', 'aprovada', 'recusada', 'cancelada')",
            name="status_valido",
        ),
        CheckConstraint(
            "(st_solicitacao = 'pendente') = (dt_decisao IS NULL)", name="decisao_coerente"
        ),
        CheckConstraint(
            "txt_motivo_recusa IS NULL OR st_solicitacao = 'recusada'", name="motivo_so_em_recusa"
        ),
        # No máximo uma pendente por aluno e turma (RF-14).
        Index(
            "uq_tb_solicitacao_inscricao_pendente",
            "id_turma",
            "id_usuario",
            unique=True,
            postgresql_where=text("st_solicitacao = 'pendente'"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column("id_solicitacao", primary_key=True, default=uuid.uuid4)
    turma_id: Mapped[uuid.UUID] = mapped_column("id_turma", ForeignKey("tb_turma.id_turma"))
    aluno_id: Mapped[uuid.UUID] = mapped_column(
        "id_usuario", ForeignKey("tb_usuario.id_usuario"), index=True
    )
    status: Mapped[str] = mapped_column(
        "st_solicitacao", String(10), default="pendente", server_default="pendente"
    )
    solicitada_em: Mapped[datetime] = mapped_column(
        "dt_solicitacao", DateTime(timezone=True), server_default=func.now()
    )
    decidida_em: Mapped[datetime | None] = mapped_column("dt_decisao", DateTime(timezone=True))
    decidida_por: Mapped[uuid.UUID | None] = mapped_column(
        "id_usuario_decisor", ForeignKey("tb_usuario.id_usuario")
    )
    motivo_recusa: Mapped[str | None] = mapped_column("txt_motivo_recusa", String(300))
