import 'package:flutter/foundation.dart';

import '../models/pagina.dart';
import '../models/solicitacao.dart';
import '../models/turma.dart';
import '../repositories/solicitacoes_repository.dart';
import '../repositories/turmas_repository.dart';
import '../services/api_failure.dart';
import 'avisos_controller.dart' show EstadoLista;

/// Lista paginada com os quatro estados (RM-32), como a de avisos.
class ListaPaginada<T> {
  EstadoLista estado = EstadoLista.carregando;
  final itens = <T>[];
  int total = 0;
  ApiFailure? falha;
  ApiFailure? falhaAoCarregarMais;
  bool carregandoMais = false;
  bool carregada = false;

  /// Muda a cada substituição da lista: respostas de "carregar mais" de antes são descartadas.
  int geracao = 0;

  /// Data dos dados quando a tela mostra o cache por falta de rede; `null` com dados frescos.
  DateTime? dadosDe;

  bool get temMais => dadosDe == null && itens.length < total;

  void substituir(List<T> novos, int novoTotal, {DateTime? dadosDe}) {
    itens.replaceRange(0, itens.length, novos);
    total = novoTotal;
    this.dadosDe = dadosDe;
    falha = null;
    falhaAoCarregarMais = null;
    carregada = true;
    carregandoMais = false;
    geracao++;
    estado = novos.isEmpty ? EstadoLista.vazio : EstadoLista.conteudo;
  }

  void falhar(ApiFailure f) {
    estado = EstadoLista.erro;
    falha = f;
    carregada = true;
  }
}

/// Base comum: carregar, puxar para recarregar e carregar mais sobre uma [ListaPaginada].
abstract class _ControllerDeLista<T> extends ChangeNotifier {
  final lista = ListaPaginada<T>();
  ApiFailure? _ultimaFalha;
  bool _descartado = false;

  /// Falha de uma recarga que manteve a lista na tela (para um aviso breve).
  ApiFailure? get ultimaFalha => _ultimaFalha;

  Future<Pagina<T>> buscar(int offset);

  /// Sem rede na primeira carga: o que houver guardado, com a data da coleta.
  (Pagina<T>, DateTime)? emCache() => null;

  Future<void> carregar() async {
    lista
      ..estado = EstadoLista.carregando
      ..falha = null;
    notifyListeners();
    try {
      final pagina = await buscar(0);
      lista.substituir(pagina.items, pagina.total);
    } on ApiFailure catch (falha) {
      final guardado = falha.efeito == EfeitoFalha.repetir ? emCache() : null;
      if (guardado != null) {
        final (pagina, coletadoEm) = guardado;
        lista.substituir(pagina.items, pagina.total, dadosDe: coletadoEm);
      } else {
        lista.falhar(falha);
      }
    }
    notifyListeners();
  }

  /// Puxar para recarregar (RM-15): falhando, mantém o que já estava na tela.
  Future<void> recarregar() async {
    if (!lista.carregada || lista.estado == EstadoLista.erro) return carregar();
    _ultimaFalha = null;
    try {
      final pagina = await buscar(0);
      lista.substituir(pagina.items, pagina.total);
    } on ApiFailure catch (falha) {
      _ultimaFalha = falha;
    }
    notifyListeners();
  }

  /// [repetir] vem do botão "Tentar de novo": a rolagem não insiste numa página que falhou.
  Future<void> carregarMais({bool repetir = false}) async {
    if (!lista.temMais || lista.carregandoMais || lista.estado != EstadoLista.conteudo) return;
    if (lista.falhaAoCarregarMais != null && !repetir) return;
    final geracao = lista.geracao;
    lista
      ..carregandoMais = true
      ..falhaAoCarregarMais = null;
    notifyListeners();
    try {
      final pagina = await buscar(lista.itens.length);
      if (lista.geracao != geracao) return; // a lista foi recarregada nesse meio-tempo
      lista
        ..itens.addAll(pagina.items)
        ..total = pagina.total;
    } on ApiFailure catch (falha) {
      if (lista.geracao == geracao) lista.falhaAoCarregarMais = falha;
    } finally {
      lista.carregandoMais = false;
      notifyListeners();
    }
  }

  @override
  void notifyListeners() {
    // Respostas que chegam depois de a tela sair (logout, troca de aba) não notificam ninguém.
    if (!_descartado) super.notifyListeners();
  }

  @override
  void dispose() {
    _descartado = true;
    super.dispose();
  }
}

/// T06 — minhas turmas e, para o aluno, as três solicitações mais recentes (RM-18).
class MinhasTurmasController extends _ControllerDeLista<TurmaVinculada> {
  MinhasTurmasController(
    this._turmas,
    this._solicitacoes, {
    required this.usuarioId,
    required this.aluno,
  });

  static const quantasRecentes = 3;

  final TurmasRepository _turmas;
  final SolicitacoesRepository _solicitacoes;
  final String usuarioId;
  final bool aluno;

  List<Solicitacao>? _recentes;

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

  /// Também usada depois de solicitar ou cancelar (recarga cruzada, RM-19).
  @override
  Future<void> recarregar() => Future.wait([super.recarregar(), _carregarRecentes()]);

  Future<void> _carregarRecentes() async {
    if (!aluno) return;
    try {
      _recentes = (await _solicitacoes.minhas(limit: quantasRecentes)).items;
    } on ApiFailure {
      _recentes = null;
    }
    notifyListeners();
  }
}

/// T07 — turmas abertas a solicitação, só para o aluno (RM-19, RM-20). Sem cache (contrato §6).
class DisponiveisController extends _ControllerDeLista<Turma> {
  DisponiveisController(this._turmas);

  final TurmasRepository _turmas;

  /// A API recusou por perfil: a tela explica e volta a Minhas turmas (contrato §6).
  bool get semPermissao => lista.falha?.code == 'SEM_PERMISSAO';

  @override
  Future<Pagina<Turma>> buscar(int offset) => _turmas.disponiveis(offset: offset);
}
