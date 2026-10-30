import 'dart:async';
import 'dart:convert';
import 'dart:developer' as developer;
import 'dart:io';

import 'package:http/http.dart' as http;

import 'api_failure.dart';

/// Sessão invalidada pela API, com o token que a chamada usou (para ignorar tokens antigos).
class SessaoInvalida {
  const SessaoInvalida(this.falha, this.token);

  final ApiFailure falha;
  final String token;
}

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
  final _sessaoInvalida = StreamController<SessaoInvalida>.broadcast();

  /// Token da sessão corrente; `null` fora de sessão.
  String? token;
  String? _tokenJaInvalidado;

  /// `NAO_AUTENTICADO` ou `USUARIO_INATIVO` numa chamada autenticada.
  Stream<SessaoInvalida> get sessaoInvalida => _sessaoInvalida.stream;

  /// RM-38: toda falha de API vai para o log local com método, endpoint (sem query), status e
  /// `code` — nunca token, corpo ou o `detail` do servidor, que podem ter dados pessoais.
  /// Substituível nos testes.
  static void Function(String linha) registrar = _registrarLocalmente;

  static void _registrarLocalmente(String linha) => developer.log(linha, name: 'conecta.api');

  Future<Map<String, dynamic>> get(String caminho, {Map<String, Object?>? query}) => _registrando(
    'GET',
    caminho,
    () async => _exigirCorpo(await _enviar('GET', caminho, query: query)),
  );

  Future<Map<String, dynamic>> post(
    String caminho,
    Map<String, Object?> corpo, {
    bool autenticado = true,
  }) => _registrando(
    'POST',
    caminho,
    () async =>
        _exigirCorpo(await _enviar('POST', caminho, corpo: corpo, autenticado: autenticado)),
  );

  static Map<String, dynamic> _exigirCorpo(Map<String, dynamic>? corpo) =>
      corpo ?? (throw const ApiFailure(code: ApiFailure.respostaInvalida));

  Future<Map<String, dynamic>?> delete(String caminho) =>
      _registrando('DELETE', caminho, () => _enviar('DELETE', caminho));

  Future<T> _registrando<T>(String metodo, String caminho, Future<T> Function() chamada) async {
    try {
      return await chamada();
    } on ApiFailure catch (falha) {
      final status = falha.status == null ? '' : '${falha.status} ';
      registrar('$metodo $caminho → $status${falha.code}');
      rethrow;
    }
  }

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
    } on IOException {
      // Inclui SocketException e falhas de TLS (HandshakeException) de redes com portal.
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
    _sessaoInvalida.add(SessaoInvalida(falha, tokenUsado));
  }

  void fechar() {
    _sessaoInvalida.close();
    _client.close();
  }
}
