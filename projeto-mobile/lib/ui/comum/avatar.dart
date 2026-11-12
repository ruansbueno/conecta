import 'package:flutter/material.dart';

import '../../models/usuario.dart';
import '../../theme/cores.dart';
import '../../theme/tema.dart';
import '../../theme/tipografia.dart';

enum TamanhoAvatar { pequeno, medio, grande }

/// Quadrado navy com as iniciais (design: `.avatar` / `.avatar.sm`; o grande é o do perfil, m-13).
class Avatar extends StatelessWidget {
  const Avatar({required this.nome, this.tamanho = TamanhoAvatar.pequeno, super.key});

  final String nome;
  final TamanhoAvatar tamanho;

  @override
  Widget build(BuildContext context) {
    final (lado, raio, fonte) = switch (tamanho) {
      TamanhoAvatar.pequeno => (30.0, Raios.avatar, 11.5),
      TamanhoAvatar.medio => (34.0, Raios.avatarMedio, 12.5),
      TamanhoAvatar.grande => (64.0, Raios.avatarGrande, 22.0),
    };
    return Semantics(
      label: nome,
      excludeSemantics: true,
      child: Container(
        width: lado,
        height: lado,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: context.cores.painel,
          borderRadius: BorderRadius.circular(raio),
        ),
        child: Text(
          iniciaisDe(nome),
          style: context.tipos.avatar.copyWith(fontSize: fonte),
          textScaler: TextScaler.noScaling, // cabe no quadrado em qualquer escala de fonte
        ),
      ),
    );
  }
}
