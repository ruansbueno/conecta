import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../services/api_failure.dart';
import '../../state/session_controller.dart';
import '../../theme/cores.dart';
import '../../theme/tema.dart';
import '../../theme/tipografia.dart';
import '../comum/marca.dart';

/// T01 — login (design m-01). A senha só existe no campo, enquanto a tela está aberta.
class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _usuario = TextEditingController();
  final _senha = TextEditingController();
  final _focoSenha = FocusNode();

  bool _enviando = false;
  bool _tentou = false;
  ApiFailure? _falha;

  @override
  void initState() {
    super.initState();
    // Os avisos dos campos acompanham a digitação, não só o próximo toque em Entrar.
    _usuario.addListener(_aoDigitar);
    _senha.addListener(_aoDigitar);
  }

  void _aoDigitar() {
    if (_tentou || (_falha?.errors.isNotEmpty ?? false)) setState(() {});
  }

  @override
  void dispose() {
    _usuario.dispose();
    _senha.dispose();
    _focoSenha.dispose();
    super.dispose();
  }

  String? _erroCampo(String campo, TextEditingController controle, String vazio) {
    if (_tentou && controle.text.trim().isEmpty) return vazio;
    for (final e in _falha?.errors ?? const <ErroDeCampo>[]) {
      if (e.campo == campo) return e.mensagem;
    }
    return null;
  }

  Future<void> _entrar() async {
    setState(() {
      _tentou = true;
      _falha = null;
    });
    if (_usuario.text.trim().isEmpty || _senha.text.isEmpty) return;

    setState(() => _enviando = true);
    try {
      await context.read<SessionController>().login(_usuario.text.trim(), _senha.text);
    } on ApiFailure catch (falha) {
      if (!mounted) return;
      setState(() {
        _falha = falha;
        // Falha de credencial limpa a senha; sem rede, ela fica para o "Tentar de novo".
        if (falha.efeito != EfeitoFalha.repetir) _senha.clear();
        // Campo vazio por limpeza do app não é "campo faltando": só a mensagem da falha.
        _tentou = false;
      });
    } finally {
      if (mounted) setState(() => _enviando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final encerramento = context.select<SessionController, String?>((s) => s.mensagemEncerramento);
    final mensagem = _falha?.mensagem ?? encerramento;

    return Scaffold(
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, limites) => SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(28, 56, 28, 30),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: limites.maxHeight - 86),
              child: IntrinsicHeight(
                child: AutofillGroup(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Align(alignment: Alignment.centerLeft, child: MarcaConecta()),
                      const SizedBox(height: 20),
                      Text('CONECTA', style: Tipografia.marca),
                      const SizedBox(height: 8),
                      ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 290),
                        child: const Text(
                          'Avisos, agenda e turmas do curso de Análise e Desenvolvimento de '
                          'Sistemas — IFSul.',
                          style: Tipografia.apoio,
                        ),
                      ),
                      const SizedBox(height: 32),
                      _Campo(
                        key: const Key('campo-usuario'),
                        rotulo: 'Usuário',
                        controle: _usuario,
                        dica: 'seu.usuario',
                        icone: Icons.person_outline,
                        erro: _erroCampo('username', _usuario, 'Informe o usuário.'),
                        acao: TextInputAction.next,
                        autofill: const [AutofillHints.username],
                        aoEnviar: (_) => _focoSenha.requestFocus(),
                      ),
                      const SizedBox(height: 16),
                      _Campo(
                        key: const Key('campo-senha'),
                        rotulo: 'Senha',
                        controle: _senha,
                        foco: _focoSenha,
                        icone: Icons.lock_outline,
                        oculto: true,
                        erro: _erroCampo('password', _senha, 'Informe a senha.'),
                        acao: TextInputAction.done,
                        autofill: const [AutofillHints.password],
                        aoEnviar: (_) => _entrar(),
                      ),
                      if (mensagem != null) ...[
                        const SizedBox(height: 20),
                        _Mensagem(
                          texto: mensagem,
                          onRepetir: _falha?.efeito == EfeitoFalha.repetir ? _entrar : null,
                        ),
                      ],
                      const SizedBox(height: 24),
                      FilledButton(
                        onPressed: _enviando ? null : _entrar,
                        child: _enviando
                            ? const SizedBox.square(
                                dimension: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.4,
                                  color: Cores.branco,
                                  semanticsLabel: 'Entrando',
                                ),
                              )
                            : const Text('Entrar'),
                      ),
                      const Spacer(),
                      const SizedBox(height: 32),
                      const _AvisoSenha(),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Campo extends StatelessWidget {
  const _Campo({
    required this.rotulo,
    required this.controle,
    required this.icone,
    required this.acao,
    required this.autofill,
    required this.aoEnviar,
    this.dica,
    this.foco,
    this.erro,
    this.oculto = false,
    super.key,
  });

  final String rotulo;
  final TextEditingController controle;
  final IconData icone;
  final TextInputAction acao;
  final List<String> autofill;
  final ValueChanged<String> aoEnviar;
  final String? dica;
  final FocusNode? foco;
  final String? erro;
  final bool oculto;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(rotulo, style: Tipografia.rotuloCampo),
      const SizedBox(height: 6),
      TextField(
        controller: controle,
        focusNode: foco,
        obscureText: oculto,
        obscuringCharacter: '•',
        autocorrect: false,
        enableSuggestions: !oculto,
        textInputAction: acao,
        autofillHints: autofill,
        onSubmitted: aoEnviar,
        style: Tipografia.campo,
        decoration: InputDecoration(
          hintText: dica,
          semanticCounterText: rotulo,
          labelText: null,
          prefixIcon: Icon(icone, size: 18),
          errorText: erro,
        ),
      ),
    ],
  );
}

class _Mensagem extends StatelessWidget {
  const _Mensagem({required this.texto, this.onRepetir});

  final String texto;
  final VoidCallback? onRepetir;

  @override
  Widget build(BuildContext context) => Semantics(
    liveRegion: true,
    child: Container(
      padding: EdgeInsets.fromLTRB(14, 10, onRepetir == null ? 14 : 4, 10),
      decoration: BoxDecoration(
        color: Cores.perigoFundo,
        borderRadius: BorderRadius.circular(Raios.campo),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, size: 18, color: Cores.perigo),
          const SizedBox(width: 10),
          Expanded(
            child: Text(texto, style: Tipografia.apoio.copyWith(color: Cores.perigo)),
          ),
          if (onRepetir != null)
            TextButton(onPressed: onRepetir, child: const Text('Tentar de novo')),
        ],
      ),
    ),
  );
}

class _AvisoSenha extends StatelessWidget {
  const _AvisoSenha();

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
    decoration: BoxDecoration(
      color: Cores.fundoPagina,
      borderRadius: BorderRadius.circular(Raios.cartao),
    ),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Icon(Icons.shield_outlined, size: 18, color: Cores.navySuave),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            'Use o login e a senha institucionais do IFSul. O CONECTA não armazena sua senha.',
            style: Tipografia.apoio.copyWith(fontSize: 12.5, color: Cores.navySuave),
          ),
        ),
      ],
    ),
  );
}
