// Spec 002, User Story 1 (FR-001 a FR-005): o modo noturno no app inteiro.
import 'package:conecta/app.dart';
import 'package:conecta/services/cache_local.dart';
import 'package:conecta/services/cofre_sessao.dart';
import 'package:conecta/services/preferencia_tema.dart';
import 'package:conecta/theme/cores.dart';
import 'package:conecta/ui/comum/botao_tema.dart';
import 'package:conecta/ui/rotas_das_telas.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../apoio.dart';
import '../fixtures/fabrica.dart';
import '../fixtures/fixtures.dart';

const _id = '7b1c0e3a-6f64-4f43-8a58-2f3d5f0c1a11';

void main() {
  late ApiFalsa api;
  late CacheLocal cache;
  late CofreSessao cofre;

  setUpAll(() async {
    await initializeDateFormatting('pt_BR');
    registrarRotas();
  });

  setUp(() async {
    api = ApiFalsa();
    (cache, cofre) = await armazenamentosVazios();
    api.responder('GET /avisos', avisosP1Json);
  });

  tearDown(() => TestWidgetsFlutterBinding.instance.platformDispatcher.clearAllTestValues());

  Future<SharedPreferences> prefs() => SharedPreferences.getInstance();

  Future<void> abrir(WidgetTester tester) async {
    await tester.pumpWidget(
      ConectaApp(
        dependencias: Dependencias(
          api: api.api,
          cache: cache,
          cofre: cofre,
          preferencias: PreferenciaTema(await prefs()),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  Future<void> entrarLogado() async {
    await cofre.gravar(SessaoGuardada(token: 'tok', usuarioId: _id, expiraEm: DateTime.utc(2030)));
    api.responder('GET /me', meJson);
  }

  Brightness brilho(WidgetTester tester) =>
      Theme.of(tester.element(find.byType(Scaffold).first)).brightness;
  Color fundo(WidgetTester tester) =>
      tester.widget<Scaffold>(find.byType(Scaffold).first).backgroundColor ??
      Theme.of(tester.element(find.byType(Scaffold).first)).scaffoldBackgroundColor;
  void sistemaEscuro(WidgetTester tester) =>
      tester.platformDispatcher.platformBrightnessTestValue = Brightness.dark;
  Finder ativar() => find.byTooltip('Ativar modo noturno');
  Finder desativar() => find.byTooltip('Desativar modo noturno');

  testWidgets('sem escolha e sistema claro: claro, com a lua', (tester) async {
    await abrir(tester);

    expect(brilho(tester), Brightness.light);
    expect(ativar(), findsOneWidget);
    expect(find.byIcon(Icons.dark_mode_outlined), findsOneWidget);
  });

  testWidgets('sem escolha e sistema escuro: escuro desde o primeiro quadro, com o sol', (
    tester,
  ) async {
    sistemaEscuro(tester);
    await abrir(tester);

    expect(brilho(tester), Brightness.dark);
    expect(desativar(), findsOneWidget);
    expect(find.byIcon(Icons.light_mode_outlined), findsOneWidget);
  });

  testWidgets('a escolha "claro" vence o sistema escuro', (tester) async {
    sistemaEscuro(tester);
    await (await prefs()).setString('conecta:tema', 'claro');
    await abrir(tester);

    expect(brilho(tester), Brightness.light);
  });

  testWidgets('tocar alterna, grava e vale depois de reabrir o app', (tester) async {
    await entrarLogado();
    await abrir(tester);
    expect(brilho(tester), Brightness.light);

    await tester.tap(ativar());
    await tester.pumpAndSettle();

    expect(brilho(tester), Brightness.dark);
    expect(fundo(tester), CoresConecta.escuro.branco);
    expect((await prefs()).getString('conecta:tema'), 'escuro');

    await tester.pumpWidget(const SizedBox()); // fecha o app
    await abrir(tester);
    expect(brilho(tester), Brightness.dark);
    expect(desativar(), findsOneWidget);
  });

  testWidgets('sair da conta não apaga a escolha: o login abre escuro', (tester) async {
    await entrarLogado();
    await (await prefs()).setString('conecta:tema', 'escuro');
    await abrir(tester);

    await tester.tap(
      find.descendant(of: find.byKey(const Key('barra-abas')), matching: find.text('Perfil')),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sair da conta'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(TextButton, 'Sair'));
    await tester.pumpAndSettle();

    expect(find.text('Entrar'), findsOneWidget);
    expect(brilho(tester), Brightness.dark);
    expect((await prefs()).getString('conecta:tema'), 'escuro');
  });

  testWidgets('no login, trocar o tema não apaga o usuário digitado', (tester) async {
    await abrir(tester);
    await tester.enterText(find.byType(TextField).first, 'aluno.teste');

    await tester.tap(ativar());
    await tester.pumpAndSettle();

    expect(brilho(tester), Brightness.dark);
    expect(find.text('aluno.teste'), findsOneWidget);
  });

  testWidgets('o botão está no canto superior direito de toda tela (FR-001)', (tester) async {
    await entrarLogado();
    api
      ..responder('GET /turmas/minhas', paginaJson([]))
      ..responder('GET /eventos', paginaJson([]))
      ..responder('GET /turmas', paginaJson([]))
      ..responder('GET /solicitacoes/minhas', paginaJson([]));
    await abrir(tester);

    void naBarraDoTopo(String tela) {
      final botao = find.byType(BotaoTema);
      expect(botao, findsOneWidget, reason: tela);
      expect(
        find.ancestor(of: botao, matching: find.byType(AppBar)),
        findsOneWidget,
        reason: '$tela: o botão fica na barra do topo',
      );
      final barra = tester.getRect(find.ancestor(of: botao, matching: find.byType(AppBar)));
      final r = tester.getRect(botao);
      expect(r.right, closeTo(barra.right, 16), reason: '$tela: à direita');
      expect(r.top, lessThan(barra.top + 60), reason: '$tela: no topo');
    }

    naBarraDoTopo('Avisos');
    for (final aba in ['Agenda', 'Turmas', 'Horários', 'Perfil']) {
      await tester.tap(
        find.descendant(of: find.byKey(const Key('barra-abas')), matching: find.text(aba)),
      );
      await tester.pumpAndSettle();
      naBarraDoTopo(aba);
    }

    // Detalhe de aviso.
    await tester.tap(
      find.descendant(of: find.byKey(const Key('barra-abas')), matching: find.text('Avisos')),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Reunião de pais e alunos'));
    await tester.pumpAndSettle();
    naBarraDoTopo('Detalhe do aviso');
  });

  testWidgets('login e "Sem conexão": canto superior direito, fora de barra', (tester) async {
    await abrir(tester);
    final tela = tester.getRect(find.byType(Scaffold).first);
    var r = tester.getRect(find.byType(BotaoTema));
    expect(r.right, closeTo(tela.right, 24), reason: 'login: à direita');
    expect(r.top, lessThan(tela.top + 80), reason: 'login: no topo');

    await cofre.gravar(SessaoGuardada(token: 'tok', usuarioId: _id, expiraEm: DateTime.utc(2030)));
    api.falharRede('GET /me');
    await tester.pumpWidget(const SizedBox());
    await abrir(tester);
    expect(find.text('Sem conexão. Verifique a rede e tente de novo.'), findsOneWidget);
    r = tester.getRect(find.byType(BotaoTema));
    expect(r.right, closeTo(tela.right, 24), reason: 'sem conexão: à direita');
    expect(r.top, lessThan(tela.top + 80), reason: 'sem conexão: no topo');
  });

  testWidgets('alvo de toque de 48 dp e rótulo para o leitor de tela', (tester) async {
    final semantica = tester.ensureSemantics();
    await abrir(tester);
    final r = tester.getRect(find.byType(BotaoTema));
    expect(r.width, greaterThanOrEqualTo(48));
    expect(r.height, greaterThanOrEqualTo(48));
    // O leitor de tela anuncia a dica do botão (tooltip) como o que o toque faz.
    expect(
      tester.getSemantics(find.byType(IconButton).last),
      isSemantics(tooltip: 'Ativar modo noturno', isButton: true, hasTapAction: true),
    );
    semantica.dispose();
  });
}
