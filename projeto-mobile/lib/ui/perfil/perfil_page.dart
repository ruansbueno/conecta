import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config/curso.dart';
import '../../models/turma.dart';
import '../../models/usuario.dart';
import '../../repositories/turmas_repository.dart';
import '../../services/api_client.dart';
import '../../services/api_failure.dart';
import '../../state/session_controller.dart';
import '../../theme/cores.dart';
import '../../theme/tipografia.dart';
import '../comum/avatar.dart';
import '../comum/faixa_cache.dart';
import '../comum/faixa_informativa.dart';
import '../turmas/turma_card.dart';

/// T14 — perfil (design m-13, RM-08, RM-10). A recarga de `GET /me` ao abrir a aba e ao voltar
/// do segundo plano fica na casca (RM-09).
class PerfilPage extends StatefulWidget {
  const PerfilPage({super.key});

  @override
  State<PerfilPage> createState() => _PerfilPageState();
}

class _PerfilPageState extends State<PerfilPage> {
  /// Período letivo das turmas do usuário: o `/me` não o informa (vem de `GET /turmas/minhas`).
  String? _periodo;
  Set<String>? _turmasDoPeriodo;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final usuario = context.watch<SessionController>().usuario;
    final turmas = <String>{for (final t in usuario?.turmas ?? const <TurmaVinculada>[]) t.id};
    if (usuario != null && !_mesmas(turmas, _turmasDoPeriodo)) {
      _turmasDoPeriodo = turmas;
      _carregarPeriodo(usuario);
    }
  }

  static bool _mesmas(Set<String> a, Set<String>? b) =>
      b != null && a.length == b.length && a.containsAll(b);

  /// Muda a cada carga: a resposta de uma carga antiga (turmas que já mudaram) é descartada.
  int _cargaDoPeriodo = 0;

  Future<void> _carregarPeriodo(Usuario usuario) async {
    final carga = ++_cargaDoPeriodo;
    if (usuario.turmas?.isEmpty ?? true) {
      _periodo = null;
      return;
    }
    final repo = context.read<TurmasRepository>();
    final guardado = repo.minhasEmCache(usuario.id);
    if (guardado != null) _periodo = _periodos(guardado.$1.items);
    try {
      final pagina = await repo.minhas(usuarioId: usuario.id);
      if (mounted && carga == _cargaDoPeriodo) setState(() => _periodo = _periodos(pagina.items));
    } on ApiFailure {
      // Sem rede e sem cache, a linha some; o resto do perfil vem do `/me`. O ApiClient já
      // registrou a falha (RM-38).
    } on Object catch (erro) {
      // Erro fora do ApiClient (cliente HTTP, cache): a linha some do mesmo jeito, mas sem passar
      // pelo log do cliente. Só o tipo: a mensagem pode trazer dados da resposta.
      ApiClient.registrarFalha('GET /turmas/minhas → ${erro.runtimeType}');
    }
  }

  /// "2026/2"; turmas de períodos diferentes, em ordem: "2026/1, 2026/2".
  static String? _periodos(Iterable<TurmaVinculada> turmas) {
    final todos = {for (final t in turmas) ?t.periodoLetivo}.toList()..sort();
    return todos.isEmpty ? null : todos.join(', ');
  }

  static String _rotuloPerfil(Usuario u) => switch (u.perfil) {
    Perfil.administrador => 'Administração',
    Perfil.coordenacao => 'Coordenação',
    Perfil.docente => 'Docente',
    Perfil.aluno => 'Aluno',
    Perfil.desconhecido => u.perfilBruto,
  };

  Future<void> _sair() async {
    final sessao = context.read<SessionController>();
    final confirmou = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sair da conta?'),
        content: const Text(
          'Para voltar, será preciso entrar de novo. Os dados guardados neste aparelho são '
          'apagados.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: context.cores.perigo),
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Sair'),
          ),
        ],
      ),
    );
    if (confirmou == true) await sessao.logout();
  }

  @override
  Widget build(BuildContext context) {
    final sessao = context.watch<SessionController>();
    final usuario = sessao.usuario;
    final dadosDe = sessao.perfilDoCache;
    return Scaffold(
      appBar: AppBar(title: const Text('Perfil'), toolbarHeight: 60, titleSpacing: 20),
      body: usuario == null
          ? const SizedBox.shrink()
          : ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              children: [
                // Aberto sem rede, o perfil é o guardado: diz de quando são os dados (RM-29).
                if (dadosDe != null) ...[
                  FaixaCache(coletadoEm: dadosDe, onRepetir: sessao.recarregarPerfil),
                  const SizedBox(height: 16),
                ],
                _Identificacao(usuario: usuario, perfil: _rotuloPerfil(usuario)),
                const SizedBox(height: 24),
                _Dados(usuario: usuario, periodo: _periodo),
                if (usuario.turmas?.isNotEmpty ?? false) ...[
                  const SizedBox(height: 24),
                  Semantics(
                    header: true,
                    child: Text(
                      'Minhas turmas',
                      style: context.tipos.subtitulo.copyWith(color: context.cores.apagado),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final t in usuario.turmas!)
                        _ChipTurma(rotulo: codigoCurto(t.codigo), nome: t.nome),
                    ],
                  ),
                ],
                const SizedBox(height: 24),
                const FaixaInformativa(
                  'Seu perfil de acesso é definido pela administração do CONECTA.',
                  icone: Icons.shield_outlined,
                ),
                const SizedBox(height: 16),
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton.icon(
                    onPressed: _sair,
                    icon: const Icon(Icons.logout, size: 20),
                    label: const Text('Sair da conta'),
                    style: TextButton.styleFrom(foregroundColor: context.cores.perigo),
                  ),
                ),
              ],
            ),
    );
  }
}

