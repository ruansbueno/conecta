import '../models/sessao.dart';
import '../models/usuario.dart';
import '../services/api_client.dart';
import '../services/cache_local.dart';

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
    return Sessao.fromLogin(json);
  }

  /// Usuário corrente com as turmas; guarda o perfil para abrir sem rede (RM-28).
  Future<Usuario> me() async {
    final json = await _api.get('/me');
    final usuario = Usuario.fromJson(json);
    await _cache.gravar(usuario.id, RecursoCache.perfil, json);
    return usuario;
  }

  /// Último perfil guardado e a data da coleta.
  (Usuario, DateTime)? perfilEmCache(String usuarioId) {
    final guardado = _cache.ler(usuarioId, RecursoCache.perfil);
    if (guardado == null) return null;
    return (Usuario.fromJson(guardado.dados), guardado.coletadoEm);
  }
}
