import 'package:conecta/models/destino.dart';
import 'package:conecta/models/evento.dart';
import 'package:flutter_test/flutter_test.dart';

import '../fixtures/fabrica.dart';

void main() {
  group('Evento.fromJson (contracts E3 §1)', () {
    test('converte todos os campos, com as datas em UTC', () {
      final e = Evento.fromJson(
        eventoMapa(
          'e1',
          titulo: 'Defesas de TCC II',
          tipo: 'banca',
          inicio: DateTime.utc(2026, 10, 24, 17),
          fim: DateTime.utc(2026, 10, 24, 21),
          local: 'Sala 203',
          descricao: 'Cinco defesas.',
          editadoEm: '2026-10-20T12:00:00Z',
          destinos: [
            {'tipo': 'semestre', 'turma': null, 'semestre': 6},
          ],
        ),
      );
      expect(e.id, 'e1');
      expect(e.titulo, 'Defesas de TCC II');
      expect(e.tipo, TipoEvento.banca);
      expect(e.inicio, DateTime.utc(2026, 10, 24, 17));
      expect(e.inicio.isUtc, isTrue);
      expect(e.fim, DateTime.utc(2026, 10, 24, 21));
      expect(e.local, 'Sala 203');
      expect(e.descricao, 'Cinco defesas.');
      expect(e.autorNome, 'Marina Duarte');
      expect(e.editadoEm, DateTime.utc(2026, 10, 20, 12));
      expect(e.destinos.single.tipo, TipoDestino.semestre);
    });

    test('fim, local, descrição e edição podem vir nulos', () {
      final e = Evento.fromJson(
        eventoMapa('e2', inicio: DateTime.utc(2026, 10, 31, 23), local: null),
      );
      expect(e.fim, isNull);
      expect(e.local, isNull);
      expect(e.descricao, isNull);
      expect(e.editadoEm, isNull);
    });

    test('data_importante e tipo desconhecido', () {
      expect(
        Evento.fromJson(eventoMapa('e3', tipo: 'data_importante', inicio: DateTime.utc(2026))).tipo,
        TipoEvento.dataImportante,
      );
      final novo = Evento.fromJson(eventoMapa('e4', tipo: 'hackathon', inicio: DateTime.utc(2026)));
      expect(novo.tipo, TipoEvento.desconhecido);
      expect(novo.rotuloTipo, 'hackathon');
    });

    test('rótulo de cada tipo', () {
      expect(
        {for (final t in TipoEvento.values) t: t.rotulo},
        {
          TipoEvento.palestra: 'Palestra',
          TipoEvento.banca: 'Banca',
          TipoEvento.reuniao: 'Reunião',
          TipoEvento.formatura: 'Formatura',
          TipoEvento.prova: 'Prova',
          TipoEvento.dataImportante: 'Data importante',
          TipoEvento.outro: 'Outro',
          TipoEvento.desconhecido: 'Evento',
        },
      );
      expect(TipoEvento.dataImportante.valorApi, 'data_importante');
      expect(TipoEvento.prova.valorApi, 'prova');
    });

    test('vários dias quando o fim cai em outro dia local', () {
      final um = Evento.fromJson(
        eventoMapa('a', inicio: DateTime(2026, 9, 2, 19), fim: DateTime(2026, 9, 2, 21)),
      );
      final varios = Evento.fromJson(
        eventoMapa('b', inicio: DateTime(2026, 9, 2, 19), fim: DateTime(2026, 9, 4, 18)),
      );
      expect(um.variosDias, isFalse);
      expect(varios.variosDias, isTrue);
    });
  });
}
