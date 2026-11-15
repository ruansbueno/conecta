import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import '../test/fixtures/fabrica.dart';
import '../test/fixtures/fixtures.dart';
import 'apoio_integracao.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  late AppSobTeste app;
  final si3a = turmaMapa('SI-3A', nome: 'Sistemas para Internet 3A', papel: 'aluno');
  final si3b = turmaMapa('SI-3B', nome: 'Sistemas para Internet 3B', papel: 'aluno');

  setUp(() async {
    app = await AppSobTeste.preparar();
    app.servidor
      ..responder('POST /auth/login', loginJson)
      ..responder('GET /me', meJson)
      ..responder('GET /avisos', avisosVazioJson)
      ..responder('GET /solicitacoes/minhas', paginaJson([]))
      ..responder('GET /turmas/minhas', paginaJson([si3a, si3b]))
      ..responder(
        'GET /turmas/turma-SI-3A/horarios',
        paginaJson([aulaMapa('a1', turmaId: 'turma-SI-3A')]),
      )
      ..responder(
        'GET /turmas/turma-SI-3B/horarios',
        paginaJson([
          aulaMapa('b1', turmaId: 'turma-SI-3B', diaSemana: 2, disciplina: 'Algoritmos'),
        ]),
      );
  });

  tearDown(() => app.encerrar());

  testWidgets('aluno com duas turmas troca a turma e vê a grade dela', (tester) async {
    await app.abrir(tester);
    await app.entrar(tester);
    await app.abrirAba(tester, 'Horários');
    await esperar(tester, find.text('Banco de Dados II'));

    await tester.tap(find.byKey(const Key('trocar-turma')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('SI-3B — Sistemas para Internet 3B'));
    await esperar(tester, find.text('Algoritmos'));

    expect(find.text('TER'), findsOneWidget);
    expect(find.text('Turma SI-3B'), findsOneWidget);
  });

  testWidgets('vínculo removido na API: mensagem e volta à turma que restou', (tester) async {
    await app.abrir(tester);
    await app.entrar(tester);
    // Depois do login, a SI-3A perde o vínculo: a grade responde 403 e a lista já não a traz.
    app.servidor
      ..responder(
        'GET /turmas/turma-SI-3A/horarios',
        '{"detail": "x", "code": "SEM_PERMISSAO"}',
        status: 403,
      )
      ..responderCom(
        'GET /turmas/minhas',
        (_) => (
          200,
          paginaJson(
            app.servidor.pedidos.any((p) => p.rota == 'GET /turmas/turma-SI-3A/horarios')
                ? [si3b]
                : [si3a, si3b],
          ),
        ),
      );
    await app.abrirAba(tester, 'Horários');

    await esperar(tester, find.text('Você não está mais nesta turma.'));
    await esperar(tester, find.text('Algoritmos'));
  });

  testWidgets('docente vê as próprias aulas de todas as turmas (emenda E3.1)', (tester) async {
    Map<String, dynamic> comoDocente(String json) {
      final mapa = jsonDecode(json) as Map<String, dynamic>;
      final usuario = (mapa['usuario'] as Map<String, dynamic>?) ?? mapa;
      usuario['perfil'] = 'docente';
      return mapa;
    }

    app.servidor
      ..responder('POST /auth/login', jsonEncode(comoDocente(loginJson)))
      ..responder('GET /me', jsonEncode(comoDocente(meJson)))
      ..responder(
        'GET /horarios/minhas',
        paginaJson([
          {
            ...aulaMapa('m1', turmaId: 'turma-SI-3A'),
            'turma': {'id': 'turma-SI-3A', 'codigo': 'SI-3A', 'nome': 'Sistemas para Internet 3A'},
          },
          {
            ...aulaMapa('m2', turmaId: 'turma-SI-3B', diaSemana: 2, disciplina: 'Algoritmos'),
            'turma': {'id': 'turma-SI-3B', 'codigo': 'SI-3B', 'nome': 'Sistemas para Internet 3B'},
          },
        ]),
      );
    await app.abrir(tester);
    await app.entrar(tester);
    await app.abrirAba(tester, 'Horários');

    await esperar(tester, find.text('Algoritmos'));
    expect(find.text('Suas aulas em todas as turmas'), findsOneWidget);
    expect(find.text('SI-3A · Sistemas para Internet 3A'), findsOneWidget);
    expect(find.text('SI-3B · Sistemas para Internet 3B'), findsOneWidget);
    expect(find.byKey(const Key('trocar-turma')), findsNothing);
    expect(app.servidor.pedidos.where((p) => p.rota.endsWith('/horarios')), isEmpty);
  });
}
