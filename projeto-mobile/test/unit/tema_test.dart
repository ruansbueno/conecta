import 'package:conecta/theme/cores.dart';
import 'package:conecta/theme/tema.dart';
import 'package:conecta/theme/tipografia.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final tema = temaConecta(CoresConecta.claro);
  final escuro = temaConecta(CoresConecta.escuro);

  test('Inter em todo o texto', () {
    expect(tema.textTheme.bodyMedium!.fontFamily, 'Inter');
    expect(TiposConecta.de(CoresConecta.claro).titulo.fontFamily, 'Inter');
  });

  test('cores do design (design/README.md)', () {
    expect(tema.colorScheme.primary, CoresConecta.claro.azul);
    expect(tema.colorScheme.error, CoresConecta.claro.perigo);
    expect(tema.scaffoldBackgroundColor, CoresConecta.claro.branco);
    expect(CoresConecta.claro.navy, const Color(0xFF132A4E));
    expect(CoresConecta.claro.azul, const Color(0xFF2563EB));
  });

  test('alvo de toque mínimo de 48 dp (RM-34)', () {
    for (final t in [tema, escuro]) {
      expect(t.materialTapTargetSize, MaterialTapTargetSize.padded);
      final minimo = t.filledButtonTheme.style!.minimumSize!.resolve({})!;
      expect(minimo.height, greaterThanOrEqualTo(48));
      final minimoContorno = t.outlinedButtonTheme.style!.minimumSize!.resolve({})!;
      expect(minimoContorno.height, greaterThanOrEqualTo(48));
    }
  });

  test('títulos com entreletra negativa de -0,02 em', () {
    final titulo = TiposConecta.de(CoresConecta.claro).titulo;
    expect(titulo.letterSpacing, closeTo(-0.02 * titulo.fontSize!, 0.01));
  });

  group('tema escuro (spec 002)', () {
    test('é escuro, com a paleta e a tipografia do escuro', () {
      expect(escuro.brightness, Brightness.dark);
      expect(escuro.colorScheme.brightness, Brightness.dark);
      expect(escuro.scaffoldBackgroundColor, CoresConecta.escuro.branco);
      expect(escuro.extension<CoresConecta>(), CoresConecta.escuro);
      expect(escuro.extension<TiposConecta>()!.titulo.color, CoresConecta.escuro.navy);
      expect(escuro.appBarTheme.backgroundColor, CoresConecta.escuro.branco);
      expect(escuro.inputDecorationTheme.fillColor, CoresConecta.escuro.branco);
    });

    test('o claro carrega as extensões do claro', () {
      expect(tema.brightness, Brightness.light);
      expect(tema.extension<CoresConecta>(), CoresConecta.claro);
      expect(tema.extension<TiposConecta>()!.meta.color, CoresConecta.claro.tenue);
    });

    test('botão principal: #2563eb com texto branco nos dois temas', () {
      for (final t in [tema, escuro]) {
        final estilo = t.filledButtonTheme.style!;
        expect(estilo.backgroundColor!.resolve({}), const Color(0xFF2563EB));
        expect(estilo.foregroundColor!.resolve({}), const Color(0xFFFFFFFF));
      }
    });

    test('a extensão interpola entre os temas (troca animada)', () {
      final meio = CoresConecta.claro.lerp(CoresConecta.escuro, 0.5);
      expect(meio.branco, isNot(CoresConecta.claro.branco));
      expect(CoresConecta.claro.lerp(CoresConecta.escuro, 1).branco, CoresConecta.escuro.branco);
    });
  });
}
