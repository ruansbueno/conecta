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
    color: context.cores.fundoPagina,
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
                color: context.cores.branco,
                border: Border.all(color: context.cores.linha),
                borderRadius: BorderRadius.circular(22),
              ),
              child: Icon(Icons.cloud_off_outlined, size: 30, color: context.cores.tenue),
            ),
            const SizedBox(height: 20),
            Text(mensagem, style: context.tipos.apoio, textAlign: TextAlign.center),
            const SizedBox(height: 20),
            OutlinedButton(onPressed: onRepetir, child: const Text('Tentar de novo')),
          ],
        ),
      ),
    ),
  );
}
