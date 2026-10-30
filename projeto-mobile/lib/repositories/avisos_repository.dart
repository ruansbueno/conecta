import '../models/aviso.dart';
import '../models/pagina.dart';
import '../services/api_client.dart';
import '../services/cache_local.dart';
import 'conversao.dart';

/// `GET /avisos` e `GET /avisos/{id}` (contrato §3 e §4). Nenhum filtro no cliente: a API
/// decide o que o usuário vê (Princípio I).
class AvisosRepository {
  AvisosRepository(this._api, this._cache);

  static const tamanhoPagina = 20;

  final ApiClient _api;
  final CacheLocal _cache;

  Future<Pagina<Aviso>> listar({
    required String usuarioId,
    SituacaoAviso situacao = SituacaoAviso.ativo,
    int offset = 0,
  }) async {
    final token = _api.token;
    final json = await _api.get(
      '/avisos',
      query: {'situacao': situacao.name, 'limit': tamanhoPagina, 'offset': offset},
    );
    final pagina = converter(() => Pagina.fromJson(json, Aviso.fromJson), origem: 'GET /avisos');
    if (situacao == SituacaoAviso.ativo && offset == 0 && token != null && _api.token == token) {
      await _cache.gravar(usuarioId, RecursoCache.avisosAtivosP1, json);
    }
    return pagina;
  }

  /// Primeira página de ativos guardada, com a data da coleta (RM-28).
  (Pagina<Aviso>, DateTime)? avisosEmCache(String usuarioId) {
    final guardado = _cache.ler(usuarioId, RecursoCache.avisosAtivosP1);
    if (guardado == null) return null;
    try {
      return (Pagina.fromJson(guardado.dados, Aviso.fromJson), guardado.coletadoEm);
    } on Object {
      return null;
    }
  }

  Future<Aviso> obter(String id) async {
    final caminho = '/avisos/${Uri.encodeComponent(id)}';
    final json = await _api.get(caminho);
    return converter(() => Aviso.fromJson(json), origem: 'GET $caminho');
  }
}
