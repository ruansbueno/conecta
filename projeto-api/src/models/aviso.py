import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    SmallInteger,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base

if TYPE_CHECKING:  # import real criaria ciclo com src.db.base, que importa todos os models
    from src.models.turma import Turma
    from src.models.usuario import Usuario

# Substitui NULL na unicidade dos destinos sem depender de NULLS NOT DISTINCT (PostgreSQL 15+).
_UUID_NULO = text("'00000000-0000-0000-0000-000000000000'::uuid")


class Aviso(Base):
    __tablename__ = "aviso"
    __table_args__ = (
        CheckConstraint("char_length(titulo) BETWEEN 3 AND 150", name="titulo_tamanho"),
        CheckConstraint("char_length(conteudo) BETWEEN 1 AND 5000", name="conteudo_tamanho"),
        CheckConstraint("situacao IN ('ativo', 'arquivado', 'excluido')", name="situacao_valida"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    titulo: Mapped[str] = mapped_column(String(150))
    conteudo: Mapped[str] = mapped_column(Text)
    autor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuario.id"), index=True)
    situacao: Mapped[str] = mapped_column(String(10), default="ativo", server_default="ativo")
    # Nulo = publicado na criação; publicado_em = COALESCE(publicar_em, criado_em).
    publicar_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    versao_atual: Mapped[int] = mapped_column(default=1, server_default=text("1"))
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    editado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    arquivado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    excluido_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # lazy="raise": quem lê destinos/autor precisa carregá-los explicitamente (sem N+1).
    autor: Mapped["Usuario"] = relationship(lazy="raise")
    destinos: Mapped[list["AvisoDestino"]] = relationship(
        back_populates="aviso", cascade="all, delete-orphan", lazy="raise"
    )

    @property
    def publicado_em(self) -> datetime:
        return self.publicar_em or self.criado_em


class AvisoDestino(Base):
    """Um alvo do aviso: todos, uma turma, um semestre do curso ou os docentes."""

    __tablename__ = "aviso_destino"
    __table_args__ = (
        CheckConstraint(
            "(tipo = 'turma' AND turma_id IS NOT NULL AND semestre IS NULL)"
            " OR (tipo = 'semestre' AND semestre BETWEEN 1 AND 12 AND turma_id IS NULL)"
            " OR (tipo IN ('todos', 'docentes') AND turma_id IS NULL AND semestre IS NULL)",
            name="referencia_coerente",
        ),
        Index(
            "uq_aviso_destino_sem_repeticao",
            "aviso_id",
            "tipo",
            func.coalesce(text("turma_id"), _UUID_NULO),
            func.coalesce(text("semestre"), 0),
            unique=True,
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    aviso_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("aviso.id", ondelete="CASCADE"), index=True
    )
    tipo: Mapped[str] = mapped_column(String(10))
    turma_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("turma.id"), index=True)
    semestre: Mapped[int | None] = mapped_column(SmallInteger)

    aviso: Mapped[Aviso] = relationship(back_populates="destinos", lazy="raise")
    turma: Mapped["Turma | None"] = relationship(lazy="raise")
