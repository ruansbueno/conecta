import 'package:flutter/material.dart';

import '../../theme/cores.dart';
import '../../theme/tipografia.dart';

/// Lista vazia não é erro: explica e, quando faz sentido, oferece um atalho (design m-05).
class EstadoVazio extends StatelessWidget {
  const EstadoVazio({
    required this.icone,
    required this.titulo,
    required this.texto,
    this.acao,
    this.onAcao,
    super.key,
  });

  final IconData icone;
  final String titulo;
  final String texto;
  final String? acao;
  final VoidCallback? onAcao;

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
              child: Icon(icone, size: 30, color: Cores.tenue),
            ),
            const SizedBox(height: 20),
            Text(titulo, style: Tipografia.subtitulo, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(texto, style: Tipografia.apoio, textAlign: TextAlign.center),
            if (acao != null) ...[
              const SizedBox(height: 20),
              OutlinedButton(onPressed: onAcao, child: Text(acao!)),
            ],
          ],
        ),
      ),
    ),
  );
}
