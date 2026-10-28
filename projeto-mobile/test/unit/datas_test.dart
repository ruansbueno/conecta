import 'package:conecta/ui/comum/datas.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';

void main() {
  setUpAll(() => initializeDateFormatting('pt_BR'));

  // Datas montadas no fuso local e convertidas para UTC, como chegam da API.
  final agora = DateTime(2026, 10, 25, 15, 0); // domingo
  DateTime antes(Duration d) => agora.subtract(d).toUtc();

  group('dataRelativa (lista)', () {
    test('menos de um minuto', () {
      expect(dataRelativa(antes(const Duration(seconds: 20)), agora: agora), 'agora');
    });

    test('minutos e horas no mesmo dia', () {
      expect(dataRelativa(antes(const Duration(minutes: 5)), agora: agora), 'há 5 min');
      expect(dataRelativa(antes(const Duration(hours: 2)), agora: agora), 'há 2 h');
    });

    test('dia anterior é "ontem"', () {
      expect(dataRelativa(DateTime(2026, 10, 24, 23, 50).toUtc(), agora: agora), 'ontem');
    });

    test('até 7 dias: dia da semana e hora', () {
      expect(dataRelativa(DateTime(2026, 10, 19, 9, 12).toUtc(), agora: agora), 'seg, 09:12');
    });

    test('depois de 7 dias: data curta; outro ano leva o ano', () {
      expect(dataRelativa(DateTime(2026, 9, 12, 10).toUtc(), agora: agora), '12 set');
      expect(dataRelativa(DateTime(2025, 12, 3, 10).toUtc(), agora: agora), '3 dez 2025');
    });

    test('data no futuro (relógio do aparelho atrasado) não quebra', () {
      expect(dataRelativa(agora.add(const Duration(minutes: 3)).toUtc(), agora: agora), 'agora');
    });
  });

  group('dataHoraDetalhe', () {
    test('sempre com hora', () {
      expect(dataHoraDetalhe(DateTime(2026, 10, 25, 9, 5).toUtc(), agora: agora), 'hoje, 09:05');
      expect(dataHoraDetalhe(DateTime(2026, 10, 24, 14, 5).toUtc(), agora: agora), 'ontem, 14:05');
      expect(dataHoraDetalhe(DateTime(2026, 10, 19, 9, 12).toUtc(), agora: agora), 'seg, 09:12');
      expect(
        dataHoraDetalhe(DateTime(2026, 9, 12, 8, 0).toUtc(), agora: agora),
        '12 set 2026, 08:00',
      );
    });
  });

  test('converte do UTC da API para o fuso do aparelho', () {
    final utc = DateTime.utc(2026, 10, 25, 12, 0);
    final local = utc.toLocal();
    final esperado =
        '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';

    expect(dataHoraDetalhe(utc, agora: local.add(const Duration(hours: 1))), 'hoje, $esperado');
  });

  group('dataDiaMes', () {
    final agora = DateTime(2026, 10, 28, 12);

    test('no ano corrente, só dia e mês', () {
      expect(dataDiaMes(DateTime(2026, 10, 10, 10).toUtc(), agora: agora), '10 out');
      expect(dataDiaMes(DateTime(2026, 8, 30, 15).toUtc(), agora: agora), '30 ago');
    });

    test('em outro ano, com o ano', () {
      expect(dataDiaMes(DateTime(2025, 12, 3, 9).toUtc(), agora: agora), '3 dez 2025');
    });
  });
}
