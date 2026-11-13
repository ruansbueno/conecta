"""restrições do decisor da solicitação e do tipo institucional

Revision ID: 212a05273ad8
Revises: a7c4e1f0b923
Create Date: 2026-11-12 10:00:00.000000

Validação externa do DER (12/11/2026):
- tb_solicitacao_inscricao: tem decisor se, e somente se, não está pendente; na cancelada, o
  decisor é o próprio aluno;
- tb_usuario: tp_institucional só 'aluno', 'administrativo' ou nulo.

Dados antigos: a cancelada sem decisor recebe o próprio aluno (é quem cancela, por definição).
Qualquer outra violação faz a migração parar com os ids, sem inventar quem decidiu.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "212a05273ad8"
down_revision: str | Sequence[str] | None = "a7c4e1f0b923"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _parar_se_houver(sql: str, problema: str) -> None:
    linhas = op.get_bind().execute(sa.text(sql)).all()
    if linhas:
        lista = "; ".join(", ".join(str(v) for v in linha) for linha in linhas)
        raise RuntimeError(f"{problema}. Corrija antes de migrar: {lista}")


def upgrade() -> None:
    op.execute(
        "UPDATE tb_solicitacao_inscricao SET id_usuario_decisor = id_usuario "
        "WHERE st_solicitacao = 'cancelada' AND id_usuario_decisor IS NULL"
    )
    _parar_se_houver(
        "SELECT id_solicitacao, st_solicitacao FROM tb_solicitacao_inscricao "
        "WHERE (st_solicitacao = 'pendente') <> (id_usuario_decisor IS NULL) "
        "ORDER BY id_solicitacao",
        "Solicitações com decisor incoerente com a situação (decidida sem decisor ou pendente "
        "com decisor)",
    )
    _parar_se_houver(
        "SELECT cod_usuario, tp_institucional FROM tb_usuario "
        "WHERE tp_institucional NOT IN ('aluno', 'administrativo') ORDER BY cod_usuario",
        "Usuários com tipo institucional fora de aluno/administrativo",
    )
    op.create_check_constraint(
        op.f("ck_tb_solicitacao_inscricao_decisor_coerente"),
        "tb_solicitacao_inscricao",
        "(st_solicitacao = 'pendente') = (id_usuario_decisor IS NULL)",
    )
    op.create_check_constraint(
        op.f("ck_tb_usuario_institucional_valido"),
        "tb_usuario",
        "tp_institucional IN ('aluno', 'administrativo')",
    )


def downgrade() -> None:
    # Os dados ficam: o decisor preenchido na cancelada continua válido sem a restrição.
    op.drop_constraint(op.f("ck_tb_usuario_institucional_valido"), "tb_usuario", type_="check")
    op.drop_constraint(
        op.f("ck_tb_solicitacao_inscricao_decisor_coerente"),
        "tb_solicitacao_inscricao",
        type_="check",
    )
