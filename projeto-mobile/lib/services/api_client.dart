import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import 'api_failure.dart';

/// Cliente HTTP da API (D3): cabeçalhos, token, timeout, JSON e conversão de erro em
/// [ApiFailure]. Emite [sessaoInvalida] uma única vez por token (D6).
class ApiClient {
  ApiClient({
    required http.Client client,
    required String baseUrl,
    this.timeout = const Duration(seconds: 15),
  }) : _client = client,
       _base = Uri.parse(baseUrl);

  final http.Client _client;
  final Uri _base;
  final Duration timeout;
  final _sessaoInvalida = StreamController<ApiFailure>.broadcast();

  /// Token da sessão corrente; `null` fora de sessão.
  String? token;
  String? _tokenJaInvalidado;

  /// `NAO_AUTENTICADO` ou `USUARIO_INATIVO` numa chamada autenticada.
  Stream<ApiFailure> get sessaoInvalida => _sessaoInvalida.stream;

  Future<Map<String, dynamic>> get(String caminho, {Map<String, Object?>? query}) async =>
      (await _enviar('GET', caminho, query: query))!;

  Future<Map<String, dynamic>> post(
    String caminho,
    Map<String, Object?> corpo, {
    bool autenticado = true,
  }) async => (await _enviar('POST', caminho, corpo: corpo, autenticado: autenticado))!;

  Future<Map<String, dynamic>?> delete(String caminho) => _enviar('DELETE', caminho);

  Future<Map<String, dynamic>?> _enviar(
    String metodo,
    String caminho, {
    Map<String, Object?>? query,
    Map<String, Object?>? corpo,
    bool autenticado = true,
  }) async {
    final tokenUsado = autenticado ? token : null;
    final pedido = http.Request(metodo, _url(caminho, query))
      ..headers['Accept'] = 'application/json';
    if (corpo != null) {
      pedido
        ..headers['Content-Type'] = 'application/json'
        ..body = jsonEncode(corpo);
    }
    if (tokenUsado != null) pedido.headers['Authorization'] = 'Bearer $tokenUsado';

    final http.Response resposta;
    try {
      resposta = await http.Response.fromStream(
        await _client.send(pedido).timeout(timeout),
      ).timeout(timeout);
    } on TimeoutException {
      throw const ApiFailure(code: ApiFailure.timeout);
    } on SocketException {
      throw const ApiFailure(code: ApiFailure.semRede);
    } on http.ClientException {
      throw const ApiFailure(code: ApiFailure.semRede);
    }

    final status = resposta.statusCode;
    if (status == 204 || (status < 300 && resposta.bodyBytes.isEmpty)) return null;
    final json = _decodificar(resposta);
    if (status < 300) {
      if (json == null) throw ApiFailure(code: ApiFailure.respostaInvalida, status: status);
      return json;
    }

    final falha = _falha(json, status);
    if (autenticado && tokenUsado != null) _talvezEncerrarSessao(falha, tokenUsado);
    throw falha;
  }

  Uri _url(String caminho, Map<String, Object?>? query) => _base.replace(
    path: '${_base.path}$caminho'.replaceAll('//', '/'),
    queryParameters: query == null
        ? null
        : {
            for (final e in query.entries)
              if (e.value != null) e.key: '${e.value}',
          },
  );

  Map<String, dynamic>? _decodificar(http.Response resposta) {
    try {
      final valor = jsonDecode(utf8.decode(resposta.bodyBytes));
      return valor is Map<String, dynamic> ? valor : null;
    } on FormatException {
      return null;
    }
  }

  ApiFailure _falha(Map<String, dynamic>? json, int status) {
    final code = json?['code'];
    if (code is! String) return ApiFailure(code: ApiFailure.respostaInvalida, status: status);
    return ApiFailure(
      code: code,
      status: status,
      detail: json!['detail'] as String?,
      errors: [
        for (final e in (json['errors'] as List?) ?? const [])
          ErroDeCampo(
            campo: (e as Map<String, dynamic>)['campo'] as String,
            mensagem: e['mensagem'] as String,
          ),
      ],
    );
  }

  void _talvezEncerrarSessao(ApiFailure falha, String tokenUsado) {
    final encerra = falha.status == 401 || (falha.status == 403 && falha.code == 'USUARIO_INATIVO');
    if (!encerra || _tokenJaInvalidado == tokenUsado) return;
    _tokenJaInvalidado = tokenUsado;
    _sessaoInvalida.add(falha);
  }

  void fechar() {
    _sessaoInvalida.close();
    _client.close();
  }
}
