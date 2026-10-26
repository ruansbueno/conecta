import 'package:flutter/material.dart';

import '../../theme/cores.dart';
import '../../theme/tipografia.dart';

/// Faixa de explicação no topo de uma lista (design m-04).
class FaixaInformativa extends StatelessWidget {
  const FaixaInformativa(this.texto, {this.icone = Icons.info_outline, this.acao, super.key});

  final String texto;
  final IconData icone;
  final Widget? acao;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    color: Cores.fundoPagina,
    padding: EdgeInsets.fromLTRB(20, 12, acao == null ? 20 : 8, 12),
    child: Row(
      children: [
        Icon(icone, size: 16, color: Cores.apagado),
        const SizedBox(width: 8),
        Expanded(
          child: Text(texto, style: Tipografia.meta.copyWith(color: Cores.apagado)),
        ),
        ?acao,
      ],
    ),
  );
}
