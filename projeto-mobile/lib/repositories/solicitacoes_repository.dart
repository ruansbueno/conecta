import '../models/pagina.dart';
import '../models/solicitacao.dart';
import '../services/api_client.dart';
import 'conversao.dart';

/// Solicitações de inscrição do aluno (contrato §7, §8 e §9). A lista não vai para o cache, pelo
/// mesmo motivo das turmas disponíveis; nada muda no app antes da resposta da API (RM-23).
class SolicitacoesRepository {
  SolicitacoesRepository(this._api);

  final ApiClient _api;

  Future<Pagina<Solicitacao>> minhas({int limit = 20, int offset = 0}) async {
    final json = await _api.get('/solicitacoes/minhas', query: {'limit': limit, 'offset': offset});
    return converter(() => Pagina.fromJson(json, Solicitacao.fromJson));
  }

  /// `POST /turmas/{id}/solicitacoes`, sem corpo. Devolve o id da solicitação pendente criada.
  Future<String> criar(String turmaId) async {
    final json = await _api.post('/turmas/${Uri.encodeComponent(turmaId)}/solicitacoes', const {});
    return converter(() => json['id'] as String);
  }

  /// `DELETE /solicitacoes/{id}`: só pendentes; a API responde 409 se já foi decidida.
  Future<void> cancelar(String solicitacaoId) =>
      _api.delete('/solicitacoes/${Uri.encodeComponent(solicitacaoId)}');
}
