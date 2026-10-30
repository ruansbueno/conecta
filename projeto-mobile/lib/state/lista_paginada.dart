import 'package:flutter/foundation.dart';

import '../models/pagina.dart';
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
abstract class ControllerDeLista<T> extends ChangeNotifier {
  final lista = ListaPaginada<T>();
  ApiFailure? _ultimaFalha;
  bool _descartado = false;

  /// Cada carga ou recarga ganha um número; só a resposta do pedido mais recente é aplicada (um
  /// "Tentar de novo" com a carga anterior ainda em curso, uma recarga cruzada).
  int _pedido = 0;

  /// Falha de uma recarga que manteve a lista na tela (para um aviso breve).
  ApiFailure? get ultimaFalha => _ultimaFalha;

  Future<Pagina<T>> buscar(int offset);

  /// Sem rede na primeira carga: o que houver guardado, com a data da coleta.
  (Pagina<T>, DateTime)? emCache() => null;

  Future<void> carregar() async {
    final pedido = ++_pedido;
    lista
      ..estado = EstadoLista.carregando
      ..falha = null;
    notifyListeners();
    try {
      final pagina = await buscar(0);
      if (pedido != _pedido) return;
      lista.substituir(pagina.items, pagina.total);
    } on ApiFailure catch (falha) {
      if (pedido != _pedido) return;
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
    // Só há o que manter na tela com conteúdo ou vazio; carregando ou com erro, recarregar é uma
    // carga completa (senão uma recarga que falha deixaria a lista presa no esqueleto).
    final naTela = lista.estado == EstadoLista.conteudo || lista.estado == EstadoLista.vazio;
    if (!naTela) return carregar();
    final pedido = ++_pedido;
    _ultimaFalha = null;
    try {
      final pagina = await buscar(0);
      if (pedido != _pedido) return;
      lista.substituir(pagina.items, pagina.total);
    } on ApiFailure catch (falha) {
      if (pedido != _pedido) return;
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
      // A lista foi recarregada nesse meio-tempo: a página é de antes, e a trava pode ser de um
      // pedido novo.
      if (lista.geracao != geracao) return;
      lista
        ..itens.addAll(pagina.items)
        ..total = pagina.total
        ..carregandoMais = false;
    } on ApiFailure catch (falha) {
      if (lista.geracao != geracao) return;
      lista
        ..falhaAoCarregarMais = falha
        ..carregandoMais = false;
    }
    notifyListeners();
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
