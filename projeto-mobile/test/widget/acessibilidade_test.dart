// T060 (RM-34, RM-35, SC-007): cada tela e diálogo da F1 passa nas regras de acessibilidade do
// Flutter — contraste de texto (AA), alvo de toque de 48 dp e alvos de toque com rótulo. A ordem
// de foco do leitor de tela é conferida à parte, com o TalkBack (evidencias/RELATORIO.md).
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_test/flutter_test.dart';

import '../fixtures/fabrica.dart';
import '../fixtures/fixtures.dart';
import 'app_falso.dart';

/// Rótulos na ordem em que o leitor de tela os percorre.
List<String> ordemDeLeitura(WidgetTester tester) {
  final rotulos = <String>[];
  void visitar(SemanticsNode no) {
    if (no.label.isNotEmpty) rotulos.add(no.label);
    for (final filho in no.debugListChildrenInOrder(DebugSemanticsDumpOrder.traversalOrder)) {
      visitar(filho);
    }
  }

  visitar(tester.getSemantics(find.byType(Scaffold).first));
  return rotulos;
}

/// Os [esperados] aparecem nessa ordem (cada um contido em algum rótulo).
void expectOrdem(List<String> ordem, List<String> esperados) {
  var desde = 0;
  for (final esperado in esperados) {
    final i = ordem.indexWhere((r) => r.contains(esperado), desde);
    expect(i, greaterThanOrEqualTo(0), reason: '"$esperado" fora da ordem em $ordem');
    desde = i + 1;
  }
}

Future<void> auditar(WidgetTester tester) async {
  await expectLater(tester, meetsGuideline(textContrastGuideline));
  await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
  await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
}

