import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../state/tema_controller.dart';
import '../../theme/cores.dart';

/// Spec 002 (FR-001, FR-002, D-AMN-6): lua no claro, sol no escuro, no canto superior direito de
/// toda tela. A dica (e o rótulo do leitor de tela) diz o que o toque faz.
class BotaoTema extends StatelessWidget {
  const BotaoTema({super.key});

  @override
  Widget build(BuildContext context) {
    final brilho = Theme.of(context).brightness;
    final escuro = brilho == Brightness.dark;
    return IconButton(
      tooltip: escuro ? 'Desativar modo noturno' : 'Ativar modo noturno',
      color: context.cores.navySuave,
      icon: Icon(escuro ? Icons.light_mode_outlined : Icons.dark_mode_outlined),
      onPressed: () => context.read<TemaController>().alternar(brilho),
    );
  }
}

/// Para telas sem barra no topo (login, "Sem conexão"): o botão no canto superior direito, dentro
/// da área segura, por cima do conteúdo.
class ComBotaoTema extends StatelessWidget {
  const ComBotaoTema({required this.child, super.key});

  final Widget child;

  @override
  Widget build(BuildContext context) => Stack(
    children: [
      Positioned.fill(child: child),
      const SafeArea(
        child: Align(
          alignment: Alignment.topRight,
          child: Padding(padding: EdgeInsets.all(4), child: BotaoTema()),
        ),
      ),
    ],
  );
}
