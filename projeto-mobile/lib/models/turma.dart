import 'json.dart';

enum Papel { aluno, docente, desconhecido }

/// Turma em que o usuário tem vínculo (GET /me e GET /turmas/minhas).
class TurmaVinculada {
  const TurmaVinculada({
    required this.id,
    required this.codigo,
    required this.nome,
    this.papel,
    this.semestreCurso,
    this.periodoLetivo,
  });

  factory TurmaVinculada.fromJson(Map<String, dynamic> json) => TurmaVinculada(
    id: json['id'] as String,
    codigo: json['codigo'] as String,
    nome: json['nome'] as String,
    papel: json['papel'] == null
        ? null
        : enumPorNome(Papel.values, json['papel'], Papel.desconhecido),
    semestreCurso: json['semestre_curso'] as int?,
    periodoLetivo: json['periodo_letivo'] as String?,
  );

  final String id;
  final String codigo;
  final String nome;
  final Papel? papel;
  final int? semestreCurso;
  final String? periodoLetivo;

  @override
  bool operator ==(Object other) =>
      other is TurmaVinculada &&
      other.id == id &&
      other.codigo == codigo &&
      other.nome == nome &&
      other.papel == papel &&
      other.semestreCurso == semestreCurso &&
      other.periodoLetivo == periodoLetivo;

  @override
  int get hashCode => Object.hash(id, codigo, nome, papel, semestreCurso, periodoLetivo);
}

/// Turma aberta a solicitação (GET /turmas/disponiveis), sem papel.
class Turma {
  const Turma({
    required this.id,
    required this.codigo,
    required this.nome,
    this.semestreCurso,
    this.periodoLetivo,
  });

  factory Turma.fromJson(Map<String, dynamic> json) => Turma(
    id: json['id'] as String,
    codigo: json['codigo'] as String,
    nome: json['nome'] as String,
    semestreCurso: json['semestre_curso'] as int?,
    periodoLetivo: json['periodo_letivo'] as String?,
  );

  final String id;
  final String codigo;
  final String nome;
  final int? semestreCurso;
  final String? periodoLetivo;

  @override
  bool operator ==(Object other) =>
      other is Turma &&
      other.id == id &&
      other.codigo == codigo &&
      other.nome == nome &&
      other.semestreCurso == semestreCurso &&
      other.periodoLetivo == periodoLetivo;

  @override
  int get hashCode => Object.hash(id, codigo, nome, semestreCurso, periodoLetivo);
}

/// Resumo de turma embutido em uma solicitação.
class TurmaResumo {
  const TurmaResumo({required this.id, required this.codigo, required this.nome});

  factory TurmaResumo.fromJson(Map<String, dynamic> json) => TurmaResumo(
    id: json['id'] as String,
    codigo: json['codigo'] as String,
    nome: json['nome'] as String,
  );

  final String id;
  final String codigo;
  final String nome;

  @override
  bool operator ==(Object other) =>
      other is TurmaResumo && other.id == id && other.codigo == codigo && other.nome == nome;

  @override
  int get hashCode => Object.hash(id, codigo, nome);
}
