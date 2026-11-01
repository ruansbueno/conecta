/// Aula da grade semanal (contracts E3 §3). `inicio` e `fim` são horas locais `HH:MM`, sem data:
/// a grade é recorrência semanal e não passa por conversão de fuso.
class Aula {
  const Aula({
    required this.id,
    required this.turmaId,
    required this.diaSemana,
    required this.inicio,
    required this.fim,
    required this.disciplina,
    required this.local,
    required this.docenteNome,
  });

  factory Aula.fromJson(Map<String, dynamic> json) {
    final docente = json['docente'] as Map<String, dynamic>?;
    return Aula(
      id: json['id'] as String,
      turmaId: json['turma_id'] as String,
      diaSemana: json['dia_semana'] as int,
      inicio: json['inicio'] as String,
      fim: json['fim'] as String,
      disciplina: json['disciplina'] as String,
      local: json['local'] as String?,
      docenteNome: docente?['nome'] as String?,
    );
  }

  final String id;
  final String turmaId;

  /// 1 = segunda … 7 = domingo.
  final int diaSemana;
  final String inicio;
  final String fim;
  final String disciplina;
  final String? local;
  final String? docenteNome;

  @override
  bool operator ==(Object other) =>
      other is Aula &&
      other.id == id &&
      other.turmaId == turmaId &&
      other.diaSemana == diaSemana &&
      other.inicio == inicio &&
      other.fim == fim &&
      other.disciplina == disciplina &&
      other.local == local &&
      other.docenteNome == docenteNome;

  @override
  int get hashCode =>
      Object.hash(id, turmaId, diaSemana, inicio, fim, disciplina, local, docenteNome);
}
