import 'package:conecta/main.dart';
import 'package:conecta/models/evento.dart';
import 'package:conecta/ui/agenda/calendario.dart';
import 'package:flutter_test/flutter_test.dart';

import '../fixtures/fabrica.dart';

// Datas locais: o app mostra e monta janelas no fuso do aparelho (plan-f2 D-AF2-9).
Evento ev(String id, DateTime inicio, {DateTime? fim, String tipo = 'palestra'}) =>
    Evento.fromJson(eventoMapa(id, inicio: inicio, fim: fim, tipo: tipo));

void main() {
  setUpAll(iniciarFormatos);

  group('mês e grade (D-AF2-4)', () {
    test('chave, nome, anterior e próximo, com virada de ano', () {
      const out = Mes(2026, 10);
      expect(out.chave, '2026-10');
      expect(out.nome, 'Outubro de 2026');
      expect(const Mes(2026, 12).proximo, const Mes(2027, 1));
      expect(const Mes(2026, 1).anterior, const Mes(2025, 12));
      expect(Mes.de(DateTime(2026, 10, 16, 9)), out);
    });

    test('grade de semanas inteiras começando no domingo', () {
      final dias = diasDaGrade(const Mes(2026, 10));
      // 1º de outubro de 2026 é quinta: a grade começa no domingo 27 de setembro.
      expect(dias.first, DateTime(2026, 9, 27));
      expect(dias.first.weekday, DateTime.sunday);
      expect(dias.last, DateTime(2026, 10, 31));
      expect(dias.length % 7, 0);
      expect(diasDaGrade(const Mes(2026, 11)).last, DateTime(2026, 12, 5));
    });

    // Passos de calendário, não de 24 h: num fuso com horário de verão (rode com
    // TZ=Europe/Berlin), somar dias atravessaria a mudança de hora e deslocaria a grade.
    test('toda grade, de 2026 a 2030: dias à meia-noite local, semanas de domingo a sábado', () {
      for (var ano = 2026; ano <= 2030; ano++) {
        for (var mes = 1; mes <= 12; mes++) {
          final dias = diasDaGrade(Mes(ano, mes));
          expect(dias.length % 7, 0, reason: '$ano-$mes');
          expect(dias.first.weekday, DateTime.sunday, reason: '$ano-$mes');
          expect(dias.every((d) => d.hour == 0 && d.minute == 0), isTrue, reason: '$ano-$mes');
          expect(dias.contains(DateTime(ano, mes)), isTrue);
        }
      }
    });

    test('janela da grade: do primeiro dia ao dia seguinte ao último, meia-noite local', () {
      final janela = janelaDaGrade(const Mes(2026, 11));
      expect(janela.de, DateTime(2026, 11, 1));
      expect(janela.ate, DateTime(2026, 12, 6));
    });
  });

  group('eventos por dia', () {
    final semana = ev('s', DateTime(2026, 10, 30, 8), fim: DateTime(2026, 11, 2, 18));
    final prova = ev(
      'p',
      DateTime(2026, 11, 2, 19, 10),
      fim: DateTime(2026, 11, 2, 20, 50),
      tipo: 'prova',
    );
    final prazo = ev('d', DateTime(2026, 11, 2, 23, 59), tipo: 'data_importante');
    final meiaNoite = ev('m', DateTime(2026, 11, 3, 22), fim: DateTime(2026, 11, 4));

    test('evento de vários dias toca cada dia; termina à meia-noite não toca o dia seguinte', () {
      for (final d in [30, 31]) {
        expect(eventosDoDia([semana], DateTime(2026, 10, d)), [semana]);
      }
      expect(eventosDoDia([semana], DateTime(2026, 11, 1)), [semana]);
      expect(eventosDoDia([semana], DateTime(2026, 11, 3)), isEmpty);
      expect(eventosDoDia([meiaNoite], DateTime(2026, 11, 3)), [meiaNoite]);
      expect(eventosDoDia([meiaNoite], DateTime(2026, 11, 4)), isEmpty);
    });

    test('lista do dia em ordem de início; sem fim, só o próprio dia', () {
      expect(eventosDoDia([prazo, prova, semana], DateTime(2026, 11, 2)), [semana, prova, prazo]);
      expect(eventosDoDia([prazo], DateTime(2026, 11, 3)), isEmpty);
    });

    test('marcadores: um por evento, com o tipo, até três', () {
      final quatro = [semana, prova, prazo, ev('x', DateTime(2026, 11, 2, 10))];
      expect(marcadoresDoDia(quatro, DateTime(2026, 11, 2)), [
        TipoEvento.palestra,
        TipoEvento.palestra,
        TipoEvento.prova,
      ]);
      expect(marcadoresDoDia([prova], DateTime(2026, 11, 2)), [TipoEvento.prova]);
    });

    test('rótulo de horário no dia: início, "o dia todo" e "até HH:MM"', () {
      expect(rotuloNoDia(semana, DateTime(2026, 10, 30)), '08:00');
      expect(rotuloNoDia(semana, DateTime(2026, 10, 31)), 'o dia todo');
      expect(rotuloNoDia(semana, DateTime(2026, 11, 2)), 'até 18:00');
      expect(rotuloNoDia(prova, DateTime(2026, 11, 2)), '19:10');
      // Terminar à meia-noite: o último dia é o anterior, e nele o evento dura o dia todo.
      final ateMeiaNoite = ev('z', DateTime(2026, 9, 2, 19), fim: DateTime(2026, 9, 5));
      expect(rotuloNoDia(ateMeiaNoite, DateTime(2026, 9, 4)), 'o dia todo');
    });
  });

  group('cartão (D-AF2-3)', () {
    test('faixa de horas', () {
      expect(
        faixaDeHoras(ev('a', DateTime(2026, 10, 16, 19, 10), fim: DateTime(2026, 10, 16, 20, 50))),
        '19:10 – 20:50',
      );
      expect(
        faixaDeHoras(ev('b', DateTime(2026, 10, 31, 23, 59), tipo: 'data_importante')),
        'até 23:59',
      );
      expect(faixaDeHoras(ev('c', DateTime(2026, 10, 31, 19))), '19:00');
      expect(
        faixaDeHoras(ev('d', DateTime(2026, 9, 2, 19), fim: DateTime(2026, 9, 4, 18))),
        'de 02/09 a 04/09',
      );
    });

    test('agrupamento por data: a coluna da data só no primeiro evento de cada dia', () {
      final lista = [
        ev('1', DateTime(2026, 10, 16, 8)),
        ev('2', DateTime(2026, 10, 16, 19)),
        ev('3', DateTime(2026, 10, 21, 19)),
      ];
      expect([for (var i = 0; i < lista.length; i++) primeiroDoDia(lista, i)], [true, false, true]);
    });

    test('títulos: dia por extenso e quantidade', () {
      expect(tituloDoDia(DateTime(2026, 10, 16)), 'Sexta, 16 de outubro');
      expect(quantidadeDeAtividades(1), '1 atividade');
      expect(quantidadeDeAtividades(2), '2 atividades');
      expect(diaEMes(DateTime(2026, 10, 16)), ('16', 'out'));
    });
  });
}
