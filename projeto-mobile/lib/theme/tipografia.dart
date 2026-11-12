import 'package:flutter/material.dart';

import 'cores.dart';

const _familia = 'Inter';

/// Entreletra em `em` do design convertida para pixels lógicos.
double _em(double em, double tamanho) => em * tamanho;

/// Família da escala tipográfica (design/_assets/base.css).
abstract final class Tipografia {
  static const familia = _familia;
}

/// Escala tipográfica das telas, com a cor do tema ativo (spec 002): `context.tipos.meta`. Pesos
/// 550/650 do CSS viram 500/600.
@immutable
class TiposConecta extends ThemeExtension<TiposConecta> {
  const TiposConecta._({
    required this.marca,
    required this.tituloGrande,
    required this.titulo,
    required this.subtitulo,
    required this.tituloCartao,
    required this.corpo,
    required this.apoio,
    required this.meta,
    required this.autor,
    required this.rotuloCampo,
    required this.campo,
    required this.botao,
    required this.botaoPequeno,
    required this.chip,
    required this.segmento,
    required this.aba,
    required this.avatar,
  });

  factory TiposConecta.de(CoresConecta c) => TiposConecta._(
    marca: TextStyle(
      fontFamily: _familia,
      fontSize: 30,
      fontWeight: FontWeight.w800,
      letterSpacing: _em(0.08, 30),
      color: c.navy,
      height: 1.15,
    ),
    tituloGrande: TextStyle(
      fontFamily: _familia,
      fontSize: 22,
      fontWeight: FontWeight.w700,
      letterSpacing: _em(-0.025, 22),
      color: c.navy,
      height: 1.2,
    ),
    titulo: TextStyle(
      fontFamily: _familia,
      fontSize: 20,
      fontWeight: FontWeight.w600,
      letterSpacing: _em(-0.02, 20),
      color: c.navy,
      height: 1.2,
    ),
    subtitulo: TextStyle(
      fontFamily: _familia,
      fontSize: 16,
      fontWeight: FontWeight.w600,
      letterSpacing: _em(-0.012, 16),
      color: c.navy,
      height: 1.3,
    ),
    tituloCartao: TextStyle(
      fontFamily: _familia,
      fontSize: 15,
      fontWeight: FontWeight.w600,
      letterSpacing: _em(-0.012, 15),
      color: c.navy,
      height: 1.35,
    ),
    corpo: TextStyle(fontFamily: _familia, fontSize: 14, height: 1.55, color: c.textoCorpo),
    apoio: TextStyle(fontFamily: _familia, fontSize: 13, height: 1.5, color: c.apagado),
    meta: TextStyle(fontFamily: _familia, fontSize: 12, height: 1.4, color: c.tenue),
    autor: TextStyle(
      fontFamily: _familia,
      fontSize: 12.5,
      fontWeight: FontWeight.w600,
      color: c.navySuave,
    ),
    rotuloCampo: TextStyle(
      fontFamily: _familia,
      fontSize: 12.5,
      fontWeight: FontWeight.w600,
      color: c.apagado,
    ),
    campo: TextStyle(fontFamily: _familia, fontSize: 14, color: c.tinta),
    botao: TextStyle(
      fontFamily: _familia,
      fontSize: 14,
      fontWeight: FontWeight.w600,
      letterSpacing: _em(-0.005, 14),
    ),
    botaoPequeno: const TextStyle(fontFamily: _familia, fontSize: 13, fontWeight: FontWeight.w600),
    chip: TextStyle(fontFamily: _familia, fontSize: 12, fontWeight: FontWeight.w500, color: c.navy),
    segmento: const TextStyle(fontFamily: _familia, fontSize: 12.5, fontWeight: FontWeight.w600),
    aba: const TextStyle(fontFamily: _familia, fontSize: 10.5, fontWeight: FontWeight.w500),
    avatar: TextStyle(
      fontFamily: _familia,
      fontSize: 11.5,
      fontWeight: FontWeight.w600,
      color: c.sobreCor,
      letterSpacing: 0.25,
    ),
  );

  final TextStyle marca;
  final TextStyle tituloGrande;

  /// Título de tela (barra superior).
  final TextStyle titulo;
  final TextStyle subtitulo;

  /// Título de aviso na lista.
  final TextStyle tituloCartao;
  final TextStyle corpo;
  final TextStyle apoio;
  final TextStyle meta;
  final TextStyle autor;
  final TextStyle rotuloCampo;
  final TextStyle campo;
  final TextStyle botao;
  final TextStyle botaoPequeno;
  final TextStyle chip;
  final TextStyle segmento;
  final TextStyle aba;
  final TextStyle avatar;

  @override
  TiposConecta copyWith() => this;

  @override
  TiposConecta lerp(TiposConecta? other, double t) {
    if (other == null) return this;
    TextStyle l(TextStyle a, TextStyle b) => TextStyle.lerp(a, b, t)!;
    return TiposConecta._(
      marca: l(marca, other.marca),
      tituloGrande: l(tituloGrande, other.tituloGrande),
      titulo: l(titulo, other.titulo),
      subtitulo: l(subtitulo, other.subtitulo),
      tituloCartao: l(tituloCartao, other.tituloCartao),
      corpo: l(corpo, other.corpo),
      apoio: l(apoio, other.apoio),
      meta: l(meta, other.meta),
      autor: l(autor, other.autor),
      rotuloCampo: l(rotuloCampo, other.rotuloCampo),
      campo: l(campo, other.campo),
      botao: l(botao, other.botao),
      botaoPequeno: l(botaoPequeno, other.botaoPequeno),
      chip: l(chip, other.chip),
      segmento: l(segmento, other.segmento),
      aba: l(aba, other.aba),
      avatar: l(avatar, other.avatar),
    );
  }
}

extension TiposDoTema on BuildContext {
  /// Estilos de texto do tema ativo (claro ou escuro).
  TiposConecta get tipos => Theme.of(this).extension<TiposConecta>()!;
}
