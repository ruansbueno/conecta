import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Recursos guardados para abrir sem rede (RM-28). Solicitações nunca são guardadas.
enum RecursoCache {
  perfil('perfil'),
  avisosAtivosP1('avisos_ativos_p1'),
  turmasMinhas('turmas_minhas');

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

  static String _chave(String usuarioId, RecursoCache recurso) =>
      'cache:$usuarioId:${recurso.chave}';

  /// Chamado só depois de uma resposta 2xx (quem chama garante).
  Future<void> gravar(
    String usuarioId,
    RecursoCache recurso,
    Map<String, dynamic> dados, {
    DateTime? agora,
  }) => _prefs.setString(
    _chave(usuarioId, recurso),
    jsonEncode({
      'coletado_em': (agora ?? DateTime.now().toUtc()).toIso8601String(),
      'dados': dados,
    }),
  );

  ConteudoGuardado? ler(String usuarioId, RecursoCache recurso) {
    final bruto = _prefs.getString(_chave(usuarioId, recurso));
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

  /// Encerrar a sessão apaga tudo do usuário (RM-30).
  Future<void> apagarUsuario(String usuarioId) async {
    final prefixo = 'cache:$usuarioId:';
    for (final chave in _prefs.getKeys().where((k) => k.startsWith(prefixo)).toList()) {
      await _prefs.remove(chave);
    }
  }
}