void main() {
  late AppFalso app;
  late SemanticsHandle semantica;

  Future<void> preparar({String perfil = 'aluno'}) async {
    app = AppFalso();
    final me = (jsonDecode(meJson) as Map<String, dynamic>)..['perfil'] = perfil;
    if (perfil != 'aluno') me['turmas'] = <Object>[];
    await app.preparar(me: jsonEncode(me));
    app.api
      ..responder('GET /avisos', avisosP1Json)
      ..responder(
        'GET /turmas/minhas',
        paginaJson([
          if (perfil == 'aluno') turmaMapa('TADS-3A-2026-2', nome: 'TADS 3º Sem A', papel: 'aluno'),
        ]),
      )
      ..responder(
        'GET /solicitacoes/minhas',
        paginaJson([
          solicitacaoMapa('s1', nome: 'Introdução a Ciência de Dados'),
          solicitacaoMapa(
            's2',
            nome: 'Desenvolvimento de Jogos',
            status: 'recusada',
            decididaEm: '2026-08-30T12:00:00Z',
            motivoRecusa: 'turma sem vagas.',
          ),
        ]),
      )
      ..responder(
        'GET /turmas/disponiveis',
        paginaJson([turmaMapa('TADS-5A-2026-2', nome: 'TADS 5º Sem A', semestre: 5)]),
      )
      ..responder('POST /turmas/turma-TADS-5A-2026-2/solicitacoes', '{"id": "s9"}', 201);
  }

  Future<void> aba(WidgetTester tester, String nome) async {
    await tester.tap(
      find.descendant(of: find.byKey(const Key('barra-abas')), matching: find.text(nome)),
    );
    await tester.pumpAndSettle();
  }

  setUp(() => semantica = SemanticsBinding.instance.ensureSemantics());
  tearDown(() => semantica.dispose());

  testWidgets('login e erro de credenciais', (tester) async {
    await preparar();
    await app.cofre.apagar();
    await app.abrir(tester);
    await auditar(tester);

    app.api.responder('POST /auth/login', '{"detail": "x", "code": "CREDENCIAIS_INVALIDAS"}', 401);
    await tester.enterText(find.byKey(const Key('campo-usuario')), 'aluno.teste');
    await tester.enterText(find.byKey(const Key('campo-senha')), 'errada');
    await tester.tap(find.text('Entrar'));
    await tester.pumpAndSettle();
    expect(find.text('Usuário ou senha incorretos.'), findsOneWidget);
    await auditar(tester);
  });

  testWidgets('avisos: lista, arquivados, detalhe e vazio', (tester) async {
    await preparar();
    await app.abrir(tester);
    await auditar(tester);

    await tester.tap(find.text('Arquivados'));
    await tester.pumpAndSettle();
    await auditar(tester);
    await tester.tap(find.text('Ativos'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Reunião de pais e alunos'));
    await tester.pumpAndSettle();
    await auditar(tester);
    await tester.tap(find.byType(BackButton));
    await tester.pumpAndSettle();

    app.api.responder('GET /avisos', avisosVazioJson);
    await tester.pumpWidget(const SizedBox());
    await app.abrir(tester);
    expect(find.text('Nenhum aviso por enquanto'), findsOneWidget);
    await auditar(tester);
  });

  testWidgets('turmas: minhas, disponíveis e folha de confirmação', (tester) async {
    await preparar();
    await app.abrir(tester);
    await aba(tester, 'Turmas');
    await auditar(tester);

    await tester.tap(find.text('Ver turmas'));
    await tester.pumpAndSettle();
    await auditar(tester);

    await tester.tap(find.text('Solicitar'));
    await tester.pumpAndSettle();
    expect(find.text('Solicitação enviada'), findsOneWidget);
    await auditar(tester);
  });

  testWidgets('minhas solicitações e o diálogo de cancelar', (tester) async {
    await preparar();
    await app.abrir(tester);
    await aba(tester, 'Turmas');
    await tester.tap(find.text('Ver todas'));
    await tester.pumpAndSettle();
    await auditar(tester);

    await tester.tap(find.text('Cancelar solicitação'));
    await tester.pumpAndSettle();
    await auditar(tester);
  });

  testWidgets('perfil e o diálogo de sair', (tester) async {
    await preparar();
    await app.abrir(tester);
    await aba(tester, 'Perfil');
    await auditar(tester);

    await tester.tap(find.text('Sair da conta'));
    await tester.pumpAndSettle();
    await auditar(tester);
  });

  testWidgets('coordenação sem turmas e estado de erro', (tester) async {
    await preparar(perfil: 'coordenacao');
    await app.abrir(tester);
    await aba(tester, 'Turmas');
    expect(find.text('Nenhuma turma vinculada'), findsOneWidget);
    await auditar(tester);

    app.api.falharRede('GET /avisos');
    await tester.pumpWidget(const SizedBox());
    await app.abrir(tester);
    expect(find.text('Tentar de novo'), findsOneWidget);
    await auditar(tester);
  });

  testWidgets('ordem de leitura segue a ordem visual (login, avisos, turmas, perfil)', (
    tester,
  ) async {
    await preparar();
    await app.cofre.apagar();
    await app.abrir(tester);
    expectOrdem(ordemDeLeitura(tester), ['Usuário', 'Senha', 'Entrar']);

    await tester.pumpWidget(const SizedBox());
    await preparar();
    await app.abrir(tester);
    expectOrdem(ordemDeLeitura(tester), [
      'Ativos',
      'Arquivados',
      'Reunião de pais e alunos',
      'Avisos',
      'Turmas',
      'Perfil',
    ]);

    await aba(tester, 'Turmas');
    expectOrdem(ordemDeLeitura(tester), [
      'Você participa de 1 turma',
      'TADS 3º Sem A',
      'Entrar em outra turma',
      'Minhas solicitações',
      'Introdução a Ciência de Dados',
    ]);

    await aba(tester, 'Perfil');
    expectOrdem(ordemDeLeitura(tester), [
      'Aluno de Teste',
      'Curso',
      'Período letivo',
      'Turmas',
      'Seu perfil de acesso',
      'Sair da conta',
    ]);
  });
}
