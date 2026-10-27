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
      TomSelo.alerta => (Cores.alerta, Cores.alertaFundo),
      TomSelo.sucesso => (Cores.sucesso, Cores.sucessoFundo),
      TomSelo.perigo => (Cores.perigo, Cores.perigoFundo),
      TomSelo.neutro => (Cores.apagado, Cores.linhaSuave),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: fundo, borderRadius: BorderRadius.circular(999)),
      child: Text(
        texto,
        style: Tipografia.chip.copyWith(color: cor, fontWeight: FontWeight.w600),
      ),
    );
  }
}
