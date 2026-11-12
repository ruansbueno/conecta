import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';

import 'config/rotas.dart';
import 'repositories/auth_repository.dart';
import 'repositories/avisos_repository.dart';
import 'repositories/eventos_repository.dart';
import 'repositories/horarios_repository.dart';
import 'repositories/solicitacoes_repository.dart';
import 'repositories/turmas_repository.dart';
import 'services/api_client.dart';
import 'services/api_failure.dart';
import 'services/cache_local.dart';
import 'services/cofre_sessao.dart';
import 'services/preferencia_tema.dart';
import 'state/session_controller.dart';
import 'state/solicitacoes_controller.dart';
import 'state/tema_controller.dart';
import 'theme/cores.dart';
import 'theme/tema.dart';
import 'ui/casca/casca_abas.dart';
import 'ui/comum/botao_tema.dart';
import 'ui/comum/estado_erro.dart';
import 'ui/comum/marca.dart';
import 'ui/login/login_page.dart';

/// O que o app precisa do mundo de fora; os testes injetam versões falsas.
class Dependencias {
  const Dependencias({
    required this.api,
    required this.cache,
    required this.cofre,
    required this.preferencias,
  });

  final ApiClient api;
  final CacheLocal cache;
  final CofreSessao cofre;

  /// Tema claro ou escuro escolhido no aparelho (spec 002).
  final PreferenciaTema preferencias;
}

class ConectaApp extends StatelessWidget {
  const ConectaApp({required this.dependencias, super.key});

  final Dependencias dependencias;

  @override
  Widget build(BuildContext context) {
    final d = dependencias;
    final auth = AuthRepository(d.api, d.cache);
    return MultiProvider(
      providers: [
        Provider.value(value: d.api),
        Provider.value(value: d.cache),
        Provider.value(value: auth),
        Provider(create: (_) => AvisosRepository(d.api, d.cache)),
        Provider(create: (_) => TurmasRepository(d.api, d.cache)),
        Provider(create: (_) => EventosRepository(d.api, d.cache)),
        Provider(create: (_) => HorariosRepository(d.api, d.cache)),
        Provider(create: (_) => SolicitacoesRepository(d.api)),
        ChangeNotifierProvider(create: (_) => MudancasDeSolicitacao()),
        // Lida antes do primeiro quadro: as preferências já vêm carregadas em Dependencias (FR-005).
        ChangeNotifierProvider(create: (_) => TemaController(d.preferencias)),
        ChangeNotifierProvider(
          create: (_) =>
              SessionController(api: d.api, auth: auth, cofre: d.cofre, cache: d.cache)..iniciar(),
        ),
      ],
      child: Builder(
        builder: (context) => MaterialApp(
          title: 'CONECTA',
          debugShowCheckedModeBanner: false,
          theme: temaConecta(CoresConecta.claro),
          darkTheme: temaConecta(CoresConecta.escuro),
          themeMode: context.watch<TemaController>().modo,
          locale: const Locale('pt', 'BR'),
          supportedLocales: const [Locale('pt', 'BR')],
          localizationsDelegates: GlobalMaterialLocalizations.delegates,
          navigatorKey: Rotas.navigatorKey,
          onGenerateRoute: Rotas.gerar,
          home: const _Raiz(),
        ),
      ),
    );
  }
}

/// Decide a tela inicial pelo estado da sessão (RM-07) e volta à raiz quando ela termina.
class _Raiz extends StatefulWidget {
  const _Raiz();

  @override
  State<_Raiz> createState() => _RaizState();
}

class _RaizState extends State<_Raiz> {
  EstadoSessao? _anterior;

  @override
  Widget build(BuildContext context) {
    final sessao = context.watch<SessionController>();
    if (_anterior == EstadoSessao.logado && sessao.estado == EstadoSessao.deslogado) {
      // Detalhes empilhados sobre a casca saem junto com a sessão.
      WidgetsBinding.instance.addPostFrameCallback(
        (_) => Rotas.navigatorKey.currentState?.popUntil((r) => r.isFirst),
      );
    }
    _anterior = sessao.estado;

    return switch (sessao.estado) {
      EstadoSessao.verificando => const _Abertura(),
      EstadoSessao.deslogado => const LoginPage(),
      EstadoSessao.logado => CascaAbas(key: ValueKey(sessao.usuario?.id)),
      EstadoSessao.semConexao => Scaffold(
        body: ComBotaoTema(
          child: EstadoErro(
            mensagem: const ApiFailure(code: ApiFailure.semRede).mensagem,
            onRepetir: sessao.iniciar,
          ),
        ),
      ),
    };
  }
}

class _Abertura extends StatelessWidget {
  const _Abertura();

  @override
  Widget build(BuildContext context) =>
      const Scaffold(body: Center(child: MarcaConecta(tamanho: 56)));
}
