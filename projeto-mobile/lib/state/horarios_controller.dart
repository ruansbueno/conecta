import 'package:flutter/foundation.dart';

import '../models/aula.dart';
import '../models/turma.dart';
import '../repositories/horarios_repository.dart';
import '../repositories/turmas_repository.dart';
import '../services/api_failure.dart';
import 'avisos_controller.dart' show EstadoLista;

/// T13 — grade da turma (plan-f2 D-AF2-6, D-AF2-7): as turmas vêm de `GET /turmas/minhas`, a
/// escolhida fica lembrada, e a grade abre do cache sem rede (D-AF2-8).
class HorariosController extends ChangeNotifier {
  HorariosController(this._turmas, this._horarios, {required this.usuarioId});

  final TurmasRepository _turmas;
  final HorariosRepository _horarios;
  final String usuarioId;

  /// Estado das turmas: sem elas não há grade a pedir.
  EstadoLista estado = EstadoLista.carregando;
  List<TurmaVinculada> turmas = const [];
  TurmaVinculada? turma;

  EstadoLista estadoDaGrade = EstadoLista.carregando;
  List<Aula> aulas = const [];
  ApiFailure? falha;

  /// Data dos dados quando a tela mostra o cache por falta de rede.
  DateTime? dadosDe;

  /// Mensagem própria de 403/404 da grade, para um aviso breve; a tela a consome.
  String? aviso;

  /// Mensagem do erro da grade quando nenhuma turma da lista responde (403/404 em todas).
  String? mensagemDaGrade;

  int _pedido = 0;
  bool _descartado = false;

  /// Turmas cuja grade respondeu 403/404 nesta rodada: não são escolhidas de novo mesmo que a
  /// lista ainda as traga (sem isso, uma lista desatualizada daria voltas sem fim).
  final _perdidas = <String>{};
  String? _ultimaPerda;

  Future<void> carregar() async {
    _perdidas.clear();
    return _carregar();
  }

  Future<void> _carregar() async {
    final pedido = ++_pedido;
    estado = EstadoLista.carregando;
    falha = null;
    notifyListeners();
    DateTime? turmasDe;
    try {
      turmas = (await _turmas.minhas(usuarioId: usuarioId)).items;
    } on ApiFailure catch (f) {
      if (pedido != _pedido) return;
      final guardado = f.efeito == EfeitoFalha.repetir ? _turmas.minhasEmCache(usuarioId) : null;
      if (guardado == null) {
        estado = EstadoLista.erro;
        falha = f;
        notifyListeners();
        return;
      }
      turmas = guardado.$1.items;
      turmasDe = guardado.$2;
    }
    if (pedido != _pedido) return;
    if (turmas.isEmpty) {
      turma = null;
      estado = EstadoLista.vazio;
      notifyListeners();
      return;
    }
    estado = EstadoLista.conteudo;
    final lembrada = _horarios.turmaLembrada(usuarioId);
    final possiveis = turmas.where((t) => !_perdidas.contains(t.id)).toList();
    if (possiveis.isEmpty) {
      turma = turmas.first;
      estadoDaGrade = EstadoLista.erro;
      dadosDe = null;
      falha = const ApiFailure(code: 'TURMA_NAO_ENCONTRADA');
      mensagemDaGrade = _ultimaPerda;
      notifyListeners();
      return;
    }
    // Vínculo que sumiu: volta à primeira (D-AF2-6).
    turma = possiveis.firstWhere((t) => t.id == lembrada, orElse: () => possiveis.first);
    await _carregarGrade(pedido, semRede: turmasDe != null);
  }

  Future<void> escolher(TurmaVinculada nova) async {
    // O número do pedido vem antes de qualquer espera: uma resposta da turma anterior que chegue
    // durante o `lembrarTurma` já é descartada.
    final pedido = ++_pedido;
    turma = nova;
    await _horarios.lembrarTurma(usuarioId, nova.id);
    if (pedido != _pedido) return;
    await _carregarGrade(pedido);
  }

  /// "Tentar de novo" da faixa ou do erro: as turmas e a grade.
  Future<void> recarregar() => carregar();

  Future<void> _carregarGrade(int pedido, {bool semRede = false}) async {
    final alvo = turma!;
    estadoDaGrade = EstadoLista.carregando;
    falha = null;
    mensagemDaGrade = null;
    // A faixa de dados guardados é da grade anterior: outra turma pode não ter cache.
    dadosDe = null;
    notifyListeners();
    try {
      // Sem rede nas turmas, nem tenta a grade: vai direto ao que estava guardado.
      if (semRede) throw const ApiFailure(code: ApiFailure.semRede);
      final novas = await _horarios.grade(usuarioId: usuarioId, turmaId: alvo.id);
      if (pedido != _pedido) return;
      _aplicar(novas);
    } on ApiFailure catch (f) {
      if (pedido != _pedido) return;
      final perdida = f.code == 'SEM_PERMISSAO' || f.code == 'TURMA_NAO_ENCONTRADA';
      if (perdida) {
        // O vínculo foi removido ou a turma desativada depois que a lista veio (D-AF2-7).
        aviso = _ultimaPerda = f.code == 'SEM_PERMISSAO'
            ? 'Você não está mais nesta turma.'
            : 'Esta turma não está mais disponível.';
        _perdidas.add(alvo.id);
        await _horarios.esquecerTurma(usuarioId);
        if (pedido != _pedido) return;
        await _carregar();
        return;
      }
      final guardado = f.efeito == EfeitoFalha.repetir
          ? _horarios.gradeEmCache(usuarioId, alvo.id)
          : null;
      if (guardado != null) {
        _aplicar(guardado.$1, dadosDe: guardado.$2);
      } else {
        estadoDaGrade = EstadoLista.erro;
        falha = f;
      }
    }
    notifyListeners();
  }

  void _aplicar(List<Aula> novas, {DateTime? dadosDe}) {
    aulas = novas;
    this.dadosDe = dadosDe;
    estadoDaGrade = novas.isEmpty ? EstadoLista.vazio : EstadoLista.conteudo;
  }

  /// A tela mostra o aviso uma vez.
  String? consumirAviso() {
    final a = aviso;
    aviso = null;
    return a;
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
