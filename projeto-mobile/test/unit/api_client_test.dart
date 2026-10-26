import 'dart:convert';
import 'dart:io';

import 'package:conecta/services/api_client.dart';
import 'package:conecta/services/api_failure.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import '../fixtures/fixtures.dart';

http.Response _json(String corpo, int status) =>
    http.Response.bytes(utf8.encode(corpo), status, headers: {'content-type': 'application/json'});

void main() {
  late List<http.Request> pedidos;

  ApiClient cliente(
    Future<http.Response> Function(http.Request) responder, {
    Duration timeout = const Duration(seconds: 15),
  }) {
    pedidos = [];
    return ApiClient(
      client: MockClient((r) {
        pedidos.add(r);
        return responder(r);
      }),
      baseUrl: 'http://api.teste',
      timeout: timeout,
    );
  }

  test('GET com sucesso: decodifica JSON e envia cabeçalhos e token', () async {
    final api = cliente((_) async => _json(meJson, 200))..token = 'tok-123';

    final corpo = await api.get('/me');

    expect(corpo['username'], 'aluno.teste');
    expect(pedidos.single.url.toString(), 'http://api.teste/me');
    expect(pedidos.single.headers['Authorization'], 'Bearer tok-123');
    expect(pedidos.single.headers['Accept'], 'application/json');
  });

  test('parâmetros de consulta entram na URL', () async {
    final api = cliente((_) async => _json(avisosVazioJson, 200))..token = 't';

    await api.get('/avisos', query: {'situacao': 'arquivado', 'limit': 20, 'offset': 40});

    expect(pedidos.single.url.queryParameters, {
      'situacao': 'arquivado',
      'limit': '20',
      'offset': '40',
    });
  });

  test('POST sem autenticação envia o corpo e não envia Authorization', () async {
    final api = cliente((_) async => _json(loginJson, 200))..token = 'antigo';

    await api.post('/auth/login', {'username': 'a', 'password': 'b'}, autenticado: false);

    expect(jsonDecode(pedidos.single.body), {'username': 'a', 'password': 'b'});
    expect(pedidos.single.headers['Content-Type'], startsWith('application/json'));
    expect(pedidos.single.headers.containsKey('Authorization'), isFalse);
  });

  test('erro com code vira ApiFailure com code, status, detail e errors', () async {
    final api = cliente((_) async => _json(erroValidationErrorJson, 422));

    final falha = await api
        .post('/auth/login', {}, autenticado: false)
        .then<ApiFailure?>((_) => null, onError: (Object e) => e as ApiFailure);

    expect(falha!.code, 'VALIDATION_ERROR');
    expect(falha.status, 422);
    expect(falha.detail, 'Dados inválidos');
    expect(falha.errors.single.campo, 'username');
  });

  test('corpo inesperado (HTML de proxy) vira RESPOSTA_INVALIDA com o status', () async {
    final api = cliente((_) async => http.Response('<html>Bad gateway</html>', 502));

    expect(
      () => api.get('/avisos'),
      throwsA(
        isA<ApiFailure>()
            .having((f) => f.code, 'code', ApiFailure.respostaInvalida)
            .having((f) => f.status, 'status', 502),
      ),
    );
  });

  test('sucesso com corpo que não é JSON também é RESPOSTA_INVALIDA', () async {
    final api = cliente((_) async => http.Response('ok', 200));

    expect(
      () => api.get('/me'),
      throwsA(isA<ApiFailure>().having((f) => f.code, 'code', ApiFailure.respostaInvalida)),
    );
  });

  test('timeout vira TIMEOUT', () async {
    final api = cliente(
      (_) => Future.delayed(const Duration(milliseconds: 200), () => _json('{}', 200)),
      timeout: const Duration(milliseconds: 20),
    );

    expect(
      () => api.get('/me'),
      throwsA(isA<ApiFailure>().having((f) => f.code, 'code', ApiFailure.timeout)),
    );
  });

  test('ausência de rede vira SEM_REDE', () async {
    for (final erro in [
      const SocketException('Network is unreachable'),
      http.ClientException('Connection refused'),
    ]) {
      final api = cliente((_) async => throw erro);

      expect(
        () => api.get('/me'),
        throwsA(isA<ApiFailure>().having((f) => f.code, 'code', ApiFailure.semRede)),
      );
    }
  });

  test('204 sem corpo devolve null', () async {
    final api = cliente((_) async => http.Response('', 204))..token = 't';

    expect(await api.delete('/solicitacoes/1'), isNull);
  });

  group('sessão inválida (D6)', () {
    test('vários 401 simultâneos com o mesmo token emitem um único evento', () async {
      final api = cliente((_) async => _json(erroNaoAutenticadoJson, 401))..token = 'tok';
      final eventos = <ApiFailure>[];
      api.sessaoInvalida.listen(eventos.add);

      await Future.wait([
        for (var i = 0; i < 3; i++) api.get('/avisos').catchError((_) => <String, dynamic>{}),
      ]);
      await pumpEventQueue();

      expect(eventos, hasLength(1));
      expect(eventos.single.code, 'NAO_AUTENTICADO');
    });

    test('um token novo volta a poder emitir', () async {
      final api = cliente((_) async => _json(erroNaoAutenticadoJson, 401))..token = 'tok-1';
      final eventos = <ApiFailure>[];
      api.sessaoInvalida.listen(eventos.add);

      await api.get('/me').catchError((_) => <String, dynamic>{});
      api.token = 'tok-2';
      await api.get('/me').catchError((_) => <String, dynamic>{});
      await pumpEventQueue();

      expect(eventos, hasLength(2));
    });

    test('403 USUARIO_INATIVO em chamada autenticada também encerra', () async {
      final api = cliente((_) async => _json(erroUsuarioInativoJson, 403))..token = 'tok';
      final eventos = <ApiFailure>[];
      api.sessaoInvalida.listen(eventos.add);

      await api.get('/avisos').catchError((_) => <String, dynamic>{});
      await pumpEventQueue();

      expect(eventos.single.code, 'USUARIO_INATIVO');
    });

    test('401 e 403 do próprio login não emitem (não há sessão a encerrar)', () async {
      for (final corpo in [erroCredenciaisInvalidasJson, erroUsuarioInativoJson]) {
        final status = corpo == erroCredenciaisInvalidasJson ? 401 : 403;
        final api = cliente((_) async => _json(corpo, status));
        final eventos = <ApiFailure>[];
        api.sessaoInvalida.listen(eventos.add);

        await api
            .post('/auth/login', {}, autenticado: false)
            .catchError((_) => <String, dynamic>{});
        await pumpEventQueue();

        expect(eventos, isEmpty);
      }
    });

    test('403 SEM_PERMISSAO não encerra a sessão', () async {
      final api = cliente((_) async => _json(erroSemPermissaoJson, 403))..token = 'tok';
      final eventos = <ApiFailure>[];
      api.sessaoInvalida.listen(eventos.add);

      await api.get('/turmas/disponiveis').catchError((_) => <String, dynamic>{});
      await pumpEventQueue();

      expect(eventos, isEmpty);
    });
  });
}
