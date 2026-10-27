import 'dart:convert';

import 'package:conecta/services/api_client.dart';
import 'package:conecta/services/cache_local.dart';
import 'package:conecta/services/cofre_sessao.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

http.Response respostaJson(String corpo, [int status = 200]) =>
    http.Response.bytes(utf8.encode(corpo), status, headers: {'content-type': 'application/json'});

/// API falsa por rota: `'GET /me'` → resposta. Rota ausente responde 404 genérico.
class ApiFalsa {
  final rotas = <String, http.Response Function(http.Request)>{};

  /// Respostas que só chegam quando o teste quiser (estado de carregando).
  final rotasAssincronas = <String, Future<http.Response> Function(http.Request)>{};
  final pedidos = <http.Request>[];

  void responder(String rota, String corpo, [int status = 200]) =>
      rotas[rota] = (_) => respostaJson(corpo, status);

  void falharRede(String rota) =>
      rotas[rota] = (_) => throw http.ClientException('Connection refused');

  late final client = MockClient((r) async {
    pedidos.add(r);
    final assincrona = rotasAssincronas['${r.method} ${r.url.path}'];
    if (assincrona != null) return assincrona(r);
    final rota = rotas['${r.method} ${r.url.path}'];
    if (rota == null) {
      return respostaJson('{"detail": "Recurso não encontrado", "code": "NAO_ENCONTRADO"}', 404);
    }
    return rota(r);
  });

  late final api = ApiClient(client: client, baseUrl: 'http://api.teste');
}

Future<(CacheLocal, CofreSessao)> armazenamentosVazios() async {
  SharedPreferences.setMockInitialValues({});
  FlutterSecureStorage.setMockInitialValues({});
  return (
    CacheLocal(await SharedPreferences.getInstance()),
    const CofreSessao(FlutterSecureStorage()),
  );
}
