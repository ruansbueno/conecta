"""acesso institucional: situação do acesso, tipo institucional e e-mail do usuário

Revision ID: a7c4e1f0b923
Revises: 321cb139e662
Create Date: 2026-11-06 10:00:00.000000

API de autenticação do IFSul (emenda v2.3 da spec): o 1º login de um servidor (tipo
administrativo) vira pedido de acesso, sem perfil até a administração ou a coordenação decidir.
Quem já existe fica liberado, com o perfil que tem.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a7c4e1f0b923"
down_revision: str | Sequence[str] | None = "321cb139e662"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "tb_usuario",
        sa.Column("st_acesso", sa.String(10), nullable=False, server_default="liberado"),
    )
    op.add_column("tb_usuario", sa.Column("tp_institucional", sa.String(20), nullable=True))
    op.add_column("tb_usuario", sa.Column("txt_email", sa.String(200), nullable=True))
    op.add_column(
        "tb_usuario", sa.Column("dt_decisao_acesso", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column("tb_usuario", sa.Column("id_decisor_acesso", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        op.f("fk_tb_usuario_id_decisor_acesso_tb_usuario"),
        "tb_usuario",
        "tb_usuario",
        ["id_decisor_acesso"],
        ["id_usuario"],
        ondelete="SET NULL",
    )
    # Sem padrão no banco: um pedido de acesso grava o perfil nulo de propósito.
    op.alter_column(
        "tb_usuario", "tp_perfil", existing_type=sa.String(20), nullable=True, server_default=None
    )
    op.create_check_constraint(
        op.f("ck_tb_usuario_situacao_acesso_valida"),
        "tb_usuario",
        "st_acesso IN ('liberado', 'pendente', 'recusado')",
    )
    op.create_check_constraint(
        op.f("ck_tb_usuario_perfil_so_se_liberado"),
        "tb_usuario",
        "(st_acesso = 'liberado') = (tp_perfil IS NOT NULL)",
    )


def downgrade() -> None:
    # Quem não estava liberado não tem perfil: sai antes de o perfil voltar a ser obrigatório.
    op.execute("DELETE FROM tb_usuario WHERE st_acesso <> 'liberado'")
    op.drop_constraint(op.f("ck_tb_usuario_perfil_so_se_liberado"), "tb_usuario", type_="check")
    op.drop_constraint(op.f("ck_tb_usuario_situacao_acesso_valida"), "tb_usuario", type_="check")
    op.alter_column(
        "tb_usuario",
        "tp_perfil",
        existing_type=sa.String(20),
        nullable=False,
        server_default="aluno",
    )
    op.drop_constraint(
        op.f("fk_tb_usuario_id_decisor_acesso_tb_usuario"), "tb_usuario", type_="foreignkey"
    )
    for coluna in ("id_decisor_acesso", "dt_decisao_acesso", "txt_email", "tp_institucional"):
        op.drop_column("tb_usuario", coluna)
    op.drop_column("tb_usuario", "st_acesso")
