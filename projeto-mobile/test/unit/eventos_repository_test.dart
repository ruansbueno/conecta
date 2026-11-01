import 'dart:convert';

import 'package:conecta/models/evento.dart';
import 'package:conecta/repositories/eventos_repository.dart';
import 'package:conecta/services/api_failure.dart';
import 'package:conecta/services/cache_local.dart';
import 'package:flutter_test/flutter_test.dart';

import '../apoio.dart';
import '../fixtures/fabrica.dart';

void main() {
  late ApiFalsa api;
  late CacheLocal cache;
  late EventosRepository repo;

  final semana = eventoMapa('e1', titulo: 'Semana acadêmica', inicio: DateTime.utc(2026, 10, 30));
  final prova = eventoMapa(
    'e2',
    titulo: 'Prova de BD',
    tipo: 'prova',
    inicio: DateTime.utc(2026, 11, 10),
  );

  setUp(() async {
    api = ApiFalsa();
    (cache, _) = await armazenamentosVazios();
    api.api.token = 'tok';
    repo = EventosRepository(api.api, cache);
  });

  group('próximos (plan-f2 D-AF2-2)', () {
    test('sem janela: limit 20 e offset; a ordem é a da API', () async {
      api.responder('GET /eventos', paginaJson([semana, prova]));

      final pagina = await repo.proximos(usuarioId: 'u1');

      expect(api.pedidos.single.url.queryParameters, {'limit': '20', 'offset': '0'});
      expect(pagina.items.map((e) => e.titulo), ['Semana acadêmica', 'Prova de BD']);
    });

    test('com tipo: tipo= no valor da API', () async {
      api.responder('GET /eventos', paginaJson([]));

      await repo.proximos(usuarioId: 'u1', tipo: TipoEvento.dataImportante, offset: 20);

      expect(api.pedidos.single.url.queryParameters, {
        'limit': '20',
        'offset': '20',
        'tipo': 'data_importante',
      });
    });

    test('só a primeira página sem filtro vai para o cache (D-AF2-8)', () async {
      api.responder('GET /eventos', paginaJson([prova], total: 30, offset: 20));
      await repo.proximos(usuarioId: 'u1', offset: 20);
      api.responder('GET /eventos', paginaJson([prova]));
      await repo.proximos(usuarioId: 'u1', tipo: TipoEvento.prova);
      expect(repo.proximosEmCache('u1'), isNull);

      api.responder('GET /eventos', paginaJson([semana, prova]));
      await repo.proximos(usuarioId: 'u1');

      final (pagina, coletadoEm) = repo.proximosEmCache('u1')!;
      expect(pagina.items, hasLength(2));
      expect(DateTime.now().toUtc().difference(coletadoEm), lessThan(const Duration(minutes: 1)));
    });

    test('falha de rede não grava cache', () async {
      api.falharRede('GET /eventos');
      await expectLater(
        repo.proximos(usuarioId: 'u1'),
        throwsA(isA<ApiFailure>().having((f) => f.code, 'code', ApiFailure.semRede)),
      );
      expect(repo.proximosEmCache('u1'), isNull);
    });
  });

  group('mês (D-AF2-4)', () {
    final de = DateTime(2026, 9, 27);
    final ate = DateTime(2026, 11, 8);

    test('janela em UTC, com os encerrados e limit 100', () async {
      api.responder('GET /eventos', paginaJson([semana]));

      await repo.doMes(usuarioId: 'u1', chave: '2026-10', de: de, ate: ate, guardar: false);

      expect(api.pedidos.single.url.queryParameters, {
        'de': de.toUtc().toIso8601String(),
        'ate': ate.toUtc().toIso8601String(),
        'incluir_encerrados': 'true',
        'limit': '100',
        'offset': '0',
      });
    });

    test('tipo filtrado também vai na janela', () async {
      api.responder('GET /eventos', paginaJson([]));
      await repo.doMes(
        usuarioId: 'u1',
        chave: '2026-10',
        de: de,
        ate: ate,
        tipo: TipoEvento.prova,
        guardar: true,
      );
      expect(api.pedidos.single.url.queryParameters['tipo'], 'prova');
      // Com filtro não guarda, mesmo sendo o mês corrente.
      expect(repo.mesEmCache('u1', '2026-10'), isNull);
    });

    test('guarda o mês corrente e só o devolve para o mesmo mês', () async {
      api.responder('GET /eventos', paginaJson([semana]));
      await repo.doMes(usuarioId: 'u1', chave: '2026-10', de: de, ate: ate, guardar: true);

      expect(repo.mesEmCache('u1', '2026-10')!.$1.items.single.id, 'e1');
      expect(repo.mesEmCache('u1', '2026-11'), isNull);
    });
  });

  test('obter: GET /eventos/{id}', () async {
    api.responder('GET /eventos/e2', jsonEncode(prova));

    final e = await repo.obter('e2');

    expect(e.tipo, TipoEvento.prova);
    expect(api.pedidos.single.url.path, '/eventos/e2');
  });
}
