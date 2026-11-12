import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/aula.dart';
import '../../repositories/horarios_repository.dart';
import '../../repositories/turmas_repository.dart';
import '../../state/avisos_controller.dart' show EstadoLista;
import '../../state/horarios_controller.dart';
import '../../state/session_controller.dart';
import '../../theme/cores.dart';
import '../../theme/tipografia.dart';
import '../comum/botao_tema.dart';
import '../comum/escala.dart';
import '../comum/esqueleto_lista.dart';
import '../comum/estado_erro.dart';
import '../comum/estado_vazio.dart';
import '../comum/faixa_cache.dart';
import '../comum/fim_da_lista.dart';
import 'folha_turmas.dart';

const _siglas = {1: 'SEG', 2: 'TER', 3: 'QUA', 4: 'QUI', 5: 'SEX', 6: 'SÁB', 7: 'DOM'};
const _nomes = {
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
  7: 'Domingo',
};

/// T13 — grade semanal da turma (design m-12, plan-f2 D-AF2-6): agrupada por dia, só os dias com
/// aula; cada aula com disciplina, horas, local e docente.
class HorariosPage extends StatelessWidget {
  const HorariosPage({super.key});

  @override
  Widget build(BuildContext context) {
    final usuarioId = context.read<SessionController>().usuario!.id;
    return ChangeNotifierProvider(
      create: (_) => HorariosController(
        context.read<TurmasRepository>(),
        context.read<HorariosRepository>(),
        usuarioId: usuarioId,
      )..carregar(),
      child: const _Horarios(),
    );
  }
}

class _Horarios extends StatefulWidget {
  const _Horarios();

  @override
  State<_Horarios> createState() => _HorariosState();
}

class _HorariosState extends State<_Horarios> {
  late final HorariosController _controller = context.read<HorariosController>();

  @override
  void initState() {
    super.initState();
    _controller.addListener(_mostrarAviso);
  }

  @override
  void dispose() {
    _controller.removeListener(_mostrarAviso);
    super.dispose();
  }

  /// 403/404 da grade: um aviso breve, fora do build; a tela já recarregou as turmas.
  void _mostrarAviso() {
    final aviso = _controller.consumirAviso();
    if (aviso == null || !mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(aviso)));
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<HorariosController>();
    return Scaffold(
      appBar: AppBar(
        title: const Text('Horários'),
        toolbarHeight: 60,
        titleSpacing: 20,
        actions: const [BotaoTema(), SizedBox(width: 8)],
      ),
      body: switch (controller.estado) {
        EstadoLista.carregando => const EsqueletoLista(),
        EstadoLista.erro => EstadoErro(
          mensagem: controller.falha!.mensagem,
          onRepetir: controller.carregar,
        ),
        EstadoLista.vazio => const EstadoVazio(
          icone: Icons.schedule_outlined,
          titulo: 'Nenhuma turma por enquanto',
          texto: 'A grade aparece depois do vínculo com uma turma.',
        ),
        EstadoLista.conteudo => _Conteudo(controller),
      },
    );
  }
}

class _Conteudo extends StatelessWidget {
  const _Conteudo(this.controller);

  final HorariosController controller;

