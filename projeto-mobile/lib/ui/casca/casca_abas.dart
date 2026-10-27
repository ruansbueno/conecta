import 'package:flutter/material.dart';

import '../../theme/cores.dart';
import '../../theme/tipografia.dart';
import '../avisos/lista_page.dart';
import '../perfil/perfil_page.dart';
import '../turmas/minhas_page.dart';

/// Abas da F1. Agenda e Horários (F2) entram quando a fase for liberada (spec §3).
enum Aba {
  avisos('Avisos', Icons.campaign_outlined, Icons.campaign),
  turmas('Turmas', Icons.school_outlined, Icons.school),
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

class _CascaAbasState extends State<CascaAbas> {
  Aba _atual = Aba.avisos;

  /// Abas já visitadas: as outras só são construídas (e só chamam a API) quando abertas.
  final _visitadas = <Aba>{Aba.avisos};

  void _selecionar(Aba aba) => setState(() {
    _atual = aba;
    _visitadas.add(aba);
  });

  Widget _tela(Aba aba) => switch (aba) {
    Aba.avisos => const AvisosListaPage(),
    Aba.turmas => const MinhasTurmasPage(),
    Aba.perfil => const PerfilPage(),
  };

  @override
  Widget build(BuildContext context) => Scaffold(
    body: IndexedStack(
      index: _atual.index,
      children: [
        for (final aba in Aba.values)
          _visitadas.contains(aba) ? _tela(aba) : const SizedBox.shrink(),
      ],
    ),
    bottomNavigationBar: _BarraAbas(atual: _atual, onSelecionar: _selecionar),
  );
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
              Text(aba.rotulo, style: Tipografia.aba.copyWith(color: cor)),
            ],
          ),
        ),
      ),
    );
  }
}
