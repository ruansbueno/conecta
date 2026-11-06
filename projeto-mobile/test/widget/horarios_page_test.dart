import 'dart:async';

import 'package:conecta/services/cache_local.dart';
import 'package:conecta/ui/comum/faixa_cache.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import '../apoio.dart';
import '../fixtures/fabrica.dart';
import '../fixtures/fixtures.dart';
import 'app_falso.dart';

const usuario = '7b1c0e3a-6f64-4f43-8a58-2f3d5f0c1a11';
final si3a = turmaMapa('SI-3A', nome: 'Sistemas para Internet 3A', papel: 'aluno');
final si3b = turmaMapa('SI-3B', nome: 'Sistemas para Internet 3B', papel: 'aluno');
const erroSemPermissao = '{"detail": "x", "code": "SEM_PERMISSAO"}';
const erroTurma = '{"detail": "x", "code": "TURMA_NAO_ENCONTRADA"}';

final gradeA = [
  aulaMapa('h1', turmaId: 'turma-SI-3A'),
  aulaMapa(
    'h2',
    turmaId: 'turma-SI-3A',
    inicio: '21:00',
    fim: '22:40',
    disciplina: 'Engenharia de Software',
    local: 'Sala 203',
    docente: null,
  ),
  aulaMapa(
    'h3',
    turmaId: 'turma-SI-3A',
    diaSemana: 3,
    disciplina: 'Redes de Computadores',
    local: null,
  ),
];

