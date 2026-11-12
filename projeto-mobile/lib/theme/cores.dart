import 'package:flutter/material.dart';

/// Tokens de cor de design/README.md (D11), nos temas claro e escuro (spec 002). Única origem de
/// cor do app (Princípio V): as telas leem do tema ativo com `context.cores`, nunca uma constante.
/// A paleta escura é a mesma da web (projeto-web/src/estilos/globals.css).
@immutable
class CoresConecta extends ThemeExtension<CoresConecta> {
  const CoresConecta({
    required this.navy,
    required this.navySuave,
    required this.azul,
    required this.azulEscuro,
    required this.azulSuperficie,
    required this.tinta,
    required this.textoCorpo,
    required this.apagado,
    required this.tenue,
    required this.linha,
    required this.linhaSuave,
    required this.fundoPagina,
    required this.branco,
    required this.alerta,
    required this.alertaFundo,
    required this.sucesso,
    required this.sucessoFundo,
    required this.perigo,
    required this.perigoFundo,
    required this.azulFoco,
    required this.sobreCor,
    required this.painel,
    required this.acao,
    required this.acaoEscura,
    required this.destinoTodosPonto,
    required this.destinoTodosFundo,
    required this.destinoTurmaPonto,
    required this.destinoTurmaFundo,
    required this.destinoSemestrePonto,
    required this.destinoSemestreFundo,
    required this.destinoDocentesPonto,
    required this.destinoDocentesFundo,
    required this.destinoDesconhecidoPonto,
    required this.destinoDesconhecidoFundo,
    required this.eventoProva,
    required this.eventoDataImportante,
    required this.eventoDemais,
  });

  /// Títulos.
  final Color navy;

  /// Ícones e títulos da barra superior.
  final Color navySuave;

  /// Ação, link e ícone ativo.
  final Color azul;
  final Color azulEscuro;

  /// Fundo de selecionado e de destaque azul.
  final Color azulSuperficie;

  /// Texto forte e campos.
  final Color tinta;

  /// Texto corrido.
  final Color textoCorpo;

  /// Texto secundário.
  final Color apagado;

  /// Texto discreto. O design usa #8A99B0 (2,9:1 sobre branco), abaixo do AA para texto
  /// pequeno (SC-007): escurecida na mesma matiz para 5,1:1 sobre branco, como na plataforma web.
  final Color tenue;

  /// Bordas.
  final Color linha;

  /// Divisórias.
  final Color linhaSuave;

  /// Fundo atrás das superfícies.
  final Color fundoPagina;

  /// Superfície: telas, barras, cartões e campos (é "branco" só no tema claro).
  final Color branco;
  final Color alerta;
  final Color alertaFundo;
  final Color sucesso;
  final Color sucessoFundo;
  final Color perigo;
  final Color perigoFundo;

  /// Anel de foco dos campos: azul a 12% (28% no escuro).
  final Color azulFoco;

  /// Texto e ícone sobre cor cheia (botão principal, painel). Branco nos dois temas.
  final Color sobreCor;

  /// Fundo navy cheio: avatar, dia escolhido, aviso rápido (snackbar).
  final Color painel;

  /// Fundo do botão principal: o mesmo azul nos dois temas (decisão do autor, 11/11/2026).
  final Color acao;
  final Color acaoEscura;

  /// Chip de destino: o ponto e o fundo por tipo (data-model.md, "Destino").
  final Color destinoTodosPonto;
  final Color destinoTodosFundo;
  final Color destinoTurmaPonto;
  final Color destinoTurmaFundo;
  final Color destinoSemestrePonto;
  final Color destinoSemestreFundo;
  final Color destinoDocentesPonto;
  final Color destinoDocentesFundo;
  final Color destinoDesconhecidoPonto;
  final Color destinoDesconhecidoFundo;

  /// Cores por tipo de evento (plan-f2 D-AF2-10): prova em âmbar, data importante em navy,
  /// os demais em azul.
  final Color eventoProva;
  final Color eventoDataImportante;
  final Color eventoDemais;

  static const claro = CoresConecta(
    navy: Color(0xFF132A4E),
    navySuave: Color(0xFF2A4374),
    azul: Color(0xFF2563EB),
    azulEscuro: Color(0xFF1D4ED8),
    azulSuperficie: Color(0xFFEFF4FF),
    tinta: Color(0xFF0F1C33),
    textoCorpo: Color(0xFF263A5B),
    apagado: Color(0xFF5B6B86),
    tenue: Color(0xFF646F80),
    linha: Color(0xFFE4E9F2),
    linhaSuave: Color(0xFFEFF2F7),
    fundoPagina: Color(0xFFF5F8FC),
    branco: Color(0xFFFFFFFF),
    alerta: Color(0xFFB45309),
    alertaFundo: Color(0xFFFDF4E6),
    sucesso: Color(0xFF15803D),
    sucessoFundo: Color(0xFFE9F6EE),
    perigo: Color(0xFFB91C1C),
    perigoFundo: Color(0xFFFCECEC),
    azulFoco: Color(0x1F2563EB),
    sobreCor: Color(0xFFFFFFFF),
    painel: Color(0xFF132A4E),
    acao: Color(0xFF2563EB),
    acaoEscura: Color(0xFF1D4ED8),
    destinoTodosPonto: Color(0xFF2F855A),
    destinoTodosFundo: Color(0xFFE8F3EC),
    destinoTurmaPonto: Color(0xFF2563EB),
    destinoTurmaFundo: Color(0xFFEFF4FF),
    destinoSemestrePonto: Color(0xFF2A4374),
    destinoSemestreFundo: Color(0xFFEDEFF8),
    destinoDocentesPonto: Color(0xFFC2770B),
    destinoDocentesFundo: Color(0xFFFDF4E6),
    destinoDesconhecidoPonto: Color(0xFF646F80),
    destinoDesconhecidoFundo: Color(0xFFEFF2F7),
    eventoProva: Color(0xFFB45309),
    eventoDataImportante: Color(0xFF2A4374),
    eventoDemais: Color(0xFF2563EB),
  );

