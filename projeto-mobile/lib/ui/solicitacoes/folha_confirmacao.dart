import 'package:flutter/material.dart';

import '../../theme/cores.dart';
import '../../theme/tipografia.dart';

enum SaidaDaFolha { verSolicitacoes, voltarAsTurmas }

/// T08 — folha depois do `201` (design m-08): a inscrição ficou pendente e quem decide. Dois
/// caminhos de saída; arrastar para baixo fecha e fica nas turmas disponíveis (`null`).
Future<SaidaDaFolha?> mostrarFolhaConfirmacao(BuildContext context, String turmaNome) =>
    showModalBottomSheet<SaidaDaFolha>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      backgroundColor: context.cores.branco,
      builder: (context) => SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: context.cores.sucessoFundo,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(Icons.check, color: context.cores.sucesso),
              ),
              const SizedBox(height: 16),
              Semantics(
                header: true,
                child: Text('Solicitação enviada', style: context.tipos.titulo),
              ),
              const SizedBox(height: 8),
              Text.rich(
                TextSpan(
                  style: context.tipos.apoio,
                  children: [
                    const TextSpan(text: 'Sua inscrição em '),
                    TextSpan(
                      text: turmaNome,
                      style: TextStyle(fontWeight: FontWeight.w700, color: context.cores.navy),
                    ),
                    const TextSpan(
                      text:
                          ' ficou pendente. A coordenação ou quem leciona na turma decide, e a '
                          'resposta aparece em Minhas solicitações.',
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: context.cores.navy),
                  onPressed: () => Navigator.of(context).pop(SaidaDaFolha.verSolicitacoes),
                  child: const Text('Ver minhas solicitações'),
                ),
              ),
              const SizedBox(height: 4),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: () => Navigator.of(context).pop(SaidaDaFolha.voltarAsTurmas),
                  child: const Text('Voltar às turmas'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
