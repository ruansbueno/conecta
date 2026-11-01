import 'package:flutter/widgets.dart';

/// Largura de uma coluna de texto que cresce na mesma proporção que a fonte dela (RM-36). Com a
/// escala não linear do Android 14+, `scale(largura)` cresceria menos que o texto: a proporção é
/// a do tamanho da fonte da coluna.
double larguraEscalada(BuildContext context, double largura, double tamanhoDaFonte) =>
    largura * MediaQuery.textScalerOf(context).scale(tamanhoDaFonte) / tamanhoDaFonte;
