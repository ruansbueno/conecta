import 'dart:convert';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import '../test/fixtures/fabrica.dart';
import '../test/fixtures/fixtures.dart';
import 'apoio_integracao.dart';

/// RM-09: a administração muda o perfil no servidor e o app passa a respeitá-lo na mesma
/// sessão, sem novo login — ao abrir a aba Perfil ou ao voltar do segundo plano.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  late AppSobTeste app;
  late String perfil;

  setUp(() async {
    app = await AppSobTeste.preparar();
    perfil = 'aluno';
    app.servidor
      ..responder('POST /auth/login', loginJson)
      ..responderCom('GET /me', (_) {
        final me = (jsonDecode(meJson) as Map<String, dynamic>)..['perfil'] = perfil;
        if (perfil != 'aluno') me['turmas'] = <Object>[];
        return (200, jsonEncode(me));
      })
      ..responder('GET /avisos', avisosVazioJson)
      ..responderCom(
        'GET /turmas/minhas',
        (_) =>
            (200, paginaJson([if (perfil == 'aluno') turmaMapa('TADS-3A-2026-2', papel: 'aluno')])),
      )
      ..responder('GET /solicitacoes/minhas', paginaJson([]));
  });

  tearDown(() => app.encerrar());

  Future<void> entrarComoAluno(WidgetTester tester) async {
    await app.abrir(tester);
    await app.entrar(tester);
    await app.abrirAba(tester, 'Turmas');
    await esperar(tester, find.text('Entrar em outra turma'));
  }

  testWidgets('abrir a aba Perfil traz o perfil novo e ajusta as outras abas', (tester) async {
    await entrarComoAluno(tester);

    perfil = 'docente';
    await app.abrirAba(tester, 'Perfil');
    await esperar(tester, find.text('Docente'));
    expect(find.text('Nenhum vínculo'), findsOneWidget);

    await app.abrirAba(tester, 'Turmas');
    await esperar(tester, find.text('Nenhuma turma vinculada'));
    expect(find.text('Entrar em outra turma'), findsNothing);
  });

  testWidgets('voltar do segundo plano também reavalia o perfil', (tester) async {
    await entrarComoAluno(tester);

    perfil = 'coordenacao';
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);

    await esperar(tester, find.text('Nenhuma turma vinculada'));
    expect(find.text('Entrar em outra turma'), findsNothing);
  });
}
