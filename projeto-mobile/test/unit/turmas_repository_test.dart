import 'package:conecta/models/solicitacao.dart';
import 'package:conecta/models/turma.dart';
import 'package:conecta/repositories/solicitacoes_repository.dart';
import 'package:conecta/repositories/turmas_repository.dart';
import 'package:conecta/services/api_failure.dart';
import 'package:conecta/services/cache_local.dart';
import 'package:flutter_test/flutter_test.dart';

import '../apoio.dart';
import '../fixtures/fabrica.dart';

const _semPermissaoJson = '{"detail": "Sem permissão", "code": "SEM_PERMISSAO"}';

void main() {
  late ApiFalsa api;
  late CacheLocal cache;
  late TurmasRepository repo;

  setUp(() async {
    api = ApiFalsa();
    (cache, _) = await armazenamentosVazios();
    api.api.token = 'tok';
    repo = TurmasRepository(api.api, cache);
  });

  group('minhas (contrato §5)', () {
    test('pede limit 20 e offset e traz o papel de cada turma', () async {
      api.responder(
        'GET /turmas/minhas',
        paginaJson([
          turmaMapa('TADS-3A-2026-2', nome: 'TADS 3º Sem A', papel: 'aluno'),
          turmaMapa('TADS-5A-2026-2', nome: 'TADS 5º Sem A', papel: 'docente', semestre: 5),
        ]),
      );

      final pagina = await repo.minhas(usuarioId: 'u1');

      expect(api.pedidos.single.url.queryParameters, {'limit': '20', 'offset': '0'});
      expect(pagina.items.map((t) => (t.codigo, t.papel, t.semestreCurso)), [
        ('TADS-3A-2026-2', Papel.aluno, 3),
        ('TADS-5A-2026-2', Papel.docente, 5),
      ]);
    });

    test('lista vazia é um resultado normal (coordenação e administração)', () async {
      api.responder('GET /turmas/minhas', paginaJson([]));

      final pagina = await repo.minhas(usuarioId: 'u1');

      expect(pagina.items, isEmpty);
      expect(pagina.total, 0);
    });

    test('a primeira página vai para o cache (turmas_minhas), com a data da coleta', () async {
      expect(repo.minhasEmCache('u1'), isNull);
      api.responder('GET /turmas/minhas', paginaJson([turmaMapa('TADS-3A-2026-2', papel: 'aluno')]));

      await repo.minhas(usuarioId: 'u1');

      final (pagina, coletadoEm) = repo.minhasEmCache('u1')!;
      expect(pagina.items.single.codigo, 'TADS-3A-2026-2');
      expect(DateTime.now().toUtc().difference(coletadoEm), lessThan(const Duration(minutes: 1)));
      expect(repo.minhasEmCache('outra-pessoa'), isNull);
    });

    test('páginas seguintes e falhas não mexem no cache', () async {
      api.responder('GET /turmas/minhas', paginaJson([turmaMapa('X', papel: 'aluno')], total: 25, offset: 20));
      await repo.minhas(usuarioId: 'u1', offset: 20);
      api.falharRede('GET /turmas/minhas');
      await expectLater(
        repo.minhas(usuarioId: 'u1'),
        throwsA(isA<ApiFailure>().having((f) => f.code, 'code', ApiFailure.semRede)),
      );
      expect(repo.minhasEmCache('u1'), isNull);
    });

    test('resposta que chega depois de sair da conta não é guardada', () async {
      api.rotas['GET /turmas/minhas'] = (_) {
        api.api.token = null; // logout enquanto a resposta vinha
        return respostaJson(paginaJson([turmaMapa('X', papel: 'aluno')]));
      };

      await repo.minhas(usuarioId: 'u1');

      expect(repo.minhasEmCache('u1'), isNull);
    });
  });

  group('disponíveis (contrato §6)', () {
    test('lista sem papel e não guarda cache', () async {
      api.responder('GET /turmas/disponiveis', paginaJson([turmaMapa('TADS-5A-2026-2', semestre: 5)]));

      final pagina = await repo.disponiveis();

      expect(api.pedidos.single.url.queryParameters, {'limit': '20', 'offset': '0'});
      expect(pagina.items.single, isA<Turma>().having((t) => t.semestreCurso, 'semestre', 5));
      expect(repo.minhasEmCache('u1'), isNull);
    });

    test('403 SEM_PERMISSAO para quem não é aluno chega com a mensagem de perfil', () async {
      api.responder('GET /turmas/disponiveis', _semPermissaoJson, 403);

      await expectLater(
        repo.disponiveis(),
        throwsA(
          isA<ApiFailure>()
              .having((f) => f.code, 'code', 'SEM_PERMISSAO')
              .having((f) => f.mensagem, 'mensagem', 'Esta ação não está disponível para o seu perfil.'),
        ),
      );
    });

    test('formato inesperado vira RESPOSTA_INVALIDA', () async {
      api.responder('GET /turmas/disponiveis', '{"items": [{"id": 1}], "total": 1}');

      await expectLater(
        repo.disponiveis(),
        throwsA(isA<ApiFailure>().having((f) => f.code, 'code', ApiFailure.respostaInvalida)),
      );
    });
  });

  group('solicitações recentes (contrato §8, rodapé de T06)', () {
    test('pede as três mais recentes e converte status e datas', () async {
      final solicitacoes = SolicitacoesRepository(api.api);
      api.responder(
        'GET /solicitacoes/minhas',
        paginaJson([
          solicitacaoMapa('s1'),
          solicitacaoMapa(
            's2',
            status: 'recusada',
            decididaEm: '2026-08-30T15:00:00Z',
            motivoRecusa: 'Turma completa',
          ),
        ], limit: 3),
      );

      final pagina = await solicitacoes.minhas(limit: 3);

      expect(api.pedidos.single.url.queryParameters, {'limit': '3', 'offset': '0'});
      expect(pagina.items.map((s) => s.status), [StatusSolicitacao.pendente, StatusSolicitacao.recusada]);
      expect(pagina.items.last.decididaEm, DateTime.utc(2026, 8, 30, 15));
      expect(pagina.items.last.motivoRecusa, 'Turma completa');
    });

    test('403 SEM_PERMISSAO é repassado (a tela esconde a seção)', () async {
      final solicitacoes = SolicitacoesRepository(api.api);
      api.responder('GET /solicitacoes/minhas', _semPermissaoJson, 403);

      await expectLater(
        solicitacoes.minhas(limit: 3),
        throwsA(isA<ApiFailure>().having((f) => f.code, 'code', 'SEM_PERMISSAO')),
      );
    });
  });
}
