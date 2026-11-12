// Spec 002 (FR-007, SC-002): todo texto tem contraste AA (4,5:1) nos dois temas.
import 'dart:math' as math;

import 'package:conecta/theme/cores.dart';
import 'package:flutter/painting.dart';
import 'package:flutter_test/flutter_test.dart';

double contraste(Color a, Color b) {
  final la = a.computeLuminance();
  final lb = b.computeLuminance();
  return (math.max(la, lb) + 0.05) / (math.min(la, lb) + 0.05);
}

/// Pares de texto × fundo que as telas usam.
List<(String, Color, Color)> pares(CoresConecta c) => [
  for (final (nome, texto) in [
    ('tinta', c.tinta),
    ('textoCorpo', c.textoCorpo),
    ('navy', c.navy),
    ('navySuave', c.navySuave),
    ('apagado', c.apagado),
    ('tenue', c.tenue),
    ('azul', c.azul),
    ('azulEscuro', c.azulEscuro),
  ])
    for (final (nomeFundo, fundo) in [
      ('branco', c.branco),
      ('fundoPagina', c.fundoPagina),
      ('azulSuperficie', c.azulSuperficie),
    ])
      ('$nome sobre $nomeFundo', texto, fundo),
  ('apagado sobre linhaSuave', c.apagado, c.linhaSuave),
  ('alerta sobre alertaFundo', c.alerta, c.alertaFundo),
  ('alerta sobre branco', c.alerta, c.branco),
  ('sucesso sobre sucessoFundo', c.sucesso, c.sucessoFundo),
  ('sucesso sobre branco', c.sucesso, c.branco),
  ('perigo sobre perigoFundo', c.perigo, c.perigoFundo),
  ('perigo sobre branco', c.perigo, c.branco),
  ('sobreCor sobre acao', c.sobreCor, c.acao),
  ('sobreCor sobre acaoEscura', c.sobreCor, c.acaoEscura),
  ('sobreCor sobre painel', c.sobreCor, c.painel),
  for (final (nomeFundo, fundo) in [
    ('destinoTodosFundo', c.destinoTodosFundo),
    ('destinoSemestreFundo', c.destinoSemestreFundo),
    ('destinoDocentesFundo', c.destinoDocentesFundo),
    ('destinoDesconhecidoFundo', c.destinoDesconhecidoFundo),
  ]) ...[('navy sobre $nomeFundo', c.navy, fundo), ('apagado sobre $nomeFundo', c.apagado, fundo)],
];

void main() {
  for (final (nome, cores) in [('claro', CoresConecta.claro), ('escuro', CoresConecta.escuro)]) {
    test('tema $nome: todo par de texto × fundo tem 4,5:1 ou mais', () {
      final abaixo = [
        for (final (par, texto, fundo) in pares(cores))
          if (contraste(texto, fundo) < 4.5) '$par: ${contraste(texto, fundo).toStringAsFixed(2)}',
      ];
      expect(abaixo, isEmpty);
    });
  }

  test('escuro: superfícies e texto redefinidos (nada herdado do claro por esquecimento)', () {
    const c = CoresConecta.claro;
    const e = CoresConecta.escuro;
    expect(e.branco, isNot(c.branco));
    expect(e.fundoPagina, isNot(c.fundoPagina));
    expect(e.navy, isNot(c.navy));
    expect(e.tinta, isNot(c.tinta));
    expect(e.apagado, isNot(c.apagado));
    expect(e.linha, isNot(c.linha));
    expect(e.painel, isNot(c.painel));
  });

  test('mesma paleta da web (projeto-web/src/estilos/globals.css)', () {
    expect(CoresConecta.escuro.fundoPagina, const Color(0xFF0B1424));
    expect(CoresConecta.escuro.branco, const Color(0xFF121E34));
    expect(CoresConecta.escuro.azul, const Color(0xFF6B9BFF));
    expect(CoresConecta.claro.navy, const Color(0xFF132A4E));
    for (final c in [CoresConecta.claro, CoresConecta.escuro]) {
      expect(c.acao, const Color(0xFF2563EB));
      expect(c.sobreCor, const Color(0xFFFFFFFF));
    }
  });
}
