import uuid
from datetime import datetime
from typing import Literal, get_args

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base

Perfil = Literal["administrador", "coordenacao", "docente", "aluno"]
PERFIS: tuple[str, ...] = get_args(Perfil)

# Acesso ao CONECTA (RF-08, emenda v2.3): servidores (tipo institucional administrativo) pedem
# acesso no 1º login e esperam a administração ou a coordenação; só quem está liberado tem perfil.
SituacaoAcesso = Literal["liberado", "pendente", "recusado"]
SITUACOES_ACESSO: tuple[str, ...] = get_args(SituacaoAcesso)


class Usuario(Base):
    """Pessoa identificada no CONECTA. Nenhuma senha é armazenada."""

    __tablename__ = "tb_usuario"
    __table_args__ = (
        CheckConstraint(
            "tp_perfil IN (" + ", ".join(f"'{p}'" for p in PERFIS) + ")", name="perfil_valido"
        ),
        CheckConstraint(
            "st_acesso IN (" + ", ".join(f"'{s}'" for s in SITUACOES_ACESSO) + ")",
            name="situacao_acesso_valida",
        ),
        # Pendente ou recusado nunca aparece como aluno/docente em listas, vínculos ou alcance.
        CheckConstraint(
            "(st_acesso = 'liberado') = (tp_perfil IS NOT NULL)", name="perfil_so_se_liberado"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column("id_usuario", primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column("cod_usuario", String(100), unique=True)
    nome: Mapped[str] = mapped_column("nm_usuario", String(200))
    # Sem padrão na coluna: `None` precisa chegar ao banco como nulo (pedido de acesso). O padrão
    # `aluno` fica no construtor, só quando o perfil não é informado.
    perfil: Mapped[str | None] = mapped_column("tp_perfil", String(20))
    situacao_acesso: Mapped[str] = mapped_column(
        "st_acesso", String(10), default="liberado", server_default="liberado"
    )
    # Do provedor (API do IFSul): informativos, nunca decidem permissão depois do 1º login.
    tipo_institucional: Mapped[str | None] = mapped_column("tp_institucional", String(20))
    email: Mapped[str | None] = mapped_column("txt_email", String(200))
    acesso_decidido_em: Mapped[datetime | None] = mapped_column(
        "dt_decisao_acesso", DateTime(timezone=True)
    )
    acesso_decidido_por_id: Mapped[uuid.UUID | None] = mapped_column(
        "id_decisor_acesso", ForeignKey("tb_usuario.id_usuario", ondelete="SET NULL")
    )
    ativo: Mapped[bool] = mapped_column("fl_ativo", default=True, server_default=text("true"))
    criado_em: Mapped[datetime] = mapped_column(
        "dt_cadastro", DateTime(timezone=True), server_default=func.now()
    )
    # Muda só com nome, perfil ou ativo (data-model.md) — não a cada login.
    atualizado_em: Mapped[datetime] = mapped_column(
        "dt_atualizacao", DateTime(timezone=True), server_default=func.now()
    )
    ultimo_login_em: Mapped[datetime | None] = mapped_column(
        "dt_ultimo_acesso", DateTime(timezone=True)
    )

    def __init__(self, **campos):
        campos.setdefault("perfil", "aluno")
        super().__init__(**campos)
