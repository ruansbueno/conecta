import 'package:conecta/repositories/auth_repository.dart';
import 'package:conecta/services/api_failure.dart';
import 'package:conecta/services/cache_local.dart';
import 'package:conecta/services/cofre_sessao.dart';
import 'package:conecta/state/session_controller.dart';
import 'package:flutter_test/flutter_test.dart';

import '../apoio.dart';
import '../fixtures/fixtures.dart';

const _id = '7b1c0e3a-6f64-4f43-8a58-2f3d5f0c1a11';

void main() {
  late ApiFalsa api;
  late CacheLocal cache;
  late CofreSessao cofre;
  late SessionController sessao;

  setUp(() async {
    api = ApiFalsa();
    (cache, cofre) = await armazenamentosVazios();
    sessao = SessionController(
      api: api.api,
      auth: AuthRepository(api.api, cache),
      cofre: cofre,
      cache: cache,
    );
  });

  Future<void> guardarSessao() => cofre.gravar(
    SessaoGuardada(token: 'tok-guardado', usuarioId: _id, expiraEm: DateTime.utc(2030)),
  );

  group('abertura (RM-07)', () {
    test('sem token guardado vai para o login', () async {
      await sessao.iniciar();

      expect(sessao.estado, EstadoSessao.deslogado);
      expect(api.pedidos, isEmpty);
    });

    test('com token válido valida em GET /me e entra', () async {
      await guardarSessao();
      api.responder('GET /me', meJson);

      await sessao.iniciar();

      expect(sessao.estado, EstadoSessao.logado);
      expect(sessao.usuario!.nome, 'Aluno de Teste');
      expect(api.pedidos.single.headers['Authorization'], 'Bearer tok-guardado');
    });

    test('com token inválido apaga a sessão e mostra que expirou', () async {
      await guardarSessao();
      await cache.gravar(_id, RecursoCache.avisosAtivosP1, {'total': 1});
      api.responder('GET /me', erroNaoAutenticadoJson, 401);

      await sessao.iniciar();

      expect(sessao.estado, EstadoSessao.deslogado);
      expect(sessao.mensagemEncerramento, 'Sua sessão expirou. Entre de novo.');
      expect(await cofre.ler(), isNull);
      expect(cache.ler(_id, RecursoCache.avisosAtivosP1), isNull);
    });

    test('usuário desativado: encerra com a mensagem própria', () async {
      await guardarSessao();
      api.responder('GET /me', erroUsuarioInativoJson, 403);

      await sessao.iniciar();

      expect(sessao.estado, EstadoSessao.deslogado);
      expect(sessao.mensagemEncerramento, 'Seu acesso está desativado. Procure a coordenação.');
    });

    test('sem rede com perfil em cache: entra com os dados guardados', () async {
      await guardarSessao();
      api.responder('GET /me', meJson);
      await sessao.iniciar();
      api.falharRede('GET /me');
      final outra = SessionController(
        api: api.api,
        auth: AuthRepository(api.api, cache),
        cofre: cofre,
        cache: cache,
      );

      await outra.iniciar();

      expect(outra.estado, EstadoSessao.logado);
      expect(outra.usuario!.nome, 'Aluno de Teste');
      expect(outra.perfilDoCache, isNotNull);
    });

    test('sem rede e sem cache: tela de sem conexão, sessão preservada', () async {
      await guardarSessao();
      api.falharRede('GET /me');

      await sessao.iniciar();

      expect(sessao.estado, EstadoSessao.semConexao);
      expect(await cofre.ler(), isNotNull);
    });
  });

  group('login e logout', () {
    test('login grava o token no cofre e entra', () async {
      api.responder('POST /auth/login', loginJson);
      api.responder('GET /me', meJson);

      await sessao.login('aluno.teste', 'senha-teste');

      expect(sessao.estado, EstadoSessao.logado);
      expect((await cofre.ler())!.usuarioId, _id);
      expect(api.api.token, isNotNull);
    });

    test('login com falha não grava nada e repassa a falha', () async {
      api.responder('POST /auth/login', erroCredenciaisInvalidasJson, 401);

      await expectLater(
        sessao.login('aluno.teste', 'errada'),
        throwsA(isA<ApiFailure>().having((f) => f.code, 'code', 'CREDENCIAIS_INVALIDAS')),
      );
      expect(sessao.estado, isNot(EstadoSessao.logado));
      expect(await cofre.ler(), isNull);
    });

    test('logout apaga token e cache (RM-10, RM-30)', () async {
      api.responder('POST /auth/login', loginJson);
      api.responder('GET /me', meJson);
      await sessao.login('aluno.teste', 'senha-teste');
      await pumpEventQueue();

      await sessao.logout();

      expect(sessao.estado, EstadoSessao.deslogado);
      expect(sessao.mensagemEncerramento, isNull);
      expect(await cofre.ler(), isNull);
      expect(cache.ler(_id, RecursoCache.perfil), isNull);
      expect(api.api.token, isNull);
    });
  });

  group('sessão invalidada no meio do uso (RM-04, RM-05)', () {
    setUp(() async {
      await guardarSessao();
      api.responder('GET /me', meJson);
      await sessao.iniciar();
    });

    test('401 em qualquer chamada encerra uma única vez', () async {
      var encerramentos = 0;
      sessao.addListener(() {
        if (sessao.estado == EstadoSessao.deslogado) encerramentos++;
      });
      api.responder('GET /avisos', erroNaoAutenticadoJson, 401);

      await Future.wait([
        for (var i = 0; i < 3; i++) api.api.get('/avisos').catchError((_) => <String, dynamic>{}),
      ]);
      await pumpEventQueue();

      expect(sessao.estado, EstadoSessao.deslogado);
      expect(sessao.mensagemEncerramento, 'Sua sessão expirou. Entre de novo.');
      expect(encerramentos, 1);
      expect(await cofre.ler(), isNull);
    });
  });
}
