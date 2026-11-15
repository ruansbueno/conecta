import 'package:flutter/foundation.dart';

import '../models/aula.dart';
import '../repositories/horarios_repository.dart';
import '../services/api_failure.dart';
import 'avisos_controller.dart' show EstadoLista;

/// Horários do docente (emenda E3.1 da API, RF-54): as aulas dele em todas as turmas, de
/// `GET /horarios/minhas`. Sem rede, as guardadas, com a data da coleta.
class MinhasAulasController extends ChangeNotifier {
  MinhasAulasController(this._repo, {required this.usuarioId});

  final HorariosRepository _repo;
  final String usuarioId;

  EstadoLista estado = EstadoLista.carregando;
  List<Aula> aulas = const [];
  ApiFailure? falha;

  /// Data dos dados quando a tela mostra o cache por falta de rede.
  DateTime? dadosDe;

  int _pedido = 0;
  bool _descartado = false;

  /// Falha de uma recarga que manteve as aulas na tela (para um aviso breve).
  ApiFailure? ultimaFalha;

  /// Primeira carga e "Tentar de novo" do erro.
  Future<void> carregar() async {
    final pedido = ++_pedido;
    estado = EstadoLista.carregando;
    falha = null;
    notifyListeners();
    try {
      final novas = await _repo.minhasAulas(usuarioId: usuarioId);
      if (pedido != _pedido) return;
      _aplicar(novas);
    } on ApiFailure catch (f) {
      if (pedido != _pedido) return;
      final guardado = f.efeito == EfeitoFalha.repetir ? _repo.minhasAulasEmCache(usuarioId) : null;
      if (guardado != null) {
        _aplicar(guardado.$1, dadosDe: guardado.$2);
      } else {
        estado = EstadoLista.erro;
        falha = f;
      }
    }
    notifyListeners();
  }

  /// Puxar para atualizar e "Tentar de novo" da faixa: busca de novo sem tirar as aulas da tela.
  /// Falhando, o que estava fica e a falha vai para [ultimaFalha]. Sem nada na tela, é uma carga.
  Future<void> recarregar() async {
    ultimaFalha = null;
    if (estado != EstadoLista.conteudo && estado != EstadoLista.vazio) return carregar();
    final pedido = ++_pedido;
    try {
      final novas = await _repo.minhasAulas(usuarioId: usuarioId);
      if (pedido != _pedido) return;
      _aplicar(novas);
    } on ApiFailure catch (f) {
      if (pedido != _pedido) return;
      ultimaFalha = f;
    }
    notifyListeners();
  }

  void _aplicar(List<Aula> novas, {DateTime? dadosDe}) {
    aulas = novas;
    this.dadosDe = dadosDe;
    estado = novas.isEmpty ? EstadoLista.vazio : EstadoLista.conteudo;
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
