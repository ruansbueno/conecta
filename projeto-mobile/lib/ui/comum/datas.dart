import 'package:intl/intl.dart';

/// Datas da API (UTC) exibidas no fuso do aparelho, em português (D10, RM-37).
/// Exige `initializeDateFormatting('pt_BR')`, feito no `main`.

const _locale = 'pt_BR';

String _semPonto(String s) => s.replaceAll('.', '');

String _diaSemana(DateTime d) => _semPonto(DateFormat.E(_locale).format(d)).toLowerCase();

String _hora(DateTime d) => DateFormat.Hm(_locale).format(d);

String _diaMes(DateTime d) => '${d.day} ${_semPonto(DateFormat.MMM(_locale).format(d))}';

DateTime _dia(DateTime d) => DateTime(d.year, d.month, d.day);

int _diasAtras(DateTime local, DateTime agora) => _dia(agora).difference(_dia(local)).inDays;

/// Lista: "agora", "há 5 min", "há 2 h", "ontem", "seg, 09:12" (até 7 dias) e "12 set".
String dataRelativa(DateTime utc, {DateTime? agora}) {
  final ref = agora ?? DateTime.now();
  final local = utc.toLocal();
  final passado = ref.difference(local);
  final dias = _diasAtras(local, ref);

  if (passado.inMinutes < 1) return 'agora';
  if (dias == 0 && passado.inHours < 1) return 'há ${passado.inMinutes} min';
  if (dias == 0) return 'há ${passado.inHours} h';
  if (dias == 1) return 'ontem';
  if (dias < 7) return '${_diaSemana(local)}, ${_hora(local)}';
  return local.year == ref.year ? _diaMes(local) : '${_diaMes(local)} ${local.year}';
}

/// Detalhe, sempre com hora: "hoje, 09:05", "ontem, 14:05", "seg, 09:12", "12 set 2026, 08:00".
String dataHoraDetalhe(DateTime utc, {DateTime? agora}) {
  final ref = agora ?? DateTime.now();
  final local = utc.toLocal();
  final dias = _diasAtras(local, ref);

  if (dias <= 0) return 'hoje, ${_hora(local)}';
  if (dias == 1) return 'ontem, ${_hora(local)}';
  if (dias < 7) return '${_diaSemana(local)}, ${_hora(local)}';
  return '${_diaMes(local)} ${local.year}, ${_hora(local)}';
}

/// Faixa de cache: "25/10 às 14:30".
String dataHoraCurta(DateTime utc) {
  final local = utc.toLocal();
  return '${DateFormat('dd/MM', _locale).format(local)} às ${_hora(local)}';
}

/// Data sem hora, para solicitações: "10 out" no ano corrente, "3 dez 2025" em outro ano.
String dataDiaMes(DateTime utc, {DateTime? agora}) {
  final local = utc.toLocal();
  return local.year == (agora ?? DateTime.now()).year
      ? _diaMes(local)
      : '${_diaMes(local)} ${local.year}';
}
