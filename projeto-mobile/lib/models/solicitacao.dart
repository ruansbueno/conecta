import 'json.dart';
import 'turma.dart';

enum StatusSolicitacao { pendente, aprovada, recusada, cancelada, desconhecido }

class Solicitacao {
  const Solicitacao({
    required this.id,
    required this.turma,
    required this.status,
    required this.solicitadaEm,
    this.decididaEm,
    this.motivoRecusa,
  });

  factory Solicitacao.fromJson(Map<String, dynamic> json) => Solicitacao(
    id: json['id'] as String,
    turma: TurmaResumo.fromJson(json['turma'] as Map<String, dynamic>),
    status: enumPorNome(StatusSolicitacao.values, json['status'], StatusSolicitacao.desconhecido),
    solicitadaEm: data(json['solicitada_em']),
    decididaEm: dataOuNulo(json['decidida_em']),
    motivoRecusa: json['motivo_recusa'] as String?,
  );

  final String id;
  final TurmaResumo turma;
  final StatusSolicitacao status;
  final DateTime solicitadaEm;
  final DateTime? decididaEm;
  final String? motivoRecusa;

  /// Conveniência de interface: a API responde 409 se o estado mudou (RM-23).
  bool get podeCancelar => status == StatusSolicitacao.pendente;

  @override
  bool operator ==(Object other) =>
      other is Solicitacao &&
      other.id == id &&
      other.turma == turma &&
      other.status == status &&
      other.solicitadaEm == solicitadaEm &&
      other.decididaEm == decididaEm &&
      other.motivoRecusa == motivoRecusa;

  @override
  int get hashCode => Object.hash(id, turma, status, solicitadaEm, decididaEm, motivoRecusa);
}
