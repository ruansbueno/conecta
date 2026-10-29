import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config/rotas.dart';
import '../../models/turma.dart';
import '../../repositories/solicitacoes_repository.dart';
import '../../repositories/turmas_repository.dart';
import '../../services/api_failure.dart';
import '../../state/avisos_controller.dart' show EstadoLista;
import '../../state/solicitacoes_controller.dart';
import '../../state/turmas_controller.dart';
import '../../theme/cores.dart';
import '../../theme/tipografia.dart';
import '../comum/esqueleto_lista.dart';
import '../comum/estado_erro.dart';
import '../comum/estado_vazio.dart';
import '../solicitacoes/folha_confirmacao.dart';
import 'rodape_lista.dart';
import 'turma_card.dart';

/// T07 — turmas abertas a solicitação, só para o aluno (design m-07, RM-19, RM-20). Um `403`
/// explica o perfil e volta a Minhas turmas (contrato §6).
class DisponiveisPage extends StatefulWidget {
  const DisponiveisPage({super.key});

  @override
  State<DisponiveisPage> createState() => _DisponiveisPageState();
}

class _DisponiveisPageState extends State<DisponiveisPage> {
  late final DisponiveisController _controller;

  @override
  void initState() {
    super.initState();
    _controller = DisponiveisController(
      context.read<TurmasRepository>(),
      context.read<SolicitacoesRepository>(),
      context.read<MudancasDeSolicitacao>(),
    )..addListener(_seRecusada);
    _controller.carregar();
  }

  void _seRecusada() {
    if (!_controller.semPermissao || !mounted) return;
    _controller.removeListener(_seRecusada);
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(_controller.lista.falha!.mensagem)));
    Navigator.of(context).pop();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ChangeNotifierProvider.value(
    value: _controller,
    child: Scaffold(
      appBar: AppBar(title: const Text('Turmas disponíveis'), toolbarHeight: 60),
      backgroundColor: Cores.fundoPagina,
      body: Column(
        children: [
          Container(
            width: double.infinity,
            color: Cores.branco,
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 14),
            child: const Text('Turmas ativas com inscrições abertas', style: Tipografia.apoio),
          ),
          const Divider(),
          const Expanded(child: _Corpo()),
        ],
      ),
    ),
  );
}

class _Corpo extends StatelessWidget {
  const _Corpo();

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<DisponiveisController>();
    final lista = controller.lista;
    return switch (lista.estado) {
      EstadoLista.carregando => const EsqueletoLista(),
      EstadoLista.erro when controller.semPermissao => const SizedBox.shrink(),
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
                icone: Icons.school_outlined,
                titulo: 'Nenhuma turma aberta agora',
                texto: 'Quando a coordenação abrir inscrições, as turmas aparecem aqui.',
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
            key: const Key('lista-disponiveis'),
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            children: [
              for (final t in lista.itens) ...[
                _TurmaDisponivel(key: ValueKey(t.id), turma: t),
                const SizedBox(height: 12),
              ],
              RodapeLista(lista: lista, onRepetir: () => controller.carregarMais(repetir: true)),
              const SizedBox(height: 8),
              const CaixaCartao(
                child: Row(
                  children: [
                    Icon(Icons.info_outline, size: 20, color: Cores.apagado),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Turmas das quais você já participa ou para as quais já pediu inscrição '
                        'não aparecem nesta lista.',
                        style: Tipografia.apoio,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    };
  }

  Future<void> _recarregar(BuildContext context) async {
    final controller = context.read<DisponiveisController>();
    final mensageiro = ScaffoldMessenger.of(context);
    await controller.recarregar();
    final falha = controller.ultimaFalha;
    if (falha != null) mensageiro.showSnackBar(SnackBar(content: Text(falha.mensagem)));
  }
}

class _TurmaDisponivel extends StatelessWidget {
  const _TurmaDisponivel({required this.turma, super.key});

  final Turma turma;

  @override
  Widget build(BuildContext context) {
    final linha = [
      turma.codigo,
      if (turma.semestreCurso != null) '${turma.semestreCurso}º semestre' else ?turma.periodoLetivo,
    ].join(' · ');
    final enviando = context.select<DisponiveisController, bool>((c) => c.enviando(turma.id));
    return CaixaCartao(
      child: LinhaComAcao(
        conteudo: MergeSemantics(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(turma.nome, style: Tipografia.tituloCartao),
              const SizedBox(height: 2),
              Text(linha, style: Tipografia.meta),
            ],
          ),
        ),
        acao: FilledButton(
          // O contexto é o da tela, não o do cartão: depois do 201 o cartão sai da lista, mas a
          // folha de confirmação ainda precisa abrir.
          onPressed: enviando
              ? null
              : () => solicitar(
                  context.findAncestorStateOfType<_DisponiveisPageState>()!.context,
                  context.read<DisponiveisController>(),
                  turma,
                ),
          child: enviando
              ? const SizedBox.square(
                  dimension: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.2,
                    color: Cores.branco,
                    semanticsLabel: 'Enviando',
                  ),
                )
              : Text('Solicitar', semanticsLabel: 'Solicitar inscrição em ${turma.nome}'),
        ),
      ),
    );
  }
}

/// Envia o pedido (contrato §7) e segue o efeito da resposta: folha de confirmação; recarga
/// (feita pelo controller); Minhas solicitações para um pedido duplicado; volta para um `403`;
/// "Tentar de novo" sem rede. Se a pessoa saiu da tela durante o envio, a mudança já foi avisada
/// (Minhas turmas recarrega) e só resta uma mensagem curta: nada de folha ou navegação.
/// [context] é o da tela de disponíveis ([_DisponiveisPageState]).
Future<void> solicitar(BuildContext context, DisponiveisController controller, Turma turma) async {
  if (controller.enviando(turma.id)) return;
  final mensageiro = ScaffoldMessenger.of(context);
  final falha = await controller.solicitar(turma);
  if (falha == null) {
    if (!context.mounted) {
      mensageiro.showSnackBar(
        SnackBar(content: Text('Solicitação de inscrição em ${turma.nome} enviada.')),
      );
      return;
    }
    final navegador = Navigator.of(context);
    final saida = await mostrarFolhaConfirmacao(context, turma.nome);
    if (!context.mounted) return;
    if (saida == SaidaDaFolha.verSolicitacoes) {
      unawaited(navegador.pushReplacementNamed(Rotas.solicitacoes));
    } else if (saida == SaidaDaFolha.voltarAsTurmas) {
      navegador.pop();
    }
    return;
  }
  mensageiro.showSnackBar(
    SnackBar(
      content: Text(falha.mensagem),
      action: falha.efeito == EfeitoFalha.repetir && context.mounted
          ? SnackBarAction(
              label: 'Tentar de novo',
              // A mensagem sobrevive à tela: o toque só vale se ela ainda estiver aberta.
              onPressed: () {
                if (context.mounted) solicitar(context, controller, turma);
              },
            )
          : null,
    ),
  );
  if (!context.mounted) return;
  if (falha.efeito == EfeitoFalha.abreSolicitacoes) {
    unawaited(Navigator.of(context).pushReplacementNamed(Rotas.solicitacoes));
  } else if (falha.code == 'SEM_PERMISSAO') {
    Navigator.of(context).pop();
  }
}
