import 'package:conecta/services/cache_local.dart';
import 'package:conecta/services/cofre_sessao.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import '../test/fixtures/fixtures.dart';
import 'apoio_integracao.dart';

const _id = '7b1c0e3a-6f64-4f43-8a58-2f3d5f0c1a11';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  late AppSobTeste app;

  setUp(() async {
    app = await AppSobTeste.preparar();
    app.servidor
      ..responder('POST /auth/login', loginJson)
      ..responder('GET /me', meJson)
      ..responder('GET /avisos', avisosVazioJson);
  });

  tearDown(() => app.encerrar());

  Future<void> guardarToken() => app.cofre.gravar(
    SessaoGuardada(token: 'tok-guardado', usuarioId: _id, expiraEm: DateTime.utc(2030)),
  );

  testWidgets('abertura com token válido vai direto para a casca', (tester) async {
    await guardarToken();

    await app.abrir(tester);

    expect(find.byKey(const Key('barra-abas')), findsOneWidget);
    expect(app.servidor.pedidos.first.rota, 'GET /me');
    expect(app.servidor.pedidos.first.autorizacao, 'Bearer tok-guardado');
  });

  testWidgets('abertura com token inválido volta ao login e apaga a sessão', (tester) async {
    await guardarToken();
    app.servidor.responder('GET /me', erroNaoAutenticadoJson, status: 401);

    await app.abrir(tester);

    expect(find.text('Entrar'), findsOneWidget);
    expect(find.text('Sua sessão expirou. Entre de novo.'), findsOneWidget);
    expect(await app.cofre.ler(), isNull);
  });

  testWidgets('login de verdade grava o token no cofre do aparelho', (tester) async {
    await app.abrir(tester);

    await app.entrar(tester);

    expect(find.byKey(const Key('barra-abas')), findsOneWidget);
    expect((await app.cofre.ler())!.usuarioId, _id);
    expect(app.servidor.pedidos.first.corpo, contains('aluno.teste'));
  });

  testWidgets('401 no meio da navegação encerra a sessão e volta ao login', (tester) async {
    await app.abrir(tester);
    await app.entrar(tester);

    app.servidor.forcar401 = true;
    await app.abrirAba(tester, 'Perfil');
    await esperar(tester, find.text('Sua sessão expirou. Entre de novo.'));

    expect(find.text('Entrar'), findsOneWidget);
    expect(find.text('Sua sessão expirou. Entre de novo.'), findsOneWidget);
    expect(await app.cofre.ler(), isNull);
    expect(app.cache.ler(_id, RecursoCache.perfil), isNull);
  });

  testWidgets('sair limpa token e cache; reabrir leva ao login', (tester) async {
    await app.abrir(tester);
    await app.entrar(tester);
    await esperar(tester, find.byKey(const Key('barra-abas')));
    for (var i = 0; i < 50 && app.cache.ler(_id, RecursoCache.perfil) == null; i++) {
      await tester.pump(const Duration(milliseconds: 100)); // GET /me após o login
    }
    expect(app.cache.ler(_id, RecursoCache.perfil), isNotNull);

    await app.abrirAba(tester, 'Perfil');
    await tester.tap(find.text('Sair da conta'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(TextButton, 'Sair'));
    await esperar(tester, find.text('Entrar'));

    expect(find.text('Entrar'), findsOneWidget);
    expect(await app.cofre.ler(), isNull);
    expect(app.cache.ler(_id, RecursoCache.perfil), isNull);

    await app.abrir(tester);
    expect(find.text('Entrar'), findsOneWidget);
  });
}
