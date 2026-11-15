import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Recursos guardados para abrir sem rede (RM-28). Solicitações nunca são guardadas.
enum RecursoCache {
  perfil('perfil'),
  avisosAtivosP1('avisos_ativos_p1'),
  turmasMinhas('turmas_minhas'),

  /// F2 (plan-f2 D-AF2-8): primeira página de Próximos sem filtro, o mês corrente e a grade de
  /// cada turma aberta (com o id da turma como sufixo).
  agendaProximosP1('agenda_proximos_p1'),
  agendaMes('agenda_mes'),
  horarios('horarios'),

  /// Turma escolhida em Horários: só o id, lembrado por usuário.
  horariosTurma('horarios_turma'),

  /// Aulas do docente em todas as turmas (emenda E3.1 da API).
  aulasDoDocente('aulas_do_docente');

  const RecursoCache(this.chave);
  final String chave;
}

class ConteudoGuardado {
  const ConteudoGuardado({required this.dados, required this.coletadoEm});

  final Map<String, dynamic> dados;
  final DateTime coletadoEm;

  Duration idade({DateTime? agora}) => (agora ?? DateTime.now().toUtc()).difference(coletadoEm);
}

/// JSON bruto das respostas, por usuário: `cache:{usuarioId}:{recurso}` (D5).
class CacheLocal {
  CacheLocal(this._prefs);

  final SharedPreferences _prefs;

  static String _chave(String usuarioId, RecursoCache recurso, String? sufixo) =>
      'cache:$usuarioId:${recurso.chave}${sufixo == null ? '' : ':$sufixo'}';

  /// Chamado só depois de uma resposta 2xx (quem chama garante).
  Future<void> gravar(
    String usuarioId,
    RecursoCache recurso,
    Map<String, dynamic> dados, {
    String? sufixo,
    DateTime? agora,
  }) => _prefs.setString(
    _chave(usuarioId, recurso, sufixo),
    jsonEncode({
      'coletado_em': (agora ?? DateTime.now().toUtc()).toIso8601String(),
      'dados': dados,
    }),
  );

  ConteudoGuardado? ler(String usuarioId, RecursoCache recurso, {String? sufixo}) {
    final bruto = _prefs.getString(_chave(usuarioId, recurso, sufixo));
    if (bruto == null) return null;
    try {
      final json = jsonDecode(bruto) as Map<String, dynamic>;
      return ConteudoGuardado(
        dados: json['dados'] as Map<String, dynamic>,
        coletadoEm: DateTime.parse(json['coletado_em'] as String).toUtc(),
      );
    } on Object {
      return null; // entrada corrompida: como se não houvesse cache
    }
  }

  Future<void> apagar(String usuarioId, RecursoCache recurso, {String? sufixo}) =>
      _prefs.remove(_chave(usuarioId, recurso, sufixo));

  /// Encerrar a sessão apaga tudo do usuário (RM-30).
  Future<void> apagarUsuario(String usuarioId) async {
    final prefixo = 'cache:$usuarioId:';
    for (final chave in _prefs.getKeys().where((k) => k.startsWith(prefixo)).toList()) {
      await _prefs.remove(chave);
    }
  }
}