void main() {
  late AppFalso app;

  setUp(() async {
    app = AppFalso();
    await app.preparar();
    app.api.responder('GET /avisos', avisosVazioJson);
    app.api.responder('GET /solicitacoes/minhas', paginaJson([]));
  });

  Future<void> abrirHorarios(WidgetTester tester) async {
    await app.abrir(tester);
    await tester.tap(
      find.descendant(of: find.byKey(const Key('barra-abas')), matching: find.text('Horários')),
    );
    await tester.pumpAndSettle();
  }

  int pedidosDaGrade(String turma) =>
      app.api.pedidos.where((r) => r.url.path == '/turmas/turma-$turma/horarios').length;

  testWidgets('cinco abas: Horários entra entre Turmas e Perfil (spec §3)', (tester) async {
    app.api.responder('GET /turmas/minhas', paginaJson([]));
    await app.abrir(tester);
    final barra = find.byKey(const Key('barra-abas'));
    final rotulos = [
      for (final t in tester.widgetList<Text>(
        find.descendant(of: barra, matching: find.byType(Text)),
      ))
        t.data,
    ];
    expect(rotulos, ['Avisos', 'Agenda', 'Turmas', 'Horários', 'Perfil']);
  });

  testWidgets('sem vínculo: estado vazio da US6', (tester) async {
    app.api.responder('GET /turmas/minhas', paginaJson([]));
    await abrirHorarios(tester);
    expect(find.text('A grade aparece depois do vínculo com uma turma.'), findsOneWidget);
  });

  testWidgets('um vínculo: a grade por dia, com disciplina, horas, local e docente', (
    tester,
  ) async {
    app.api.responder('GET /turmas/minhas', paginaJson([si3a]));
    app.api.responder('GET /turmas/turma-SI-3A/horarios', paginaJson(gradeA));

    await abrirHorarios(tester);

    expect(find.text('Sistemas para Internet 3A'), findsOneWidget);
    expect(find.text('Turma SI-3A'), findsOneWidget);
    // Com uma turma só, não há o que trocar.
    expect(find.byKey(const Key('trocar-turma')), findsNothing);
    expect(find.text('SEG'), findsOneWidget);
    expect(find.text('QUA'), findsOneWidget);
    expect(find.text('TER'), findsNothing);
    expect(find.text('Banco de Dados II'), findsOneWidget);
    expect(find.text('19:10–20:50 · Lab 4'), findsOneWidget);
    expect(find.text('Helena Prado'), findsNWidgets(2));
    expect(find.text('21:00–22:40 · Sala 203'), findsOneWidget);
    expect(find.text('19:10–20:50'), findsOneWidget);
    expect(find.bySemanticsLabel(RegExp('^Segunda')), findsOneWidget);
  });

  testWidgets('turma sem aulas: estado vazio próprio', (tester) async {
    app.api.responder('GET /turmas/minhas', paginaJson([si3a]));
    app.api.responder('GET /turmas/turma-SI-3A/horarios', paginaJson([]));
    await abrirHorarios(tester);
    expect(find.text('Nenhuma aula nesta grade'), findsOneWidget);
  });

  testWidgets('mais de um vínculo: a folha troca a turma, e a escolha fica lembrada', (
    tester,
  ) async {
    app.api.responder('GET /turmas/minhas', paginaJson([si3a, si3b]));
    app.api.responder('GET /turmas/turma-SI-3A/horarios', paginaJson(gradeA));
    app.api.responder(
      'GET /turmas/turma-SI-3B/horarios',
      paginaJson([aulaMapa('b1', turmaId: 'turma-SI-3B', disciplina: 'Algoritmos')]),
    );

    await abrirHorarios(tester);
    expect(find.text('Banco de Dados II'), findsOneWidget);

    await tester.tap(find.byKey(const Key('trocar-turma')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('SI-3B — Sistemas para Internet 3B'));
    await tester.pumpAndSettle();

    expect(find.text('Algoritmos'), findsOneWidget);
    expect(find.text('Turma SI-3B'), findsOneWidget);

    // Reabrindo o app, abre na turma lembrada.
    await tester.pumpWidget(const SizedBox());
    await abrirHorarios(tester);
    expect(find.text('Algoritmos'), findsOneWidget);
    expect(pedidosDaGrade('SI-3B'), 2);
  });

  testWidgets('turma lembrada que perdeu o vínculo: volta à primeira', (tester) async {
    await app.cache.gravar(usuario, RecursoCache.horariosTurma, {'turma_id': 'turma-OUTRA'});
    app.api.responder('GET /turmas/minhas', paginaJson([si3a]));
    app.api.responder('GET /turmas/turma-SI-3A/horarios', paginaJson(gradeA));

    await abrirHorarios(tester);

    expect(find.text('Banco de Dados II'), findsOneWidget);
  });

  testWidgets('403 (vínculo removido): mensagem própria e as turmas são recarregadas', (
    tester,
  ) async {
    // A primeira lista ainda traz a SI-3A; depois do 403, a API já não a traz.
    var chamadas = 0;
    app.api.rotas['GET /turmas/minhas'] = (_) =>
        respostaJson(paginaJson(chamadas++ == 0 ? [si3a, si3b] : [si3b]));
    app.api.responder('GET /turmas/turma-SI-3A/horarios', erroSemPermissao, 403);
    app.api.responder(
      'GET /turmas/turma-SI-3B/horarios',
      paginaJson([aulaMapa('b1', turmaId: 'turma-SI-3B', disciplina: 'Algoritmos')]),
    );

    await abrirHorarios(tester);

    expect(
      find.descendant(
        of: find.byType(SnackBar),
        matching: find.text('Você não está mais nesta turma.'),
      ),
      findsOneWidget,
    );
    expect(find.text('Algoritmos'), findsOneWidget);
    expect(find.text('Turma SI-3B'), findsOneWidget);
  });

  testWidgets('403 numa turma que a lista ainda traz: não fica em voltas, mostra o erro', (
    tester,
  ) async {
    app.api.responder('GET /turmas/minhas', paginaJson([si3a]));
    app.api.responder('GET /turmas/turma-SI-3A/horarios', erroSemPermissao, 403);

    await abrirHorarios(tester);

    expect(pedidosDaGrade('SI-3A'), 1);
    expect(find.text('Tentar de novo'), findsOneWidget);
    expect(find.text('Você não está mais nesta turma.'), findsWidgets);
  });

  testWidgets('404 (turma inativa): mensagem própria', (tester) async {
    app.api.responder('GET /turmas/minhas', paginaJson([si3a]));
    app.api.responder('GET /turmas/turma-SI-3A/horarios', erroTurma, 404);

    await abrirHorarios(tester);

    // No aviso breve e no erro da grade: a única turma da lista não responde mais.
    expect(
      find.descendant(
        of: find.byType(SnackBar),
        matching: find.text('Esta turma não está mais disponível.'),
      ),
      findsOneWidget,
    );
    expect(find.text('Tentar de novo'), findsOneWidget);
  });

  testWidgets('sem rede: a grade guardada da turma, com a faixa', (tester) async {
    app.api.responder('GET /turmas/minhas', paginaJson([si3a]));
    app.api.responder('GET /turmas/turma-SI-3A/horarios', paginaJson(gradeA));
    await abrirHorarios(tester);

    app.api.falharRede('GET /turmas/minhas');
    app.api.falharRede('GET /turmas/turma-SI-3A/horarios');
    await tester.pumpWidget(const SizedBox());
    await abrirHorarios(tester);

    expect(find.text('Banco de Dados II'), findsOneWidget);
    expect(find.byType(FaixaCache), findsOneWidget);
  });

  testWidgets('sem rede e sem nada guardado: erro com tentar de novo', (tester) async {
    app.api.falharRede('GET /turmas/minhas');
    await abrirHorarios(tester);
    expect(find.text('Tentar de novo'), findsOneWidget);
  });

  testWidgets('403/404 esquecem a turma lembrada (D-AF2-7)', (tester) async {
    await app.cache.gravar(usuario, RecursoCache.horariosTurma, {'turma_id': 'turma-SI-3A'});
    app.api.responder('GET /turmas/minhas', paginaJson([si3a]));
    app.api.responder('GET /turmas/turma-SI-3A/horarios', erroTurma, 404);

    await abrirHorarios(tester);

    expect(app.cache.ler(usuario, RecursoCache.horariosTurma), isNull);
  });

  testWidgets('sem rede: a faixa da grade guardada não fica na turma que não tem cache', (
    tester,
  ) async {
    app.api.responder('GET /turmas/minhas', paginaJson([si3a, si3b]));
    app.api.responder('GET /turmas/turma-SI-3A/horarios', paginaJson(gradeA));
    await abrirHorarios(tester);

    app.api.falharRede('GET /turmas/minhas');
    app.api.falharRede('GET /turmas/turma-SI-3A/horarios');
    app.api.falharRede('GET /turmas/turma-SI-3B/horarios');
    await tester.pumpWidget(const SizedBox());
    await abrirHorarios(tester);
    expect(find.byType(FaixaCache), findsOneWidget);

    await tester.tap(find.byKey(const Key('trocar-turma')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('SI-3B — Sistemas para Internet 3B'));
    await tester.pumpAndSettle();

    expect(find.byType(FaixaCache), findsNothing);
    expect(find.text('Tentar de novo'), findsOneWidget);
  });

  testWidgets('trocar de turma: a grade da turma anterior, que chega depois, é descartada', (
    tester,
  ) async {
    final atrasada = Completer<http.Response>();
    app.api.responder('GET /turmas/minhas', paginaJson([si3a, si3b]));
    app.api.rotasAssincronas['GET /turmas/turma-SI-3A/horarios'] = (_) => atrasada.future;
    app.api.responder(
      'GET /turmas/turma-SI-3B/horarios',
      paginaJson([aulaMapa('b1', turmaId: 'turma-SI-3B', disciplina: 'Algoritmos')]),
    );

    await abrirHorarios(tester);
    await tester.tap(find.byKey(const Key('trocar-turma')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('SI-3B — Sistemas para Internet 3B'));
    await tester.pumpAndSettle();
    atrasada.complete(respostaJson(paginaJson(gradeA)));
    await tester.pumpAndSettle();

    expect(find.text('Turma SI-3B'), findsOneWidget);
    expect(find.text('Algoritmos'), findsOneWidget);
    expect(find.text('Banco de Dados II'), findsNothing);
  });

  testWidgets('o botão da turma diz ao leitor de tela que troca a turma', (tester) async {
    app.api.responder('GET /turmas/minhas', paginaJson([si3a, si3b]));
    app.api.responder('GET /turmas/turma-SI-3A/horarios', paginaJson(gradeA));
    final semantica = tester.ensureSemantics();

    await abrirHorarios(tester);

    expect(tester.getSemantics(find.byKey(const Key('trocar-turma'))).hint, 'Trocar de turma');
    semantica.dispose();
  });
}
