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
    __tablename__ = "tb_aviso"
    __table_args__ = (
        CheckConstraint("char_length(nm_aviso) BETWEEN 3 AND 150", name="titulo_tamanho"),
        CheckConstraint("char_length(txt_aviso) BETWEEN 1 AND 5000", name="conteudo_tamanho"),
        CheckConstraint("st_aviso IN ('ativo', 'arquivado', 'excluido')", name="situacao_valida"),
    )

    id: Mapped[uuid.UUID] = mapped_column("id_aviso", primary_key=True, default=uuid.uuid4)
    titulo: Mapped[str] = mapped_column("nm_aviso", String(150))
    conteudo: Mapped[str] = mapped_column("txt_aviso", Text)
    autor_id: Mapped[uuid.UUID] = mapped_column(
        "id_usuario", ForeignKey("tb_usuario.id_usuario"), index=True
    )
    situacao: Mapped[str] = mapped_column(
        "st_aviso", String(10), default="ativo", server_default="ativo"
    )
    # Nulo = publicado na criação; publicado_em = COALESCE(publicar_em, criado_em).
    publicar_em: Mapped[datetime | None] = mapped_column("dt_publicacao", DateTime(timezone=True))
    versao_atual: Mapped[int] = mapped_column("nr_versao", default=1, server_default=text("1"))
    criado_em: Mapped[datetime] = mapped_column(
        "dt_cadastro", DateTime(timezone=True), server_default=func.now()
    )
    editado_em: Mapped[datetime | None] = mapped_column("dt_edicao", DateTime(timezone=True))
    arquivado_em: Mapped[datetime | None] = mapped_column(
        "dt_arquivamento", DateTime(timezone=True)
    )
    excluido_em: Mapped[datetime | None] = mapped_column("dt_exclusao", DateTime(timezone=True))

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

    __tablename__ = "tb_aviso_destino"
    __table_args__ = (
        CheckConstraint(
            "(tp_destino = 'turma' AND id_turma IS NOT NULL AND nr_semestre IS NULL)"
            " OR (tp_destino = 'semestre' AND nr_semestre BETWEEN 1 AND 12 AND id_turma IS NULL)"
            " OR (tp_destino IN ('todos', 'docentes') AND id_turma IS NULL"
            " AND nr_semestre IS NULL)",
            name="referencia_coerente",
        ),
        Index(
            "uq_tb_aviso_destino_sem_repeticao",
            "id_aviso",
            "tp_destino",
            func.coalesce(text("id_turma"), _UUID_NULO),
            func.coalesce(text("nr_semestre"), 0),
            unique=True,
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column("id_aviso_destino", primary_key=True, default=uuid.uuid4)
    aviso_id: Mapped[uuid.UUID] = mapped_column(
        "id_aviso", ForeignKey("tb_aviso.id_aviso", ondelete="CASCADE"), index=True
    )
    tipo: Mapped[str] = mapped_column("tp_destino", String(10))
    turma_id: Mapped[uuid.UUID | None] = mapped_column(
        "id_turma", ForeignKey("tb_turma.id_turma"), index=True
    )
    semestre: Mapped[int | None] = mapped_column("nr_semestre", SmallInteger)

    aviso: Mapped[Aviso] = relationship(back_populates="destinos", lazy="raise")
    turma: Mapped["Turma | None"] = relationship(lazy="raise")
