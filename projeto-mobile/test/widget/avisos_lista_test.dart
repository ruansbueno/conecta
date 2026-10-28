import 'dart:async';
import 'dart:convert';

import 'package:conecta/ui/comum/chip_destino.dart';
import 'package:conecta/ui/comum/esqueleto_lista.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import '../apoio.dart';
import '../fixtures/fabrica.dart';
import '../fixtures/fixtures.dart';
import 'app_falso.dart';

void main() {
  late AppFalso app;

  setUp(() async {
    app = AppFalso();
    await app.preparar();
  });

  void paginado(int total) => app.api.rotas['GET /avisos'] = (r) => respostaJson(
    paginaAvisosJson(
      total: total,
      offset: int.parse(r.url.queryParameters['offset']!),
      situacao: r.url.queryParameters['situacao']!,
    ),
  );

  testWidgets('carregando: esqueleto enquanto a primeira página não chega', (tester) async {
    final resposta = Completer<http.Response>();
    app.api.rotasAssincronas['GET /avisos'] = (_) => resposta.future;

    await tester.pumpWidget(const SizedBox());
    await app.abrir(tester);

    expect(find.byType(EsqueletoLista), findsOneWidget);
    resposta.complete(respostaJson(avisosP1Json));
    await tester.pumpAndSettle();
    expect(find.byType(EsqueletoLista), findsNothing);
  });

  testWidgets('conteúdo: autor, data, título, trecho e todos os destinos', (tester) async {
    app.api.responder('GET /avisos', avisosP1Json);

    await app.abrir(tester);

    expect(find.text('Reunião de pais e alunos'), findsOneWidget);
    expect(find.text('Maria Coordenadora'), findsOneWidget);
    expect(find.text('Será realizada na sexta, às 19h, no auditório.'), findsOneWidget);
    expect(find.text('TADS 3º Sem A'), findsOneWidget);
    expect(find.text('TADS 3º Sem B'), findsOneWidget);
  });

  testWidgets('aviso com vários destinos aparece uma vez, com todos os chips', (tester) async {
    app.api.responder('GET /avisos', avisosP1Json);

    await app.abrir(tester);

    expect(find.text('Entrega do trabalho de Redes adiada para 30/10'), findsOneWidget);
    for (final rotulo in ['Todos', '6º semestre', 'Docentes']) {
      expect(find.widgetWithText(ChipDestino, rotulo), findsOneWidget);
    }
  });

  testWidgets('aviso editado leva a marca "editado"', (tester) async {
    app.api.responder('GET /avisos', avisosP1Json);

    await app.abrir(tester);

    expect(find.textContaining('· editado'), findsOneWidget);
  });

  testWidgets('vazio: explicação e atalho para turmas, para aluno', (tester) async {
    app.api.responder('GET /avisos', avisosVazioJson);

    await app.abrir(tester);

    expect(find.text('Nenhum aviso por enquanto'), findsOneWidget);
    await tester.tap(find.text('Ver turmas disponíveis'));
    await tester.pumpAndSettle();
    expect(find.widgetWithText(AppBar, 'Turmas disponíveis'), findsOneWidget);
  });

  testWidgets('vazio para docente: sem o atalho de solicitar turma', (tester) async {
    app = AppFalso();
    final docente = (jsonDecode(meJson) as Map<String, dynamic>)..['perfil'] = 'docente';
    await app.preparar(me: jsonEncode(docente));
    app.api.responder('GET /avisos', avisosVazioJson);

    await app.abrir(tester);

    expect(find.text('Nenhum aviso por enquanto'), findsOneWidget);
    expect(find.text('Ver turmas disponíveis'), findsNothing);
  });

  testWidgets('erro sem cache: mensagem e tentar de novo', (tester) async {
    app.api.falharRede('GET /avisos');

    await app.abrir(tester);
    expect(find.text('Sem conexão. Verifique a rede e tente de novo.'), findsOneWidget);

    app.api.responder('GET /avisos', avisosP1Json);
    await tester.tap(find.text('Tentar de novo'));
    await tester.pumpAndSettle();
    expect(find.text('Reunião de pais e alunos'), findsOneWidget);
  });

  testWidgets('rolagem até o fim carrega a segunda página e mostra o fim da lista', (tester) async {
    paginado(25);

    await app.abrir(tester);
    await tester.dragUntilVisible(
      find.text('Não há mais avisos.'),
      find.descendant(of: find.byKey(const Key('lista-avisos')), matching: find.byType(Scrollable)),
      const Offset(0, -600),
    );
    await tester.pumpAndSettle();

    expect(find.text('Aviso número 25'), findsOneWidget);
    expect(
      app.api.pedidos.map((p) => p.url.queryParameters['offset']).whereType<String>(),
      containsAllInOrder(['0', '20']),
    );
  });

  testWidgets('arquivados: alternância com explicação da lista', (tester) async {
    paginado(2);
    await app.abrir(tester);

    await tester.tap(find.text('Arquivados'));
    await tester.pumpAndSettle();

    expect(
      find.text('Avisos arquivados saem da lista ativa e ficam guardados aqui.'),
      findsOneWidget,
    );
    expect(app.api.pedidos.last.url.queryParameters['situacao'], 'arquivado');
  });

  testWidgets('puxar para baixo recarrega do servidor', (tester) async {
    app.api.responder('GET /avisos', avisosP1Json);
    await app.abrir(tester);
    app.api.responder('GET /avisos', avisosVazioJson);

    await tester.fling(find.text('Reunião de pais e alunos'), const Offset(0, 400), 1200);
    await tester.pumpAndSettle();

    expect(find.text('Nenhum aviso por enquanto'), findsOneWidget);
  });

  testWidgets('sem rede com cache: mostra o guardado e a faixa com a data', (tester) async {
    app.api.responder('GET /avisos', avisosP1Json);
    await app.abrir(tester);
    app.api.falharRede('GET /avisos');
    app.api.falharRede('GET /me');
    await tester.pumpWidget(const SizedBox()); // fecha o app antes de reabrir

    await app.abrir(tester);

    expect(find.text('Reunião de pais e alunos'), findsOneWidget);
    expect(find.textContaining('Mostrando dados de'), findsOneWidget);
  });
}
