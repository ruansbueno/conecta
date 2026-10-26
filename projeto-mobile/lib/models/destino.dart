import 'json.dart';

enum TipoDestino { todos, turma, semestre, docentes, desconhecido }

/// Um alvo do aviso, como a API devolve. O app só apresenta; não decide visibilidade.
class Destino {
  const Destino({
    required this.tipo,
    required this.tipoBruto,
    this.turmaId,
    this.turmaNome,
    this.semestre,
  });

  factory Destino.fromJson(Map<String, dynamic> json) {
    final turma = json['turma'] as Map<String, dynamic>?;
    return Destino(
      tipo: enumPorNome(TipoDestino.values, json['tipo'], TipoDestino.desconhecido),
      tipoBruto: json['tipo'] as String? ?? '',
      turmaId: turma?['id'] as String?,
      turmaNome: turma?['nome'] as String?,
      semestre: json['semestre'] as int?,
    );
  }

  final TipoDestino tipo;

  /// Valor recebido da API, exibido quando o tipo é novo para o app.
  final String tipoBruto;
  final String? turmaId;
  final String? turmaNome;
  final int? semestre;

  String get rotulo => switch (tipo) {
    TipoDestino.todos => 'Todos',
    TipoDestino.docentes => 'Docentes',
    TipoDestino.semestre => '$semestreº semestre',
    TipoDestino.turma => turmaNome ?? (turmaId ?? '').split('-').first,
    TipoDestino.desconhecido => tipoBruto,
  };

  @override
  bool operator ==(Object other) =>
      other is Destino &&
      other.tipo == tipo &&
      other.tipoBruto == tipoBruto &&
      other.turmaId == turmaId &&
      other.turmaNome == turmaNome &&
      other.semestre == semestre;

  @override
  int get hashCode => Object.hash(tipo, tipoBruto, turmaId, turmaNome, semestre);
}
