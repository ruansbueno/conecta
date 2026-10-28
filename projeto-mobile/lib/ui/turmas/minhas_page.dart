import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config/rotas.dart';
import '../../models/solicitacao.dart';
import '../../models/turma.dart';
import '../../models/usuario.dart';
import '../../repositories/solicitacoes_repository.dart';
import '../../repositories/turmas_repository.dart';
import '../../state/avisos_controller.dart' show EstadoLista;
import '../../state/session_controller.dart';
import '../../state/turmas_controller.dart';
import '../../theme/cores.dart';
import '../../theme/tipografia.dart';
import '../comum/datas.dart';
import '../comum/esqueleto_lista.dart';
import '../comum/estado_erro.dart';
import '../comum/estado_vazio.dart';
import '../comum/faixa_cache.dart';
import '../comum/selo_situacao.dart';
import 'rodape_lista.dart';
import 'turma_card.dart';

/// T06 — minhas turmas, o atalho para pedir inscrição e as solicitações recentes (design m-06).
class MinhasTurmasPage extends StatelessWidget {
  const MinhasTurmasPage({super.key});

  @override
  Widget build(BuildContext context) {
    final usuario = context.read<SessionController>().usuario!;
    return ChangeNotifierProvider(
      create: (_) => MinhasTurmasController(
        context.read<TurmasRepository>(),
        context.read<SolicitacoesRepository>(),
        usuarioId: usuario.id,
        aluno: usuario.podeSolicitarInscricao,
      )..carregar(),
      child: _Minhas(perfil: usuario.perfil),
    );
  }
}

/// Abre as turmas disponíveis e, se algo mudou lá (fase 6: solicitação enviada), recarrega
/// turmas e solicitações (recarga cruzada, RM-19).
Future<void> abrirDisponiveis(BuildContext context, {MinhasTurmasController? controller}) async {
  final mudou = await Navigator.of(context).pushNamed(Rotas.turmasDisponiveis);
  if (mudou == true) await controller?.recarregar();
}

class _Minhas extends StatelessWidget {
  const _Minhas({required this.perfil});

  final Perfil perfil;

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<MinhasTurmasController>();
    final turmas = controller.turmas;
    return Scaffold(
      appBar: AppBar(title: const Text('Minhas turmas'), toolbarHeight: 60, titleSpacing: 20),
      backgroundColor: Cores.fundoPagina,
      body: Column(
        children: [
          if (turmas.dadosDe != null)
            FaixaCache(coletadoEm: turmas.dadosDe!, onRepetir: controller.carregar),
          Expanded(child: _corpo(context, controller)),
        ],
      ),
    );
  }

  Widget _corpo(BuildContext context, MinhasTurmasController controller) {
    final turmas = controller.turmas;
    return switch (turmas.estado) {
      EstadoLista.carregando => const EsqueletoLista(),
      EstadoLista.erro => EstadoErro(
        mensagem: turmas.falha!.mensagem,
        onRepetir: controller.carregar,
      ),
      EstadoLista.vazio when !controller.aluno => RefreshIndicator(
        onRefresh: () => _recarregar(context),
        child: LayoutBuilder(
          builder: (context, limites) => SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: SizedBox(height: limites.maxHeight, child: _vazioSemVinculo()),
          ),
        ),
      ),
      _ => RefreshIndicator(
        onRefresh: () => _recarregar(context),
        child: NotificationListener<ScrollNotification>(
          onNotification: (n) {
            // Próxima página ao passar de 80% da rolagem (D7).
            if (n.metrics.axis == Axis.vertical &&
                n.metrics.pixels >= n.metrics.maxScrollExtent * 0.8) {
              controller.carregarMais();
            }
            return false;
          },
          child: ListView(
            key: const Key('lista-turmas'),
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            children: [
              if (turmas.itens.isEmpty)
                const _SemTurmasAluno()
              else ...[
                Text(_resumo(turmas), style: Tipografia.apoio),
                const SizedBox(height: 16),
                for (final t in turmas.itens) ...[TurmaCard(turma: t), const SizedBox(height: 12)],
                RodapeLista(lista: turmas, onRepetir: () => controller.carregarMais(repetir: true)),
              ],
              if (controller.aluno) ...[
                const SizedBox(height: 8),
                _EntrarEmOutraTurma(
                  onAbrir: () => abrirDisponiveis(context, controller: controller),
                ),
              ],
              if (controller.recentes case final recentes? when recentes.isNotEmpty) ...[
                const SizedBox(height: 28),
                Text(
                  'Minhas solicitações',
                  style: Tipografia.subtitulo.copyWith(color: Cores.apagado),
                ),
                const SizedBox(height: 12),
                for (final s in recentes) ...[
                  _SolicitacaoRecente(solicitacao: s),
                  const SizedBox(height: 12),
                ],
              ],
            ],
          ),
        ),
      ),
    };
  }

  Future<void> _recarregar(BuildContext context) async {
    final controller = context.read<MinhasTurmasController>();
    final mensageiro = ScaffoldMessenger.of(context);
    await controller.recarregar();
    final falha = controller.ultimaFalha;
    if (falha != null) mensageiro.showSnackBar(SnackBar(content: Text(falha.mensagem)));
  }

  /// "Você participa de 3 turmas em 2026/2". O período só quando todas estão carregadas e são do
  /// mesmo; sem rede, diz quantas das guardadas aparecem (o cache tem só a primeira página).
  static String _resumo(ListaPaginada<TurmaVinculada> turmas) {
    final todas = turmas.itens.length == turmas.total;
    final periodos = turmas.itens.map((t) => t.periodoLetivo).toSet();
    final periodo = todas && periodos.length == 1 ? periodos.single : null;
    final quantas = turmas.total == 1 ? '1 turma' : '${turmas.total} turmas';
    final resumo = periodo == null
        ? 'Você participa de $quantas'
        : 'Você participa de $quantas em $periodo';
    if (turmas.dadosDe != null && !todas) {
      return '$resumo. Sem conexão, aparecem as ${turmas.itens.length} guardadas.';
    }
    return resumo;
  }

  Widget _vazioSemVinculo() => EstadoVazio(
    icone: Icons.school_outlined,
    titulo: 'Nenhuma turma vinculada',
    texto: perfil == Perfil.docente
        ? 'As turmas em que você leciona aparecem aqui depois que a coordenação fizer o vínculo.'
        : 'A coordenação e a administração acompanham todas as turmas pela plataforma web. '
              'Aqui aparecem só as turmas em que você tem vínculo.',
  );
}

