import 'package:flutter/material.dart';

import '../../theme/cores.dart';
import '../../theme/tipografia.dart';

enum TomSelo { alerta, sucesso, perigo, neutro }

/// Selo de situação/status (pendente, aprovada, arquivado…), com a cor do tom.
class SeloSituacao extends StatelessWidget {
  const SeloSituacao(this.texto, {required this.tom, super.key});

  final String texto;
  final TomSelo tom;

  @override
  Widget build(BuildContext context) {
    final (cor, fundo) = switch (tom) {
      TomSelo.alerta => (context.cores.alerta, context.cores.alertaFundo),
      TomSelo.sucesso => (context.cores.sucesso, context.cores.sucessoFundo),
      TomSelo.perigo => (context.cores.perigo, context.cores.perigoFundo),
      TomSelo.neutro => (context.cores.apagado, context.cores.linhaSuave),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: fundo, borderRadius: BorderRadius.circular(999)),
      child: Text(
        texto,
        style: context.tipos.chip.copyWith(color: cor, fontWeight: FontWeight.w600),
      ),
    );
  }
}
