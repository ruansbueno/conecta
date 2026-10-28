import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/aviso.dart';
import '../../repositories/avisos_repository.dart';
import '../../services/api_failure.dart';
import '../../theme/cores.dart';
import '../../theme/tipografia.dart';
import '../comum/avatar.dart';
import '../comum/chip_destino.dart';
import '../comum/datas.dart';
import '../comum/selo_situacao.dart';

/// Registro das rotas de telas empilhadas.
/// T03 — detalhe (design m-03). Abre com o dado da lista e revalida em `GET /avisos/{id}`;
/// `404` volta à lista, que recarrega (RM-13, RM-17).
class AvisoDetalhePage extends StatefulWidget {
  const AvisoDetalhePage({required this.aviso, super.key});

  final Aviso aviso;

  @override
  State<AvisoDetalhePage> createState() => _AvisoDetalhePageState();
}

class _AvisoDetalhePageState extends State<AvisoDetalhePage> {
  late Aviso _aviso = widget.aviso;

  @override
  void initState() {
    super.initState();
    _revalidar();
  }

  Future<void> _revalidar() async {
    final repo = context.read<AvisosRepository>();
    try {
      final atual = await repo.obter(_aviso.id);
      if (mounted) setState(() => _aviso = atual);
    } on ApiFailure catch (falha) {
      if (!mounted || falha.efeito != EfeitoFalha.voltaLista) return;
      // Sem rede ou erro do servidor: segue com o dado da lista.
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(falha.mensagem)));
      Navigator.of(context).pop(true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final aviso = _aviso;
    final publicado = 'Publicado ${dataHoraDetalhe(aviso.publicadoEm)}';
    return Scaffold(
      appBar: AppBar(leading: const BackButton()),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
        children: [
          Row(
            children: [
              Expanded(child: ChipsDestino(aviso.destinos)),
              if (aviso.situacao == SituacaoAviso.arquivado)
                const SeloSituacao('Arquivado', tom: TomSelo.neutro),
            ],
          ),
          const SizedBox(height: 12),
          Semantics(header: true, child: Text(aviso.titulo, style: Tipografia.tituloGrande)),
          const SizedBox(height: 16),
          Row(
            children: [
              Avatar(nome: aviso.autorNome, tamanho: TamanhoAvatar.medio),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  aviso.autorNome,
                  style: Tipografia.autor.copyWith(fontSize: 13, color: Cores.navy),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(),
          const SizedBox(height: 16),
          SelectableText(aviso.conteudo, style: Tipografia.corpo),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 11),
            decoration: BoxDecoration(
              color: Cores.fundoPagina,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                const Icon(Icons.history, size: 16, color: Cores.tenue),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    aviso.foiEditado
                        ? '$publicado · editado ${dataHoraDetalhe(aviso.editadoEm!)}'
                        : publicado,
                    style: Tipografia.meta,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
