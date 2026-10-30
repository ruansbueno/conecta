import '../models/pagina.dart';
import '../models/solicitacao.dart';
import '../models/turma.dart';
import '../repositories/solicitacoes_repository.dart';
import '../repositories/turmas_repository.dart';
import '../services/api_failure.dart';
import 'lista_paginada.dart';
import 'solicitacoes_controller.dart';

/// T06 — minhas turmas e, para o aluno, as três solicitações mais recentes (RM-18).
class MinhasTurmasController extends ControllerDeLista<TurmaVinculada> {
  MinhasTurmasController(
    this._turmas,
    this._solicitacoes, {
    required this.usuarioId,
    required this.aluno,
    required MudancasDeSolicitacao mudancas,
  }) : _mudancas = mudancas {
    _mudancas.addListener(_aoMudar);
  }

  static const quantasRecentes = 3;

  final TurmasRepository _turmas;
  final SolicitacoesRepository _solicitacoes;
  final String usuarioId;
  final bool aluno;
  final MudancasDeSolicitacao _mudancas;

  List<Solicitacao>? _recentes;
  int _pedidoRecentes = 0;
  bool _descartado = false;

  /// `null` esconde o rodapé: perfil não-aluno, `SEM_PERMISSAO` ou falha (é informação de apoio).
  List<Solicitacao>? get recentes => _recentes;

  ListaPaginada<TurmaVinculada> get turmas => lista;

  @override
  Future<Pagina<TurmaVinculada>> buscar(int offset) =>
      _turmas.minhas(usuarioId: usuarioId, offset: offset);

  @override
  (Pagina<TurmaVinculada>, DateTime)? emCache() => _turmas.minhasEmCache(usuarioId);

  @override
  Future<void> carregar() => Future.wait([super.carregar(), _carregarRecentes()]);

  /// Também chamada quando uma solicitação muda (recarga cruzada, RM-19).
  @override
  Future<void> recarregar() => Future.wait([super.recarregar(), _carregarRecentes()]);

  bool _recarregandoPorMudanca = false;
  bool _outraMudanca = false;

  /// Avisos seguidos viram no máximo uma recarga em curso e uma depois dela.
  Future<void> _aoMudar() async {
    if (_recarregandoPorMudanca) {
      _outraMudanca = true;
      return;
    }
    _recarregandoPorMudanca = true;
    try {
      do {
        _outraMudanca = false;
        await recarregar();
      } while (_outraMudanca && !_descartado);
    } finally {
      _recarregandoPorMudanca = false;
    }
  }

  @override
  void dispose() {
    _descartado = true;
    _mudancas.removeListener(_aoMudar);
    super.dispose();
  }

  Future<void> _carregarRecentes() async {
    if (!aluno) return;
    final pedido = ++_pedidoRecentes;
    try {
      final recentes = (await _solicitacoes.minhas(limit: quantasRecentes)).items;
      if (pedido != _pedidoRecentes) return;
      _recentes = recentes;
    } on ApiFailure {
      if (pedido != _pedidoRecentes) return;
      _recentes = null;
    }
    notifyListeners();
  }
}

/// T07 — turmas abertas a solicitação, só para o aluno (RM-19, RM-20). Sem cache (contrato §6).
class DisponiveisController extends ControllerDeLista<Turma> {
  DisponiveisController(this._turmas, this._solicitacoes, this._mudancas);

  final TurmasRepository _turmas;
  final SolicitacoesRepository _solicitacoes;
  final MudancasDeSolicitacao _mudancas;
  final _enviando = <String>{};

  /// A API recusou por perfil — na primeira carga, numa recarga ou ao carregar mais: a tela
  /// explica e volta a Minhas turmas (contrato §6).
  ApiFailure? get falhaDePermissao => [
    lista.falha,
    ultimaFalha,
    lista.falhaAoCarregarMais,
  ].firstWhere((f) => f?.code == 'SEM_PERMISSAO', orElse: () => null);

  bool get semPermissao => falhaDePermissao != null;

  bool enviando(String turmaId) => _enviando.contains(turmaId);

  @override
  Future<Pagina<Turma>> buscar(int offset) => _turmas.disponiveis(offset: offset);

  /// Pede inscrição (contrato §7). Só depois do 201 a turma sai da lista (RM-23); a falha volta
  /// para a tela explicar, e as que dizem que a turma mudou recarregam a lista. Um segundo toque
  /// durante o envio é ignorado.
  Future<ApiFailure?> solicitar(Turma turma) async {
    if (!_enviando.add(turma.id)) return null;
    notifyListeners();
    try {
      await _solicitacoes.criar(turma.id);
    } on ApiFailure catch (falha) {
      _enviando.remove(turma.id);
      // A turma ou o pedido mudou na API: Minhas turmas também fica desatualizada.
      if (falha.efeito == EfeitoFalha.recarrega || falha.efeito == EfeitoFalha.abreSolicitacoes) {
        _mudancas.avisar();
      }
      if (falha.efeito == EfeitoFalha.recarrega) {
        await recarregar();
      } else {
        notifyListeners();
      }
      return falha;
    }
    _enviando.remove(turma.id);
    final restantes = lista.itens.where((t) => t.id != turma.id).toList();
    lista.substituir(restantes, lista.total - (lista.itens.length - restantes.length));
    _mudancas.avisar();
    notifyListeners();
    return null;
  }
}
