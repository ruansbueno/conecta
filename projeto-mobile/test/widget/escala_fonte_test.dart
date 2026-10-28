// RM-36: as telas acomodam a fonte do sistema a 200% sem perder conteúdo.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../fixtures/fabrica.dart';
import '../fixtures/fixtures.dart';
import 'app_falso.dart';

void main() {
  Future<void> telaPequenaComFonteDobrada(WidgetTester tester) async {
    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1;
    tester.platformDispatcher.textScaleFactorTestValue = 2;
    addTearDown(tester.view.reset);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
  }

  testWidgets('lista de avisos a 200%: alternância e cartões sem estouro', (tester) async {
    await telaPequenaComFonteDobrada(tester);
    final app = AppFalso();
    await app.preparar();
    app.api.responder('GET /avisos', avisosP1Json);

    await app.abrir(tester);
    await tester.tap(find.text('Arquivados'));
    await tester.pumpAndSettle();

    final e = tester.takeException();
    expect(e, isNull);
    expect(find.text('Arquivados').hitTestable(), findsOneWidget);
  });

  testWidgets('login a 200% sem estouro', (tester) async {
    await telaPequenaComFonteDobrada(tester);
    final app = AppFalso();
    await app.preparar();
    await app.cofre.apagar();

    await app.abrir(tester);

    expect(tester.takeException(), isNull);
    expect(find.text('Entrar'), findsOneWidget);
  });

  testWidgets('detalhe do aviso a 200% sem estouro', (tester) async {
    await telaPequenaComFonteDobrada(tester);
    final app = AppFalso();
    await app.preparar();
    app.api.responder('GET /avisos', avisosP1Json);
    app.api.falharRede('GET /avisos/e5d20000-0000-4000-8000-000000000001');
    await app.abrir(tester);

    await tester.tap(find.text('Reunião de pais e alunos'));
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
  });

  testWidgets('minhas turmas e turmas disponíveis a 200% sem estouro', (tester) async {
    await telaPequenaComFonteDobrada(tester);
    final app = AppFalso();
    await app.preparar();
    app.api.responder('GET /avisos', avisosP1Json);
    app.api.responder(
      'GET /turmas/minhas',
      paginaJson([turmaMapa('TADS-3A-2026-2', nome: 'TADS 3º Sem A', papel: 'aluno')]),
    );
    app.api.responder(
      'GET /solicitacoes/minhas',
      paginaJson([solicitacaoMapa('s1', nome: 'Introdução a Ciência de Dados')]),
    );
    app.api.responder(
      'GET /turmas/disponiveis',
      paginaJson([turmaMapa('TADS-5A-2026-2', nome: 'TADS 5º Sem A', semestre: 5)]),
    );
    await app.abrir(tester);

    await tester.tap(find.text('Turmas').last);
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await tester.scrollUntilVisible(
      find.text('Ver turmas'),
      200,
      scrollable: find.descendant(
        of: find.byKey(const Key('lista-turmas')),
        matching: find.byType(Scrollable),
      ),
    );
    await tester.ensureVisible(find.text('Ver turmas'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Ver turmas'));
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    await tester.scrollUntilVisible(
      find.text('Solicitar'),
      100,
      scrollable: find.descendant(
        of: find.byKey(const Key('lista-disponiveis')),
        matching: find.byType(Scrollable),
      ),
    );
    expect(find.text('Solicitar').hitTestable(), findsOneWidget);
  });
}
