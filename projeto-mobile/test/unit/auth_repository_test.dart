import 'package:conecta/models/usuario.dart';
import 'package:conecta/repositories/auth_repository.dart';
import 'package:conecta/services/api_failure.dart';
import 'package:conecta/services/cache_local.dart';
import 'package:flutter_test/flutter_test.dart';

import '../apoio.dart';
import '../fixtures/fixtures.dart';

void main() {
  late ApiFalsa api;
  late CacheLocal cache;
  late AuthRepository repo;

  setUp(() async {
    api = ApiFalsa();
    (cache, _) = await armazenamentosVazios();
    repo = AuthRepository(api.api, cache);
  });

  Future<ApiFailure> falhaDoLogin() => repo
      .login('aluno.teste', 'x')
      .then((_) => fail('deveria falhar'), onError: (e) => e as ApiFailure);

  test('login 200 devolve a sessão, sem enviar token', () async {
    api.responder('POST /auth/login', loginJson);

    final sessao = await repo.login('aluno.teste', 'senha-teste');

    expect(sessao.accessToken, isNotEmpty);
    expect(sessao.usuario.perfil, Perfil.aluno);
    expect(api.pedidos.single.headers.containsKey('Authorization'), isFalse);
  });

  test('login com credencial inválida, inativo, validação e sem rede', () async {
    api.responder('POST /auth/login', erroCredenciaisInvalidasJson, 401);
    expect((await falhaDoLogin()).code, 'CREDENCIAIS_INVALIDAS');

    api.responder('POST /auth/login', erroUsuarioInativoJson, 403);
    expect((await falhaDoLogin()).code, 'USUARIO_INATIVO');

    api.responder('POST /auth/login', erroValidationErrorJson, 422);
    expect((await falhaDoLogin()).errors.single.campo, 'username');

    api.falharRede('POST /auth/login');
    expect((await falhaDoLogin()).code, ApiFailure.semRede);
  });

  test('me() devolve o usuário com turmas e guarda o perfil em cache', () async {
    api.responder('GET /me', meJson);
    api.api.token = 'tok';

    final usuario = await repo.me();

    expect(usuario.turmas, hasLength(1));
    expect(repo.perfilEmCache(usuario.id)!.$1, usuario);
  });

  test('me() com falha não grava cache', () async {
    api.falharRede('GET /me');
    api.api.token = 'tok';

    await expectLater(repo.me(), throwsA(isA<ApiFailure>()));
    expect(repo.perfilEmCache('7b1c0e3a-6f64-4f43-8a58-2f3d5f0c1a11'), isNull);
  });
}
