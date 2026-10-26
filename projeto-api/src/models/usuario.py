import uuid
from datetime import datetime
from typing import Literal, get_args

from sqlalchemy import CheckConstraint, DateTime, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base

Perfil = Literal["administrador", "coordenacao", "docente", "aluno"]
PERFIS: tuple[str, ...] = get_args(Perfil)


class Usuario(Base):
    """Pessoa identificada no CONECTA. Nenhuma senha é armazenada."""

    __tablename__ = "usuario"
    __table_args__ = (
        CheckConstraint(
            "perfil IN (" + ", ".join(f"'{p}'" for p in PERFIS) + ")", name="perfil_valido"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(100), unique=True)
    nome: Mapped[str] = mapped_column(String(200))
    perfil: Mapped[str] = mapped_column(String(20), default="aluno", server_default="aluno")
    ativo: Mapped[bool] = mapped_column(default=True, server_default=text("true"))
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    # Muda só com nome, perfil ou ativo (data-model.md) — não a cada login.
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    ultimo_login_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
