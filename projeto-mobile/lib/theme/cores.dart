import 'package:flutter/painting.dart';

/// Tokens de cor de design/README.md (D11). Única origem de cor do app (Princípio V).
abstract final class Cores {
  static const navy = Color(0xFF132A4E);
  static const navySuave = Color(0xFF2A4374);
  static const azul = Color(0xFF2563EB);
  static const azulEscuro = Color(0xFF1D4ED8);
  static const azulSuperficie = Color(0xFFEFF4FF);
  static const tinta = Color(0xFF0F1C33);
  static const textoCorpo = Color(0xFF263A5B);
  static const apagado = Color(0xFF5B6B86);
  static const tenue = Color(0xFF8A99B0);
  static const linha = Color(0xFFE4E9F2);
  static const linhaSuave = Color(0xFFEFF2F7);
  static const fundoPagina = Color(0xFFF5F8FC);
  static const branco = Color(0xFFFFFFFF);

  static const alerta = Color(0xFFB45309);
  static const alertaFundo = Color(0xFFFDF4E6);
  static const sucesso = Color(0xFF15803D);
  static const sucessoFundo = Color(0xFFE9F6EE);
  static const perigo = Color(0xFFB91C1C);
  static const perigoFundo = Color(0xFFFCECEC);

  /// Anel de foco dos campos: azul a 12%.
  static const azulFoco = Color(0x1F2563EB);
}

/// Cores do chip de destino: o ponto e o fundo por tipo (data-model.md, "Destino").
abstract final class CoresDestino {
  static const todosPonto = Color(0xFF2F855A);
  static const todosFundo = Color(0xFFE8F3EC);
  static const turmaPonto = Cores.azul;
  static const turmaFundo = Cores.azulSuperficie;
  static const semestrePonto = Cores.navySuave;
  static const semestreFundo = Color(0xFFEDEFF8);
  static const docentesPonto = Color(0xFFC2770B);
  static const docentesFundo = Cores.alertaFundo;
  static const desconhecidoPonto = Cores.tenue;
  static const desconhecidoFundo = Cores.linhaSuave;
}
