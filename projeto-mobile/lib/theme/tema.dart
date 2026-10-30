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

ThemeData temaConecta() {
  const esquema = ColorScheme.light(
    primary: Cores.azul,
    onPrimary: Cores.branco,
    secondary: Cores.navy,
    onSecondary: Cores.branco,
    surface: Cores.branco,
    onSurface: Cores.tinta,
    error: Cores.perigo,
    onError: Cores.branco,
    outline: Cores.linha,
    outlineVariant: Cores.linhaSuave,
  );

  OutlineInputBorder borda(Color cor, [double largura = 1]) => OutlineInputBorder(
    borderRadius: BorderRadius.circular(Raios.campo),
    borderSide: BorderSide(color: cor, width: largura),
  );

  final base = ThemeData(
    useMaterial3: true,
    colorScheme: esquema,
    fontFamily: Tipografia.familia,
    scaffoldBackgroundColor: Cores.branco,
    materialTapTargetSize: MaterialTapTargetSize.padded,
    splashFactory: InkSparkle.splashFactory,
  );

  return base.copyWith(
    textTheme: base.textTheme.apply(
      fontFamily: Tipografia.familia,
      bodyColor: Cores.tinta,
      displayColor: Cores.navy,
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: Cores.branco,
      surfaceTintColor: Colors.transparent,
      foregroundColor: Cores.navySuave,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: Tipografia.titulo,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Cores.branco,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      hintStyle: Tipografia.campo.copyWith(color: Cores.tenue),
      prefixIconColor: WidgetStateColor.resolveWith(
        (s) => s.contains(WidgetState.focused) ? Cores.azul : Cores.tenue,
      ),
      border: borda(Cores.linha),
      enabledBorder: borda(Cores.linha),
      focusedBorder: borda(Cores.azul),
      errorBorder: borda(Cores.perigo),
      focusedErrorBorder: borda(Cores.perigo),
      errorStyle: Tipografia.meta.copyWith(color: Cores.perigo),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: Cores.azul,
        foregroundColor: Cores.branco,
        disabledBackgroundColor: Cores.azul.withValues(alpha: 0.6),
        disabledForegroundColor: Cores.branco,
        minimumSize: const Size(alvoMinimo, alvoMinimo),
        textStyle: Tipografia.botao,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Raios.campo)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        backgroundColor: Cores.branco,
        foregroundColor: Cores.navy,
        minimumSize: const Size(alvoMinimo, alvoMinimo),
        padding: const EdgeInsets.symmetric(horizontal: 16),
        textStyle: Tipografia.botaoPequeno,
        side: const BorderSide(color: Cores.linha),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Raios.botaoPequeno)),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: Cores.azul,
        minimumSize: const Size(alvoMinimo, alvoMinimo),
        textStyle: Tipografia.botaoPequeno,
      ),
    ),
    dividerTheme: const DividerThemeData(color: Cores.linhaSuave, thickness: 1, space: 1),
    progressIndicatorTheme: const ProgressIndicatorThemeData(color: Cores.azul),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: Cores.navy,
      contentTextStyle: Tipografia.apoio.copyWith(color: Cores.branco),
      behavior: SnackBarBehavior.floating,
    ),
  );
}
