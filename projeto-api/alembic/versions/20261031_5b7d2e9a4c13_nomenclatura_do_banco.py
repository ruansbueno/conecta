"""nomenclatura do banco: tb_ nas tabelas e prefixo em toda coluna

Revision ID: 5b7d2e9a4c13
Revises: 9e05f46bf9bf
Create Date: 2026-10-31 12:00:00.000000

Só renomeia (data-model.md, "Nomes físicos"): nenhuma coluna muda de tipo e nenhum dado se move.
O PostgreSQL acompanha a renomeação nas restrições CHECK, nos índices de expressão e no índice
parcial, que guardam a coluna pelo número, não pelo nome. Os nomes das restrições e dos índices
são renomeados à parte, para continuarem seguindo a NAMING_CONVENTION de src/db/base.py.
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "5b7d2e9a4c13"
down_revision: str | Sequence[str] | None = "9e05f46bf9bf"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# tabela antiga: (tabela nova, {coluna antiga: coluna nova})
_TABELAS: dict[str, tuple[str, dict[str, str]]] = {
    "usuario": (
        "tb_usuario",
        {
            "id": "id_usuario",
            "username": "cod_usuario",
            "nome": "nm_usuario",
            "perfil": "tp_perfil",
            "ativo": "fl_ativo",
            "criado_em": "dt_cadastro",
            "atualizado_em": "dt_atualizacao",
            "ultimo_login_em": "dt_ultimo_acesso",
        },
    ),
    "turma": (
        "tb_turma",
        {
            "id": "id_turma",
            "codigo": "cod_turma",
            "nome": "nm_turma",
            "semestre_curso": "nr_semestre",
            "periodo_letivo": "cod_periodo_letivo",
            "inscricoes_abertas": "fl_inscricoes_abertas",
            "ativa": "fl_ativa",
            "criado_em": "dt_cadastro",
            "atualizado_em": "dt_atualizacao",
        },
    ),
    "vinculo_turma": (
        "tb_usuario_turma",
        {
            "id": "id_usuario_turma",
            "turma_id": "id_turma",
            "usuario_id": "id_usuario",
            "papel": "tp_papel",
            "origem": "tp_origem",
            "criado_em": "dt_vinculo",
            "criado_por": "id_usuario_criador",
        },
    ),
    "solicitacao_inscricao": (
        "tb_solicitacao_inscricao",
        {
            "id": "id_solicitacao",
            "turma_id": "id_turma",
            "aluno_id": "id_usuario",
            "status": "st_solicitacao",
            "solicitada_em": "dt_solicitacao",
            "decidida_em": "dt_decisao",
            "decidida_por": "id_usuario_decisor",
            "motivo_recusa": "txt_motivo_recusa",
        },
    ),
    "aviso": (
        "tb_aviso",
        {
            "id": "id_aviso",
            "titulo": "nm_aviso",
            "conteudo": "txt_aviso",
            "autor_id": "id_usuario",
            "situacao": "st_aviso",
            "publicar_em": "dt_publicacao",
            "versao_atual": "nr_versao",
            "criado_em": "dt_cadastro",
            "editado_em": "dt_edicao",
            "arquivado_em": "dt_arquivamento",
            "excluido_em": "dt_exclusao",
        },
    ),
    "aviso_destino": (
        "tb_aviso_destino",
        {
            "id": "id_aviso_destino",
            "aviso_id": "id_aviso",
            "tipo": "tp_destino",
            "turma_id": "id_turma",
            "semestre": "nr_semestre",
        },
    ),
    "aviso_versao": (
        "tb_aviso_versao",
        {
            "id": "id_aviso_versao",
            "aviso_id": "id_aviso",
            "versao": "nr_versao",
            "titulo": "nm_aviso",
            "conteudo": "txt_aviso",
            "destinos": "txt_destinos",
            "publicar_em": "dt_publicacao",
            "criada_por": "id_usuario",
            "criada_em": "dt_versao",
        },
    ),
    "aviso_evento": (
        "tb_aviso_historico",
        {
            "id": "id_aviso_historico",
            "aviso_id": "id_aviso",
            "tipo": "tp_operacao",
            "usuario_id": "id_usuario",
            "ocorrido_em": "dt_operacao",
            "versao": "nr_versao",
            "alteracoes": "txt_alteracoes",
        },
    ),
}

# (tabela nova, restrição antiga, restrição nova)
_RESTRICOES: tuple[tuple[str, str, str], ...] = (
    ("tb_usuario", "pk_usuario", "pk_tb_usuario"),
    ("tb_usuario", "uq_usuario_username", "uq_tb_usuario_cod_usuario"),
    ("tb_usuario", "ck_usuario_perfil_valido", "ck_tb_usuario_perfil_valido"),
    ("tb_turma", "pk_turma", "pk_tb_turma"),
    ("tb_turma", "uq_turma_codigo", "uq_tb_turma_cod_turma"),
    ("tb_turma", "ck_turma_semestre_curso_valido", "ck_tb_turma_semestre_curso_valido"),
    ("tb_usuario_turma", "pk_vinculo_turma", "pk_tb_usuario_turma"),
    ("tb_usuario_turma", "uq_vinculo_turma_turma_usuario", "uq_tb_usuario_turma_turma_usuario"),
    ("tb_usuario_turma", "ck_vinculo_turma_papel_valido", "ck_tb_usuario_turma_papel_valido"),
    ("tb_usuario_turma", "ck_vinculo_turma_origem_valida", "ck_tb_usuario_turma_origem_valida"),
    (
        "tb_usuario_turma",
        "fk_vinculo_turma_turma_id_turma",
        "fk_tb_usuario_turma_id_turma_tb_turma",
    ),
    (
        "tb_usuario_turma",
        "fk_vinculo_turma_usuario_id_usuario",
        "fk_tb_usuario_turma_id_usuario_tb_usuario",
    ),
    (
        "tb_usuario_turma",
        "fk_vinculo_turma_criado_por_usuario",
        "fk_tb_usuario_turma_id_usuario_criador_tb_usuario",
    ),
    ("tb_solicitacao_inscricao", "pk_solicitacao_inscricao", "pk_tb_solicitacao_inscricao"),
    (
        "tb_solicitacao_inscricao",
        "ck_solicitacao_inscricao_status_valido",
        "ck_tb_solicitacao_inscricao_status_valido",
    ),
    (
        "tb_solicitacao_inscricao",
        "ck_solicitacao_inscricao_decisao_coerente",
        "ck_tb_solicitacao_inscricao_decisao_coerente",
    ),
    (
        "tb_solicitacao_inscricao",
        "ck_solicitacao_inscricao_motivo_so_em_recusa",
        "ck_tb_solicitacao_inscricao_motivo_so_em_recusa",
    ),
    (
        "tb_solicitacao_inscricao",
        "fk_solicitacao_inscricao_turma_id_turma",
        "fk_tb_solicitacao_inscricao_id_turma_tb_turma",
    ),
    (
        "tb_solicitacao_inscricao",
        "fk_solicitacao_inscricao_aluno_id_usuario",
        "fk_tb_solicitacao_inscricao_id_usuario_tb_usuario",
    ),
    (
        "tb_solicitacao_inscricao",
        "fk_solicitacao_inscricao_decidida_por_usuario",
        "fk_tb_solicitacao_inscricao_id_usuario_decisor_tb_usuario",
    ),
    ("tb_aviso", "pk_aviso", "pk_tb_aviso"),
    ("tb_aviso", "ck_aviso_titulo_tamanho", "ck_tb_aviso_titulo_tamanho"),
    ("tb_aviso", "ck_aviso_conteudo_tamanho", "ck_tb_aviso_conteudo_tamanho"),
    ("tb_aviso", "ck_aviso_situacao_valida", "ck_tb_aviso_situacao_valida"),
    ("tb_aviso", "fk_aviso_autor_id_usuario", "fk_tb_aviso_id_usuario_tb_usuario"),
    ("tb_aviso_destino", "pk_aviso_destino", "pk_tb_aviso_destino"),
    (
        "tb_aviso_destino",
        "ck_aviso_destino_referencia_coerente",
        "ck_tb_aviso_destino_referencia_coerente",
    ),
    (
        "tb_aviso_destino",
        "fk_aviso_destino_aviso_id_aviso",
        "fk_tb_aviso_destino_id_aviso_tb_aviso",
    ),
    (
        "tb_aviso_destino",
        "fk_aviso_destino_turma_id_turma",
        "fk_tb_aviso_destino_id_turma_tb_turma",
    ),
    ("tb_aviso_versao", "pk_aviso_versao", "pk_tb_aviso_versao"),
    ("tb_aviso_versao", "uq_aviso_versao_aviso_versao", "uq_tb_aviso_versao_aviso_versao"),
    ("tb_aviso_versao", "fk_aviso_versao_aviso_id_aviso", "fk_tb_aviso_versao_id_aviso_tb_aviso"),
    (
        "tb_aviso_versao",
        "fk_aviso_versao_criada_por_usuario",
        "fk_tb_aviso_versao_id_usuario_tb_usuario",
    ),
    ("tb_aviso_historico", "pk_aviso_evento", "pk_tb_aviso_historico"),
    ("tb_aviso_historico", "ck_aviso_evento_tipo_valido", "ck_tb_aviso_historico_tipo_valido"),
    (
        "tb_aviso_historico",
        "fk_aviso_evento_aviso_id_aviso",
        "fk_tb_aviso_historico_id_aviso_tb_aviso",
    ),
    (
        "tb_aviso_historico",
        "fk_aviso_evento_usuario_id_usuario",
        "fk_tb_aviso_historico_id_usuario_tb_usuario",
    ),
)

# (índice antigo, índice novo): os que não pertencem a uma restrição.
_INDICES: tuple[tuple[str, str], ...] = (
    ("ix_aviso_autor_id", "ix_tb_aviso_id_usuario"),
    ("ix_aviso_destino_aviso_id", "ix_tb_aviso_destino_id_aviso"),
    ("ix_aviso_destino_turma_id", "ix_tb_aviso_destino_id_turma"),
    ("uq_aviso_destino_sem_repeticao", "uq_tb_aviso_destino_sem_repeticao"),
    ("ix_aviso_evento_aviso_ocorrido", "ix_tb_aviso_historico_aviso_ocorrido"),
    ("ix_aviso_versao_aviso_id", "ix_tb_aviso_versao_id_aviso"),
    ("uq_solicitacao_inscricao_pendente", "uq_tb_solicitacao_inscricao_pendente"),
    ("ix_solicitacao_inscricao_aluno_id", "ix_tb_solicitacao_inscricao_id_usuario"),
    ("ix_vinculo_turma_usuario_id", "ix_tb_usuario_turma_id_usuario"),
)

# (tabela nova, trigger antigo, trigger novo): imutabilidade da auditoria (plan-e2 D-E2-3).
_TRIGGERS: tuple[tuple[str, str, str], ...] = (
    ("tb_aviso_versao", "aviso_versao_imutavel", "tb_aviso_versao_imutavel"),
    ("tb_aviso_historico", "aviso_evento_imutavel", "tb_aviso_historico_imutavel"),
)


def upgrade() -> None:
    for antiga, (nova, colunas) in _TABELAS.items():
        for de, para in colunas.items():
            op.execute(f"ALTER TABLE {antiga} RENAME COLUMN {de} TO {para}")
        op.execute(f"ALTER TABLE {antiga} RENAME TO {nova}")
    for tabela, de, para in _RESTRICOES:
        op.execute(f"ALTER TABLE {tabela} RENAME CONSTRAINT {de} TO {para}")
    for de, para in _INDICES:
        op.execute(f"ALTER INDEX {de} RENAME TO {para}")
    for tabela, de, para in _TRIGGERS:
        op.execute(f"ALTER TRIGGER {de} ON {tabela} RENAME TO {para}")


def downgrade() -> None:
    for tabela, de, para in _TRIGGERS:
        op.execute(f"ALTER TRIGGER {para} ON {tabela} RENAME TO {de}")
    for de, para in _INDICES:
        op.execute(f"ALTER INDEX {para} RENAME TO {de}")
    for tabela, de, para in _RESTRICOES:
        op.execute(f"ALTER TABLE {tabela} RENAME CONSTRAINT {para} TO {de}")
    for antiga, (nova, colunas) in _TABELAS.items():
        op.execute(f"ALTER TABLE {nova} RENAME TO {antiga}")
        for de, para in colunas.items():
            op.execute(f"ALTER TABLE {antiga} RENAME COLUMN {para} TO {de}")
