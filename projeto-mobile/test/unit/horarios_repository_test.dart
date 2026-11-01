import 'package:conecta/repositories/horarios_repository.dart';
import 'package:conecta/services/api_failure.dart';
import 'package:conecta/services/cache_local.dart';
import 'package:flutter_test/flutter_test.dart';

import '../apoio.dart';
import '../fixtures/fabrica.dart';
import '../fixtures/fixtures.dart';

void main() {
  late ApiFalsa api;
  late CacheLocal cache;
  late HorariosRepository repo;

  setUp(() async {
    api = ApiFalsa();
    (cache, _) = await armazenamentosVazios();
    api.api.token = 'tok';
    repo = HorariosRepository(api.api, cache);
  });

  test('grade da turma numa chamada, com limit 100', () async {
    api.responder(
      'GET /turmas/t1/horarios',
      paginaJson([aulaMapa('h1'), aulaMapa('h2', diaSemana: 3)]),
    );

    final aulas = await repo.grade(usuarioId: 'u1', turmaId: 't1');

    expect(api.pedidos.single.url.queryParameters, {'limit': '100', 'offset': '0'});
    expect(aulas.map((a) => a.id), ['h1', 'h2']);
  });

  test('cache por turma: cada turma tem a sua grade guardada (D-AF2-8)', () async {
    api.responder('GET /turmas/t1/horarios', paginaJson([aulaMapa('h1')]));
    api.responder('GET /turmas/t2/horarios', paginaJson([aulaMapa('h9', turmaId: 't2')]));
    await repo.grade(usuarioId: 'u1', turmaId: 't1');
    await repo.grade(usuarioId: 'u1', turmaId: 't2');

    expect(repo.gradeEmCache('u1', 't1')!.$1.single.id, 'h1');
    expect(repo.gradeEmCache('u1', 't2')!.$1.single.id, 'h9');
    expect(repo.gradeEmCache('u2', 't1'), isNull);
  });

  test('logout apaga também as grades guardadas', () async {
    api.responder('GET /turmas/t1/horarios', paginaJson([aulaMapa('h1')]));
    await repo.grade(usuarioId: 'u1', turmaId: 't1');

    await cache.apagarUsuario('u1');

    expect(repo.gradeEmCache('u1', 't1'), isNull);
  });

  test('403 SEM_PERMISSAO chega como ApiFailure e não grava cache', () async {
    api.responder('GET /turmas/t1/horarios', erroSemPermissaoJson, 403);

    await expectLater(
      repo.grade(usuarioId: 'u1', turmaId: 't1'),
      throwsA(isA<ApiFailure>().having((f) => f.code, 'code', 'SEM_PERMISSAO')),
    );
    expect(repo.gradeEmCache('u1', 't1'), isNull);
  });

  test('turma escolhida em Horários fica lembrada por usuário e sai no logout', () async {
    expect(repo.turmaLembrada('u1'), isNull);

    await repo.lembrarTurma('u1', 't2');

    expect(repo.turmaLembrada('u1'), 't2');
    expect(repo.turmaLembrada('u2'), isNull);
    await repo.esquecerTurma('u1');
    expect(repo.turmaLembrada('u1'), isNull);
    await repo.lembrarTurma('u1', 't3');
    await cache.apagarUsuario('u1');
    expect(repo.turmaLembrada('u1'), isNull);
  });
}
