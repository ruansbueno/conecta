import 'package:flutter/material.dart';

import '../../theme/cores.dart';
import '../../theme/tipografia.dart';

/// Falha de rede ou servidor sem dados para mostrar: explica e oferece repetir (nunca tela em
/// branco).
class EstadoErro extends StatelessWidget {
  const EstadoErro({required this.mensagem, required this.onRepetir, super.key});

  final String mensagem;
  final VoidCallback onRepetir;

  @override
  Widget build(BuildContext context) => ColoredBox(
    color: Cores.fundoPagina,
    child: Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: Cores.branco,
                border: Border.all(color: Cores.linha),
                borderRadius: BorderRadius.circular(22),
              ),
              child: const Icon(Icons.cloud_off_outlined, size: 30, color: Cores.tenue),
            ),
            const SizedBox(height: 20),
            Text(mensagem, style: Tipografia.apoio, textAlign: TextAlign.center),
            const SizedBox(height: 20),
            OutlinedButton(onPressed: onRepetir, child: const Text('Tentar de novo')),
          ],
        ),
      ),
    ),
  );
}
