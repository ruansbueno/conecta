import 'package:flutter/material.dart';

import 'cores.dart';
import 'tipografia.dart';

/// Raio padrão das superfícies e campos (design: 10–12 px).
abstract final class Raios {
  static const campo = 10.0;
  static const cartao = 12.0;
  static const botaoPequeno = 8.0;
  static const avatar = 8.0;
  static const avatarMedio = 9.0;
  static const avatarGrande = 18.0;
}

/// Alvo mínimo de toque (RM-34). O design desenha botões de 42 px; o app usa 48.
const alvoMinimo = 48.0;

/// Tema do app a partir de uma paleta: `CoresConecta.claro` ou `CoresConecta.escuro` (spec 002).
/// As duas extensões levam as cores e os estilos de texto às telas (`context.cores`, `context.tipos`).
ThemeData temaConecta(CoresConecta c) {
  final escuro = ThemeData.estimateBrightnessForColor(c.branco) == Brightness.dark;
  final t = TiposConecta.de(c);
  // No escuro, o azul de ação é claro: o que vai por cima dele é escuro.
  final sobreClaro = escuro ? c.fundoPagina : c.sobreCor;
  final esquema = ColorScheme(
    brightness: escuro ? Brightness.dark : Brightness.light,
    primary: c.azul,
    onPrimary: sobreClaro,
    secondary: c.navy,
    onSecondary: sobreClaro,
    surface: c.branco,
    onSurface: c.tinta,
    error: c.perigo,
    onError: sobreClaro,
    outline: c.linha,
    outlineVariant: c.linhaSuave,
  );

  OutlineInputBorder borda(Color cor, [double largura = 1]) => OutlineInputBorder(
    borderRadius: BorderRadius.circular(Raios.campo),
    borderSide: BorderSide(color: cor, width: largura),
  );

  final base = ThemeData(
    useMaterial3: true,
    brightness: esquema.brightness,
    colorScheme: esquema,
    extensions: [c, t],
    fontFamily: Tipografia.familia,
    scaffoldBackgroundColor: c.branco,
    materialTapTargetSize: MaterialTapTargetSize.padded,
    splashFactory: InkSparkle.splashFactory,
  );

  return base.copyWith(
    textTheme: base.textTheme.apply(
      fontFamily: Tipografia.familia,
      bodyColor: c.tinta,
      displayColor: c.navy,
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: c.branco,
      surfaceTintColor: Colors.transparent,
      foregroundColor: c.navySuave,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: t.titulo,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: c.branco,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      hintStyle: t.campo.copyWith(color: c.tenue),
      prefixIconColor: WidgetStateColor.resolveWith(
        (s) => s.contains(WidgetState.focused) ? c.azul : c.tenue,
      ),
      border: borda(c.linha),
      enabledBorder: borda(c.linha),
      focusedBorder: borda(c.azul),
      errorBorder: borda(c.perigo),
      focusedErrorBorder: borda(c.perigo),
      errorStyle: t.meta.copyWith(color: c.perigo),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: c.acao,
        foregroundColor: c.sobreCor,
        disabledBackgroundColor: c.acao.withValues(alpha: 0.6),
        disabledForegroundColor: c.sobreCor,
        minimumSize: const Size(alvoMinimo, alvoMinimo),
        textStyle: t.botao,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Raios.campo)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        backgroundColor: c.branco,
        foregroundColor: c.navy,
        minimumSize: const Size(alvoMinimo, alvoMinimo),
        padding: const EdgeInsets.symmetric(horizontal: 16),
        textStyle: t.botaoPequeno,
        side: BorderSide(color: c.linha),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Raios.botaoPequeno)),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: c.azul,
        minimumSize: const Size(alvoMinimo, alvoMinimo),
        textStyle: t.botaoPequeno,
      ),
    ),
    dividerTheme: DividerThemeData(color: c.linhaSuave, thickness: 1, space: 1),
    progressIndicatorTheme: ProgressIndicatorThemeData(color: c.azul),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: c.painel,
      contentTextStyle: t.apoio.copyWith(color: c.sobreCor),
      behavior: SnackBarBehavior.floating,
    ),
  );
}
