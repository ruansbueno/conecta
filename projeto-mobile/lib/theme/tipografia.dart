import 'package:flutter/painting.dart';

import 'cores.dart';

const _familia = 'Inter';

/// Entreletra em `em` do design convertida para pixels lógicos.
double _em(double em, double tamanho) => em * tamanho;

/// Escala tipográfica das telas (design/_assets/base.css). Pesos 550/650 do CSS viram 500/600.
abstract final class Tipografia {
  static const familia = _familia;

  static final marca = TextStyle(
    fontFamily: _familia,
    fontSize: 30,
    fontWeight: FontWeight.w800,
    letterSpacing: _em(0.08, 30),
    color: Cores.navy,
    height: 1.15,
  );

  static final tituloGrande = TextStyle(
    fontFamily: _familia,
    fontSize: 22,
    fontWeight: FontWeight.w700,
    letterSpacing: _em(-0.025, 22),
    color: Cores.navy,
    height: 1.2,
  );

  /// Título de tela (barra superior).
  static final titulo = TextStyle(
    fontFamily: _familia,
    fontSize: 20,
    fontWeight: FontWeight.w600,
    letterSpacing: _em(-0.02, 20),
    color: Cores.navy,
    height: 1.2,
  );

  static final subtitulo = TextStyle(
    fontFamily: _familia,
    fontSize: 16,
    fontWeight: FontWeight.w600,
    letterSpacing: _em(-0.012, 16),
    color: Cores.navy,
    height: 1.3,
  );

  /// Título de aviso na lista.
  static final tituloCartao = TextStyle(
    fontFamily: _familia,
    fontSize: 15,
    fontWeight: FontWeight.w600,
    letterSpacing: _em(-0.012, 15),
    color: Cores.navy,
    height: 1.35,
  );

  static const corpo = TextStyle(
    fontFamily: _familia,
    fontSize: 14,
    height: 1.55,
    color: Cores.textoCorpo,
  );

  static const apoio = TextStyle(
    fontFamily: _familia,
    fontSize: 13,
    height: 1.5,
    color: Cores.apagado,
  );

  static const meta = TextStyle(
    fontFamily: _familia,
    fontSize: 12,
    height: 1.4,
    color: Cores.tenue,
  );

  static const autor = TextStyle(
    fontFamily: _familia,
    fontSize: 12.5,
    fontWeight: FontWeight.w600,
    color: Cores.navySuave,
  );

  static const rotuloCampo = TextStyle(
    fontFamily: _familia,
    fontSize: 12.5,
    fontWeight: FontWeight.w600,
    color: Cores.apagado,
  );

  static const campo = TextStyle(fontFamily: _familia, fontSize: 14, color: Cores.tinta);

  static final botao = TextStyle(
    fontFamily: _familia,
    fontSize: 14,
    fontWeight: FontWeight.w600,
    letterSpacing: _em(-0.005, 14),
  );

  static const botaoPequeno = TextStyle(
    fontFamily: _familia,
    fontSize: 13,
    fontWeight: FontWeight.w600,
  );

  static const chip = TextStyle(
    fontFamily: _familia,
    fontSize: 12,
    fontWeight: FontWeight.w500,
    color: Cores.navy,
  );

  static const segmento = TextStyle(
    fontFamily: _familia,
    fontSize: 12.5,
    fontWeight: FontWeight.w600,
  );

  static const aba = TextStyle(fontFamily: _familia, fontSize: 10.5, fontWeight: FontWeight.w500);

  static const avatar = TextStyle(
    fontFamily: _familia,
    fontSize: 11.5,
    fontWeight: FontWeight.w600,
    color: Cores.branco,
    letterSpacing: 0.25,
  );
}
