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

/// Turmas e solicitações no formato do contrato (§5, §6 e §8).
Map<String, dynamic> turmaMapa(
  String codigo, {
  String? nome,
  String? papel,
  int? semestre = 3,
  String? periodo = '2026/2',
}) => {
  'id': 'turma-$codigo',
  'codigo': codigo,
  'nome': nome ?? 'Turma $codigo',
  'semestre_curso': semestre,
  'periodo_letivo': periodo,
  'papel': ?papel,
};

String paginaJson(List<Map<String, dynamic>> itens, {int? total, int limit = 20, int offset = 0}) =>
    jsonEncode({'items': itens, 'total': total ?? itens.length, 'limit': limit, 'offset': offset});

Map<String, dynamic> solicitacaoMapa(
  String id, {
  String codigo = 'TADS-5A-2026-2',
  String nome = 'TADS 5º Sem A',
  String status = 'pendente',
  String solicitadaEm = '2026-10-10T13:00:00Z',
  String? decididaEm,
  String? motivoRecusa,
}) => {
  'id': id,
  'turma': {'id': 'turma-$codigo', 'codigo': codigo, 'nome': nome},
  'status': status,
  'solicitada_em': solicitadaEm,
  'decidida_em': decididaEm,
  'motivo_recusa': motivoRecusa,
};

/// Eventos e aulas no formato da E3 (contracts E3 §1–3).
Map<String, dynamic> eventoMapa(
  String id, {
  String titulo = 'Evento',
  String tipo = 'palestra',
  required DateTime inicio,
  DateTime? fim,
  String? local = 'Auditório',
  String? descricao,
  String? editadoEm,
  List<Map<String, dynamic>>? destinos,
}) => {
  'id': id,
  'titulo': titulo,
  'descricao': descricao,
  'tipo': tipo,
  'inicio': inicio.toUtc().toIso8601String(),
  'fim': fim?.toUtc().toIso8601String(),
  'local': local,
  'autor': {'id': 'autor-1', 'nome': 'Marina Duarte'},
  'situacao': 'ativo',
  'editado_em': editadoEm,
  'destinos':
      destinos ??
      [
        {'tipo': 'todos', 'turma': null, 'semestre': null},
      ],
};

Map<String, dynamic> aulaMapa(
  String id, {
  String turmaId = 'turma-SI-3A',
  int diaSemana = 1,
  String inicio = '19:10',
  String fim = '20:50',
  String disciplina = 'Banco de Dados II',
  String? local = 'Lab 4',
  Map<String, dynamic>? docente = const {'id': 'doc-1', 'nome': 'Helena Prado'},
}) => {
  'id': id,
  'turma_id': turmaId,
  'dia_semana': diaSemana,
  'inicio': inicio,
  'fim': fim,
  'disciplina': disciplina,
  'local': local,
  'docente': docente,
};
