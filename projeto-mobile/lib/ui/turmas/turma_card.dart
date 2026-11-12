import 'package:flutter/material.dart';

import '../../models/turma.dart';
import '../../theme/cores.dart';
import '../../theme/tipografia.dart';

/// Sigla do quadro colorido, em duas linhas: `TADS-3A-2026-2` → `TADS` / `3A` (data-model.md).
String siglaCurta(String codigo) {
  final partes = codigo.split('-').where((p) => p.isNotEmpty).toList();
  return partes.length < 2 ? codigo : '${partes[0]}\n${partes[1]}';
}

/// Código sem o período, para chips: `TADS-3A-2026-2` → `TADS-3A`.
String codigoCurto(String codigo) {
  final partes = codigo.split('-').where((p) => p.isNotEmpty).toList();
  return partes.length < 2 ? codigo : '${partes[0]}-${partes[1]}';
}

/// "3º semestre · 2026/2"; sem semestre (optativa), só o período (data-model.md).
String descricaoTurma({int? semestre, String? periodo}) =>
    [if (semestre != null) '$semestreº semestre', ?periodo].join(' · ');

/// Contorno branco com borda, comum aos cartões de turma e de solicitação (design m-06, m-07).
class CaixaCartao extends StatelessWidget {
  const CaixaCartao({required this.child, super.key});

  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    decoration: BoxDecoration(
      color: context.cores.branco,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: context.cores.linha),
    ),
    child: child,
  );
}

/// Conteúdo com um elemento à direita (botão, selo). Com a fonte do sistema grande, o elemento
/// desce para baixo do conteúdo em vez de espremê-lo (RM-36).
class LinhaComAcao extends StatelessWidget {
  const LinhaComAcao({required this.conteudo, required this.acao, super.key});

  final Widget conteudo;
  final Widget acao;

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.textScalerOf(context).scale(10) > 13) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [conteudo, const SizedBox(height: 10), acao],
      );
    }
    return Row(
      children: [
        Expanded(child: conteudo),
        const SizedBox(width: 12),
        acao,
      ],
    );
  }
}

/// T06 — turma em que a pessoa tem vínculo: sigla, nome, semestre e selo do papel (design m-06).
class TurmaCard extends StatelessWidget {
  const TurmaCard({required this.turma, super.key});

  final TurmaVinculada turma;

  @override
  Widget build(BuildContext context) {
    final descricao = descricaoTurma(semestre: turma.semestreCurso, periodo: turma.periodoLetivo);
    final papel = switch (turma.papel) {
      Papel.aluno => 'Aluno',
      Papel.docente => 'Docente',
      _ => null,
    };
    return MergeSemantics(
      child: CaixaCartao(
        child: LinhaComAcao(
          conteudo: Row(
            children: [
              ExcludeSemantics(
                child: Container(
                  constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: context.cores.azulSuperficie,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    siglaCurta(turma.codigo),
                    style: context.tipos.botaoPequeno.copyWith(
                      color: context.cores.azul,
                      height: 1.2,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(turma.nome, style: context.tipos.tituloCartao),
                    if (descricao.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(descricao, style: context.tipos.meta),
                    ],
                  ],
                ),
              ),
            ],
          ),
          acao: papel == null
              ? const SizedBox.shrink()
              : Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: context.cores.azulSuperficie,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(papel, style: context.tipos.chip.copyWith(color: context.cores.azul)),
                ),
        ),
      ),
    );
  }
}
