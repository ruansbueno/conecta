/// Aula da grade semanal (contracts E3 §3 e §3a). `inicio` e `fim` são horas locais `HH:MM`, sem data:
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
    this.turmaCodigo,
    this.turmaNome,
  });

  factory Aula.fromJson(Map<String, dynamic> json) {
    final docente = json['docente'] as Map<String, dynamic>?;
    // Só nas aulas do docente (`GET /horarios/minhas`, emenda E3.1): a turma de cada aula.
    final turma = json['turma'] as Map<String, dynamic>?;
    return Aula(
      id: json['id'] as String,
      turmaId: json['turma_id'] as String,
      diaSemana: json['dia_semana'] as int,
      inicio: json['inicio'] as String,
      fim: json['fim'] as String,
      disciplina: json['disciplina'] as String,
      local: json['local'] as String?,
      docenteNome: docente?['nome'] as String?,
      turmaCodigo: turma?['codigo'] as String?,
      turmaNome: turma?['nome'] as String?,
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

  /// Turma da aula, só nas aulas do docente; na grade de uma turma, `null`.
  final String? turmaCodigo;
  final String? turmaNome;

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
      other.docenteNome == docenteNome &&
      other.turmaCodigo == turmaCodigo &&
      other.turmaNome == turmaNome;

  @override
  int get hashCode => Object.hash(
    id,
    turmaId,
    diaSemana,
    inicio,
    fim,
    disciplina,
    local,
    docenteNome,
    turmaCodigo,
    turmaNome,
  );
}
