import 'package:flutter/material.dart';

import '../../models/aviso.dart';
import '../../theme/cores.dart';
import '../../theme/tipografia.dart';
import '../comum/avatar.dart';
import '../comum/chip_destino.dart';
import '../comum/datas.dart';

/// Item da lista de avisos (design m-02): autor, data relativa, título, trecho e destinos.
class AvisoCard extends StatelessWidget {
  const AvisoCard({required this.aviso, required this.onTap, super.key});

  final Aviso aviso;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final quando = dataRelativa(aviso.publicadoEm);
    return MergeSemantics(
      child: Semantics(
        button: true,
        child: InkWell(
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: context.cores.linhaSuave)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Avatar(nome: aviso.autorNome),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        aviso.autorNome,
                        style: context.tipos.autor,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      aviso.foiEditado ? '$quando · editado' : quando,
                      style: context.tipos.meta,
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  aviso.titulo,
                  style: context.tipos.tituloCartao,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),
                Text(aviso.trecho, style: context.tipos.apoio),
                if (aviso.destinos.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  ChipsDestino(aviso.destinos),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
