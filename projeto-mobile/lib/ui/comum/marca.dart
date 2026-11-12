import 'package:flutter/material.dart';

import '../../theme/cores.dart';

/// Capelo acadêmico do CONECTA, transcrito do SVG do design (viewBox 28×28).
class MarcaConecta extends StatelessWidget {
  const MarcaConecta({this.tamanho = 44, this.cor, super.key});

  final double tamanho;

  /// Sem cor, a de título do tema ativo.
  final Color? cor;

  @override
  Widget build(BuildContext context) => Semantics(
    label: 'CONECTA',
    child: CustomPaint(size: Size.square(tamanho), painter: _Capelo(cor ?? context.cores.navy)),
  );
}

class _Capelo extends CustomPainter {
  _Capelo(this.cor);

  final Color cor;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.scale(size.width / 28);
    final traco = Paint()
      ..color = cor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.9
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    canvas
      ..drawPath(
        Path()
          ..moveTo(3, 10.2)
          ..lineTo(14, 5.2)
          ..lineTo(25, 10.2)
          ..lineTo(14, 15.2)
          ..close(),
        traco,
      )
      ..drawPath(
        Path()
          ..moveTo(7.6, 12.4)
          ..lineTo(7.6, 17.8)
          ..cubicTo(7.6, 19.7, 10.5, 21.2, 14, 21.2)
          ..cubicTo(17.5, 21.2, 20.4, 19.7, 20.4, 17.8)
          ..lineTo(20.4, 12.4),
        traco,
      )
      ..drawLine(const Offset(24.6, 10.6), const Offset(24.6, 16.7), traco);
  }

  @override
  bool shouldRepaint(_Capelo old) => old.cor != cor;
}
