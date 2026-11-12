import 'package:flutter/material.dart';

import '../../models/turma.dart';
import '../../theme/cores.dart';
import '../../theme/tipografia.dart';

/// Troca de turma em Horários (RM-27): as turmas de `GET /turmas/minhas`, com a atual marcada.
Future<TurmaVinculada?> escolherTurma(
  BuildContext context,
  List<TurmaVinculada> turmas,
  TurmaVinculada? atual,
) => showModalBottomSheet<TurmaVinculada>(
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
              child: Text('Escolher turma', style: context.tipos.subtitulo),
            ),
          ),
          for (final t in turmas)
            Semantics(
              selected: t.id == atual?.id,
              button: true,
              excludeSemantics: true,
              label: '${t.codigo} — ${t.nome}',
              onTap: () => Navigator.of(context).pop(t),
              child: InkWell(
                onTap: () => Navigator.of(context).pop(t),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(minHeight: 48),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${t.codigo} — ${t.nome}',
                            style: context.tipos.corpo.copyWith(
                              color: t.id == atual?.id ? context.cores.azul : context.cores.navy,
                              fontWeight: t.id == atual?.id ? FontWeight.w600 : FontWeight.w400,
                            ),
                          ),
                        ),
                        if (t.id == atual?.id)
                          Icon(Icons.check, size: 20, color: context.cores.azul),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    ),
  ),
);
