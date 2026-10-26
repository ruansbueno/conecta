import 'package:flutter/material.dart';

import '../comum/estado_vazio.dart';

/// T06 — provisória: Minhas turmas entra na US3.
class MinhasTurmasPage extends StatelessWidget {
  const MinhasTurmasPage({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Turmas')),
    body: const EstadoVazio(
      icone: Icons.school_outlined,
      titulo: 'Turmas em breve',
      texto: 'Suas turmas e as solicitações de inscrição chegam na próxima versão do app.',
    ),
  );
}