class _Identificacao extends StatelessWidget {
  const _Identificacao({required this.usuario, required this.perfil});

  final Usuario usuario;
  final String perfil;

  @override
  Widget build(BuildContext context) => MergeSemantics(
    child: Row(
      children: [
        // O nome já está ao lado: o leitor de tela não o repete.
        ExcludeSemantics(
          child: Avatar(nome: usuario.nome, tamanho: TamanhoAvatar.grande),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(usuario.nome, style: context.tipos.titulo),
              const SizedBox(height: 2),
              Text(usuario.username, style: context.tipos.apoio),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: context.cores.azulSuperficie,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(perfil, style: context.tipos.chip.copyWith(color: context.cores.azul)),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

/// Curso, período e quantos vínculos (design m-13).
class _Dados extends StatelessWidget {
  const _Dados({required this.usuario, required this.periodo});

  final Usuario usuario;
  final String? periodo;

  @override
  Widget build(BuildContext context) {
    final vinculos = usuario.turmas?.length ?? 0;
    final linhas = [
      (Icons.menu_book_outlined, 'Curso', Curso.nome),
      if (periodo != null) (Icons.calendar_today_outlined, 'Período letivo', periodo!),
      (
        Icons.school_outlined,
        'Turmas',
        switch (vinculos) {
          0 => 'Nenhum vínculo',
          1 => '1 vínculo',
          _ => '$vinculos vínculos',
        },
      ),
    ];
    return Container(
      decoration: BoxDecoration(
        color: context.cores.branco,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.cores.linha),
      ),
      child: Column(
        children: [
          for (final (i, (icone, rotulo, valor)) in linhas.indexed) ...[
            if (i > 0) const Divider(height: 1, indent: 16, endIndent: 16),
            MergeSemantics(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                child: _LinhaDeDado(icone: icone, rotulo: rotulo, valor: valor),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _ChipTurma extends StatelessWidget {
  const _ChipTurma({required this.rotulo, required this.nome});

  final String rotulo;
  final String nome;

  @override
  Widget build(BuildContext context) => Semantics(
    label: nome,
    excludeSemantics: true,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: context.cores.azulSuperficie,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(color: context.cores.azul, shape: BoxShape.circle),
          ),
          const SizedBox(width: 8),
          Text(rotulo, style: context.tipos.chip),
        ],
      ),
    ),
  );
}

/// Rótulo à esquerda e valor alinhado à direita; com a fonte do sistema grande, o valor desce
/// para baixo do rótulo (RM-36).
class _LinhaDeDado extends StatelessWidget {
  const _LinhaDeDado({required this.icone, required this.rotulo, required this.valor});

  final IconData icone;
  final String rotulo;
  final String valor;

  @override
  Widget build(BuildContext context) {
    final grande = MediaQuery.textScalerOf(context).scale(10) > 13;
    final cabeca = [Icon(icone, size: 20, color: context.cores.apagado), const SizedBox(width: 12)];
    final textoValor = Text(valor, style: context.tipos.tituloCartao, textAlign: TextAlign.end);
    if (grande) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              ...cabeca,
              Expanded(child: Text(rotulo, style: context.tipos.apoio)),
            ],
          ),
          const SizedBox(height: 4),
          Padding(padding: const EdgeInsets.only(left: 32), child: textoValor),
        ],
      );
    }
    return Row(
      children: [
        ...cabeca,
        Text(rotulo, style: context.tipos.apoio),
        const SizedBox(width: 12),
        Expanded(child: textoValor),
      ],
    );
  }
}