  @override
  Widget build(BuildContext context) {
    final turma = controller.turma!;
    final variasTurmas = controller.turmas.length > 1;
    return RefreshIndicator(
      onRefresh: controller.recarregar,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          if (controller.dadosDe != null)
            FaixaCache(coletadoEm: controller.dadosDe!, onRepetir: controller.recarregar),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(turma.nome, style: context.tipos.apoio),
                const SizedBox(height: 12),
                if (variasTurmas)
                  // O leitor de tela ouve o que o botão faz, não só o código da turma.
                  MergeSemantics(
                    child: Semantics(
                      hint: 'Trocar de turma',
                      child: OutlinedButton.icon(
                        key: const Key('trocar-turma'),
                        onPressed: () async {
                          final escolhida = await escolherTurma(
                            context,
                            controller.turmas,
                            controller.turma,
                          );
                          if (escolhida != null && escolhida.id != turma.id) {
                            await controller.escolher(escolhida);
                          }
                        },
                        iconAlignment: IconAlignment.end,
                        icon: const Icon(Icons.arrow_forward, size: 18),
                        label: Text('Turma ${turma.codigo}'),
                      ),
                    ),
                  )
                else
                  Text('Turma ${turma.codigo}', style: context.tipos.tituloCartao),
              ],
            ),
          ),
          const Divider(),
          ..._grade(context),
        ],
      ),
    );
  }

  List<Widget> _grade(BuildContext context) => switch (controller.estadoDaGrade) {
    EstadoLista.carregando => [const SizedBox(height: 300, child: EsqueletoLista(itens: 3))],
    EstadoLista.erro => [
      SizedBox(
        height: 300,
        child: EstadoErro(
          mensagem: controller.mensagemDaGrade ?? controller.falha!.mensagem,
          onRepetir: controller.recarregar,
        ),
      ),
    ],
    EstadoLista.vazio => [
      const SizedBox(
        height: 300,
        child: EstadoVazio(
          icone: Icons.event_busy_outlined,
          titulo: 'Nenhuma aula nesta grade',
          texto: 'A coordenação ainda não montou a grade desta turma.',
        ),
      ),
    ],
    EstadoLista.conteudo => [
      for (final dia in [1, 2, 3, 4, 5, 6, 7])
        if (controller.aulas.where((a) => a.diaSemana == dia).toList() case final doDia
            when doDia.isNotEmpty)
          _Dia(dia: dia, aulas: doDia),
      // Os dias sem aula não aparecem: o fecho diz que não faltou nada (spec 002).
      if (controller.aulas.map((a) => a.diaSemana).toSet().length < 7)
        const FimDaLista('Não há aulas nos outros dias da semana.'),
    ],
  };
}

class _Dia extends StatelessWidget {
  const _Dia({required this.dia, required this.aulas});

  final int dia;
  final List<Aula> aulas;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.fromLTRB(20, 14, 20, 14),
    decoration: BoxDecoration(
      border: Border(bottom: BorderSide(color: context.cores.linhaSuave)),
    ),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // A coluna acompanha a fonte do sistema, para a sigla nunca quebrar (RM-36); a mesma
        // largura em todos os dias mantém as barras alinhadas.
        SizedBox(
          width: larguraEscalada(context, 56, context.tipos.meta.fontSize!),
          child: Padding(
            padding: const EdgeInsets.only(top: 2),
            // A sigla é visual; o leitor de tela ouve o dia por extenso.
            child: Semantics(
              label: _nomes[dia],
              header: true,
              excludeSemantics: true,
              child: Text(
                _siglas[dia]!,
                softWrap: false,
                style: context.tipos.meta.copyWith(fontWeight: FontWeight.w600, letterSpacing: 1),
              ),
            ),
          ),
        ),
        Expanded(
          child: Column(
            children: [
              for (final (i, a) in aulas.indexed) ...[
                if (i > 0) const SizedBox(height: 12),
                _Aula(a),
              ],
            ],
          ),
        ),
      ],
    ),
  );
}

class _Aula extends StatelessWidget {
  const _Aula(this.aula);

  final Aula aula;

  @override
  Widget build(BuildContext context) {
    final horas = '${aula.inicio}–${aula.fim}';
    return MergeSemantics(
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              width: 3,
              decoration: BoxDecoration(
                color: context.cores.azul,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(aula.disciplina, style: context.tipos.tituloCartao),
                  const SizedBox(height: 2),
                  Text(
                    aula.local == null ? horas : '$horas · ${aula.local}',
                    style: context.tipos.meta,
                  ),
                  if (aula.docenteNome case final docente?)
                    Text(docente, style: context.tipos.meta.copyWith(color: context.cores.apagado)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
