import 'package:flutter/material.dart';

import 'datas.dart';
import 'faixa_informativa.dart';

/// Sem rede, a tela mostra o que estava guardado e diz de quando é (RM-29).
class FaixaCache extends StatelessWidget {
  const FaixaCache({required this.coletadoEm, required this.onRepetir, super.key});

  final DateTime coletadoEm;
  final VoidCallback onRepetir;

  @override
  Widget build(BuildContext context) => FaixaInformativa(
    'Mostrando dados de ${dataHoraCurta(coletadoEm)}. Sem conexão.',
    icone: Icons.cloud_off_outlined,
    acao: TextButton(onPressed: onRepetir, child: const Text('Tentar de novo')),
  );
}
