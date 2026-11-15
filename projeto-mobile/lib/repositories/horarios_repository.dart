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

  /// `GET /horarios/minhas` (contracts E3 §3a, emenda E3.1): as aulas do docente em todas as
  /// turmas, numa chamada, como a grade de uma turma.
  Future<List<Aula>> minhasAulas({required String usuarioId}) async {
    final token = _api.token;
    const caminho = '/horarios/minhas';
    final json = await _api.get(caminho, query: {'limit': limite, 'offset': 0});
    final pagina = converter(() => Pagina.fromJson(json, Aula.fromJson), origem: 'GET $caminho');
    if (token != null && _api.token == token) {
      await _cache.gravar(usuarioId, RecursoCache.aulasDoDocente, json);
    }
    return pagina.items;
  }

  (List<Aula>, DateTime)? minhasAulasEmCache(String usuarioId) =>
      _lerAulas(_cache.ler(usuarioId, RecursoCache.aulasDoDocente));

  (List<Aula>, DateTime)? gradeEmCache(String usuarioId, String turmaId) =>
      _lerAulas(_cache.ler(usuarioId, RecursoCache.horarios, sufixo: turmaId));

  static (List<Aula>, DateTime)? _lerAulas(ConteudoGuardado? guardado) {
    if (guardado == null) return null;
    try {
      return (Pagina.fromJson(guardado.dados, Aula.fromJson).items, guardado.coletadoEm);
    } on Object {
      return null;
    }
  }

  /// Turma escolhida em Horários (plan-f2 D-AF2-6): só o id, sai no logout com o resto do cache.
  String? turmaLembrada(String usuarioId) =>
      _cache.ler(usuarioId, RecursoCache.horariosTurma)?.dados['turma_id'] as String?;

  Future<void> lembrarTurma(String usuarioId, String turmaId) =>
      _cache.gravar(usuarioId, RecursoCache.horariosTurma, {'turma_id': turmaId});

  Future<void> esquecerTurma(String usuarioId) =>
      _cache.apagar(usuarioId, RecursoCache.horariosTurma);
}
