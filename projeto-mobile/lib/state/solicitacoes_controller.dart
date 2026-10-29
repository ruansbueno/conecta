import 'package:flutter/foundation.dart';

import '../models/pagina.dart';
import '../models/solicitacao.dart';
import '../repositories/solicitacoes_repository.dart';
import '../services/api_failure.dart';
import 'lista_paginada.dart';

/// Avisa que uma solicitação foi criada, cancelada ou mudou de estado na API. Minhas turmas
/// escuta e recarrega turmas e solicitações recentes (recarga cruzada, RM-19), venha a mudança
/// de onde vier (disponíveis, folha de confirmação, lista de solicitações).
class MudancasDeSolicitacao extends ChangeNotifier {
  void avisar() => notifyListeners();
}

/// T09 — minhas solicitações, com cancelamento das pendentes (RM-21, RM-22, RM-23).
class SolicitacoesController extends ControllerDeLista<Solicitacao> {
  SolicitacoesController(this._repo, this._mudancas);

  final SolicitacoesRepository _repo;
  final MudancasDeSolicitacao _mudancas;
  final _cancelando = <String>{};

  bool cancelando(String solicitacaoId) => _cancelando.contains(solicitacaoId);

  @override
  Future<Pagina<Solicitacao>> buscar(int offset) => _repo.minhas(offset: offset);

  /// Nada muda na tela antes da resposta (RM-23). Devolve a falha para a tela explicar; um `409`
  /// ou `404` quer dizer que a solicitação mudou na API, e a lista é recarregada.
  Future<ApiFailure?> cancelar(Solicitacao s) async {
    if (!_cancelando.add(s.id)) return null;
    notifyListeners();
    ApiFailure? falha;
    try {
      await _repo.cancelar(s.id);
    } on ApiFailure catch (f) {
      falha = f;
    }
    _cancelando.remove(s.id);
    if (falha == null || falha.efeito == EfeitoFalha.recarrega) {
      _mudancas.avisar();
      await recarregar();
    } else {
      notifyListeners();
    }
    return falha;
  }
}