  static const escuro = CoresConecta(
    navy: Color(0xFFE3EAF6),
    navySuave: Color(0xFFB4C3DD),
    azul: Color(0xFF6B9BFF),
    azulEscuro: Color(0xFF93B6FF),
    azulSuperficie: Color(0xFF172A4D),
    tinta: Color(0xFFEEF2F8),
    textoCorpo: Color(0xFFC9D4E6),
    apagado: Color(0xFF9EACC4),
    tenue: Color(0xFF8C9AB1),
    linha: Color(0xFF26344F),
    linhaSuave: Color(0xFF1B2842),
    fundoPagina: Color(0xFF0B1424),
    branco: Color(0xFF121E34),
    alerta: Color(0xFFF5B149),
    alertaFundo: Color(0xFF2D2312),
    sucesso: Color(0xFF5CC98A),
    sucessoFundo: Color(0xFF122B1E),
    perigo: Color(0xFFF58A8A),
    perigoFundo: Color(0xFF2E1719),
    azulFoco: Color(0x476B9BFF),
    sobreCor: Color(0xFFFFFFFF),
    painel: Color(0xFF1C3560),
    acao: Color(0xFF2563EB),
    acaoEscura: Color(0xFF1D4ED8),
    destinoTodosPonto: Color(0xFF5CC98A),
    destinoTodosFundo: Color(0xFF122B1E),
    destinoTurmaPonto: Color(0xFF6B9BFF),
    destinoTurmaFundo: Color(0xFF172A4D),
    destinoSemestrePonto: Color(0xFFB4C3DD),
    destinoSemestreFundo: Color(0xFF1D2643),
    destinoDocentesPonto: Color(0xFFF5B149),
    destinoDocentesFundo: Color(0xFF2D2312),
    destinoDesconhecidoPonto: Color(0xFF8C9AB1),
    destinoDesconhecidoFundo: Color(0xFF1B2842),
    eventoProva: Color(0xFFF5B149),
    eventoDataImportante: Color(0xFFB4C3DD),
    eventoDemais: Color(0xFF6B9BFF),
  );

  @override
  CoresConecta copyWith() => this;

  @override
  CoresConecta lerp(CoresConecta? other, double t) {
    if (other == null) return this;
    Color l(Color a, Color b) => Color.lerp(a, b, t)!;
    return CoresConecta(
      navy: l(navy, other.navy),
      navySuave: l(navySuave, other.navySuave),
      azul: l(azul, other.azul),
      azulEscuro: l(azulEscuro, other.azulEscuro),
      azulSuperficie: l(azulSuperficie, other.azulSuperficie),
      tinta: l(tinta, other.tinta),
      textoCorpo: l(textoCorpo, other.textoCorpo),
      apagado: l(apagado, other.apagado),
      tenue: l(tenue, other.tenue),
      linha: l(linha, other.linha),
      linhaSuave: l(linhaSuave, other.linhaSuave),
      fundoPagina: l(fundoPagina, other.fundoPagina),
      branco: l(branco, other.branco),
      alerta: l(alerta, other.alerta),
      alertaFundo: l(alertaFundo, other.alertaFundo),
      sucesso: l(sucesso, other.sucesso),
      sucessoFundo: l(sucessoFundo, other.sucessoFundo),
      perigo: l(perigo, other.perigo),
      perigoFundo: l(perigoFundo, other.perigoFundo),
      azulFoco: l(azulFoco, other.azulFoco),
      sobreCor: l(sobreCor, other.sobreCor),
      painel: l(painel, other.painel),
      acao: l(acao, other.acao),
      acaoEscura: l(acaoEscura, other.acaoEscura),
      destinoTodosPonto: l(destinoTodosPonto, other.destinoTodosPonto),
      destinoTodosFundo: l(destinoTodosFundo, other.destinoTodosFundo),
      destinoTurmaPonto: l(destinoTurmaPonto, other.destinoTurmaPonto),
      destinoTurmaFundo: l(destinoTurmaFundo, other.destinoTurmaFundo),
      destinoSemestrePonto: l(destinoSemestrePonto, other.destinoSemestrePonto),
      destinoSemestreFundo: l(destinoSemestreFundo, other.destinoSemestreFundo),
      destinoDocentesPonto: l(destinoDocentesPonto, other.destinoDocentesPonto),
      destinoDocentesFundo: l(destinoDocentesFundo, other.destinoDocentesFundo),
      destinoDesconhecidoPonto: l(destinoDesconhecidoPonto, other.destinoDesconhecidoPonto),
      destinoDesconhecidoFundo: l(destinoDesconhecidoFundo, other.destinoDesconhecidoFundo),
      eventoProva: l(eventoProva, other.eventoProva),
      eventoDataImportante: l(eventoDataImportante, other.eventoDataImportante),
      eventoDemais: l(eventoDemais, other.eventoDemais),
    );
  }
}

extension CoresDoTema on BuildContext {
  /// Cores do tema ativo (claro ou escuro).
  CoresConecta get cores => Theme.of(this).extension<CoresConecta>()!;
}
