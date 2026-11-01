import '../models/aula.dart';
import '../models/pagina.dart';
import '../services/api_client.dart';
import '../services/cache_local.dart';
import 'conversao.dart';

/// `GET /turmas/{id}/horarios` (contracts E3 §3): a grade inteira numa chamada, porque uma turma
/// tem poucas aulas por semana. Cada turma aberta fica no cache com o seu id (D-AF2-8).
class HorariosRepository {
  HorariosRepository(this._api, this._cache);

  static const limite = 100;

  final ApiClient _api;
  final CacheLocal _cache;

  Future<List<Aula>> grade({required String usuarioId, required String turmaId}) async {
    final token = _api.token;
    final caminho = '/turmas/${Uri.encodeComponent(turmaId)}/horarios';
    final json = await _api.get(caminho, query: {'limit': limite, 'offset': 0});
    final pagina = converter(() => Pagina.fromJson(json, Aula.fromJson), origem: 'GET $caminho');
    if (token != null && _api.token == token) {
      await _cache.gravar(usuarioId, RecursoCache.horarios, json, sufixo: turmaId);
    }
    return pagina.items;
  }

  (List<Aula>, DateTime)? gradeEmCache(String usuarioId, String turmaId) {
    final guardado = _cache.ler(usuarioId, RecursoCache.horarios, sufixo: turmaId);
    if (guardado == null) return null;
    try {
      return (Pagina.fromJson(guardado.dados, Aula.fromJson).items, guardado.coletadoEm);
    } on Object {
      return null;
    }
  }
}
