import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config/rotas.dart';
import '../../models/usuario.dart';
import '../../state/session_controller.dart';
import '../../theme/cores.dart';
import '../../theme/tipografia.dart';
import '../agenda/agenda_page.dart';
import '../avisos/lista_page.dart';
import '../horarios/horarios_page.dart';
import '../perfil/perfil_page.dart';
import '../turmas/minhas_page.dart';

/// As cinco abas da spec §3.
enum Aba {
  avisos('Avisos', Icons.campaign_outlined, Icons.campaign),
  agenda('Agenda', Icons.calendar_today_outlined, Icons.calendar_today),
  turmas('Turmas', Icons.school_outlined, Icons.school),
  horarios('Horários', Icons.schedule_outlined, Icons.schedule),
  perfil('Perfil', Icons.person_outline, Icons.person);

  const Aba(this.rotulo, this.icone, this.iconeAtivo);
  final String rotulo;
  final IconData icone;
  final IconData iconeAtivo;
}

/// Casca com a barra de abas; cada aba mantém seu estado no [IndexedStack] (D2).
class CascaAbas extends StatefulWidget {
  const CascaAbas({super.key});

  /// Troca de aba a partir de uma tela interna (ex.: atalho do estado vazio).
  static void irPara(BuildContext context, Aba aba) =>
      context.findAncestorStateOfType<_CascaAbasState>()?._selecionar(aba);

  @override
  State<CascaAbas> createState() => _CascaAbasState();
}

class _CascaAbasState extends State<CascaAbas> with WidgetsBindingObserver {
  Aba _atual = Aba.avisos;

  /// Abas já visitadas: as outras só são construídas (e só chamam a API) quando abertas.
  final _visitadas = <Aba>{Aba.avisos};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  /// RM-09: o perfil é reavaliado ao voltar do segundo plano e a cada abertura da aba Perfil.
  @override
  void didChangeAppLifecycleState(AppLifecycleState estado) {
    if (estado == AppLifecycleState.resumed) context.read<SessionController>().recarregarPerfil();
  }

  void _selecionar(Aba aba) {
    final abrindoPerfil = aba == Aba.perfil && _atual != Aba.perfil;
    setState(() {
      _atual = aba;
      _visitadas.add(aba);
    });
    // Tocar de novo na aba já aberta não é uma nova abertura.
    if (abrindoPerfil) context.read<SessionController>().recarregarPerfil();
  }

  Perfil? _perfilAnterior;

  Widget _tela(Aba aba) => switch (aba) {
    Aba.avisos => const AvisosListaPage(),
    Aba.agenda => const AgendaPage(),
    Aba.turmas => const MinhasTurmasPage(),
    Aba.horarios => const HorariosPage(),
    Aba.perfil => const PerfilPage(),
  };

  @override
  Widget build(BuildContext context) {
    // Um perfil novo muda o que cada aba mostra e oferece (atalhos de aluno, avisos visíveis):
    // as abas são recriadas e carregam de novo.
    final perfil = context.select<SessionController, Perfil?>((s) => s.usuario?.perfil);
    if (_perfilAnterior != null && perfil != null && perfil != _perfilAnterior) {
      // Telas empilhadas sobre as abas (disponíveis, solicitações, detalhe) eram do perfil
      // anterior: fecham, e a pessoa volta às abas já recriadas.
      WidgetsBinding.instance.addPostFrameCallback(
        (_) => Rotas.navigatorKey.currentState?.popUntil((rota) => rota.isFirst),
      );
    }
    _perfilAnterior = perfil;
    return Scaffold(
      body: IndexedStack(
        index: _atual.index,
        children: [
          for (final aba in Aba.values)
            _visitadas.contains(aba)
                ? KeyedSubtree(key: ValueKey((aba, perfil)), child: _tela(aba))
                : const SizedBox.shrink(),
        ],
      ),
      bottomNavigationBar: _BarraAbas(atual: _atual, onSelecionar: _selecionar),
    );
  }
}

class _BarraAbas extends StatelessWidget {
  const _BarraAbas({required this.atual, required this.onSelecionar});

  final Aba atual;
  final ValueChanged<Aba> onSelecionar;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    key: const Key('barra-abas'),
    decoration: const BoxDecoration(
      color: Cores.branco,
      border: Border(top: BorderSide(color: Cores.linha)),
    ),
    child: SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(6, 6, 6, 4),
        child: Row(
          children: [
            for (final aba in Aba.values)
              Expanded(
                child: _ItemAba(aba: aba, ativa: aba == atual, onTap: () => onSelecionar(aba)),
              ),
          ],
        ),
      ),
    ),
  );
}

class _ItemAba extends StatelessWidget {
  const _ItemAba({required this.aba, required this.ativa, required this.onTap});

  final Aba aba;
  final bool ativa;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cor = ativa ? Cores.azul : Cores.tenue;
    return Semantics(
      button: true,
      selected: ativa,
      label: aba.rotulo,
      // Com os filhos excluídos, o toque do InkWell não chega ao leitor de tela: a ação fica aqui.
      onTap: onTap,
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 52),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(ativa ? aba.iconeAtivo : aba.icone, size: 22, color: cor),
              const SizedBox(height: 4),
              // Cinco abas: com a fonte grande, o rótulo encolhe para caber em vez de quebrar no
              // meio da palavra ("Horário/s"). O nome para o leitor de tela não muda.
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 2),
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(
                    aba.rotulo,
                    maxLines: 1,
                    softWrap: false,
                    style: Tipografia.aba.copyWith(color: cor),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
