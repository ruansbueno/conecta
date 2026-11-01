import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../models/evento.dart';
import '../../repositories/eventos_repository.dart';
import '../../services/api_failure.dart';
import '../../theme/cores.dart';
import '../../theme/tipografia.dart';
import '../comum/avatar.dart';
import '../comum/chip_destino.dart';
import '../comum/datas.dart';
import '../comum/esqueleto_lista.dart';
import '../comum/estado_erro.dart';
import '../comum/faixa_informativa.dart';
import 'calendario.dart';

/// T12 — detalhe do evento (design m-11, plan-f2 D-AF2-5). Abre com o evento da lista e revalida
/// em `GET /eventos/{id}`; `404` volta à agenda, que recarrega. Aberto só com o id, mostra o
/// esqueleto até a resposta.
class EventoDetalhePage extends StatefulWidget {
  const EventoDetalhePage({this.evento, this.id, super.key}) : assert(evento != null || id != null);

  /// A rota aceita o [Evento] (vindo da lista) ou só o id.
  factory EventoDetalhePage.daRota(Object? argumento) => argumento is Evento
      ? EventoDetalhePage(evento: argumento)
      : EventoDetalhePage(id: argumento! as String);

  final Evento? evento;
  final String? id;

  @override
  State<EventoDetalhePage> createState() => _EventoDetalhePageState();
}

class _EventoDetalhePageState extends State<EventoDetalhePage> {
  late Evento? _evento = widget.evento;
  ApiFailure? _falha;

  /// Sem rede: o que está na tela veio da lista.
  bool _semRede = false;

  String get _id => widget.evento?.id ?? widget.id!;

  @override
  void initState() {
    super.initState();
    _revalidar();
  }

  Future<void> _revalidar() async {
    final repo = context.read<EventosRepository>();
    setState(() => _falha = null);
    try {
      final atual = await repo.obter(_id);
      if (!mounted) return;
      setState(() {
        _evento = atual;
        _semRede = false;
      });
    } on ApiFailure catch (falha) {
      if (!mounted) return;
      if (falha.efeito == EfeitoFalha.voltaLista) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(falha.mensagem)));
        Navigator.of(context).pop(true);
        return;
      }
      // Com o evento da lista na tela, segue com ele (a faixa só quando falta rede); sem nada,
      // o estado de erro.
      final semRede = falha.code == ApiFailure.semRede || falha.code == ApiFailure.timeout;
      setState(() => _evento == null ? _falha = falha : _semRede = semRede);
    }
  }

  @override
  Widget build(BuildContext context) {
    final evento = _evento;
    return Scaffold(
      appBar: AppBar(leading: const BackButton()),
      body: evento == null
          ? (_falha == null
                ? const EsqueletoLista(itens: 2)
                : EstadoErro(mensagem: _falha!.mensagem, onRepetir: _revalidar))
          : ListView(
              padding: const EdgeInsets.only(bottom: 32),
              children: [
                if (_semRede)
                  FaixaInformativa(
                    'Sem conexão. Mostrando o evento como estava na agenda.',
                    icone: Icons.cloud_off_outlined,
                    acao: TextButton(onPressed: _revalidar, child: const Text('Tentar de novo')),
                  ),
                Padding(padding: const EdgeInsets.fromLTRB(20, 4, 20, 0), child: _Conteudo(evento)),
              ],
            ),
    );
  }
}

class _Conteudo extends StatelessWidget {
  const _Conteudo(this.evento);

  final Evento evento;

  /// Vários dias numa linha; um dia, o dia por extenso e as horas abaixo.
  (String, String?) get _quando {
    if (evento.variosDias) {
      final f = DateFormat("dd/MM', 'HH:mm", 'pt_BR');
      return (
        'De ${f.format(evento.inicio.toLocal())}, a ${f.format(evento.fim!.toLocal())}',
        null,
      );
    }
    return (tituloDoDia(evento.inicio.toLocal()), faixaDeHoras(evento));
  }

  @override
  Widget build(BuildContext context) {
    final cor = corDoTipo(evento.tipo);
    final (quando, horas) = _quando;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: cor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            evento.rotuloTipo,
            style: Tipografia.chip.copyWith(color: cor, fontWeight: FontWeight.w600),
          ),
        ),
        const SizedBox(height: 12),
        Semantics(header: true, child: Text(evento.titulo, style: Tipografia.tituloGrande)),
        const SizedBox(height: 20),
        DecoratedBox(
          decoration: BoxDecoration(
            border: Border.all(color: Cores.linha),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Column(
            children: [
              _Linha(icone: Icons.calendar_today_outlined, titulo: quando, apoio: horas),
              if (evento.local case final local?) ...[
                const Divider(indent: 16, endIndent: 16, height: 1),
                _Linha(icone: Icons.place_outlined, titulo: local),
              ],
            ],
          ),
        ),
        if (evento.descricao case final descricao? when descricao.trim().isNotEmpty) ...[
          const SizedBox(height: 20),
          SelectionArea(child: Text(descricao, style: Tipografia.corpo)),
        ],
        const SizedBox(height: 24),
        Text('Para quem é', style: Tipografia.rotuloCampo),
        const SizedBox(height: 8),
        ChipsDestino(evento.destinos),
        const SizedBox(height: 24),
        Row(
          children: [
            Avatar(nome: evento.autorNome, tamanho: TamanhoAvatar.medio),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(evento.autorNome, style: Tipografia.autor.copyWith(color: Cores.navy)),
                  if (evento.editadoEm case final editado?)
                    Text('Editado ${dataHoraDetalhe(editado)}', style: Tipografia.meta),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _Linha extends StatelessWidget {
  const _Linha({required this.icone, required this.titulo, this.apoio});

  final IconData icone;
  final String titulo;
  final String? apoio;

  @override
  Widget build(BuildContext context) => MergeSemantics(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icone, size: 20, color: Cores.azul),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(titulo, style: Tipografia.tituloCartao),
                if (apoio case final apoio?) Text(apoio, style: Tipografia.meta),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}
