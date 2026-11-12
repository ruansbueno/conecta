import 'package:flutter/material.dart';

import '../../theme/tipografia.dart';

/// Spec 002 (FR-008): diz, em texto, que a lista acabou — em vez de terminar num espaço em branco.
class FimDaLista extends StatelessWidget {
  const FimDaLista(this.texto, {super.key});

  final String texto;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(20),
    child: Center(
      child: Text(texto, style: context.tipos.meta, textAlign: TextAlign.center),
    ),
  );
}
