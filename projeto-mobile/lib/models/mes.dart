import 'package:intl/intl.dart';

import 'evento.dart';

/// Mês da agenda, grade de semanas e eventos por dia (plan-f2 D-AF2-4, D-AF2-9). Tudo no fuso do
/// aparelho; a janela vai à API em UTC pelo repositório.

DateTime _dia(DateTime d) => DateTime(d.year, d.month, d.day);

bool mesmoDia(DateTime a, DateTime b) => a.year == b.year && a.month == b.month && a.day == b.day;

/// Último instante do evento ainda dentro dele: terminar à meia-noite é terminar no dia anterior.
DateTime ultimoInstante(Evento e) =>
    (e.fim ?? e.inicio).toLocal().subtract(Duration(microseconds: e.fim == null ? 0 : 1));

class Mes {
  const Mes(this.ano, this.mes);

  factory Mes.de(DateTime d) => Mes(d.year, d.month);

  final int ano;
  final int mes;

  /// "2026-10": identifica o mês no cache.
  String get chave => '$ano-${mes.toString().padLeft(2, '0')}';

  /// "Outubro de 2026".
  String get nome {
    final s = DateFormat("MMMM 'de' y", 'pt_BR').format(DateTime(ano, mes));
    return '${s[0].toUpperCase()}${s.substring(1)}';
  }

  Mes get anterior => Mes.de(DateTime(ano, mes - 1));
  Mes get proximo => Mes.de(DateTime(ano, mes + 1));

  bool contem(DateTime d) => d.year == ano && d.month == mes;

  @override
  bool operator ==(Object other) => other is Mes && other.ano == ano && other.mes == mes;

  @override
  int get hashCode => Object.hash(ano, mes);

  @override
  String toString() => chave;
}

/// Semanas inteiras, de domingo a sábado, cobrindo o mês (design m-10b).
List<DateTime> diasDaGrade(Mes m) {
  // Aritmética de calendário (dia 1 - n), nunca `Duration(days:)`: num fuso com horário de
  // verão, 24 h a menos atravessariam a mudança de hora e deslocariam a grade inteira.
  final primeiro = DateTime(m.ano, m.mes);
  final ultimo = DateTime(m.ano, m.mes + 1, 0);
  final inicio = DateTime(m.ano, m.mes, 1 - primeiro.weekday % 7);
  final fim = DateTime(m.ano, m.mes + 1, 6 - ultimo.weekday % 7);
  return [for (var d = inicio; !d.isAfter(fim); d = DateTime(d.year, d.month, d.day + 1)) d];
}

/// `[de, ate)` da grade inteira: os dias de outros meses também mostram seus eventos.
({DateTime de, DateTime ate}) janelaDaGrade(Mes m) {
  final dias = diasDaGrade(m);
  final ultimo = dias.last;
  return (de: dias.first, ate: DateTime(ultimo.year, ultimo.month, ultimo.day + 1));
}

/// O evento toca o dia: começa antes de o dia acabar e termina depois de ele começar. Sem fim,
/// só o dia em que começa.
bool tocaODia(Evento e, DateTime dia) {
  final inicioDoDia = _dia(dia);
  final fimDoDia = DateTime(dia.year, dia.month, dia.day + 1);
  final inicio = e.inicio.toLocal();
  final fim = e.fim?.toLocal();
  if (fim == null) return !inicio.isBefore(inicioDoDia) && inicio.isBefore(fimDoDia);
  return inicio.isBefore(fimDoDia) && fim.isAfter(inicioDoDia);
}

List<Evento> eventosDoDia(List<Evento> eventos, DateTime dia) =>
    eventos.where((e) => tocaODia(e, dia)).toList()..sort((a, b) => a.inicio.compareTo(b.inicio));
