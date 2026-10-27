import 'package:conecta/theme/cores.dart';
import 'package:conecta/theme/tema.dart';
import 'package:conecta/theme/tipografia.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final tema = temaConecta();

  test('Inter em todo o texto', () {
    expect(tema.textTheme.bodyMedium!.fontFamily, 'Inter');
    expect(Tipografia.titulo.fontFamily, 'Inter');
  });

  test('cores do design (design/README.md)', () {
    expect(tema.colorScheme.primary, Cores.azul);
    expect(tema.colorScheme.error, Cores.perigo);
    expect(tema.scaffoldBackgroundColor, Cores.branco);
    expect(Cores.navy, const Color(0xFF132A4E));
    expect(Cores.azul, const Color(0xFF2563EB));
  });

  test('alvo de toque mínimo de 48 dp (RM-34)', () {
    expect(tema.materialTapTargetSize, MaterialTapTargetSize.padded);
    final minimo = tema.filledButtonTheme.style!.minimumSize!.resolve({})!;
    expect(minimo.height, greaterThanOrEqualTo(48));
    final minimoContorno = tema.outlinedButtonTheme.style!.minimumSize!.resolve({})!;
    expect(minimoContorno.height, greaterThanOrEqualTo(48));
  });

  test('títulos com entreletra negativa de -0,02 em', () {
    expect(Tipografia.titulo.letterSpacing, closeTo(-0.02 * Tipografia.titulo.fontSize!, 0.01));
  });
}
