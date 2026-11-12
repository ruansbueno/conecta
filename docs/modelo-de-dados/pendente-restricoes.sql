-- =============================================================================
-- CONECTA — restrições pendentes (ainda NÃO aplicadas no banco)
-- Registrado em 11/11/2026, a partir da validação externa do DER.
-- O ER.architect já descreve estas regras nos comentários das colunas,
-- marcadas como "pendente no banco".
--
-- 1. ck_tb_solicitacao_inscricao_decisor_coerente
--    A solicitação tem decisor se, e somente se, não está pendente.
--    Aprovada e recusada guardam quem decidiu; cancelada guarda o próprio
--    aluno (o serviço já grava assim). Pendente não tem decisor.
--    Completa a regra existente ck_tb_solicitacao_inscricao_decisao_coerente
--    (pendente <=> dt_decisao IS NULL).
--
-- 2. ck_tb_usuario_institucional_valido
--    tp_institucional só aceita 'aluno' ou 'administrativo' (TipoInstitucional
--    em projeto-api/src/providers/auth/base.py). NULL continua permitido:
--    a API grava NULL quando o IFSul não informa o tipo.
--
-- ANTES DE APLICAR, mudar no código (senão o seed e os testes quebram):
--   a) projeto-api/scripts/seed_dev_data.py — a solicitação "recusada" de
--      aluno3.teste (linha ~66) é criada sem decisor; passar a gravar um
--      decisor (por exemplo, coord.teste).
--   b) projeto-api/src/services/solicitacoes_gestao_service.py — aprovar()
--      aceita decisor=None ("script de dev"); passar a exigir um decisor.
--   c) projeto-api/tests/integration/test_turmas_flow.py (linhas 31 e 68)
--      chamam aprovar(..., decisor_username=None); informar um decisor.
--   d) projeto-api/src/models/solicitacao_inscricao.py e usuario.py —
--      declarar os mesmos CheckConstraint em __table_args__ e gerar a
--      migração Alembic correspondente (este arquivo é o registro; a
--      migração é o caminho oficial para aplicar).
--
-- No banco de dev de 11/11/2026, 1 linha viola a regra 1 (a do seed acima)
-- e 0 linhas violam a regra 2.
-- =============================================================================

BEGIN;

-- Passo 1: conferir o que viola as regras. As duas consultas devem
-- voltar vazias antes do passo 3.
SELECT id_solicitacao, st_solicitacao, id_usuario_decisor
  FROM tb_solicitacao_inscricao
 WHERE (st_solicitacao = 'pendente') <> (id_usuario_decisor IS NULL);

SELECT id_usuario, cod_usuario, tp_institucional
  FROM tb_usuario
 WHERE tp_institucional IS NOT NULL
   AND tp_institucional NOT IN ('aluno', 'administrativo');

-- Passo 2 (só em dev): corrigir a linha do seed, atribuindo a decisão
-- a um usuário de coordenação. Em produção, decidir caso a caso.
-- UPDATE tb_solicitacao_inscricao
--    SET id_usuario_decisor = (SELECT id_usuario FROM tb_usuario WHERE cod_usuario = 'coord.teste')
--  WHERE st_solicitacao <> 'pendente' AND id_usuario_decisor IS NULL;

-- Passo 3: criar as restrições.
ALTER TABLE tb_solicitacao_inscricao
  ADD CONSTRAINT ck_tb_solicitacao_inscricao_decisor_coerente
  CHECK ((st_solicitacao = 'pendente') = (id_usuario_decisor IS NULL));

ALTER TABLE tb_usuario
  ADD CONSTRAINT ck_tb_usuario_institucional_valido
  CHECK (tp_institucional IS NULL OR tp_institucional IN ('aluno', 'administrativo'));

COMMIT;

-- Para desfazer:
-- ALTER TABLE tb_solicitacao_inscricao DROP CONSTRAINT ck_tb_solicitacao_inscricao_decisor_coerente;
-- ALTER TABLE tb_usuario DROP CONSTRAINT ck_tb_usuario_institucional_valido;
