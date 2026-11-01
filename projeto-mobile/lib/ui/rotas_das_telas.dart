import '../config/rotas.dart';
import '../models/aviso.dart';
import 'agenda/detalhe_page.dart';
import 'avisos/detalhe_page.dart';
import 'solicitacoes/lista_page.dart';
import 'turmas/disponiveis_page.dart';

/// Liga cada nome de [Rotas] à sua tela; chamado no `main` e nos testes.
void registrarRotas() {
  Rotas.registrar(Rotas.avisoDetalhe, (argumento) => AvisoDetalhePage(aviso: argumento! as Aviso));
  Rotas.registrar(Rotas.turmasDisponiveis, (_) => const DisponiveisPage());
  Rotas.registrar(Rotas.solicitacoes, (_) => const SolicitacoesPage());
  Rotas.registrar(Rotas.eventoDetalhe, EventoDetalhePage.daRota);
}
