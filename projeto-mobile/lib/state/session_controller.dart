import 'dart:async';

import 'package:flutter/foundation.dart';

import '../models/usuario.dart';
import '../repositories/auth_repository.dart';
import '../services/api_client.dart';
import '../services/api_failure.dart';
import '../services/cache_local.dart';
import '../services/cofre_sessao.dart';

enum EstadoSessao { verificando, deslogado, logado, semConexao }

/// Sessão do app: usuário corrente, login, logout e encerramento central (D6).
class SessionController extends ChangeNotifier {
  SessionController({
    required ApiClient api,
    required AuthRepository auth,
    required CofreSessao cofre,
    required CacheLocal cache,
  }) : _api = api,
       _auth = auth,
       _cofre = cofre,
       _cache = cache {
    _assinatura = _api.sessaoInvalida.listen((falha) => _encerrar(falha.mensagem));
  }

  final ApiClient _api;
  final AuthRepository _auth;
  final CofreSessao _cofre;
  final CacheLocal _cache;
  late final StreamSubscription<ApiFailure> _assinatura;

  EstadoSessao _estado = EstadoSessao.verificando;
  Usuario? _usuario;
  DateTime? _perfilDoCache;
  String? _mensagemEncerramento;

  EstadoSessao get estado => _estado;
  Usuario? get usuario => _usuario;

  /// Data dos dados do perfil quando a abertura foi sem rede; `null` com dados frescos.
  DateTime? get perfilDoCache => _perfilDoCache;

  /// Motivo do último encerramento forçado, exibido no login.
  String? get mensagemEncerramento => _mensagemEncerramento;

  /// Abertura do app: com token guardado, valida em `GET /me` antes de mostrar conteúdo (RM-07).
  Future<void> iniciar() async {
    _estado = EstadoSessao.verificando;
    notifyListeners();
    final guardada = await _cofre.ler();
    if (guardada == null) return _mudar(EstadoSessao.deslogado);

    _api.token = guardada.token;
    try {
      _usuario = await _auth.me();
      _perfilDoCache = null;
      _mudar(EstadoSessao.logado);
    } on ApiFailure catch (falha) {
      if (falha.efeito == EfeitoFalha.encerraSessao) {
        return _encerrar(falha.mensagem, idUsuario: guardada.usuarioId);
      }
      final emCache = _auth.perfilEmCache(guardada.usuarioId);
      if (emCache == null) return _mudar(EstadoSessao.semConexao);
      final (usuario, coletadoEm) = emCache;
      _usuario = usuario;
      _perfilDoCache = coletadoEm;
      _mudar(EstadoSessao.logado);
    }
  }

  /// Repassa a [ApiFailure] para a tela de login; em falha nada é gravado.
  Future<void> login(String username, String password) async {
    final sessao = await _auth.login(username, password);
    await _cofre.gravar(
      SessaoGuardada(
        token: sessao.accessToken,
        usuarioId: sessao.usuario.id,
        expiraEm: sessao.expiraEm,
      ),
    );
    _api.token = sessao.accessToken;
    _usuario = sessao.usuario;
    _perfilDoCache = null;
    _mensagemEncerramento = null;
    _mudar(EstadoSessao.logado);
    unawaited(_completarPerfil());
  }

  Future<void> logout() async {
    _mensagemEncerramento = null;
    await _limpar(_usuario?.id);
    _mudar(EstadoSessao.deslogado);
  }

  /// O login não traz as turmas: completa com `GET /me` e guarda o perfil.
  Future<void> _completarPerfil() async {
    try {
      final usuario = await _auth.me();
      if (_estado == EstadoSessao.logado && usuario.id == _usuario?.id) {
        _usuario = usuario;
        notifyListeners();
      }
    } on ApiFailure {
      // Sem rede logo após o login: segue com os dados do login; 401 já encerra pelo evento.
    }
  }

  /// Encerramento único, mesmo com várias falhas simultâneas (RM-04).
  Future<void> _encerrar(String mensagem, {String? idUsuario}) async {
    if (_estado == EstadoSessao.deslogado) return;
    _mensagemEncerramento = mensagem;
    final id = idUsuario ?? _usuario?.id;
    _mudar(EstadoSessao.deslogado);
    await _limpar(id);
  }

  Future<void> _limpar(String? usuarioId) async {
    _api.token = null;
    _usuario = null;
    _perfilDoCache = null;
    await _cofre.apagar();
    if (usuarioId != null) await _cache.apagarUsuario(usuarioId);
  }

  void _mudar(EstadoSessao estado) {
    _estado = estado;
    notifyListeners();
  }

  @override
  void dispose() {
    _assinatura.cancel();
    super.dispose();
  }
}
