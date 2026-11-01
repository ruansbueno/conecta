import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/evento.dart';
import '../../state/avisos_controller.dart' show EstadoLista;
import '../../state/mes_controller.dart';
import '../../theme/cores.dart';
import '../../theme/tipografia.dart';
import '../comum/chip_destino.dart';
import '../comum/escala.dart';
import '../comum/esqueleto_lista.dart';
import '../comum/estado_erro.dart';
import '../comum/faixa_cache.dart';
import '../comum/faixa_informativa.dart';
import 'agenda_page.dart';
import 'calendario.dart';

const _semana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/// T11 — visão de mês (design m-10b, plan-f2 D-AF2-4): grade de domingo a sábado com marcadores e,
/// abaixo, as atividades do dia escolhido. Rola inteira, para caber com a fonte a 200% (RM-36).
class MesView extends StatelessWidget {
  const MesView({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<MesController>();
    return ListView(
      padding: const EdgeInsets.only(bottom: 24),
      children: [
        if (controller.dadosDe != null)
          FaixaCache(coletadoEm: controller.dadosDe!, onRepetir: controller.carregar),
        _Cabecalho(controller),
        _Grade(controller),
        if (controller.incompleto)
          FaixaInformativa(
            'Mostrando ${controller.eventos.length} de ${controller.total} atividades deste mês.',
          ),
        Container(height: 8, color: Cores.fundoPagina),
        switch (controller.estado) {
          // O esqueleto rola sozinho: aqui ele ocupa uma altura fixa dentro da lista do mês.
          EstadoLista.carregando => const SizedBox(height: 220, child: EsqueletoLista(itens: 2)),
          EstadoLista.erro => SizedBox(
            height: 280,
            child: EstadoErro(mensagem: controller.falha!.mensagem, onRepetir: controller.carregar),
          ),
          _ => _DoDia(controller),
        },
      ],
    );
  }
}

class _Cabecalho extends StatelessWidget {
  const _Cabecalho(this.controller);

  final MesController controller;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(20, 16, 8, 4),
    child: Row(
      children: [
        Expanded(
          child: Semantics(
            header: true,
            liveRegion: true,
            child: Text(controller.mes.nome, style: Tipografia.titulo),
          ),
        ),
        IconButton(
          tooltip: 'Mês anterior',
          icon: const Icon(Icons.chevron_left),
          color: Cores.azul,
          onPressed: () => controller.irPara(controller.mes.anterior),
        ),
        IconButton(
          tooltip: 'Próximo mês',
          icon: const Icon(Icons.chevron_right),
          color: Cores.azul,
          onPressed: () => controller.irPara(controller.mes.proximo),
        ),
      ],
    ),
  );
}

class _Grade extends StatelessWidget {
  const _Grade(this.controller);

  final MesController controller;

