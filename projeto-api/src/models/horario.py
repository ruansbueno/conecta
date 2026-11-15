import uuid
from datetime import time
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Index, SmallInteger, String, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base

if TYPE_CHECKING:
    from src.models.turma import Turma
    from src.models.usuario import Usuario


class Horario(Base):
    """Aula da grade semanal de uma turma: recorrência pura, sem data (RF-46).

    Configuração, não comunicação: sem versões nem histórico, e a remoção é física.
    """

    __tablename__ = "tb_horario"
    __table_args__ = (
        CheckConstraint("nr_dia_semana BETWEEN 1 AND 7", name="dia_semana_valido"),
        CheckConstraint("hr_fim > hr_inicio", name="fim_depois_do_inicio"),
        CheckConstraint("char_length(nm_disciplina) BETWEEN 2 AND 120", name="disciplina_tamanho"),
        Index("ix_tb_horario_turma_dia_inicio", "id_turma", "nr_dia_semana", "hr_inicio"),
    )

    id: Mapped[uuid.UUID] = mapped_column("id_horario", primary_key=True, default=uuid.uuid4)
    turma_id: Mapped[uuid.UUID] = mapped_column(
        "id_turma", ForeignKey("tb_turma.id_turma", ondelete="CASCADE")
    )
    # 1 = segunda … 7 = domingo.
    dia_semana: Mapped[int] = mapped_column("nr_dia_semana", SmallInteger)
    inicio: Mapped[time] = mapped_column("hr_inicio", Time)
    fim: Mapped[time] = mapped_column("hr_fim", Time)
    disciplina: Mapped[str] = mapped_column("nm_disciplina", String(120))
    local: Mapped[str | None] = mapped_column("nm_local", String(80))
    docente_id: Mapped[uuid.UUID | None] = mapped_column(
        "id_usuario_docente", ForeignKey("tb_usuario.id_usuario"), index=True
    )

    docente: Mapped["Usuario | None"] = relationship(lazy="raise")
    # Só para as aulas do docente (RF-54), que mostram a turma de cada aula.
    turma: Mapped["Turma"] = relationship(lazy="raise")
