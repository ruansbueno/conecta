import '../models/sessao.dart';
import '../models/usuario.dart';
import '../services/api_client.dart';
import '../services/cache_local.dart';
import 'conversao.dart';

/// `POST /auth/login` e `GET /me` (contrato §1 e §2).
class AuthRepository {
  AuthRepository(this._api, this._cache);

  final ApiClient _api;
  final CacheLocal _cache;

  Future<Sessao> login(String username, String password) async {
    final json = await _api.post('/auth/login', {
      'username': username,
      'password': password,
    }, autenticado: false);
    return converter(() => Sessao.fromLogin(json), origem: 'POST /auth/login');
  }

  /// Usuário corrente com as turmas; guarda o perfil para abrir sem rede (RM-28).
  Future<Usuario> me() async {
    final token = _api.token;
    final json = await _api.get('/me');
    final usuario = converter(() => Usuario.fromJson(json), origem: 'GET /me');
    // Resposta de uma sessão que já terminou não grava nada (RM-30).
    if (token != null && _api.token == token) {
      await _cache.gravar(usuario.id, RecursoCache.perfil, json);
    }
    return usuario;
  }

  /// Último perfil guardado e a data da coleta.
  (Usuario, DateTime)? perfilEmCache(String usuarioId) {
    final guardado = _cache.ler(usuarioId, RecursoCache.perfil);
    if (guardado == null) return null;
    try {
      return (Usuario.fromJson(guardado.dados), guardado.coletadoEm);
    } on Object {
      return null; // formato antigo: como se não houvesse cache
    }
  }
}
