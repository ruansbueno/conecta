import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/usuario.dart';
import '../../state/session_controller.dart';
import '../../theme/cores.dart';
import '../../theme/tipografia.dart';
import '../comum/avatar.dart';

/// T14 — provisória até a US5: identifica o usuário, reavalia o perfil ao abrir (RM-09) e
/// oferece a saída da conta (RM-10).
class PerfilPage extends StatefulWidget {
  const PerfilPage({super.key});

  @override
  State<PerfilPage> createState() => _PerfilPageState();
}

class _PerfilPageState extends State<PerfilPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback(
      (_) => context.read<SessionController>().recarregarPerfil(),
    );
  }

  static String _rotuloPerfil(Usuario u) => switch (u.perfil) {
    Perfil.administrador => 'Administração',
    Perfil.coordenacao => 'Coordenação',
    Perfil.docente => 'Docente',
    Perfil.aluno => 'Aluno',
    Perfil.desconhecido => u.perfilBruto,
  };

  @override
  Widget build(BuildContext context) {
    final usuario = context.watch<SessionController>().usuario;
    return Scaffold(
      appBar: AppBar(title: const Text('Perfil')),
      body: usuario == null
          ? const SizedBox.shrink()
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Row(
                  children: [
                    Avatar(nome: usuario.nome, tamanho: TamanhoAvatar.medio),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(usuario.nome, style: Tipografia.subtitulo),
                          Text(
                            '${usuario.username} · ${_rotuloPerfil(usuario)}',
                            style: Tipografia.meta,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 28),
                OutlinedButton.icon(
                  onPressed: () => context.read<SessionController>().logout(),
                  icon: const Icon(Icons.logout, size: 18),
                  label: const Text('Sair da conta'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Cores.perigo,
                    side: const BorderSide(color: Cores.perigoFundo),
                  ),
                ),
              ],
            ),
    );
  }
}
