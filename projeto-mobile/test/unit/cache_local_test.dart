import 'package:conecta/services/cache_local.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  late CacheLocal cache;
  late SharedPreferences prefs;

  setUp(() async {
    SharedPreferences.setMockInitialValues({'preferencia.qualquer': 'fica'});
    prefs = await SharedPreferences.getInstance();
    cache = CacheLocal(prefs);
  });

  test('grava e lê o JSON com a data de coleta', () async {
    final coleta = DateTime.utc(2026, 10, 25, 14, 30);

    await cache.gravar('u1', RecursoCache.avisosAtivosP1, {'total': 3}, agora: coleta);
    final guardado = cache.ler('u1', RecursoCache.avisosAtivosP1)!;

    expect(guardado.dados, {'total': 3});
    expect(guardado.coletadoEm, coleta);
    expect(prefs.getKeys(), contains('cache:u1:avisos_ativos_p1'));
  });

  test('idade do dado a partir da coleta', () async {
    await cache.gravar('u1', RecursoCache.perfil, {}, agora: DateTime.utc(2026, 10, 25, 12));

    final idade = cache
        .ler('u1', RecursoCache.perfil)!
        .idade(agora: DateTime.utc(2026, 10, 25, 14));

    expect(idade, const Duration(hours: 2));
  });

  test('nada guardado devolve null', () {
    expect(cache.ler('u1', RecursoCache.perfil), isNull);
  });

  test('conteúdo de um usuário nunca aparece para outro (RM-31)', () async {
    await cache.gravar('u1', RecursoCache.perfil, {'nome': 'Um'});

    expect(cache.ler('u2', RecursoCache.perfil), isNull);
  });

  test('apagar o usuário remove só as chaves dele (RM-30)', () async {
    await cache.gravar('u1', RecursoCache.perfil, {'nome': 'Um'});
    await cache.gravar('u1', RecursoCache.avisosAtivosP1, {'total': 0});
    await cache.gravar('u2', RecursoCache.perfil, {'nome': 'Dois'});

    await cache.apagarUsuario('u1');

    expect(cache.ler('u1', RecursoCache.perfil), isNull);
    expect(cache.ler('u1', RecursoCache.avisosAtivosP1), isNull);
    expect(cache.ler('u2', RecursoCache.perfil), isNotNull);
    expect(prefs.getString('preferencia.qualquer'), 'fica');
  });

  test('entrada corrompida é tratada como ausente', () async {
    await prefs.setString('cache:u1:perfil', 'não é json');

    expect(cache.ler('u1', RecursoCache.perfil), isNull);
  });
}
