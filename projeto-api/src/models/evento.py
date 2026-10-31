import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Literal, get_args

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

TipoDeEvento = Literal[
    "palestra", "banca", "reuniao", "formatura", "prova", "data_importante", "outro"
]
TIPOS_DE_EVENTO: tuple[str, ...] = get_args(TipoDeEvento)

_UUID_NULO = text("'00000000-0000-0000-0000-000000000000'::uuid")


class Evento(Base):
    """Item da agenda. Sem agendamento de publicação: existe para os destinos desde a criação."""

    __tablename__ = "tb_evento"
    __table_args__ = (
        CheckConstraint("char_length(nm_evento) BETWEEN 3 AND 150", name="titulo_tamanho"),
        CheckConstraint(
            "txt_evento IS NULL OR char_length(txt_evento) <= 5000", name="descricao_tamanho"
        ),
        CheckConstraint(
            "tp_evento IN (" + ", ".join(f"'{t}'" for t in TIPOS_DE_EVENTO) + ")",
            name="tipo_valido",
        ),
        CheckConstraint("dt_fim IS NULL OR dt_fim > dt_inicio", name="fim_depois_do_inicio"),
        CheckConstraint("st_evento IN ('ativo', 'arquivado', 'excluido')", name="situacao_valida"),
        Index("ix_tb_evento_situacao_inicio", "st_evento", "dt_inicio"),
    )

    id: Mapped[uuid.UUID] = mapped_column("id_evento", primary_key=True, default=uuid.uuid4)
    titulo: Mapped[str] = mapped_column("nm_evento", String(150))
    descricao: Mapped[str | None] = mapped_column("txt_evento", Text)
    tipo: Mapped[str] = mapped_column("tp_evento", String(20))
    inicio: Mapped[datetime] = mapped_column("dt_inicio", DateTime(timezone=True))
    fim: Mapped[datetime | None] = mapped_column("dt_fim", DateTime(timezone=True))
    local: Mapped[str | None] = mapped_column("nm_local", String(120))
    autor_id: Mapped[uuid.UUID] = mapped_column(
        "id_usuario", ForeignKey("tb_usuario.id_usuario"), index=True
    )
    situacao: Mapped[str] = mapped_column(
        "st_evento", String(10), default="ativo", server_default="ativo"
    )
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
    destinos: Mapped[list["EventoDestino"]] = relationship(
        back_populates="evento", cascade="all, delete-orphan", lazy="raise"
    )


class EventoDestino(Base):
    """Um alvo do evento: a mesma estrutura e as mesmas regras do destino do aviso."""

    __tablename__ = "tb_evento_destino"
    __table_args__ = (
        CheckConstraint(
            "(tp_destino = 'turma' AND id_turma IS NOT NULL AND nr_semestre IS NULL)"
            " OR (tp_destino = 'semestre' AND nr_semestre BETWEEN 1 AND 12 AND id_turma IS NULL)"
            " OR (tp_destino IN ('todos', 'docentes') AND id_turma IS NULL"
            " AND nr_semestre IS NULL)",
            name="referencia_coerente",
        ),
        Index(
            "uq_tb_evento_destino_sem_repeticao",
            "id_evento",
            "tp_destino",
            func.coalesce(text("id_turma"), _UUID_NULO),
            func.coalesce(text("nr_semestre"), 0),
            unique=True,
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column("id_evento_destino", primary_key=True, default=uuid.uuid4)
    evento_id: Mapped[uuid.UUID] = mapped_column(
        "id_evento", ForeignKey("tb_evento.id_evento", ondelete="CASCADE"), index=True
    )
    tipo: Mapped[str] = mapped_column("tp_destino", String(10))
    turma_id: Mapped[uuid.UUID | None] = mapped_column(
        "id_turma", ForeignKey("tb_turma.id_turma"), index=True
    )
    semestre: Mapped[int | None] = mapped_column("nr_semestre", SmallInteger)

    evento: Mapped[Evento] = relationship(back_populates="destinos", lazy="raise")
    turma: Mapped["Turma | None"] = relationship(lazy="raise")
