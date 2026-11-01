import 'package:conecta/app.dart';
import 'package:conecta/services/cache_local.dart';
import 'package:conecta/services/cofre_sessao.dart';
import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';

import '../apoio.dart';
import '../fixtures/fixtures.dart';

const _id = '7b1c0e3a-6f64-4f43-8a58-2f3d5f0c1a11';

void main() {
  late ApiFalsa api;
  late CacheLocal cache;
  late CofreSessao cofre;

  setUpAll(() => initializeDateFormatting('pt_BR'));

  setUp(() async {
    api = ApiFalsa();
    (cache, cofre) = await armazenamentosVazios();
    api.responder('GET /avisos', avisosVazioJson);
  });

  Future<void> abrir(WidgetTester tester) async {
    await tester.pumpWidget(
      ConectaApp(
        dependencias: Dependencias(api: api.api, cache: cache, cofre: cofre),
      ),
    );
    await tester.pumpAndSettle();
  }

  Future<void> guardarSessao() =>
      cofre.gravar(SessaoGuardada(token: 'tok', usuarioId: _id, expiraEm: DateTime.utc(2030)));

  testWidgets('sem token abre no login', (tester) async {
    await abrir(tester);

    expect(find.text('Entrar'), findsOneWidget);
  });

  testWidgets('com token válido vai direto para Avisos, sem passar pelo login', (tester) async {
    await guardarSessao();
    api.responder('GET /me', meJson);

    await abrir(tester);

    expect(find.text('Entrar'), findsNothing);
    expect(find.widgetWithText(AppBar, 'Avisos'), findsOneWidget);
  });

  testWidgets('barra com as cinco abas da spec §3', (tester) async {
    await guardarSessao();
    api.responder('GET /me', meJson);

    await abrir(tester);

    final barra = find.byKey(const Key('barra-abas'));
    final rotulos = [
      for (final t in tester.widgetList<Text>(
        find.descendant(of: barra, matching: find.byType(Text)),
      ))
        t.data,
    ];
    expect(rotulos, ['Avisos', 'Agenda', 'Turmas', 'Horários', 'Perfil']);
  });

  testWidgets('cada aba expõe a ação de toque ao leitor de tela', (tester) async {
    await guardarSessao();
    api.responder('GET /me', meJson);
    final semantica = tester.ensureSemantics();

    await abrir(tester);

    final barra = find.byKey(const Key('barra-abas'));
    for (final aba in ['Avisos', 'Agenda', 'Turmas', 'Horários', 'Perfil']) {
      final no = tester.getSemantics(find.descendant(of: barra, matching: find.text(aba)));
      expect(no.getSemanticsData().hasAction(SemanticsAction.tap), isTrue, reason: aba);
    }
    semantica.dispose();
  });

  testWidgets('login válido leva à casca', (tester) async {
    api.responder('POST /auth/login', loginJson);
    api.responder('GET /me', meJson);
    await abrir(tester);

    await tester.enterText(find.byKey(const Key('campo-usuario')), 'aluno.teste');
    await tester.enterText(find.byKey(const Key('campo-senha')), 'senha-teste');
    await tester.tap(find.text('Entrar'));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('barra-abas')), findsOneWidget);
  });

  testWidgets('sair, no Perfil, apaga a sessão e volta ao login', (tester) async {
    await guardarSessao();
    api.responder('GET /me', meJson);
    await abrir(tester);

    await tester.tap(
      find.descendant(of: find.byKey(const Key('barra-abas')), matching: find.text('Perfil')),
    );
    await tester.pumpAndSettle();
    expect(find.text('Aluno de Teste'), findsOneWidget);
    await tester.tap(find.text('Sair da conta'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(TextButton, 'Sair'));
    await tester.pumpAndSettle();

    expect(find.text('Entrar'), findsOneWidget);
    expect(await cofre.ler(), isNull);
  });

  testWidgets('401 no meio do uso volta ao login com aviso de sessão expirada', (tester) async {
    await guardarSessao();
    api.responder('GET /me', meJson);
    await abrir(tester);

    api.responder('GET /me', erroNaoAutenticadoJson, 401);
    await tester.tap(
      find.descendant(of: find.byKey(const Key('barra-abas')), matching: find.text('Perfil')),
    );
    await tester.pumpAndSettle();

    expect(find.text('Entrar'), findsOneWidget);
    expect(find.text('Sua sessão expirou. Entre de novo.'), findsOneWidget);
  });

  testWidgets('a barra de abas não toma a tela: o conteúdo da aba tem altura', (tester) async {
    await guardarSessao();
    api.responder('GET /me', meJson);
    await abrir(tester);

    final barra = tester.getRect(find.byKey(const Key('barra-abas')));

    expect(barra.height, lessThan(100));
    expect(barra.bottom, tester.view.physicalSize.height / tester.view.devicePixelRatio);
  });

  testWidgets('abertura sem rede e sem cache: tela de sem conexão com repetir', (tester) async {
    await guardarSessao();
    api.falharRede('GET /me');
    await abrir(tester);

    expect(find.text('Sem conexão. Verifique a rede e tente de novo.'), findsOneWidget);

    api.responder('GET /me', meJson);
    await tester.tap(find.text('Tentar de novo'));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('barra-abas')), findsOneWidget);
  });
}
