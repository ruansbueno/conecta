import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import '../test/fixtures/fabrica.dart';
import '../test/fixtures/fixtures.dart';
import 'apoio_integracao.dart';

/// T062 e T085 (SC-005): com o cache preenchido e sem rede, as abas abrem com conteúdo e a faixa
/// com a data dos dados — Avisos, Turmas e Perfil (F1); Agenda (Próximos, mês corrente e detalhe)
/// e Horários (F2).
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  late AppSobTeste app;

  setUp(() async {
    app = await AppSobTeste.preparar();
    app.servidor
      ..responder('POST /auth/login', loginJson)
      ..responder('GET /me', meJson)
      ..responderCom(
        'GET /avisos',
        (q) => (200, paginaAvisosJson(total: 3, situacao: q['situacao']!)),
      )
      ..responder(
        'GET /turmas/minhas',
        paginaJson([turmaMapa('TADS-3A-2026-2', nome: 'TADS 3º Sem A', papel: 'aluno')]),
      )
      ..responder('GET /solicitacoes/minhas', paginaJson([]));
  });

  tearDown(() => app.encerrar());

  testWidgets('sem rede, as três abas abrem com o conteúdo guardado e a data', (tester) async {
    // Com rede: entra e visita as abas, que guardam a primeira página de cada uma.
    await app.abrir(tester);
    await app.entrar(tester);
    await esperar(tester, find.text('Aviso número 1'));
    await app.abrirAba(tester, 'Turmas');
    await esperar(tester, find.text('TADS 3º Sem A'));
    await app.abrirAba(tester, 'Perfil');
    await esperar(tester, find.text('Aluno de Teste'));

    // Modo avião: o app é reaberto sem servidor.
    await app.servidor.derrubar();
    await tester.pumpWidget(const SizedBox());
    await app.abrir(tester);

    await esperar(tester, find.text('Aviso número 1'));
    expect(find.textContaining('Mostrando dados de'), findsOneWidget);

    await app.abrirAba(tester, 'Turmas');
    await esperar(tester, find.text('TADS 3º Sem A'));
    expect(find.textContaining('Mostrando dados de'), findsOneWidget);

    await app.abrirAba(tester, 'Perfil');
    await esperar(tester, find.text('Aluno de Teste'));
    expect(find.textContaining('Mostrando dados de'), findsOneWidget);
  });

  testWidgets('sem rede, a agenda, o mês corrente, o detalhe e a grade abrem do que foi guardado', (
    tester,
  ) async {
    final hoje = DateTime.now();
    final evento = eventoMapa(
      'e1',
      titulo: 'Semana acadêmica',
      inicio: DateTime(hoje.year, hoje.month, hoje.day, 23, 50),
      fim: DateTime(hoje.year, hoje.month, hoje.day + 2, 18),
    );
    app.servidor
      ..responder('GET /eventos', paginaJson([evento]))
      ..responder('GET /eventos/e1', jsonEncode(evento))
      ..responder(
        'GET /turmas/turma-TADS-3A-2026-2/horarios',
        paginaJson([aulaMapa('a1', turmaId: 'turma-TADS-3A-2026-2')]),
      );

    // Com rede: Próximos, o mês corrente e a grade ficam guardados.
    await app.abrir(tester);
    await app.entrar(tester);
    await app.abrirAba(tester, 'Agenda');
    await esperar(tester, find.text('Semana acadêmica'));
    await tester.tap(find.text('Mês'));
    await esperar(tester, find.text('Semana acadêmica'));
    await tester.tap(find.text('Próximos'));
    await tester.pumpAndSettle();
    await app.abrirAba(tester, 'Horários');
    await esperar(tester, find.text('Banco de Dados II'));

    await app.servidor.derrubar();
    await tester.pumpWidget(const SizedBox());
    await app.abrir(tester);

    await app.abrirAba(tester, 'Agenda');
    await esperar(tester, find.text('Semana acadêmica'));
    expect(find.textContaining('Mostrando dados de'), findsOneWidget);

    await tester.tap(find.text('Semana acadêmica'));
    await esperar(tester, find.textContaining('Sem conexão'));
    expect(find.text('Para quem é'), findsOneWidget);
    await tester.tap(find.byType(BackButton));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Mês'));
    await esperar(tester, find.textContaining('Mostrando dados de'));
    expect(find.text('Semana acadêmica'), findsOneWidget);

    await app.abrirAba(tester, 'Horários');
    await esperar(tester, find.text('Banco de Dados II'));
    expect(find.textContaining('Mostrando dados de'), findsOneWidget);
  });
}
