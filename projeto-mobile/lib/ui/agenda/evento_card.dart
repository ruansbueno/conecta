import 'package:flutter/material.dart';

import '../../models/evento.dart';
import '../../theme/cores.dart';
import '../../theme/tipografia.dart';
import '../comum/chip_destino.dart';
import 'calendario.dart';

/// Item de Próximos e Provas (design m-10): data à esquerda (só no primeiro evento do dia), barra
/// na cor do tipo, tipo, título, horas, local e destinos (plan-f2 D-AF2-3).
class EventoCard extends StatelessWidget {
  const EventoCard({
    required this.evento,
    required this.mostrarData,
    required this.onTap,
    super.key,
  });

  final Evento evento;
  final bool mostrarData;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cor = corDoTipo(evento.tipo);
    final (dia, mes) = diaEMes(evento.inicio);
    return MergeSemantics(
      child: Semantics(
        button: true,
        child: InkWell(
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: Cores.linhaSuave)),
            ),
            child: IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SizedBox(
                    width: 44,
                    child: mostrarData
                        ? Column(
                            children: [
                              Text(dia, style: Tipografia.tituloGrande.copyWith(height: 1.1)),
                              Text(mes, style: Tipografia.meta),
                            ],
                          )
                        // Sem a coluna, o leitor de tela ainda ouve a data.
                        : Semantics(label: tituloDoDia(evento.inicio.toLocal())),
                  ),
                  const SizedBox(width: 12),
                  Container(
                    width: 3,
                    decoration: BoxDecoration(
                      color: cor.withValues(alpha: 0.55),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          evento.rotuloTipo,
                          style: Tipografia.chip.copyWith(color: cor, fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 4),
                        Text(evento.titulo, style: Tipografia.tituloCartao),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 14,
                          runSpacing: 4,
                          children: [
                            _Info(Icons.schedule, faixaDeHoras(evento)),
                            if (evento.local case final local?) _Info(Icons.place_outlined, local),
                          ],
                        ),
                        if (evento.destinos.isNotEmpty) ...[
                          const SizedBox(height: 10),
                          ChipsDestino(evento.destinos),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Info extends StatelessWidget {
  const _Info(this.icone, this.texto);

  final IconData icone;
  final String texto;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(icone, size: 15, color: Cores.tenue),
      const SizedBox(width: 5),
      Flexible(child: Text(texto, style: Tipografia.meta)),
    ],
  );
}
