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
    _assinatura = _api.sessaoInvalida.listen((evento) {
      // Um 401 de chamada feita com token antigo não encerra a sessão atual.
      if (evento.token == _api.token) _encerrar(evento.falha.mensagem);
    });
  }

  final ApiClient _api;
  final AuthRepository _auth;
  final CofreSessao _cofre;
  final CacheLocal _cache;
  late final StreamSubscription<SessaoInvalida> _assinatura;

  EstadoSessao _estado = EstadoSessao.verificando;
  Usuario? _usuario;
  DateTime? _perfilDoCache;
  int _recargas = 0;
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
    final SessaoGuardada? guardada;
    try {
      guardada = await _cofre.ler();
    } on Object {
      // Cofre ilegível (ex.: backup restaurado em outro aparelho): começa do login.
      await _apagarCofre();
      return _mudar(EstadoSessao.deslogado);
    }
    if (guardada == null) return _mudar(EstadoSessao.deslogado);

    _api.token = guardada.token;
    try {
      final usuario = await _auth.me();
      if (_api.token != guardada.token) return; // sessão encerrada enquanto validava
      _usuario = usuario;
      _perfilDoCache = null;
      _mudar(EstadoSessao.logado);
    } on ApiFailure catch (falha) {
      if (_api.token != guardada.token) return;
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

  /// Reavalia perfil e turmas (RM-09). 401/403 encerram pelo evento central; sem rede, mantém.
  Future<void> recarregarPerfil() async {
    if (_estado != EstadoSessao.logado) return;
    final token = _api.token;
    final recarga = ++_recargas;
    try {
      final usuario = await _auth.me();
      if (_estado != EstadoSessao.logado || _api.token != token) return; // saiu nesse meio-tempo
      // Abrir a aba e voltar do segundo plano podem pedir juntos: só a recarga mais recente vale,
      // para uma resposta antiga não desfazer um perfil já atualizado.
      if (recarga != _recargas) return;
      _usuario = usuario;
      _perfilDoCache = null;
      notifyListeners();
    } on ApiFailure {
      // Mantém os dados atuais; o encerramento por 401/403 já veio pelo evento central.
    }
  }

  Future<void> logout() async {
    _mensagemEncerramento = null;
    await _limpar(_usuario?.id);
    _mudar(EstadoSessao.deslogado);
  }

  /// O login não traz as turmas: completa com `GET /me` e guarda o perfil.
  Future<void> _completarPerfil() async {
    final token = _api.token;
    try {
      final usuario = await _auth.me();
      if (_estado == EstadoSessao.logado && _api.token == token && usuario.id == _usuario?.id) {
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
    final semUsuario = idUsuario ?? _usuario?.id;
    _mudar(EstadoSessao.deslogado);
    // Sem usuário carregado (abertura sem rede), o dono do cache vem do cofre.
    final id = semUsuario ?? await _usuarioDoCofre();
    await _limpar(id);
  }

  Future<void> _limpar(String? usuarioId) async {
    _api.token = null;
    _usuario = null;
    _perfilDoCache = null;
    await _apagarCofre();
    if (usuarioId != null) await _cache.apagarUsuario(usuarioId);
  }

  Future<String?> _usuarioDoCofre() async {
    try {
      return (await _cofre.ler())?.usuarioId;
    } on Object {
      return null;
    }
  }

  Future<void> _apagarCofre() async {
    try {
      await _cofre.apagar();
    } on Object {
      // Sem como apagar: o próximo login sobrescreve.
    }
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
