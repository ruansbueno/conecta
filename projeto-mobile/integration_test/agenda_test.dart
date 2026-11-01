import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import '../test/fixtures/fabrica.dart';
import '../test/fixtures/fixtures.dart';
import 'apoio_integracao.dart';

/// `GET /eventos` como a E3 responde (contracts E3 §1; plan-f2 D-AF2-12): sem janela, os não
/// encerrados; com `de`/`ate`, os que tocam a janela; `tipo` filtra.
(int, String) responderEventos(List<Map<String, dynamic>> eventos, Map<String, String> q) {
  final agora = DateTime.now().toUtc();
  DateTime inicio(Map<String, dynamic> e) => DateTime.parse(e['inicio'] as String);
  DateTime termino(Map<String, dynamic> e) => DateTime.parse((e['fim'] ?? e['inicio']) as String);
  final de = q['de'] == null ? null : DateTime.parse(q['de']!);
  final ate = q['ate'] == null ? null : DateTime.parse(q['ate']!);
  final itens =
      eventos
          .where((e) => q['tipo'] == null || e['tipo'] == q['tipo'])
          .where(
            (e) =>
                de == null ||
                (inicio(e).isBefore(ate!) &&
                    (e['fim'] == null ? !inicio(e).isBefore(de) : termino(e).isAfter(de))),
          )
          .where((e) => de != null || !termino(e).isBefore(agora))
          .toList()
        ..sort((a, b) => inicio(a).compareTo(inicio(b)));
  return (200, paginaJson(itens));
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  late AppSobTeste app;
  final agora = DateTime.now();
  final seguinte = DateTime(agora.year, agora.month + 1);
  DateTime noSeguinte(int dia, [int h = 0]) => DateTime(seguinte.year, seguinte.month, dia, h);

  final eventos = [
    eventoMapa(
      'p',
      titulo: 'Prova de Banco de Dados II',
      tipo: 'prova',
      inicio: noSeguinte(10, 19),
      fim: noSeguinte(10, 21),
      local: 'Lab 4',
    ),
    eventoMapa('s', titulo: 'Semana acadêmica', inicio: noSeguinte(14, 8), fim: noSeguinte(16, 18)),
    eventoMapa(
      'v',
      titulo: 'Reunião que já passou',
      tipo: 'reuniao',
      inicio: agora.subtract(const Duration(days: 3)),
    ),
  ];

  setUp(() async {
    app = await AppSobTeste.preparar();
    app.servidor
      ..responder('POST /auth/login', loginJson)
      ..responder('GET /me', meJson)
      ..responder('GET /avisos', avisosVazioJson)
      ..responderCom('GET /eventos', (q) => responderEventos(eventos, q));
    for (final e in eventos) {
      app.servidor.responder('GET /eventos/${e['id']}', jsonEncode(e));
    }
  });

  tearDown(() => app.encerrar());

  testWidgets('Próximos, Provas e o detalhe', (tester) async {
    await app.abrir(tester);
    await app.entrar(tester);
    await app.abrirAba(tester, 'Agenda');
    await esperar(tester, find.text('Semana acadêmica'));
    expect(find.text('Reunião que já passou'), findsNothing);

    await tester.tap(find.text('Provas'));
    await esperar(tester, find.text('Prova de Banco de Dados II'));
    expect(find.text('Semana acadêmica'), findsNothing);

    await tester.tap(find.text('Prova de Banco de Dados II'));
    await esperar(tester, find.text('Para quem é'));
    expect(find.text('Lab 4'), findsOneWidget);
  });

  testWidgets('mês: o evento de vários dias aparece em cada dia', (tester) async {
    await app.abrir(tester);
    await app.entrar(tester);
    await app.abrirAba(tester, 'Agenda');
    await tester.tap(find.text('Mês'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Próximo mês'));
    await esperar(tester, find.text('Nenhuma atividade neste dia'));

    for (final dia in [14, 15, 16]) {
      await tester.tap(find.bySemanticsLabel(RegExp('^$dia, .* de ')).first);
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('Semana acadêmica'),
        200,
        scrollable: find.byType(Scrollable).last,
      );
      expect(find.text('Semana acadêmica'), findsOneWidget, reason: 'dia $dia');
      await tester.scrollUntilVisible(
        find.byTooltip('Próximo mês'),
        -200,
        scrollable: find.byType(Scrollable).last,
      );
    }
  });

  testWidgets('evento excluído na API: 404 volta à agenda com a mensagem', (tester) async {
    app.servidor.responder(
      'GET /eventos/s',
      '{"detail": "x", "code": "EVENTO_NAO_ENCONTRADO"}',
      status: 404,
    );
    await app.abrir(tester);
    await app.entrar(tester);
    await app.abrirAba(tester, 'Agenda');
    await esperar(tester, find.text('Semana acadêmica'));

    await tester.tap(find.text('Semana acadêmica'));
    await esperar(tester, find.text('Este evento não está mais disponível.'));
    expect(find.text('Para quem é'), findsNothing);
  });
}
