import 'package:flutter/material.dart';

import '../../models/evento.dart';
import '../../theme/cores.dart';
import '../../theme/tipografia.dart';

/// Folha do ícone de filtro (plan-f2 D-AF2-2). Devolve `(tipo,)`, com `null` para "Todos os
/// tipos"; fechar sem escolher devolve `null`.
Future<(TipoEvento?,)?> escolherTipo(BuildContext context, TipoEvento? atual) =>
    showModalBottomSheet<(TipoEvento?,)>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) => SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.only(bottom: 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                child: Semantics(
                  header: true,
                  child: Text('Filtrar por tipo', style: context.tipos.subtitulo),
                ),
              ),
              for (final tipo in <TipoEvento?>[null, ...TipoEvento.conhecidos])
                _Opcao(
                  texto: tipo?.rotulo ?? 'Todos os tipos',
                  escolhida: tipo == atual,
                  onTap: () => Navigator.of(context).pop((tipo,)),
                ),
            ],
          ),
        ),
      ),
    );

class _Opcao extends StatelessWidget {
  const _Opcao({required this.texto, required this.escolhida, required this.onTap});

  final String texto;
  final bool escolhida;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    selected: escolhida,
    button: true,
    excludeSemantics: true,
    label: texto,
    onTap: onTap,
    child: InkWell(
      onTap: onTap,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 48),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  texto,
                  style: context.tipos.corpo.copyWith(
                    color: escolhida ? context.cores.azul : context.cores.navy,
                    fontWeight: escolhida ? FontWeight.w600 : FontWeight.w400,
                  ),
                ),
              ),
              if (escolhida) Icon(Icons.check, size: 20, color: context.cores.azul),
            ],
          ),
        ),
      ),
    ),
  );
}
