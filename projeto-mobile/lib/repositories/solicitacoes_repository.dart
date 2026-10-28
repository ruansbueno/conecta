import '../models/pagina.dart';
import '../models/solicitacao.dart';
import '../services/api_client.dart';
import 'conversao.dart';

/// `GET /solicitacoes/minhas` (contrato §8), sem cache pelo mesmo motivo das turmas disponíveis.
/// Criar e cancelar (§7 e §9) entram na US4.
class SolicitacoesRepository {
  SolicitacoesRepository(this._api);

  final ApiClient _api;

  Future<Pagina<Solicitacao>> minhas({int limit = 20, int offset = 0}) async {
    final json = await _api.get('/solicitacoes/minhas', query: {'limit': limit, 'offset': offset});
    return converter(() => Pagina.fromJson(json, Solicitacao.fromJson));
  }
}
