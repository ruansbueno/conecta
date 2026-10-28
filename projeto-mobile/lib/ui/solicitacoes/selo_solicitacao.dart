import '../../models/solicitacao.dart';
import '../comum/selo_situacao.dart';

/// Selo de cada status; `null` para um status que o app não conhece.
SeloSituacao? seloDaSolicitacao(StatusSolicitacao status) => switch (status) {
  StatusSolicitacao.pendente => const SeloSituacao('Pendente', tom: TomSelo.alerta),
  StatusSolicitacao.aprovada => const SeloSituacao('Aprovada', tom: TomSelo.sucesso),
  StatusSolicitacao.recusada => const SeloSituacao('Recusada', tom: TomSelo.perigo),
  StatusSolicitacao.cancelada => const SeloSituacao('Cancelada', tom: TomSelo.neutro),
  StatusSolicitacao.desconhecido => null,
};
