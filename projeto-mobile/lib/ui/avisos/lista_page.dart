import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config/rotas.dart';
import '../../models/aviso.dart';
import '../../repositories/avisos_repository.dart';
import '../../state/avisos_controller.dart';
import '../../state/session_controller.dart';
import '../../theme/tipografia.dart';
import '../casca/casca_abas.dart';
import '../comum/esqueleto_lista.dart';
import '../comum/estado_erro.dart';
import '../comum/estado_vazio.dart';
import '../comum/faixa_cache.dart';
import '../comum/faixa_informativa.dart';
import '../comum/pilula.dart';
import '../turmas/minhas_page.dart';
import 'aviso_card.dart';

/// T02/T04/T05 — avisos ativos e arquivados (design m-02, m-04, m-05).
class AvisosListaPage extends StatelessWidget {
  const AvisosListaPage({super.key});

  @override
  Widget build(BuildContext context) {
    final usuarioId = context.read<SessionController>().usuario!.id;
    return ChangeNotifierProvider(
      create: (_) =>
          AvisosController(context.read<AvisosRepository>(), usuarioId: usuarioId)..carregar(),
      child: const _Lista(),
    );
  }
}

class _Lista extends StatelessWidget {
  const _Lista();

  Future<void> _abrir(BuildContext context, Aviso aviso) async {
    final controller = context.read<AvisosController>();
    final indisponivel = await Navigator.of(
      context,
    ).pushNamed(Rotas.avisoDetalhe, arguments: aviso);
    if (indisponivel == true) await controller.recarregar();
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<AvisosController>();
    final lista = controller.lista;
    return Scaffold(
      appBar: AppBar(title: const Text('Avisos'), toolbarHeight: 60, titleSpacing: 20),
      body: Column(
        children: [
          // Fora da AppBar: a altura acompanha a escala de fonte do sistema (RM-36).
          _Alternancia(atual: controller.situacao, onMudar: controller.alternar),
          const Divider(),
          if (controller.situacao == SituacaoAviso.arquivado)
            const FaixaInformativa('Avisos arquivados saem da lista ativa e ficam guardados aqui.'),
          if (lista.dadosDe != null)
            // Tenta sem tirar os dados guardados da tela; falhando, só um aviso breve.
            FaixaCache(coletadoEm: lista.dadosDe!, onRepetir: () => _recarregar(context)),
          Expanded(child: _corpo(context, controller, lista)),
        ],
      ),
    );
  }

  Widget _corpo(BuildContext context, AvisosController controller, ListaAvisos lista) =>
      switch (lista.estado) {
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
              child: SizedBox(height: limites.maxHeight, child: _vazio(context, controller)),
            ),
          ),
        ),
        EstadoLista.conteudo => RefreshIndicator(
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
            child: ListView.builder(
              key: const Key('lista-avisos'),
              physics: const AlwaysScrollableScrollPhysics(),
              itemCount: lista.itens.length + 1,
              itemBuilder: (context, i) => i < lista.itens.length
                  ? AvisoCard(aviso: lista.itens[i], onTap: () => _abrir(context, lista.itens[i]))
                  : _Rodape(lista: lista, onRepetir: controller.carregarMais),
            ),
          ),
        ),
      };

  Future<void> _recarregar(BuildContext context) async {
    final controller = context.read<AvisosController>();
    final mensageiro = ScaffoldMessenger.of(context);
    await controller.recarregar();
    final falha = controller.ultimaFalha;
    if (falha != null) mensageiro.showSnackBar(SnackBar(content: Text(falha.mensagem)));
  }

  Widget _vazio(BuildContext context, AvisosController controller) {
    if (controller.situacao == SituacaoAviso.arquivado) {
      return const EstadoVazio(
        icone: Icons.inventory_2_outlined,
        titulo: 'Nenhum aviso arquivado',
        texto: 'Avisos arquivados pela coordenação ou pelos docentes aparecem aqui.',
      );
    }
    final aluno = context.read<SessionController>().usuario?.podeSolicitarInscricao ?? false;
    return EstadoVazio(
      icone: Icons.inbox_outlined,
      titulo: 'Nenhum aviso por enquanto',
      texto: 'Você verá aqui os avisos gerais do curso e os das turmas de que você participa.',
      acao: aluno ? 'Ver turmas disponíveis' : null,
      onAcao: aluno
          ? () {
              // Leva à aba Turmas e já abre as disponíveis: voltar cai em Minhas turmas.
              CascaAbas.irPara(context, Aba.turmas);
              abrirDisponiveis(context);
            }
          : null,
    );
  }
}

/// Ativos / Arquivados (design: pílulas de 32 px; o alvo de toque tem 48 dp).
class _Alternancia extends StatelessWidget {
  const _Alternancia({required this.atual, required this.onMudar});

  final SituacaoAviso atual;
  final ValueChanged<SituacaoAviso> onMudar;

  @override
  Widget build(BuildContext context) => LinhaDePilulas(
    children: [
      Pilula(
        'Ativos',
        ativa: atual == SituacaoAviso.ativo,
        onTap: () => onMudar(SituacaoAviso.ativo),
      ),
      Pilula(
        'Arquivados',
        ativa: atual == SituacaoAviso.arquivado,
        onTap: () => onMudar(SituacaoAviso.arquivado),
      ),
    ],
  );
}

/// Fim da lista (RM-14), carregando mais ou falha ao carregar mais.
class _Rodape extends StatelessWidget {
  const _Rodape({required this.lista, required this.onRepetir});

  final ListaAvisos lista;
  final VoidCallback onRepetir;

  @override
  Widget build(BuildContext context) {
    final Widget conteudo;
    if (lista.carregandoMais) {
      conteudo = const SizedBox.square(
        dimension: 22,
        child: CircularProgressIndicator(strokeWidth: 2.4, semanticsLabel: 'Carregando mais'),
      );
    } else if (lista.falhaAoCarregarMais != null) {
      conteudo = TextButton(onPressed: onRepetir, child: const Text('Tentar de novo'));
    } else if (!lista.temMais && lista.dadosDe == null) {
      conteudo = const Text('Não há mais avisos.', style: Tipografia.meta);
    } else {
      conteudo = const SizedBox.shrink();
    }
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Center(child: conteudo),
    );
  }
}
