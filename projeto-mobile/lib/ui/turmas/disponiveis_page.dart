import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/turma.dart';
import '../../repositories/turmas_repository.dart';
import '../../state/avisos_controller.dart' show EstadoLista;
import '../../state/turmas_controller.dart';
import '../../theme/cores.dart';
import '../../theme/tipografia.dart';
import '../comum/esqueleto_lista.dart';
import '../comum/estado_erro.dart';
import '../comum/estado_vazio.dart';
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
    _controller = DisponiveisController(context.read<TurmasRepository>())..addListener(_seRecusada);
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
                _TurmaDisponivel(turma: t),
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
  const _TurmaDisponivel({required this.turma});

  final Turma turma;

  @override
  Widget build(BuildContext context) {
    final linha = [
      turma.codigo,
      if (turma.semestreCurso != null) '${turma.semestreCurso}º semestre' else ?turma.periodoLetivo,
    ].join(' · ');
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
        // O envio (folha de confirmação, POST) entra na US4, fase 6.
        acao: FilledButton(
          onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('A solicitação de inscrição chega na próxima versão do app.'),
            ),
          ),
          child: Text('Solicitar', semanticsLabel: 'Solicitar inscrição em ${turma.nome}'),
        ),
      ),
    );
  }
}
