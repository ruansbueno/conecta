import 'package:flutter/foundation.dart';

import '../models/evento.dart';
import '../models/mes.dart';
import '../repositories/eventos_repository.dart';
import '../services/api_failure.dart';
import 'avisos_controller.dart' show EstadoLista;

/// Visão de mês (plan-f2 D-AF2-4): a janela da grade, os eventos dela e o dia escolhido. Só o mês
/// de hoje, sem filtro de tipo, vai para o cache (D-AF2-8).
class MesController extends ChangeNotifier {
  MesController(
    this._repo, {
    required this.usuarioId,
    this.tipo,
    Mes? mesInicial,
    DateTime? diaInicial,
    DateTime Function()? agora,
  }) : _agora = agora ?? DateTime.now {
    mes = mesInicial ?? Mes.de(_agora());
    diaEscolhido = diaInicial ?? _diaInicial(mes);
  }

  final EventosRepository _repo;
  final String usuarioId;
  final TipoEvento? tipo;
  final DateTime Function() _agora;

  late Mes mes;
  late DateTime diaEscolhido;
  EstadoLista estado = EstadoLista.carregando;
  List<Evento> eventos = const [];

  /// Eventos que tocam a janela; acima do que veio, o mês está incompleto.
  int total = 0;
  ApiFailure? falha;

  /// Data dos dados quando a tela mostra o cache por falta de rede.
  DateTime? dadosDe;

  int _pedido = 0;
  bool _descartado = false;

  DateTime get hoje => _agora();
  bool get incompleto => total > eventos.length;
  List<Evento> get doDiaEscolhido => eventosDoDia(eventos, diaEscolhido);

  /// Hoje, se estiver no mês; senão, o dia 1.
  DateTime _diaInicial(Mes m) {
    final h = _agora();
    return m.contem(h) ? DateTime(h.year, h.month, h.day) : DateTime(m.ano, m.mes);
  }

  Future<void> carregar() async {
    final pedido = ++_pedido;
    final alvo = mes;
    estado = EstadoLista.carregando;
    falha = null;
    notifyListeners();
    final janela = janelaDaGrade(alvo);
    try {
      final pagina = await _repo.doMes(
        usuarioId: usuarioId,
        chave: alvo.chave,
        de: janela.de,
        ate: janela.ate,
        tipo: tipo,
        guardar: alvo == Mes.de(_agora()),
      );
      if (pedido != _pedido) return;
      _aplicar(pagina.items, pagina.total);
    } on ApiFailure catch (f) {
      if (pedido != _pedido) return;
      final guardado = f.efeito == EfeitoFalha.repetir && tipo == null
          ? _repo.mesEmCache(usuarioId, alvo.chave)
          : null;
      if (guardado != null) {
        _aplicar(guardado.$1.items, guardado.$1.total, dadosDe: guardado.$2);
      } else {
        estado = EstadoLista.erro;
        falha = f;
      }
    }
    notifyListeners();
  }

  void _aplicar(List<Evento> itens, int novoTotal, {DateTime? dadosDe}) {
    eventos = itens;
    total = novoTotal;
    this.dadosDe = dadosDe;
    estado = EstadoLista.conteudo;
  }

  void irPara(Mes novo) {
    mes = novo;
    diaEscolhido = _diaInicial(novo);
    carregar();
  }

  void escolher(DateTime dia) {
    diaEscolhido = DateTime(dia.year, dia.month, dia.day);
    notifyListeners();
  }

  @override
  void notifyListeners() {
    if (!_descartado) super.notifyListeners();
  }

  @override
  void dispose() {
    _descartado = true;
    super.dispose();
  }
}
