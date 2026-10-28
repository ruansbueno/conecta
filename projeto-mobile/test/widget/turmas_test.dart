import 'dart:convert';

import 'package:conecta/ui/comum/faixa_cache.dart';
import 'package:conecta/ui/turmas/turma_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../fixtures/fabrica.dart';
import '../fixtures/fixtures.dart';
import 'app_falso.dart';

const _semPermissaoJson = '{"detail": "Sem permissão", "code": "SEM_PERMISSAO"}';

void main() {
  late AppFalso app;

  Future<void> preparar({String perfil = 'aluno'}) async {
    app = AppFalso();
    final me = (jsonDecode(meJson) as Map<String, dynamic>)..['perfil'] = perfil;
    await app.preparar(me: jsonEncode(me));
    app.api.responder('GET /avisos', avisosVazioJson);
  }

  Future<void> abrirTurmas(WidgetTester tester) async {
    await app.abrir(tester);
    await tester.tap(find.text('Turmas').last);
    await tester.pumpAndSettle();
  }

  group('Minhas turmas (T06)', () {
    testWidgets('aluno com vínculos: cartões, total, atalho e solicitações recentes', (
      tester,
    ) async {
      await preparar();
      app.api.responder(
        'GET /turmas/minhas',
        paginaJson([
          turmaMapa('TADS-3A-2026-2', nome: 'TADS 3º Sem A', papel: 'aluno'),
          turmaMapa(
            'OPT-1',
            nome: 'Tópicos em Computação em Nuvem',
            papel: 'aluno',
            semestre: null,
          ),
        ]),
      );
      app.api.responder(
        'GET /solicitacoes/minhas',
        paginaJson([
          solicitacaoMapa(
            's1',
            nome: 'Introdução a Ciência de Dados',
            solicitadaEm: '2026-10-10T13:00:00Z',
          ),
          solicitacaoMapa(
            's2',
            nome: 'Desenvolvimento de Jogos',
            status: 'recusada',
            decididaEm: '2026-08-30T15:00:00Z',
          ),
        ], limit: 3),
      );

      await abrirTurmas(tester);

      expect(find.widgetWithText(AppBar, 'Minhas turmas'), findsOneWidget);
      expect(find.text('Você participa de 2 turmas em 2026/2'), findsOneWidget);
      expect(find.byType(TurmaCard), findsNWidgets(2));
      expect(find.text('TADS\n3A'), findsOneWidget);
      expect(find.text('3º semestre · 2026/2'), findsOneWidget);
      expect(find.text('OPT\n1'), findsOneWidget);
      expect(find.text('2026/2'), findsOneWidget); // optativa: só o período
      expect(find.text('Aluno'), findsNWidgets(2));
      expect(find.text('Entrar em outra turma'), findsOneWidget);

      await tester.scrollUntilVisible(find.text('Desenvolvimento de Jogos'), 200);
      expect(find.text('Minhas solicitações'), findsOneWidget);
      expect(find.text('Introdução a Ciência de Dados'), findsOneWidget);
      expect(find.text('Enviada em 10 out'), findsOneWidget);
      expect(find.text('Pendente'), findsOneWidget);
      expect(find.text('Recusada em 30 ago'), findsOneWidget);
      expect(find.text('Recusada'), findsOneWidget);
    });

    testWidgets('docente: papel no cartão, sem atalho e sem pedir solicitações', (tester) async {
      await preparar(perfil: 'docente');
      app.api.responder(
        'GET /turmas/minhas',
        paginaJson([
          turmaMapa('TADS-5A-2026-2', nome: 'TADS 5º Sem A', papel: 'docente', semestre: 5),
        ]),
      );

      await abrirTurmas(tester);

      expect(find.text('Docente'), findsOneWidget);
      expect(find.text('Você participa de 1 turma em 2026/2'), findsOneWidget);
      expect(find.text('Entrar em outra turma'), findsNothing);
      expect(find.text('Minhas solicitações'), findsNothing);
      expect(app.api.pedidos.where((p) => p.url.path == '/solicitacoes/minhas'), isEmpty);
    });

    testWidgets('coordenação sem vínculo: estado vazio próprio, sem atalho de inscrição', (
      tester,
    ) async {
      await preparar(perfil: 'coordenacao');
      app.api.responder('GET /turmas/minhas', paginaJson([]));

      await abrirTurmas(tester);

      expect(find.text('Nenhuma turma vinculada'), findsOneWidget);
      expect(find.textContaining('plataforma web'), findsOneWidget);
      expect(find.text('Entrar em outra turma'), findsNothing);
      expect(find.text('Ver turmas disponíveis'), findsNothing);
    });

    testWidgets('aluno sem turmas: estado vazio com o caminho para pedir inscrição', (
      tester,
    ) async {
      await preparar();
      app.api.responder('GET /turmas/minhas', paginaJson([]));
      app.api.responder('GET /solicitacoes/minhas', paginaJson([]));

      await abrirTurmas(tester);

      expect(find.text('Você ainda não participa de nenhuma turma'), findsOneWidget);
      expect(find.text('Entrar em outra turma'), findsOneWidget);
      expect(find.text('Minhas solicitações'), findsNothing); // nenhuma solicitação: seção some
    });

    testWidgets('sem rede: turmas guardadas com a faixa de data', (tester) async {
      await preparar(perfil: 'docente');
      app.api.responder(
        'GET /turmas/minhas',
        paginaJson([turmaMapa('TADS-5A-2026-2', papel: 'docente')]),
      );
      await abrirTurmas(tester);
      await tester.pumpWidget(const SizedBox());
      app.api.falharRede('GET /turmas/minhas');

      await abrirTurmas(tester);

      expect(find.byType(FaixaCache), findsOneWidget);
      expect(find.byType(TurmaCard), findsOneWidget);
    });

    testWidgets('erro sem cache: mensagem e tentar de novo', (tester) async {
      await preparar(perfil: 'docente');
      app.api.falharRede('GET /turmas/minhas');

      await abrirTurmas(tester);

      expect(find.text('Sem conexão. Verifique a rede e tente de novo.'), findsOneWidget);
      app.api.responder(
        'GET /turmas/minhas',
        paginaJson([turmaMapa('TADS-5A-2026-2', papel: 'docente')]),
      );
      await tester.tap(find.text('Tentar de novo'));
      await tester.pumpAndSettle();
      expect(find.byType(TurmaCard), findsOneWidget);
    });
  });

  group('Turmas disponíveis (T07)', () {
    Future<void> abrirDisponiveis(WidgetTester tester) async {
      app.api.responder(
        'GET /turmas/minhas',
        paginaJson([turmaMapa('TADS-3A-2026-2', papel: 'aluno')]),
      );
      app.api.responder('GET /solicitacoes/minhas', paginaJson([]));
      await abrirTurmas(tester);
      await tester.tap(find.text('Ver turmas'));
      await tester.pumpAndSettle();
    }

    testWidgets('lista as abertas com código, semestre e o botão Solicitar', (tester) async {
      await preparar();
      app.api.responder(
        'GET /turmas/disponiveis',
        paginaJson([
          turmaMapa('TADS-5A-2026-2', nome: 'TADS 5º Sem A', semestre: 5),
          turmaMapa('OPT-3', nome: 'Desenvolvimento de Jogos', semestre: null),
        ]),
      );

      await abrirDisponiveis(tester);

      expect(find.widgetWithText(AppBar, 'Turmas disponíveis'), findsOneWidget);
      expect(find.text('Turmas ativas com inscrições abertas'), findsOneWidget);
      expect(find.text('TADS-5A-2026-2 · 5º semestre'), findsOneWidget);
      expect(find.text('OPT-3 · 2026/2'), findsOneWidget);
      expect(find.widgetWithText(FilledButton, 'Solicitar'), findsNWidgets(2));
      expect(find.textContaining('já pediu inscrição não aparecem'), findsOneWidget);
    });

    testWidgets('Solicitar ainda não envia: avisa que chega na próxima versão', (tester) async {
      await preparar();
      app.api.responder('GET /turmas/disponiveis', paginaJson([turmaMapa('TADS-5A-2026-2')]));
      await abrirDisponiveis(tester);

      await tester.tap(find.widgetWithText(FilledButton, 'Solicitar'));
      await tester.pump();

      expect(find.textContaining('próxima versão'), findsOneWidget);
      expect(app.api.pedidos.where((p) => p.method == 'POST'), isEmpty);
    });

    testWidgets('nenhuma turma aberta: estado vazio', (tester) async {
      await preparar();
      app.api.responder('GET /turmas/disponiveis', paginaJson([]));

      await abrirDisponiveis(tester);

      expect(find.text('Nenhuma turma aberta agora'), findsOneWidget);
    });

    testWidgets('403 SEM_PERMISSAO: explica o perfil e volta a Minhas turmas', (tester) async {
      await preparar();
      app.api.responder('GET /turmas/disponiveis', _semPermissaoJson, 403);

      await abrirDisponiveis(tester);

      expect(find.text('Esta ação não está disponível para o seu perfil.'), findsOneWidget);
      expect(find.widgetWithText(AppBar, 'Minhas turmas'), findsOneWidget);
      expect(find.widgetWithText(AppBar, 'Turmas disponíveis'), findsNothing);
    });

    testWidgets('o atalho do estado vazio de avisos abre as turmas disponíveis', (tester) async {
      await preparar();
      app.api.responder('GET /turmas/minhas', paginaJson([]));
      app.api.responder('GET /solicitacoes/minhas', paginaJson([]));
      app.api.responder('GET /turmas/disponiveis', paginaJson([turmaMapa('TADS-5A-2026-2')]));
      await app.abrir(tester);

      await tester.tap(find.text('Ver turmas disponíveis'));
      await tester.pumpAndSettle();

      expect(find.widgetWithText(AppBar, 'Turmas disponíveis'), findsOneWidget);
      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      expect(find.widgetWithText(AppBar, 'Minhas turmas'), findsOneWidget);
    });
  });
}
