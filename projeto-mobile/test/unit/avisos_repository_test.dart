import 'package:conecta/models/aviso.dart';
import 'package:conecta/repositories/avisos_repository.dart';
import 'package:conecta/services/api_failure.dart';
import 'package:conecta/services/cache_local.dart';
import 'package:flutter_test/flutter_test.dart';

import '../apoio.dart';
import '../fixtures/fabrica.dart';
import '../fixtures/fixtures.dart';

void main() {
  late ApiFalsa api;
  late CacheLocal cache;
  late AvisosRepository repo;

  setUp(() async {
    api = ApiFalsa();
    (cache, _) = await armazenamentosVazios();
    api.api.token = 'tok';
    repo = AvisosRepository(api.api, cache);
  });

  test('lista ativos com limit 20 e offset, na ordem da API', () async {
    api.responder('GET /avisos', avisosP1Json);

    final pagina = await repo.listar(usuarioId: 'u1');

    expect(api.pedidos.single.url.queryParameters, {
      'situacao': 'ativo',
      'limit': '20',
      'offset': '0',
    });
    expect(pagina.items.map((a) => a.titulo), [
      'Reunião de pais e alunos',
      'Entrega do trabalho de Redes adiada para 30/10',
    ]);
  });

  test('só a primeira página de ativos vai para o cache', () async {
    api.responder('GET /avisos', paginaAvisosJson(total: 45, offset: 20));
    await repo.listar(usuarioId: 'u1', offset: 20);
    api.responder('GET /avisos', paginaAvisosJson(total: 2, situacao: 'arquivado'));
    await repo.listar(usuarioId: 'u1', situacao: SituacaoAviso.arquivado);
    expect(repo.avisosEmCache('u1'), isNull);

    api.responder('GET /avisos', avisosP1Json);
    await repo.listar(usuarioId: 'u1');

    final (pagina, coletadoEm) = repo.avisosEmCache('u1')!;
    expect(pagina.items, hasLength(2));
    expect(DateTime.now().toUtc().difference(coletadoEm), lessThan(const Duration(minutes: 1)));
  });

  test('arquivados pedem situacao=arquivado', () async {
    api.responder('GET /avisos', avisosVazioJson);

    await repo.listar(usuarioId: 'u1', situacao: SituacaoAviso.arquivado, offset: 40);

    expect(api.pedidos.single.url.queryParameters['situacao'], 'arquivado');
    expect(api.pedidos.single.url.queryParameters['offset'], '40');
  });

  test('falha de rede não grava cache e repassa SEM_REDE', () async {
    api.falharRede('GET /avisos');

    await expectLater(
      repo.listar(usuarioId: 'u1'),
      throwsA(isA<ApiFailure>().having((f) => f.code, 'code', ApiFailure.semRede)),
    );
    expect(repo.avisosEmCache('u1'), isNull);
  });

  test('obter o detalhe; 404 vira AVISO_NAO_ENCONTRADO', () async {
    api.rotas['GET /avisos/aviso-001'] = (_) => respostaJson(
      '{"id":"aviso-001","titulo":"T","conteudo":"C","autor":{"id":"a","nome":"N"},'
      '"publicado_em":"2026-10-01T12:00:00Z","editado_em":null,"situacao":"arquivado",'
      '"destinos":[]}',
    );
    api.responder('GET /avisos/sumiu', erroAvisoNaoEncontradoJson, 404);

    final aviso = await repo.obter('aviso-001');

    expect(aviso.situacao, SituacaoAviso.arquivado);
    await expectLater(
      repo.obter('sumiu'),
      throwsA(isA<ApiFailure>().having((f) => f.code, 'code', 'AVISO_NAO_ENCONTRADO')),
    );
  });
}
