import 'package:flutter/material.dart';

import '../../models/usuario.dart';
import '../../theme/cores.dart';
import '../../theme/tema.dart';
import '../../theme/tipografia.dart';

enum TamanhoAvatar { pequeno, medio }

/// Quadrado navy com as iniciais (design: `.avatar` / `.avatar.sm`).
class Avatar extends StatelessWidget {
  const Avatar({required this.nome, this.tamanho = TamanhoAvatar.pequeno, super.key});

  final String nome;
  final TamanhoAvatar tamanho;

  @override
  Widget build(BuildContext context) {
    final pequeno = tamanho == TamanhoAvatar.pequeno;
    return Semantics(
      label: nome,
      excludeSemantics: true,
      child: Container(
        width: pequeno ? 30 : 34,
        height: pequeno ? 30 : 34,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: Cores.navy,
          borderRadius: BorderRadius.circular(pequeno ? Raios.avatar : Raios.avatarMedio),
        ),
        child: Text(
          iniciaisDe(nome),
          style: pequeno ? Tipografia.avatar : Tipografia.avatar.copyWith(fontSize: 12.5),
          textScaler: TextScaler.noScaling, // cabe no quadrado em qualquer escala de fonte
        ),
      ),
    );
  }
}
