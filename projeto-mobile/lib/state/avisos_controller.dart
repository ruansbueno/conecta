import 'package:flutter/foundation.dart';

import '../models/aviso.dart';
import '../repositories/avisos_repository.dart';
import '../services/api_failure.dart';

enum EstadoLista { carregando, conteudo, vazio, erro }

/// Estado de uma lista paginada (RM-32): os quatro estados, fim de lista e dados guardados.
class ListaAvisos {
  EstadoLista estado = EstadoLista.carregando;
  final itens = <Aviso>[];
  int total = 0;
  ApiFailure? falha;
  ApiFailure? falhaAoCarregarMais;
  bool carregandoMais = false;
  bool carregada = false;

  /// Muda a cada substituição da lista: respostas de "carregar mais" de antes são descartadas.
  int geracao = 0;

  /// Número da carga ou recarga mais recente: só a resposta dela é aplicada.
  int pedido = 0;

  /// A carga ou recarga do pedido mais recente, até terminar.
  Future<void> vigente = Future.value();

  /// Data dos dados quando a tela mostra o cache por falta de rede; `null` com dados frescos.
  DateTime? dadosDe;

  bool get temMais => dadosDe == null && itens.length < total;
}

/// Lista de avisos ativos e arquivados, com paginação por rolagem (D7).
class AvisosController extends ChangeNotifier {
  AvisosController(this._repo, {required this.usuarioId});

  final AvisosRepository _repo;
  final String usuarioId;

  final _listas = {SituacaoAviso.ativo: ListaAvisos(), SituacaoAviso.arquivado: ListaAvisos()};

  SituacaoAviso _situacao = SituacaoAviso.ativo;
  ApiFailure? _ultimaFalha;
  bool _descartado = false;

  SituacaoAviso get situacao => _situacao;
  ListaAvisos get lista => _listas[_situacao]!;

  /// Falha de uma recarga que manteve a lista na tela (para um aviso breve).
  ApiFailure? get ultimaFalha => _ultimaFalha;

  Future<void> alternar(SituacaoAviso situacao) async {
    _situacao = situacao;
    notifyListeners();
    if (!lista.carregada) await carregar();
  }

  /// Primeira carga: sem rede, cai no cache (só ativos) ou no estado de erro.
  Future<void> carregar() {
    final alvo = lista;
    final pedido = ++alvo.pedido;
    alvo
      ..estado = EstadoLista.carregando
      ..falha = null;
    notifyListeners();
    return alvo.vigente = _carregar(alvo, _situacao, pedido);
  }

  Future<void> _carregar(ListaAvisos alvo, SituacaoAviso situacao, int pedido) async {
    try {
      final pagina = await _repo.listar(usuarioId: usuarioId, situacao: situacao);
      if (pedido != alvo.pedido) return alvo.vigente;
      _substituir(alvo, pagina.items, pagina.total);
    } on ApiFailure catch (falha) {
      if (pedido != alvo.pedido) return alvo.vigente;
      final emCache = situacao == SituacaoAviso.ativo ? _repo.avisosEmCache(usuarioId) : null;
      if (emCache != null && falha.efeito == EfeitoFalha.repetir) {
        final (pagina, coletadoEm) = emCache;
        _substituir(alvo, pagina.items, pagina.total, dadosDe: coletadoEm);
      } else {
        alvo
          ..estado = EstadoLista.erro
          ..falha = falha
          ..carregada = true;
      }
    }
    notifyListeners();
  }

  /// Puxar para recarregar (RM-15): falhando, mantém o que já estava na tela. Superada por um
  /// pedido mais novo, termina junto com ele: quem puxou vê o resultado (e a falha) que valeu.
  Future<void> recarregar() {
    final alvo = lista;
    // Só há o que manter na tela com conteúdo ou vazio; carregando ou com erro, recarregar é uma
    // carga completa (senão uma recarga que falha deixaria a lista presa no esqueleto).
    if (alvo.estado != EstadoLista.conteudo && alvo.estado != EstadoLista.vazio) return carregar();
    final pedido = ++alvo.pedido;
    _ultimaFalha = null;
    return alvo.vigente = _recarregar(alvo, _situacao, pedido);
  }

  Future<void> _recarregar(ListaAvisos alvo, SituacaoAviso situacao, int pedido) async {
    try {
      final pagina = await _repo.listar(usuarioId: usuarioId, situacao: situacao);
      if (pedido != alvo.pedido) return alvo.vigente;
      _substituir(alvo, pagina.items, pagina.total);
    } on ApiFailure catch (falha) {
      if (pedido != alvo.pedido) return alvo.vigente;
      _ultimaFalha = falha;
    }
    notifyListeners();
  }

  /// [repetir] vem do botão "Tentar de novo": a rolagem não insiste numa página que falhou.
  Future<void> carregarMais({bool repetir = false}) async {
    final alvo = lista;
    if (!alvo.temMais || alvo.carregandoMais || alvo.estado != EstadoLista.conteudo) return;
    if (alvo.falhaAoCarregarMais != null && !repetir) return;
    final geracao = alvo.geracao;
    alvo
      ..carregandoMais = true
      ..falhaAoCarregarMais = null;
    notifyListeners();
    try {
      final pagina = await _repo.listar(
        usuarioId: usuarioId,
        situacao: _situacao,
        offset: alvo.itens.length,
      );
      // A lista foi recarregada nesse meio-tempo: a página é de antes, e a trava pode ser de um
      // pedido novo.
      if (alvo.geracao != geracao) return;
      alvo
        ..itens.addAll(pagina.items)
        ..total = pagina.total
        ..carregandoMais = false;
    } on ApiFailure catch (falha) {
      if (alvo.geracao != geracao) return;
      alvo
        ..falhaAoCarregarMais = falha
        ..carregandoMais = false;
    }
    notifyListeners();
  }

  void _substituir(ListaAvisos alvo, List<Aviso> itens, int total, {DateTime? dadosDe}) {
    alvo
      ..itens.replaceRange(0, alvo.itens.length, itens)
      ..total = total
      ..dadosDe = dadosDe
      ..falha = null
      ..falhaAoCarregarMais = null
      ..carregada = true
      ..carregandoMais = false
      ..geracao = alvo.geracao + 1
      ..estado = itens.isEmpty ? EstadoLista.vazio : EstadoLista.conteudo;
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