  @override
  Widget build(BuildContext context) {
    final dias = diasDaGrade(controller.mes);
    // Enquanto carrega, a grade aparece sem marcadores.
    final eventos = controller.estado == EstadoLista.conteudo ? controller.eventos : <Evento>[];
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
      child: Column(
        children: [
          // As letras dos dias são visuais: o nome de cada dia já diz o dia da semana.
          ExcludeSemantics(
            child: Row(
              children: [
                for (final letra in _semana)
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Text(letra, textAlign: TextAlign.center, style: Tipografia.meta),
                    ),
                  ),
              ],
            ),
          ),
          for (var i = 0; i < dias.length; i += 7)
            Row(
              children: [
                for (final dia in dias.sublist(i, i + 7))
                  Expanded(
                    child: _Dia(
                      dia: dia,
                      doMes: controller.mes.contem(dia),
                      hoje: mesmoDia(dia, controller.hoje),
                      escolhido: mesmoDia(dia, controller.diaEscolhido),
                      eventos: eventosDoDia(eventos, dia),
                      onTap: () => controller.escolher(dia),
                    ),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}

class _Dia extends StatelessWidget {
  const _Dia({
    required this.dia,
    required this.doMes,
    required this.hoje,
    required this.escolhido,
    required this.eventos,
    required this.onTap,
  });

  final DateTime dia;
  final bool doMes;
  final bool hoje;
  final bool escolhido;
  final List<Evento> eventos;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final quantidade = eventos.isEmpty ? 'sem atividades' : quantidadeDeAtividades(eventos.length);
    final cor = escolhido
        ? Cores.branco
        : hoje
        ? Cores.azul
        : doMes
        ? Cores.navy
        : Cores.tenue;
    // O nome começa pelo número visível (WCAG 2.5.3): "16, sexta, 16 de outubro, 2 atividades".
    return Semantics(
      button: true,
      selected: escolhido,
      label: '${dia.day}, ${tituloDoDia(dia).toLowerCase()}, $quantidade',
      // Com os filhos excluídos, a ação de toque precisa estar aqui para o leitor de tela.
      onTap: onTap,
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 52),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Mínimo de 36 px, não fixo: o número cresce com a fonte do sistema (RM-36).
              Container(
                constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                padding: const EdgeInsets.all(4),
                alignment: Alignment.center,
                decoration: escolhido
                    ? const BoxDecoration(color: Cores.navy, shape: BoxShape.circle)
                    : null,
                child: Text(
                  '${dia.day}',
                  style: Tipografia.corpo.copyWith(
                    color: cor,
                    fontWeight: hoje || escolhido ? FontWeight.w600 : FontWeight.w400,
                  ),
                ),
              ),
              const SizedBox(height: 3),
              SizedBox(
                height: 6,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    for (final tipo in eventos.take(3).map((e) => e.tipo))
                      Container(
                        width: 5,
                        height: 5,
                        margin: const EdgeInsets.symmetric(horizontal: 1.5),
                        decoration: BoxDecoration(color: corDoTipo(tipo), shape: BoxShape.circle),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DoDia extends StatelessWidget {
  const _DoDia(this.controller);

  final MesController controller;

  @override
  Widget build(BuildContext context) {
    final dia = controller.diaEscolhido;
    final eventos = controller.doDiaEscolhido;
    return Semantics(
      liveRegion: true,
      container: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
            child: Wrap(
              alignment: WrapAlignment.spaceBetween,
              spacing: 12,
              children: [
                Semantics(header: true, child: Text(tituloDoDia(dia), style: Tipografia.subtitulo)),
                if (eventos.isNotEmpty)
                  Text(quantidadeDeAtividades(eventos.length), style: Tipografia.meta),
              ],
            ),
          ),
          if (eventos.isEmpty)
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 12, 20, 12),
              child: Text('Nenhuma atividade neste dia', style: Tipografia.apoio),
            )
          else
            for (final e in eventos)
              _ItemDoDia(
                evento: e,
                dia: dia,
                onTap: () async {
                  if (await abrirEvento(context, e)) await controller.carregar();
                },
              ),
        ],
      ),
    );
  }
}

/// Atividade do dia (m-10b): horário e tipo à esquerda, título, local e destinos.
class _ItemDoDia extends StatelessWidget {
  const _ItemDoDia({required this.evento, required this.dia, required this.onTap});

  final Evento evento;
  final DateTime dia;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => MergeSemantics(
    child: Semantics(
      button: true,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 14),
          decoration: const BoxDecoration(
            border: Border(bottom: BorderSide(color: Cores.linhaSuave)),
          ),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Acompanha a fonte do sistema: "o dia todo" não quebra (RM-36).
                SizedBox(
                  width: larguraEscalada(context, 68, Tipografia.tituloCartao.fontSize!),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        rotuloNoDia(evento, dia),
                        style: Tipografia.tituloCartao.copyWith(fontSize: 14),
                      ),
                      // O tipo é uma palavra só ("Palestra"): encolhe em vez de quebrar no meio.
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Text(evento.rotuloTipo, maxLines: 1, style: Tipografia.meta),
                      ),
                    ],
                  ),
                ),
                Container(
                  width: 3,
                  decoration: BoxDecoration(
                    color: corDoTipo(evento.tipo).withValues(alpha: 0.55),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(evento.titulo, style: Tipografia.tituloCartao),
                      if (evento.local case final local?) ...[
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.place_outlined, size: 15, color: Cores.tenue),
                            const SizedBox(width: 5),
                            Flexible(child: Text(local, style: Tipografia.meta)),
                          ],
                        ),
                      ],
                      if (evento.destinos.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        ChipsDestino(evento.destinos),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}
