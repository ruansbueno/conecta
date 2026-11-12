import 'package:flutter/material.dart';

import '../../models/destino.dart';
import '../../theme/cores.dart';
import '../../theme/tipografia.dart';

/// Elemento de identidade do produto: ponto colorido por tipo + rótulo (spec §7).
class ChipDestino extends StatelessWidget {
  const ChipDestino(this.destino, {super.key});

  final Destino destino;

  (Color, Color) _coresDe(CoresConecta c) => switch (destino.tipo) {
    TipoDestino.todos => (c.destinoTodosPonto, c.destinoTodosFundo),
    TipoDestino.turma => (c.destinoTurmaPonto, c.destinoTurmaFundo),
    TipoDestino.semestre => (c.destinoSemestrePonto, c.destinoSemestreFundo),
    TipoDestino.docentes => (c.destinoDocentesPonto, c.destinoDocentesFundo),
    TipoDestino.desconhecido => (c.destinoDesconhecidoPonto, c.destinoDesconhecidoFundo),
  };

  @override
  Widget build(BuildContext context) {
    final (ponto, fundo) = _coresDe(context.cores);
    return Semantics(
      label: 'Destino: ${destino.rotulo}',
      excludeSemantics: true,
      child: Container(
        constraints: const BoxConstraints(minHeight: 24),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(color: fundo, borderRadius: BorderRadius.circular(999)),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            DecoratedBox(
              key: const Key('ponto-destino'),
              decoration: BoxDecoration(color: ponto, shape: BoxShape.circle),
              child: const SizedBox.square(dimension: 6),
            ),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                destino.rotulo,
                style: context.tipos.chip,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Os chips de um aviso, quebrando linha quando preciso.
class ChipsDestino extends StatelessWidget {
  const ChipsDestino(this.destinos, {super.key});

  final List<Destino> destinos;

  @override
  Widget build(BuildContext context) =>
      Wrap(spacing: 6, runSpacing: 6, children: [for (final d in destinos) ChipDestino(d)]);
}
