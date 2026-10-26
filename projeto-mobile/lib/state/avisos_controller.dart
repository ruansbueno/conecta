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
  Future<void> carregar() async {
    final alvo = lista;
    final situacao = _situacao;
    alvo
      ..estado = EstadoLista.carregando
      ..falha = null;
    notifyListeners();
    try {
      final pagina = await _repo.listar(usuarioId: usuarioId, situacao: situacao);
      _substituir(alvo, pagina.items, pagina.total);
    } on ApiFailure catch (falha) {
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

  /// Puxar para recarregar (RM-15): falhando, mantém o que já estava na tela.
  Future<void> recarregar() async {
    final alvo = lista;
    if (!alvo.carregada || alvo.estado == EstadoLista.erro) return carregar();
    _ultimaFalha = null;
    try {
      final pagina = await _repo.listar(usuarioId: usuarioId, situacao: _situacao);
      _substituir(alvo, pagina.items, pagina.total);
    } on ApiFailure catch (falha) {
      _ultimaFalha = falha;
    }
    notifyListeners();
  }

  Future<void> carregarMais() async {
    final alvo = lista;
    if (!alvo.temMais || alvo.carregandoMais || alvo.estado != EstadoLista.conteudo) return;
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
      alvo
        ..itens.addAll(pagina.items)
        ..total = pagina.total;
    } on ApiFailure catch (falha) {
      alvo.falhaAoCarregarMais = falha;
    } finally {
      alvo.carregandoMais = false;
      notifyListeners();
    }
  }

  void _substituir(ListaAvisos alvo, List<Aviso> itens, int total, {DateTime? dadosDe}) {
    alvo
      ..itens.replaceRange(0, alvo.itens.length, itens)
      ..total = total
      ..dadosDe = dadosDe
      ..falha = null
      ..falhaAoCarregarMais = null
      ..carregada = true
      ..estado = itens.isEmpty ? EstadoLista.vazio : EstadoLista.conteudo;
  }
}
