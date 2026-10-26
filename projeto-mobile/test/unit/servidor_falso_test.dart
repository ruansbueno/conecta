import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import '../../integration_test/servidor_falso.dart';
import '../fixtures/fixtures.dart';

void main() {
  late ServidorFalso servidor;

  setUp(() async => servidor = await ServidorFalso.iniciar());
  tearDown(() => servidor.parar());

  test('responde pela rota com o JSON configurado e registra o pedido', () async {
    servidor.responder('GET /me', meJson);

    final r = await http.get(
      Uri.parse('${servidor.url}/me'),
      headers: {'Authorization': 'Bearer t'},
    );

    expect(r.statusCode, 200);
    expect(jsonDecode(utf8.decode(r.bodyBytes))['username'], 'aluno.teste');
    expect(servidor.pedidos.single.rota, 'GET /me');
    expect(servidor.pedidos.single.autorizacao, 'Bearer t');
  });

  test('rota sem resposta configurada devolve 404 no formato da API', () async {
    final r = await http.get(Uri.parse('${servidor.url}/nada'));

    expect(r.statusCode, 404);
    expect(jsonDecode(r.body)['code'], 'NAO_ENCONTRADO');
  });

  test('resposta dinâmica recebe os parâmetros de consulta', () async {
    servidor.responderCom('GET /avisos', (q) => (200, '{"offset": ${q['offset']}}'));

    final r = await http.get(Uri.parse('${servidor.url}/avisos?offset=20'));

    expect(jsonDecode(r.body)['offset'], 20);
  });

  test('forçar 401 vale para toda chamada autenticada', () async {
    servidor.responder('GET /me', meJson);
    servidor.forcar401 = true;

    final r = await http.get(
      Uri.parse('${servidor.url}/me'),
      headers: {'Authorization': 'Bearer t'},
    );

    expect(r.statusCode, 401);
    expect(jsonDecode(r.body)['code'], 'NAO_AUTENTICADO');
  });

  test('lentidão atrasa a resposta', () async {
    servidor.responder('GET /me', meJson);
    servidor.lentidao = const Duration(milliseconds: 150);
    final inicio = DateTime.now();

    await http.get(Uri.parse('${servidor.url}/me'));

    expect(
      DateTime.now().difference(inicio),
      greaterThanOrEqualTo(const Duration(milliseconds: 150)),
    );
  });

  test('queda recusa conexões; religar volta a responder na mesma URL', () async {
    servidor.responder('GET /me', meJson);

    await servidor.derrubar();
    await expectLater(
      http.get(Uri.parse('${servidor.url}/me')),
      throwsA(anyOf(isA<SocketException>(), isA<http.ClientException>())),
    );
    await servidor.religar();
    final r = await http.get(Uri.parse('${servidor.url}/me'));

    expect(r.statusCode, 200);
  });
}
