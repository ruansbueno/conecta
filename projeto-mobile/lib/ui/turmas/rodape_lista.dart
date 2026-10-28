import 'package:flutter/material.dart';

import '../../state/lista_paginada.dart';

/// Carregando a próxima página, ou falha ao carregá-la. Listas de turmas são curtas: sem o
/// "não há mais" da lista de avisos.
class RodapeLista extends StatelessWidget {
  const RodapeLista({required this.lista, required this.onRepetir, super.key});

  final ListaPaginada<Object?> lista;
  final VoidCallback onRepetir;

  @override
  Widget build(BuildContext context) {
    if (lista.carregandoMais) {
      return const Padding(
        padding: EdgeInsets.all(12),
        child: Center(
          child: SizedBox.square(
            dimension: 22,
            child: CircularProgressIndicator(strokeWidth: 2.4, semanticsLabel: 'Carregando mais'),
          ),
        ),
      );
    }
    if (lista.falhaAoCarregarMais != null) {
      return Center(
        child: TextButton(onPressed: onRepetir, child: const Text('Tentar de novo')),
      );
    }
    return const SizedBox.shrink();
  }
}
