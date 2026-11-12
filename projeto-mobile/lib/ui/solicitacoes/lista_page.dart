import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/solicitacao.dart';
import '../../repositories/solicitacoes_repository.dart';
import '../../services/api_failure.dart';
import '../../state/avisos_controller.dart' show EstadoLista;
import '../../state/solicitacoes_controller.dart';
import '../../theme/cores.dart';
import '../../theme/tipografia.dart';
import '../comum/botao_tema.dart';
import '../comum/datas.dart';
import '../comum/esqueleto_lista.dart';
import '../comum/estado_erro.dart';
import '../comum/estado_vazio.dart';
import '../turmas/rodape_lista.dart';
import '../turmas/turma_card.dart';
import 'selo_solicitacao.dart';

/// T09 — minhas solicitações: status, datas, motivo de recusa e cancelamento das pendentes
/// (design m-09, RM-21, RM-22).
class SolicitacoesPage extends StatelessWidget {
  const SolicitacoesPage({super.key});

  @override
  Widget build(BuildContext context) => ChangeNotifierProvider(
    create: (_) => SolicitacoesController(
      context.read<SolicitacoesRepository>(),
      context.read<MudancasDeSolicitacao>(),
    )..carregar(),
    child: Scaffold(
      appBar: AppBar(
        title: const Text('Minhas solicitações'),
        toolbarHeight: 60,
        actions: const [BotaoTema(), SizedBox(width: 8)],
      ),
      backgroundColor: context.cores.fundoPagina,
      body: const _Corpo(),
    ),
  );
}

class _Corpo extends StatelessWidget {
  const _Corpo();

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<SolicitacoesController>();
    final lista = controller.lista;
    return switch (lista.estado) {
      EstadoLista.carregando => const EsqueletoLista(),
      EstadoLista.erro => EstadoErro(
        mensagem: lista.falha!.mensagem,
        onRepetir: controller.carregar,
      ),
      EstadoLista.vazio => RefreshIndicator(
        onRefresh: () => _recarregar(context),
        child: LayoutBuilder(
          builder: (context, limites) => SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: SizedBox(
              height: limites.maxHeight,
              child: const EstadoVazio(
                icone: Icons.outbox_outlined,
                titulo: 'Nenhuma solicitação',
                texto:
                    'Os pedidos de inscrição em turmas aparecem aqui, com a resposta da '
                    'coordenação ou de quem leciona na turma.',
              ),
            ),
          ),
        ),
      ),
      EstadoLista.conteudo => RefreshIndicator(
        onRefresh: () => _recarregar(context),
        child: NotificationListener<ScrollNotification>(
          onNotification: (n) {
            if (n.metrics.axis == Axis.vertical &&
                n.metrics.pixels >= n.metrics.maxScrollExtent * 0.8) {
              controller.carregarMais();
            }
            return false;
          },
          child: ListView(
            key: const Key('lista-solicitacoes'),
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            children: [
              for (final s in lista.itens) ...[
                _SolicitacaoCard(solicitacao: s),
                const SizedBox(height: 12),
              ],
              RodapeLista(
                lista: lista,
                onRepetir: () => controller.carregarMais(repetir: true),
                fim: 'Não há mais solicitações.',
              ),
            ],
          ),
        ),
      ),
    };
  }

  Future<void> _recarregar(BuildContext context) async {
    final controller = context.read<SolicitacoesController>();
    final mensageiro = ScaffoldMessenger.of(context);
    await controller.recarregar();
    final falha = controller.ultimaFalha;
    if (falha != null) mensageiro.showSnackBar(SnackBar(content: Text(falha.mensagem)));
  }
}

class _SolicitacaoCard extends StatelessWidget {
  const _SolicitacaoCard({required this.solicitacao});

  final Solicitacao solicitacao;

  @override
  Widget build(BuildContext context) {
    final s = solicitacao;
    final decidida = dataDiaMes(s.decididaEm ?? s.solicitadaEm);
    final selo = seloDaSolicitacao(s.status);
    final detalhe = switch (s.status) {
      StatusSolicitacao.aprovada => 'Aprovada em $decidida · vínculo criado',
      StatusSolicitacao.recusada => 'Recusada em $decidida',
      StatusSolicitacao.cancelada => 'Cancelada em $decidida',
      _ => null,
    };
    final cancelando = context.select<SolicitacoesController, bool>((c) => c.cancelando(s.id));
    return CaixaCartao(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          MergeSemantics(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                LinhaComAcao(
                  conteudo: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(s.turma.nome, style: context.tipos.tituloCartao),
                      const SizedBox(height: 2),
                      Text('Enviada em ${dataDiaMes(s.solicitadaEm)}', style: context.tipos.meta),
                    ],
                  ),
                  acao: selo ?? const SizedBox.shrink(),
                ),
                if (detalhe != null) ...[
                  const SizedBox(height: 10),
                  Text(detalhe, style: context.tipos.apoio),
                ],
                if (s.status == StatusSolicitacao.recusada && s.motivoRecusa != null) ...[
                  const SizedBox(height: 4),
                  Text('Motivo: ${s.motivoRecusa}', style: context.tipos.apoio),
                ],
              ],
            ),
          ),
          if (s.podeCancelar) ...[
            const SizedBox(height: 12),
            OutlinedButton(
              style: OutlinedButton.styleFrom(
                foregroundColor: context.cores.perigo,
                side: BorderSide(color: context.cores.perigo.withValues(alpha: 0.3)),
              ),
              onPressed: cancelando ? null : () => _cancelar(context, s),
              child: Text(
                'Cancelar solicitação',
                semanticsLabel: 'Cancelar a solicitação de inscrição em ${s.turma.nome}',
              ),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _cancelar(BuildContext context, Solicitacao s) async {
    final controller = context.read<SolicitacoesController>();
    final mensageiro = ScaffoldMessenger.of(context);
    final confirmou = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancelar a solicitação?'),
        content: Text(
          'O pedido de inscrição em ${s.turma.nome} deixa de valer. Você pode pedir de novo '
          'enquanto as inscrições estiverem abertas.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Manter'),
          ),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: context.cores.perigo),
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Cancelar solicitação'),
          ),
        ],
      ),
    );
    if (confirmou != true) return;
    await _cancelarEMostrar(controller, mensageiro, s);
  }
}

/// Cancela e mostra o resultado; o "Tentar de novo" volta aqui, sem pedir confirmação outra vez.
/// Um cancelamento já em curso (dois diálogos confirmados) não mostra nada: o resultado vem do
/// primeiro.
Future<void> _cancelarEMostrar(
  SolicitacoesController controller,
  ScaffoldMessengerState mensageiro,
  Solicitacao s,
) async {
  if (controller.cancelando(s.id)) return;
  final falha = await controller.cancelar(s);
  mensageiro.showSnackBar(
    SnackBar(
      content: Text(falha?.mensagem ?? 'Solicitação cancelada.'),
      action: falha?.efeito == EfeitoFalha.repetir
          ? SnackBarAction(
              label: 'Tentar de novo',
              onPressed: () => _cancelarEMostrar(controller, mensageiro, s),
            )
          : null,
    ),
  );
}
