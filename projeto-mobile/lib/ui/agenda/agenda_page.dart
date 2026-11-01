import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config/rotas.dart';
import '../../models/evento.dart';
import '../../repositories/eventos_repository.dart';
import '../../state/agenda_controller.dart';
import '../../state/avisos_controller.dart' show EstadoLista;
import '../../state/session_controller.dart';
import '../../theme/cores.dart';
import '../comum/esqueleto_lista.dart';
import '../comum/estado_erro.dart';
import '../comum/estado_vazio.dart';
import '../comum/faixa_cache.dart';
import '../comum/pilula.dart';
import '../turmas/rodape_lista.dart';
import 'calendario.dart';
import 'evento_card.dart';
import 'folha_tipos.dart';
import 'mes_view.dart';

/// T10/T11 — agenda: Próximos, Provas e Mês, com o filtro de tipo (design m-10, m-10b).
class AgendaPage extends StatelessWidget {
  const AgendaPage({super.key});

  @override
  Widget build(BuildContext context) {
    final usuarioId = context.read<SessionController>().usuario!.id;
    return ChangeNotifierProvider(
      create: (_) => AgendaController(context.read<EventosRepository>(), usuarioId: usuarioId),
      child: const _Agenda(),
    );
  }
}

/// Abre o detalhe; o detalhe devolve `true` quando o evento não existe mais (404).
Future<bool> abrirEvento(BuildContext context, Evento evento) async =>
    await Navigator.of(context).pushNamed(Rotas.eventoDetalhe, arguments: evento) == true;

class _Agenda extends StatelessWidget {
  const _Agenda();

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<AgendaController>();
    final tipo = controller.tipo;
    final emProvas = controller.visao == VisaoAgenda.provas;
    return Scaffold(
      appBar: AppBar(
        title: Text(tipo == null ? 'Agenda' : 'Agenda · ${tipo.rotulo}'),
        toolbarHeight: 60,
        titleSpacing: 20,
        actions: [
          IconButton(
            tooltip: 'Filtrar por tipo',
            icon: const Icon(Icons.filter_list),
            color: tipo == null ? Cores.navy : Cores.azul,
            // Provas já é um filtro de tipo (D-AF2-2).
            onPressed: emProvas
                ? null
                : () async {
                    final escolha = await escolherTipo(context, tipo);
                    if (escolha != null) controller.filtrar(escolha.$1);
                  },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
            child: Row(
              children: [
                for (final (visao, texto) in [
                  (VisaoAgenda.proximos, 'Próximos'),
                  (VisaoAgenda.provas, 'Provas'),
                  (VisaoAgenda.mes, 'Mês'),
                ]) ...[
                  Pilula(
                    texto,
                    ativa: controller.visao == visao,
                    onTap: () => controller.alternar(visao),
                  ),
                  const SizedBox(width: 8),
                ],
              ],
            ),
          ),
          const Divider(),
          Expanded(
            child: switch (controller.visao) {
              VisaoAgenda.proximos => ChangeNotifierProvider.value(
                key: ValueKey(('proximos', tipo)),
                value: controller.proximos,
                child: _ListaEventos(
                  vazio: tipo == null
                      ? const EstadoVazio(
                          icone: Icons.event_outlined,
                          titulo: 'Nenhum evento por vir',
                          texto:
                              'Eventos, provas e prazos do curso e das suas turmas aparecem aqui.',
                        )
                      : EstadoVazio(
                          icone: Icons.event_outlined,
                          titulo: 'Nenhum evento deste tipo',
                          texto: 'Não há ${tipo.rotulo.toLowerCase()} por vir. Escolha outro tipo.',
                        ),
                ),
              ),
              VisaoAgenda.provas => ChangeNotifierProvider.value(
                key: const ValueKey('provas'),
                value: controller.provas,
                child: const _ListaEventos(
                  vazio: EstadoVazio(
                    icone: Icons.event_available_outlined,
                    titulo: 'Nenhuma prova marcada',
                    texto: 'As provas das suas turmas aparecem aqui assim que forem marcadas.',
                  ),
                ),
              ),
              VisaoAgenda.mes => ChangeNotifierProvider.value(
                key: ValueKey(('mes', tipo)),
                value: controller.mes,
                child: const MesView(),
              ),
            },
          ),
        ],
      ),
    );
  }
}

class _ListaEventos extends StatelessWidget {
  const _ListaEventos({required this.vazio});

  final Widget vazio;

  Future<void> _recarregar(BuildContext context) async {
    final controller = context.read<EventosController>();
    final mensageiro = ScaffoldMessenger.of(context);
    await controller.recarregar();
    final falha = controller.ultimaFalha;
    if (falha != null) mensageiro.showSnackBar(SnackBar(content: Text(falha.mensagem)));
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<EventosController>();
    final lista = controller.lista;
    return Column(
      children: [
        if (lista.dadosDe != null)
          FaixaCache(coletadoEm: lista.dadosDe!, onRepetir: () => _recarregar(context)),
        Expanded(
          child: switch (lista.estado) {
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
                  child: SizedBox(height: limites.maxHeight, child: vazio),
                ),
              ),
            ),
            EstadoLista.conteudo => RefreshIndicator(
              onRefresh: () => _recarregar(context),
              child: NotificationListener<ScrollNotification>(
                onNotification: (n) {
                  // Próxima página ao passar de 80% da rolagem, como nos avisos.
                  if (n.metrics.axis == Axis.vertical &&
                      n.metrics.pixels >= n.metrics.maxScrollExtent * 0.8) {
                    controller.carregarMais();
                  }
                  return false;
                },
                child: ListView.builder(
                  physics: const AlwaysScrollableScrollPhysics(),
                  itemCount: lista.itens.length + 1,
                  itemBuilder: (context, i) => i < lista.itens.length
                      ? EventoCard(
                          evento: lista.itens[i],
                          mostrarData: primeiroDoDia(lista.itens, i),
                          onTap: () async {
                            if (await abrirEvento(context, lista.itens[i])) {
                              await controller.recarregar();
                            }
                          },
                        )
                      : RodapeLista(
                          lista: lista,
                          onRepetir: () => controller.carregarMais(repetir: true),
                        ),
                ),
              ),
            ),
          },
        ),
      ],
    );
  }
}
