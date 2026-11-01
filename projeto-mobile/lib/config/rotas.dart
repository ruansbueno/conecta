import 'package:flutter/material.dart';

/// Nomes de rota e tabela do Navigator (D2). A casca de abas é a raiz quando há sessão.
abstract final class Rotas {
  static const avisoDetalhe = '/avisos/detalhe';
  static const turmasDisponiveis = '/turmas/disponiveis';
  static const solicitacoes = '/solicitacoes';
  static const eventoDetalhe = '/eventos/detalhe';

  /// Permite voltar à raiz quando a sessão é encerrada com telas empilhadas (RM-04).
  static final navigatorKey = GlobalKey<NavigatorState>();

  static final _construtores = <String, Widget Function(Object? argumento)>{};

  /// Registro feito por quem implementa a tela, para a tabela não depender da UI.
  static void registrar(String nome, Widget Function(Object? argumento) construtor) =>
      _construtores[nome] = construtor;

  static Route<void>? gerar(RouteSettings settings) {
    final construtor = _construtores[settings.name];
    if (construtor == null) return null;
    return MaterialPageRoute(settings: settings, builder: (_) => construtor(settings.arguments));
  }
}
