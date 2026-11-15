import 'package:flutter/foundation.dart';

import '../models/evento.dart';
import '../models/mes.dart';
import '../models/pagina.dart';
import '../repositories/eventos_repository.dart';
import 'lista_paginada.dart';
import 'mes_controller.dart';

enum VisaoAgenda { proximos, provas, mes }

/// Próximos (ou Provas): os não encerrados, paginados. Só a lista sem filtro tem cache (D-AF2-8).
class EventosController extends ControllerDeLista<Evento> {
  EventosController(this._repo, {required this.usuarioId, this.tipo});

  final EventosRepository _repo;
  final String usuarioId;
  final TipoEvento? tipo;

  @override
  Future<Pagina<Evento>> buscar(int offset) =>
      _repo.proximos(usuarioId: usuarioId, tipo: tipo, offset: offset);

  @override
  (Pagina<Evento>, DateTime)? emCache() => tipo == null ? _repo.proximosEmCache(usuarioId) : null;
}

/// Os chips Próximos · Provas · Mês e o filtro de tipo (plan-f2 D-AF2-2). Cada visão é criada ao
/// ser aberta; mudar o tipo recria Próximos e Mês (o mês aberto continua o mesmo). Voltar ao Mês
/// busca de novo o mês aberto.
class AgendaController extends ChangeNotifier {
  AgendaController(this._repo, {required this.usuarioId});

  final EventosRepository _repo;
  final String usuarioId;

  VisaoAgenda _visao = VisaoAgenda.proximos;
  TipoEvento? _tipo;
  EventosController? _proximos;
  EventosController? _provas;
  MesController? _mes;

  VisaoAgenda get visao => _visao;
  TipoEvento? get tipo => _tipo;

  EventosController get proximos =>
      _proximos ??= EventosController(_repo, usuarioId: usuarioId, tipo: _tipo)..carregar();

  EventosController get provas =>
      _provas ??= EventosController(_repo, usuarioId: usuarioId, tipo: TipoEvento.prova)
        ..carregar();

  /// Mês e dia abertos antes de uma troca de filtro, para o mês recriado continuar neles.
  (Mes, DateTime)? _posicaoDoMes;

  MesController get mes => _mes ??= MesController(
    _repo,
    usuarioId: usuarioId,
    tipo: _tipo,
    mesInicial: _posicaoDoMes?.$1,
    diaInicial: _posicaoDoMes?.$2,
  )..carregar();

  void alternar(VisaoAgenda visao) {
    if (visao == _visao) return;
    _visao = visao;
    // O mês não tem paginação para "puxar" sem querer: voltar a ele já busca de novo o mês aberto,
    // para um evento marcado nesse meio-tempo aparecer sem trocar de mês e voltar.
    if (visao == VisaoAgenda.mes) _mes?.recarregar();
    notifyListeners();
  }

  void filtrar(TipoEvento? tipo) {
    if (tipo == _tipo) return;
    _tipo = tipo;
    _proximos?.dispose();
    _proximos = null;
    // Recriados só quando abertos de novo: sem pedidos para uma visão fora da tela.
    final anterior = _mes;
    if (anterior != null) {
      _posicaoDoMes = (anterior.mes, anterior.diaEscolhido);
      anterior.dispose();
      _mes = null;
    }
    notifyListeners();
  }

  @override
  void dispose() {
    _proximos?.dispose();
    _provas?.dispose();
    _mes?.dispose();
    super.dispose();
  }
}