class _SemTurmasAluno extends StatelessWidget {
  const _SemTurmasAluno();

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 16),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Você ainda não participa de nenhuma turma', style: Tipografia.subtitulo),
        const SizedBox(height: 6),
        const Text(
          'Peça inscrição em uma turma aberta. Seus avisos de turma aparecem depois da aprovação.',
          style: Tipografia.apoio,
        ),
      ],
    ),
  );
}

/// Atalho só para aluno (RM-20).
class _EntrarEmOutraTurma extends StatelessWidget {
  const _EntrarEmOutraTurma({required this.onAbrir});

  final VoidCallback onAbrir;

  @override
  Widget build(BuildContext context) => CaixaCartao(
    child: LinhaComAcao(
      conteudo: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Entrar em outra turma', style: Tipografia.tituloCartao),
          const SizedBox(height: 4),
          const Text(
            'A inscrição passa pela aprovação da coordenação ou do docente.',
            style: Tipografia.apoio,
          ),
        ],
      ),
      acao: OutlinedButton(onPressed: onAbrir, child: const Text('Ver turmas')),
    ),
  );
}

class _SolicitacaoRecente extends StatelessWidget {
  const _SolicitacaoRecente({required this.solicitacao});

  final Solicitacao solicitacao;

  @override
  Widget build(BuildContext context) {
    final s = solicitacao;
    final decidida = s.decididaEm ?? s.solicitadaEm;
    final (linha, selo) = switch (s.status) {
      StatusSolicitacao.pendente => (
        'Enviada em ${dataDiaMes(s.solicitadaEm)}',
        const SeloSituacao('Pendente', tom: TomSelo.alerta),
      ),
      StatusSolicitacao.aprovada => (
        'Aprovada em ${dataDiaMes(decidida)}',
        const SeloSituacao('Aprovada', tom: TomSelo.sucesso),
      ),
      StatusSolicitacao.recusada => (
        'Recusada em ${dataDiaMes(decidida)}',
        const SeloSituacao('Recusada', tom: TomSelo.perigo),
      ),
      StatusSolicitacao.cancelada => (
        'Cancelada em ${dataDiaMes(decidida)}',
        const SeloSituacao('Cancelada', tom: TomSelo.neutro),
      ),
      StatusSolicitacao.desconhecido => ('Enviada em ${dataDiaMes(s.solicitadaEm)}', null),
    };
    return MergeSemantics(
      child: CaixaCartao(
        child: LinhaComAcao(
          conteudo: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(s.turma.nome, style: Tipografia.tituloCartao),
              const SizedBox(height: 2),
              Text(linha, style: Tipografia.meta),
            ],
          ),
          acao: selo ?? const SizedBox.shrink(),
        ),
      ),
    );
  }
}
