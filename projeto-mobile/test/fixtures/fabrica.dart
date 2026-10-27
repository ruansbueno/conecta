import 'dart:convert';

/// Avisos sintéticos no formato do contrato, para paginação e listas longas.
Map<String, dynamic> avisoMapa(
  int n, {
  String situacao = 'ativo',
  String? editadoEm,
  List<Map<String, dynamic>>? destinos,
  DateTime? publicadoEm,
}) => {
  'id': 'aviso-${n.toString().padLeft(3, '0')}',
  'titulo': 'Aviso número $n',
  'conteudo': 'Conteúdo do aviso número $n.',
  'autor': {'id': 'autor-1', 'nome': 'Maria Coordenadora'},
  'publicado_em': (publicadoEm ?? DateTime.utc(2026, 10, 1).subtract(Duration(hours: n)))
      .toIso8601String(),
  'editado_em': editadoEm,
  'situacao': situacao,
  'destinos':
      destinos ??
      [
        {'tipo': 'todos', 'turma': null, 'semestre': null},
      ],
};

String paginaAvisosJson({
  required int total,
  int offset = 0,
  int limit = 20,
  String situacao = 'ativo',
}) {
  final fim = (offset + limit).clamp(0, total);
  return jsonEncode({
    'items': [for (var i = offset; i < fim; i++) avisoMapa(i + 1, situacao: situacao)],
    'total': total,
    'limit': limit,
    'offset': offset,
  });
}
