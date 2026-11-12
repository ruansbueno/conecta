import 'package:flutter/material.dart';

import '../../theme/cores.dart';

/// Lugar dos cartões enquanto a primeira página carrega (sem diálogo bloqueante).
class EsqueletoLista extends StatelessWidget {
  const EsqueletoLista({this.itens = 4, super.key});

  final int itens;

  @override
  Widget build(BuildContext context) => Semantics(
    label: 'Carregando',
    liveRegion: true,
    excludeSemantics: true,
    child: ListView.separated(
      physics: const NeverScrollableScrollPhysics(),
      itemCount: itens,
      separatorBuilder: (_, _) => const Divider(),
      itemBuilder: (_, _) => const Padding(
        padding: EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                _Barra(largura: 30, altura: 30),
                SizedBox(width: 10),
                _Barra(largura: 120, altura: 12),
              ],
            ),
            SizedBox(height: 12),
            _Barra(largura: 260, altura: 14),
            SizedBox(height: 8),
            _Barra(largura: double.infinity, altura: 12),
            SizedBox(height: 10),
            _Barra(largura: 70, altura: 22),
          ],
        ),
      ),
    ),
  );
}

class _Barra extends StatelessWidget {
  const _Barra({required this.largura, required this.altura});

  final double largura;
  final double altura;

  @override
  Widget build(BuildContext context) => Container(
    width: largura,
    height: altura,
    decoration: BoxDecoration(
      color: context.cores.linhaSuave,
      borderRadius: BorderRadius.circular(6),
    ),
  );
}
