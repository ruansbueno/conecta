import 'dart:async';
import 'dart:convert';

import 'package:conecta/services/cache_local.dart';
import 'package:conecta/ui/comum/faixa_cache.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import '../apoio.dart';
import '../fixtures/fabrica.dart';
import '../fixtures/fixtures.dart';
import 'app_falso.dart';

String _me({String perfil = 'aluno', List<Map<String, dynamic>>? turmas}) {
  final me = (jsonDecode(meJson) as Map<String, dynamic>)..['perfil'] = perfil;
  if (turmas != null) me['turmas'] = turmas;
  return jsonEncode(me);
}

void main() {
  late AppFalso app;

  Future<void> preparar(String me) async {
    app = AppFalso();
    await app.preparar(me: me);
    app.api
      ..responder('GET /avisos', avisosVazioJson)
      ..responder('GET /solicitacoes/minhas', paginaJson([]));
  }

  Future<void> abrirAba(WidgetTester tester, String aba) async {
    await tester.tap(
      find.descendant(of: find.byKey(const Key('barra-abas')), matching: find.text(aba)),
    );
    await tester.pumpAndSettle();
  }

  int pedidosDeMe() => app.api.pedidos.where((p) => p.url.path == '/me').length;

  testWidgets('aluno com vínculos: identificação, curso, período, turmas e a nota', (tester) async {
    await preparar(
      _me(
        turmas: [
          {'id': 't1', 'codigo': 'TADS-3A-2026-2', 'nome': 'TADS 3º Sem A', 'papel': 'aluno'},
          {'id': 't2', 'codigo': 'OPT-1', 'nome': 'Tópicos', 'papel': 'aluno'},
        ],
      ),
    );
    app.api.responder(
      'GET /turmas/minhas',
      paginaJson([
        turmaMapa('TADS-3A-2026-2', papel: 'aluno'),
        turmaMapa('OPT-1', papel: 'aluno', semestre: null),
      ]),
    );
    await app.abrir(tester);

    await abrirAba(tester, 'Perfil');

    expect(find.text('Aluno de Teste'), findsOneWidget);
    expect(find.text('aluno.teste'), findsOneWidget);
    expect(find.text('Aluno'), findsOneWidget);
    expect(find.text('Sistemas para Internet'), findsOneWidget);
    expect(find.text('2026/2'), findsOneWidget);
    expect(find.text('2 vínculos'), findsOneWidget);
    expect(find.text('Minhas turmas'), findsOneWidget);
    expect(find.text('TADS-3A'), findsOneWidget);
    expect(find.text('OPT-1'), findsOneWidget);
    expect(
      find.text('Seu perfil de acesso é definido pela administração do CONECTA.'),
      findsOneWidget,
    );
  });

  testWidgets('valores alinhados à direita do cartão, sem quebra desnecessária', (tester) async {
    await preparar(_me());
    app.api.responder(
      'GET /turmas/minhas',
      paginaJson([turmaMapa('TADS-3A-2026-2', papel: 'aluno')]),
    );
    await app.abrir(tester);
    await abrirAba(tester, 'Perfil');

    final curso = tester.getRect(find.text('Sistemas para Internet'));
    final periodo = tester.getRect(find.text('2026/2'));
    final vinculos = tester.getRect(find.text('1 vínculo'));
    expect(periodo.right, moreOrLessEquals(curso.right, epsilon: 1));
    expect(vinculos.right, moreOrLessEquals(curso.right, epsilon: 1));
    expect(curso.right, greaterThan(tester.getSize(find.byType(MaterialApp)).width - 60));
    expect(curso.height, lessThan(30), reason: 'o nome do curso cabe numa linha');
  });

  testWidgets('aberto sem rede, com o perfil guardado: faixa de dados desatualizados', (
    tester,
  ) async {
    await preparar(_me());
    app.api
      ..responder('GET /turmas/minhas', paginaJson([]))
      ..falharRede('GET /me');
    await app.cache.gravar(
      '7b1c0e3a-6f64-4f43-8a58-2f3d5f0c1a11',
      RecursoCache.perfil,
      jsonDecode(_me()) as Map<String, dynamic>,
    );
    await app.abrir(tester);

    await abrirAba(tester, 'Perfil');

    expect(find.text('Aluno de Teste'), findsOneWidget);
    expect(find.byType(FaixaCache), findsOneWidget);
    app.api.responder('GET /me', _me());
    await tester.tap(
      find.descendant(of: find.byType(FaixaCache), matching: find.text('Tentar de novo')),
    );
    await tester.pumpAndSettle();
    expect(find.byType(FaixaCache), findsNothing);
  });

  testWidgets('o leitor de tela lê o nome uma vez só', (tester) async {
    final semantica = tester.ensureSemantics();
    await preparar(_me());
    app.api.responder('GET /turmas/minhas', paginaJson([]));
    await app.abrir(tester);
    await abrirAba(tester, 'Perfil');

    final rotulo = tester.getSemantics(find.text('Aluno de Teste')).label;
    expect('Aluno de Teste'.allMatches(rotulo), hasLength(1), reason: rotulo);
    semantica.dispose();
  });

  testWidgets('coordenação sem vínculo: sem período nem lista de turmas', (tester) async {
    await preparar(_me(perfil: 'coordenacao', turmas: []));
    app.api.responder('GET /turmas/minhas', paginaJson([]));
    await app.abrir(tester);

    await abrirAba(tester, 'Perfil');

    expect(find.text('Coordenação'), findsOneWidget);
    expect(find.text('Nenhum vínculo'), findsOneWidget);
    expect(find.text('Período letivo'), findsNothing);
    expect(find.text('Minhas turmas'), findsNothing);
    expect(find.text('Sistemas para Internet'), findsOneWidget);
  });

  testWidgets('mudança de perfil entre duas cargas vale na mesma sessão (RM-09)', (tester) async {
    await preparar(_me());
    app.api.responder(
      'GET /turmas/minhas',
      paginaJson([turmaMapa('TADS-3A-2026-2', papel: 'aluno')]),
    );
    await app.abrir(tester);
    await abrirAba(tester, 'Turmas');
    expect(find.text('Entrar em outra turma'), findsOneWidget);
    await abrirAba(tester, 'Perfil');
    expect(find.text('Aluno'), findsOneWidget);

    // A administração muda o perfil no servidor; o app reavalia ao abrir a aba de novo.
    app.api.responder('GET /me', _me(perfil: 'docente', turmas: []));
    await abrirAba(tester, 'Avisos');
    await abrirAba(tester, 'Perfil');

    expect(find.text('Docente'), findsOneWidget);
    await abrirAba(tester, 'Turmas');
    expect(find.text('Entrar em outra turma'), findsNothing);
  });

  testWidgets('voltar do segundo plano recarrega o perfil (RM-09)', (tester) async {
    await preparar(_me());
    app.api.responder('GET /turmas/minhas', paginaJson([]));
    await app.abrir(tester);
    final antes = pedidosDeMe();

    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pumpAndSettle();

    expect(pedidosDeMe(), antes + 1);
  });

  testWidgets('sair pede confirmação: cancelar fica, confirmar volta ao login (RM-10)', (
    tester,
  ) async {
    await preparar(_me());
    app.api.responder('GET /turmas/minhas', paginaJson([]));
    await app.abrir(tester);
    await abrirAba(tester, 'Perfil');

    await tester.tap(find.text('Sair da conta'));
    await tester.pumpAndSettle();
    expect(find.text('Sair da conta?'), findsOneWidget);
    await tester.tap(find.text('Cancelar'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('barra-abas')), findsOneWidget);

    await tester.tap(find.text('Sair da conta'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(TextButton, 'Sair'));
    await tester.pumpAndSettle();

    expect(find.text('Entrar'), findsOneWidget);
    expect(await app.cofre.ler(), isNull);
  });

  testWidgets('turmas de períodos diferentes: os dois períodos, em ordem', (tester) async {
    await preparar(
      _me(
        turmas: [
          {'id': 't1', 'codigo': 'A-1', 'nome': 'A', 'papel': 'aluno'},
          {'id': 't2', 'codigo': 'B-1', 'nome': 'B', 'papel': 'aluno'},
        ],
      ),
    );
    app.api.responder(
      'GET /turmas/minhas',
      paginaJson([
        turmaMapa('B-1', papel: 'aluno'),
        turmaMapa('A-1', papel: 'aluno', periodo: '2026/1'),
      ]),
    );
    await app.abrir(tester);

    await abrirAba(tester, 'Perfil');

    expect(find.text('2026/1, 2026/2'), findsOneWidget);
  });

  testWidgets('tocar de novo na aba Perfil já aberta não pede o /me outra vez', (tester) async {
    await preparar(_me());
    app.api.responder('GET /turmas/minhas', paginaJson([]));
    await app.abrir(tester);
    await abrirAba(tester, 'Perfil');
    final depoisDeAbrir = pedidosDeMe();

    await abrirAba(tester, 'Perfil');
    await abrirAba(tester, 'Perfil');

    expect(pedidosDeMe(), depoisDeAbrir);
  });

  testWidgets('turmas mudaram com o período ainda carregando: a resposta antiga não volta', (
    tester,
  ) async {
    await preparar(
      _me(
        turmas: [
          {'id': 't1', 'codigo': 'A-1', 'nome': 'A', 'papel': 'aluno'},
        ],
      ),
    );
    final resposta = Completer<http.Response>();
    app.api.rotasAssincronas['GET /turmas/minhas'] = (_) => resposta.future;
    await app.abrir(tester);
    await abrirAba(tester, 'Perfil');

    app.api.responder('GET /me', _me(turmas: []));
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pumpAndSettle();
    expect(find.text('Nenhum vínculo'), findsOneWidget);
    resposta.complete(respostaJson(paginaJson([turmaMapa('A-1', papel: 'aluno')])));
    await tester.pumpAndSettle();

    expect(find.text('Período letivo'), findsNothing);
  });

  testWidgets('sair apaga o perfil guardado neste aparelho (RM-10)', (tester) async {
    await preparar(_me());
    app.api.responder('GET /turmas/minhas', paginaJson([]));
    await app.abrir(tester);
    await abrirAba(tester, 'Perfil');
    expect(app.cache.ler('7b1c0e3a-6f64-4f43-8a58-2f3d5f0c1a11', RecursoCache.perfil), isNotNull);

    await tester.tap(find.text('Sair da conta'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(TextButton, 'Sair'));
    await tester.pumpAndSettle();

    expect(app.cache.ler('7b1c0e3a-6f64-4f43-8a58-2f3d5f0c1a11', RecursoCache.perfil), isNull);
  });
}
