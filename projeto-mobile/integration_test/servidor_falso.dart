import 'dart:async';
import 'dart:convert';
import 'dart:io';

/// Um pedido recebido, para os testes conferirem o que o app chamou.
class PedidoRecebido {
  const PedidoRecebido(this.rota, this.query, this.autorizacao, this.corpo);

  final String rota;
  final Map<String, String> query;
  final String? autorizacao;
  final String corpo;
}

typedef RespostaDinamica = (int, String) Function(Map<String, String> query);

/// API falsa em memória para os testes de integração (D9): responde pelas fixtures e permite
/// forçar 401, lentidão e queda de rede de forma determinística.
class ServidorFalso {
  ServidorFalso._(this._servidor) : _porta = _servidor.port {
    _escutar();
  }

  static Future<ServidorFalso> iniciar() async =>
      ServidorFalso._(await HttpServer.bind(InternetAddress.loopbackIPv4, 0));

  HttpServer _servidor;
  final int _porta;
  final _rotas = <String, RespostaDinamica>{};
  final pedidos = <PedidoRecebido>[];

  /// Toda chamada autenticada recebe 401 `NAO_AUTENTICADO`.
  bool forcar401 = false;

  /// Atraso aplicado a toda resposta.
  Duration lentidao = Duration.zero;

  String get url => 'http://${InternetAddress.loopbackIPv4.address}:$_porta';

  void responder(String rota, String corpo, {int status = 200}) =>
      _rotas[rota] = (_) => (status, corpo);

  void responderCom(String rota, RespostaDinamica resposta) => _rotas[rota] = resposta;

  void _escutar() {
    _servidor.listen((pedido) async {
      final rota = '${pedido.method} ${pedido.uri.path}';
      final corpo = await utf8.decodeStream(pedido);
      final autorizacao = pedido.headers.value(HttpHeaders.authorizationHeader);
      pedidos.add(PedidoRecebido(rota, pedido.uri.queryParameters, autorizacao, corpo));

      if (lentidao > Duration.zero) await Future<void>.delayed(lentidao);
      final (status, resposta) = forcar401 && autorizacao != null
          ? (401, '{"detail": "Token inválido ou expirado", "code": "NAO_AUTENTICADO"}')
          : (_rotas[rota]?.call(pedido.uri.queryParameters) ??
                (404, '{"detail": "Recurso não encontrado", "code": "NAO_ENCONTRADO"}'));

      pedido.response
        ..statusCode = status
        ..headers.contentType = ContentType.json;
      if (status != 204) pedido.response.add(utf8.encode(resposta));
      await pedido.response.close();
    });
  }

  /// Simula a rede caindo: conexões passam a ser recusadas.
  Future<void> derrubar() => _servidor.close(force: true);

  /// Volta a atender na mesma porta.
  Future<void> religar() async {
    _servidor = await HttpServer.bind(InternetAddress.loopbackIPv4, _porta);
    _escutar();
  }

  Future<void> parar() => _servidor.close(force: true);
}
