import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, SmallInteger, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class Turma(Base):
    """Turma acadêmica real do curso (não um grupo aberto de comunicação)."""

    __tablename__ = "tb_turma"
    __table_args__ = (
        CheckConstraint("nr_semestre BETWEEN 1 AND 12", name="semestre_curso_valido"),
    )

    id: Mapped[uuid.UUID] = mapped_column("id_turma", primary_key=True, default=uuid.uuid4)
    codigo: Mapped[str] = mapped_column("cod_turma", String(50), unique=True)
    nome: Mapped[str] = mapped_column("nm_turma", String(150))
    semestre_curso: Mapped[int] = mapped_column("nr_semestre", SmallInteger)
    periodo_letivo: Mapped[str] = mapped_column("cod_periodo_letivo", String(20))
    inscricoes_abertas: Mapped[bool] = mapped_column(
        "fl_inscricoes_abertas", default=False, server_default=text("false")
    )
    # Desativada: preserva vínculos, mas sai das listagens e suspende avisos por turma/semestre.
    ativa: Mapped[bool] = mapped_column("fl_ativa", default=True, server_default=text("true"))
    criado_em: Mapped[datetime] = mapped_column(
        "dt_cadastro", DateTime(timezone=True), server_default=func.now()
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        "dt_atualizacao", DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
