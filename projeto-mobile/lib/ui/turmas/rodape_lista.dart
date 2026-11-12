import 'package:flutter/material.dart';

import '../../state/lista_paginada.dart';
import '../comum/fim_da_lista.dart';

/// Carregando a próxima página, falha ao carregá-la ou, com [fim], o fecho da lista que acabou
/// (spec 002, D-AMN-7). Com dados guardados (sem rede), não se sabe se acabou: sem fecho.
class RodapeLista extends StatelessWidget {
  const RodapeLista({required this.lista, required this.onRepetir, this.fim, super.key});

  final ListaPaginada<Object?> lista;
  final VoidCallback onRepetir;

  /// Texto do fecho, como "Não há mais solicitações.".
  final String? fim;

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
    if (fim case final texto?
        when !lista.temMais && lista.dadosDe == null && lista.itens.isNotEmpty) {
      return FimDaLista(texto);
    }
    return const SizedBox.shrink();
  }
}
