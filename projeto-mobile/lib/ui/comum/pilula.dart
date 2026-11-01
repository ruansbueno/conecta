import 'package:flutter/material.dart';

import '../../theme/cores.dart';
import '../../theme/tipografia.dart';

/// Pílula de alternância (avisos Ativos/Arquivados, agenda Próximos/Provas/Mês): 32 px no design,
/// alvo de toque de 48 dp, e cresce com a fonte do sistema (RM-36).
class Pilula extends StatelessWidget {
  const Pilula(this.texto, {required this.ativa, required this.onTap, super.key});

  final String texto;
  final bool ativa;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    selected: ativa,
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      // Alturas mínimas, não fixas: a pílula cresce com a fonte do sistema.
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 48),
        child: Center(
          widthFactor: 1,
          child: Container(
            constraints: const BoxConstraints(minHeight: 32),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: ativa ? Cores.navy : Cores.branco,
              border: ativa ? null : Border.all(color: Cores.linha),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              texto,
              style: Tipografia.segmento.copyWith(
                color: ativa ? Cores.branco : Cores.apagado,
                fontWeight: ativa ? FontWeight.w600 : FontWeight.w500,
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

/// As pílulas de uma tela, alinhadas à esquerda como no design. Rolam na horizontal: com fonte a
/// 200% não cabem lado a lado (RM-36).
class LinhaDePilulas extends StatelessWidget {
  const LinhaDePilulas({required this.children, super.key});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Align(
    alignment: Alignment.centerLeft,
    child: SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
      child: Row(
        children: [
          for (final (i, filho) in children.indexed) ...[
            if (i > 0) const SizedBox(width: 8),
            filho,
          ],
        ],
      ),
    ),
  );
}
