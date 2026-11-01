import 'dart:ui' show Color;

import 'package:intl/intl.dart';

import '../../models/evento.dart';
import '../../models/mes.dart';
import '../../theme/cores.dart';

export '../../models/mes.dart';

/// Apresentação da agenda (plan-f2 D-AF2-3, D-AF2-4, D-AF2-10): textos de horário, títulos e
/// cores. O mês, a grade e os eventos por dia ficam em `models/mes.dart`, também usado pelo estado.

const _locale = 'pt_BR';

String _hora(DateTime d) => DateFormat.Hm(_locale).format(d.toLocal());

String _maiuscula(String s) => s.isEmpty ? s : '${s[0].toUpperCase()}${s.substring(1)}';

/// Um ponto por evento, com o tipo, até três.
List<TipoEvento> marcadoresDoDia(List<Evento> eventos, DateTime dia) =>
    eventosDoDia(eventos, dia).take(3).map((e) => e.tipo).toList();

/// Coluna de horário na lista do dia: o início no dia em que começa; "até HH:MM" no último dia de
/// um evento de vários dias; "o dia todo" nos dias do meio.
String rotuloNoDia(Evento e, DateTime dia) {
  if (mesmoDia(e.inicio.toLocal(), dia)) return _hora(e.inicio);
  final fim = e.fim!.toLocal();
  final terminaAMeiaNoite = fim.hour == 0 && fim.minute == 0;
  if (mesmoDia(ultimoInstante(e), dia) && !terminaAMeiaNoite) return 'até ${_hora(fim)}';
  return 'o dia todo';
}

/// Linha de horas do cartão (D-AF2-3).
String faixaDeHoras(Evento e) {
  final fim = e.fim;
  if (e.variosDias) {
    final dm = DateFormat('dd/MM', _locale);
    return 'de ${dm.format(e.inicio.toLocal())} a ${dm.format(ultimoInstante(e))}';
  }
  if (fim != null) return '${_hora(e.inicio)} – ${_hora(fim)}';
  // "Data importante" sem fim é um prazo.
  return e.tipo == TipoEvento.dataImportante ? 'até ${_hora(e.inicio)}' : _hora(e.inicio);
}

/// Na lista, a coluna da data aparece só no primeiro evento de cada dia (agrupamento, RM-24).
bool primeiroDoDia(List<Evento> eventos, int i) =>
    i == 0 || !mesmoDia(eventos[i - 1].inicio.toLocal(), eventos[i].inicio.toLocal());

/// "Sexta, 16 de outubro".
String tituloDoDia(DateTime d) =>
    _maiuscula(DateFormat("EEEE, d 'de' MMMM", _locale).format(d).replaceAll('-feira', ''));

String quantidadeDeAtividades(int n) => n == 1 ? '1 atividade' : '$n atividades';

/// Coluna de data do cartão: ("16", "out").
(String, String) diaEMes(DateTime d) {
  final local = d.toLocal();
  return (
    local.day.toString().padLeft(2, '0'),
    DateFormat.MMM(_locale).format(local).replaceAll('.', ''),
  );
}

Color corDoTipo(TipoEvento t) => switch (t) {
  TipoEvento.prova => CoresEvento.prova,
  TipoEvento.dataImportante => CoresEvento.dataImportante,
  _ => CoresEvento.demais,
};
