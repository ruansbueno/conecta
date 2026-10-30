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
  Widget build(BuildContext context) {
    final linha = Row(
      children: [
        Icon(icone, size: 16, color: Cores.apagado),
        const SizedBox(width: 8),
        Expanded(
          child: Text(texto, style: Tipografia.meta.copyWith(color: Cores.apagado)),
        ),
        // Com a fonte do sistema grande, a ação desce para baixo do texto (RM-36).
        if (!_acaoEmbaixo(context)) ?acao,
      ],
    );
    return Container(
      width: double.infinity,
      color: Cores.fundoPagina,
      padding: EdgeInsets.fromLTRB(20, 12, acao == null || _acaoEmbaixo(context) ? 20 : 8, 12),
      child: _acaoEmbaixo(context)
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                linha,
                Padding(padding: const EdgeInsets.only(left: 12), child: acao),
              ],
            )
          : linha,
    );
  }

  bool _acaoEmbaixo(BuildContext context) =>
      acao != null && MediaQuery.textScalerOf(context).scale(10) > 13;
}
