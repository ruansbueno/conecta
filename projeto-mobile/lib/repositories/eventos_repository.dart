import '../models/evento.dart';
import '../models/pagina.dart';
import '../services/api_client.dart';
import '../services/cache_local.dart';
import 'conversao.dart';

/// `GET /eventos` e `GET /eventos/{id}` (contracts E3 §1–2). Quem decide o que a pessoa vê é a API
/// (Princípio I); aqui só se monta a consulta e se guarda o que o plano manda (D-AF2-8).
class EventosRepository {
  EventosRepository(this._api, this._cache);

  static const tamanhoPagina = 20;

  /// A visão de mês pede a janela inteira numa página (D-AF2-4).
  static const limiteMes = 100;

  final ApiClient _api;
  final CacheLocal _cache;

  /// Os não encerrados, do mais próximo ao mais distante. Só a primeira página sem filtro vai
  /// para o cache.
  Future<Pagina<Evento>> proximos({
    required String usuarioId,
    TipoEvento? tipo,
    int offset = 0,
  }) async {
    final token = _api.token;
    final json = await _api.get(
      '/eventos',
      query: {'limit': tamanhoPagina, 'offset': offset, 'tipo': ?tipo?.valorApi},
    );
    final pagina = converter(() => Pagina.fromJson(json, Evento.fromJson), origem: 'GET /eventos');
    if (tipo == null && offset == 0 && token != null && _api.token == token) {
      await _cache.gravar(usuarioId, RecursoCache.agendaProximosP1, json);
    }
    return pagina;
  }

  (Pagina<Evento>, DateTime)? proximosEmCache(String usuarioId) {
    final guardado = _cache.ler(usuarioId, RecursoCache.agendaProximosP1);
    if (guardado == null) return null;
    try {
      return (Pagina.fromJson(guardado.dados, Evento.fromJson), guardado.coletadoEm);
    } on Object {
      return null;
    }
  }

  /// Eventos que tocam a janela `[de, ate)`, com os já encerrados: sem eles os dias passados do
  /// mês viriam vazios. [chave] identifica o mês ("2026-10"); com [guardar] e sem filtro de tipo,
  /// a resposta fica no cache como o mês corrente.
  Future<Pagina<Evento>> doMes({
    required String usuarioId,
    required String chave,
    required DateTime de,
    required DateTime ate,
    TipoEvento? tipo,
    required bool guardar,
  }) async {
    final token = _api.token;
    final json = await _api.get(
      '/eventos',
      query: {
        'de': de.toUtc().toIso8601String(),
        'ate': ate.toUtc().toIso8601String(),
        'incluir_encerrados': 'true',
        'limit': limiteMes,
        'offset': 0,
        'tipo': ?tipo?.valorApi,
      },
    );
    final pagina = converter(() => Pagina.fromJson(json, Evento.fromJson), origem: 'GET /eventos');
    if (guardar && tipo == null && token != null && _api.token == token) {
      await _cache.gravar(usuarioId, RecursoCache.agendaMes, {'mes': chave, 'pagina': json});
    }
    return pagina;
  }

  /// O mês guardado, só se for o mesmo [chave] pedido.
  (Pagina<Evento>, DateTime)? mesEmCache(String usuarioId, String chave) {
    final guardado = _cache.ler(usuarioId, RecursoCache.agendaMes);
    if (guardado == null || guardado.dados['mes'] != chave) return null;
    try {
      final pagina = guardado.dados['pagina'] as Map<String, dynamic>;
      return (Pagina.fromJson(pagina, Evento.fromJson), guardado.coletadoEm);
    } on Object {
      return null;
    }
  }

  Future<Evento> obter(String id) async {
    final caminho = '/eventos/${Uri.encodeComponent(id)}';
    final json = await _api.get(caminho);
    return converter(() => Evento.fromJson(json), origem: 'GET $caminho');
  }
}
