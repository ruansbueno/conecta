import 'dart:convert';

import 'package:conecta/ui/comum/faixa_cache.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../fixtures/fabrica.dart';
import '../fixtures/fixtures.dart';
import 'app_falso.dart';

// Emenda E3.1 da API (RF-54): o docente vê as próprias aulas, em todas as turmas, e não a grade
// de cada turma como o aluno.
String _meDocente() =>
    jsonEncode((jsonDecode(meJson) as Map<String, dynamic>)..['perfil'] = 'docente');

Map<String, dynamic> _aula(
  String id, {
  required String turma,
  required String nome,
  int diaSemana = 1,
  String inicio = '19:10',
  String fim = '20:50',
  String disciplina = 'Banco de Dados II',
  String? local = 'Lab 4',
}) => {
  ...aulaMapa(
    id,
    turmaId: 'turma-$turma',
    diaSemana: diaSemana,
    inicio: inicio,
    fim: fim,
    disciplina: disciplina,
    local: local,
    docente: const {'id': '7b1c0e3a-6f64-4f43-8a58-2f3d5f0c1a11', 'nome': 'Docente de Teste'},
  ),
  'turma': {'id': 'turma-$turma', 'codigo': turma, 'nome': nome},
};

final minhas = [
  _aula('a1', turma: 'TADS-3A-2026-2', nome: 'TADS 3º Sem A'),
  _aula(
    'a2',
    turma: 'TADS-3B-2026-2',
    nome: 'TADS 3º Sem B',
    inicio: '21:00',
    fim: '22:40',
    local: 'Lab 5',
  ),
  _aula(
    'a3',
    turma: 'TADS-5A-2026-2',
    nome: 'TADS 5º Sem A',
    diaSemana: 4,
    disciplina: 'Projeto Integrador',
    local: null,
  ),
];

void main() {
  late AppFalso app;

  setUp(() async {
    app = AppFalso();
    await app.preparar(me: _meDocente());
    app.api
      ..responder('GET /avisos', avisosVazioJson)
      ..responder('GET /solicitacoes/minhas', paginaJson([]))
      ..responder('GET /turmas/minhas', paginaJson([]));
  });

  Future<void> abrirHorarios(WidgetTester tester) async {
    await app.abrir(tester);
    await tester.tap(
      find.descendant(of: find.byKey(const Key('barra-abas')), matching: find.text('Horários')),
    );
    await tester.pumpAndSettle();
  }

  int pedidos(String caminho) => app.api.pedidos.where((r) => r.url.path == caminho).length;

  testWidgets('docente: as próprias aulas por dia, com a turma de cada uma, sem trocar turma', (
    tester,
  ) async {
    app.api.responder('GET /horarios/minhas', paginaJson(minhas));

    await abrirHorarios(tester);

    expect(find.text('Suas aulas em todas as turmas'), findsOneWidget);
    expect(find.byKey(const Key('trocar-turma')), findsNothing);
    expect(find.text('SEG'), findsOneWidget);
    expect(find.text('QUI'), findsOneWidget);
    expect(find.text('Banco de Dados II'), findsNWidgets(2));
    expect(find.text('19:10–20:50 · Lab 4'), findsOneWidget);
    expect(find.text('21:00–22:40 · Lab 5'), findsOneWidget);
    expect(find.text('TADS-3A-2026-2 · TADS 3º Sem A'), findsOneWidget);
    expect(find.text('TADS-3B-2026-2 · TADS 3º Sem B'), findsOneWidget);
    expect(find.text('TADS-5A-2026-2 · TADS 5º Sem A'), findsOneWidget);
    // O nome do próprio docente não se repete em cada aula.
    expect(find.text('Docente de Teste'), findsNothing);
    expect(pedidos('/horarios/minhas'), 1);
    expect(app.api.pedidos.last.url.queryParameters['limit'], '100');
    expect(app.api.pedidos.where((r) => r.url.path.endsWith('/horarios')), isEmpty);
  });

  testWidgets('docente sem aulas: estado vazio próprio', (tester) async {
    app.api.responder('GET /horarios/minhas', paginaJson([]));

    await abrirHorarios(tester);

    expect(find.text('Nenhuma aula atribuída'), findsOneWidget);
    expect(
      find.text(
        'Suas aulas aparecem aqui quando a coordenação incluir você como docente na grade de '
        'uma turma.',
      ),
      findsOneWidget,
    );
  });

  testWidgets('puxar para atualizar busca as aulas de novo', (tester) async {
    app.api.responder('GET /horarios/minhas', paginaJson(minhas.take(1).toList()));
    await abrirHorarios(tester);
    app.api.responder('GET /horarios/minhas', paginaJson(minhas));

    await tester.fling(find.text('Banco de Dados II'), const Offset(0, 400), 1200);
    await tester.pumpAndSettle();

    expect(pedidos('/horarios/minhas'), 2);
    expect(find.text('Projeto Integrador'), findsOneWidget);
  });

  testWidgets('sem rede: as aulas guardadas, com a faixa; Tentar de novo busca de novo', (
    tester,
  ) async {
    app.api.responder('GET /horarios/minhas', paginaJson(minhas));
    await abrirHorarios(tester);
    app.api
      ..falharRede('GET /horarios/minhas')
      ..falharRede('GET /me');
    await tester.pumpWidget(const SizedBox());

    await abrirHorarios(tester);

    expect(find.text('Projeto Integrador'), findsOneWidget);
    expect(find.byType(FaixaCache), findsOneWidget);
    app.api.responder('GET /horarios/minhas', paginaJson(minhas));
    await tester.tap(
      find.descendant(of: find.byType(FaixaCache), matching: find.text('Tentar de novo')),
    );
    await tester.pumpAndSettle();
    expect(find.byType(FaixaCache), findsNothing);
  });

  testWidgets('sem rede e sem nada guardado: erro com tentar de novo', (tester) async {
    app.api.falharRede('GET /horarios/minhas');

    await abrirHorarios(tester);

    expect(find.text('Tentar de novo'), findsOneWidget);
    app.api.responder('GET /horarios/minhas', paginaJson(minhas));
    await tester.tap(find.text('Tentar de novo'));
    await tester.pumpAndSettle();
    expect(find.text('Projeto Integrador'), findsOneWidget);
  });

  testWidgets('403 (deixou de ser docente): relê o perfil e a aba vira a grade das turmas', (
    tester,
  ) async {
    app.api.responder('GET /horarios/minhas', paginaJson(minhas));
    await abrirHorarios(tester);
    // A gestão mudou o perfil para aluno com o app aberto.
    app.api
      ..responder('GET /horarios/minhas', '{"detail": "x", "code": "SEM_PERMISSAO"}', 403)
      ..responder('GET /me', meJson)
      ..responder(
        'GET /turmas/minhas',
        paginaJson([turmaMapa('SI-3A', nome: 'Sistemas para Internet 3A', papel: 'aluno')]),
      )
      ..responder('GET /turmas/turma-SI-3A/horarios', paginaJson([aulaMapa('h1')]));

    await tester.fling(find.text('Projeto Integrador'), const Offset(0, 400), 1200);
    await tester.pumpAndSettle();

    expect(find.text('Turma SI-3A'), findsOneWidget);
    expect(find.text('Suas aulas em todas as turmas'), findsNothing);
  });
}
