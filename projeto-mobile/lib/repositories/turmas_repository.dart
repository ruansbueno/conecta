import '../models/pagina.dart';
import '../models/turma.dart';
import '../services/api_client.dart';
import '../services/cache_local.dart';
import 'conversao.dart';

/// `GET /turmas/minhas` e `GET /turmas/disponiveis` (contrato §5 e §6). Só as minhas vão para o
/// cache: a disponibilidade muda por decisão da coordenação e um dado velho levaria o aluno a uma
/// solicitação que falha.
class TurmasRepository {
  TurmasRepository(this._api, this._cache);

  static const tamanhoPagina = 20;

  final ApiClient _api;
  final CacheLocal _cache;

  Future<Pagina<TurmaVinculada>> minhas({required String usuarioId, int offset = 0}) async {
    final token = _api.token;
    final json = await _api.get(
      '/turmas/minhas',
      query: {'limit': tamanhoPagina, 'offset': offset},
    );
    final pagina = converter(() => Pagina.fromJson(json, TurmaVinculada.fromJson));
    if (offset == 0 && token != null && _api.token == token) {
      await _cache.gravar(usuarioId, RecursoCache.turmasMinhas, json);
    }
    return pagina;
  }

  /// Primeira página das minhas turmas guardada, com a data da coleta (RM-28).
  (Pagina<TurmaVinculada>, DateTime)? minhasEmCache(String usuarioId) {
    final guardado = _cache.ler(usuarioId, RecursoCache.turmasMinhas);
    if (guardado == null) return null;
    try {
      return (Pagina.fromJson(guardado.dados, TurmaVinculada.fromJson), guardado.coletadoEm);
    } on Object {
      return null;
    }
  }

  Future<Pagina<Turma>> disponiveis({int offset = 0}) async {
    final json = await _api.get(
      '/turmas/disponiveis',
      query: {'limit': tamanhoPagina, 'offset': offset},
    );
    return converter(() => Pagina.fromJson(json, Turma.fromJson));
  }
}
