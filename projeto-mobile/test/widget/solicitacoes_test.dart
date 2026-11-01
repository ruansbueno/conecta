import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import '../apoio.dart';
import '../fixtures/fabrica.dart';
import '../fixtures/fixtures.dart';
import 'app_falso.dart';

String _erro(String code) => '{"detail": "texto", "code": "$code"}';

void main() {
  late AppFalso app;

  setUp(() async {
    app = AppFalso();
    await app.preparar();
    app.api
      ..responder('GET /avisos', avisosVazioJson)
      ..responder('GET /turmas/minhas', paginaJson([turmaMapa('TADS-3A-2026-2', papel: 'aluno')]))
      ..responder('GET /solicitacoes/minhas', paginaJson([]));
  });

  Future<void> abrirTurmas(WidgetTester tester) async {
    await app.abrir(tester);
    await tester.tap(find.text('Turmas').last);
    await tester.pumpAndSettle();
  }

  int pedidos(String metodo) => app.api.pedidos.where((p) => p.method == metodo).length;

  group('Minhas solicitações (T09)', () {
    Future<void> abrirLista(WidgetTester tester) async {
      await abrirTurmas(tester);
      await tester.tap(find.text('Ver todas'));
      await tester.pumpAndSettle();
    }

    void quatroStatus() => app.api.responder(
      'GET /solicitacoes/minhas',
      paginaJson([
        solicitacaoMapa('s1', nome: 'Introdução a Ciência de Dados'),
        solicitacaoMapa(
          's2',
          nome: 'Sistemas para Internet 3B',
          status: 'aprovada',
          solicitadaEm: '2026-09-02T12:00:00Z',
          decididaEm: '2026-09-03T12:00:00Z',
        ),
        solicitacaoMapa(
          's3',
          nome: 'Desenvolvimento de Jogos',
          status: 'recusada',
          solicitadaEm: '2026-08-28T12:00:00Z',
          decididaEm: '2026-08-30T12:00:00Z',
          motivoRecusa: 'turma sem vagas para alunos de outro semestre.',
        ),
        solicitacaoMapa(
          's4',
          nome: 'Redes II',
          status: 'cancelada',
          solicitadaEm: '2026-08-01T12:00:00Z',
          decididaEm: '2026-08-02T12:00:00Z',
        ),
      ]),
    );

    testWidgets('os quatro status, com datas, motivo e cancelar só na pendente', (tester) async {
      quatroStatus();

      await abrirLista(tester);

      expect(find.widgetWithText(AppBar, 'Minhas solicitações'), findsOneWidget);
      expect(find.text('Enviada em 10 out'), findsOneWidget);
      expect(find.text('Pendente'), findsOneWidget);
      expect(find.text('Aprovada em 3 set · vínculo criado'), findsOneWidget);
      expect(find.text('Motivo: turma sem vagas para alunos de outro semestre.'), findsOneWidget);
      expect(find.text('Recusada em 30 ago'), findsOneWidget);
      expect(find.text('Cancelada em 2 ago'), findsOneWidget);
      expect(find.text('Cancelar solicitação'), findsOneWidget);
    });

    testWidgets('cancelar confirmado: DELETE, mensagem e lista recarregada', (tester) async {
      quatroStatus();
      await abrirLista(tester);
      app.api.rotas['DELETE /solicitacoes/s1'] = (_) => respostaJson('', 204);
      app.api.responder(
        'GET /solicitacoes/minhas',
        paginaJson([
          solicitacaoMapa('s1', status: 'cancelada', decididaEm: '2026-10-28T12:00:00Z'),
        ]),
      );

      await tester.tap(find.text('Cancelar solicitação'));
      await tester.pumpAndSettle();
      expect(find.text('Cancelar a solicitação?'), findsOneWidget);
      await tester.tap(find.widgetWithText(TextButton, 'Cancelar solicitação'));
      await tester.pumpAndSettle();

      expect(pedidos('DELETE'), 1);
      expect(find.text('Solicitação cancelada.'), findsOneWidget);
      expect(find.text('Cancelar solicitação'), findsNothing);
      expect(find.text('Cancelada'), findsOneWidget);
    });

    testWidgets('cancelar recusado pelo usuário: nada é enviado', (tester) async {
      quatroStatus();
      await abrirLista(tester);

      await tester.tap(find.text('Cancelar solicitação'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Manter'));
      await tester.pumpAndSettle();

      expect(pedidos('DELETE'), 0);
      expect(find.text('Pendente'), findsOneWidget);
    });

    for (final (code, status, mensagem) in [
      ('SOLICITACAO_NAO_PENDENTE', 409, 'Esta solicitação já foi decidida.'),
      ('SOLICITACAO_NAO_ENCONTRADA', 404, 'Esta solicitação não existe mais.'),
    ]) {
      testWidgets('cancelar com $status $code: mensagem e lista recarregada', (tester) async {
        quatroStatus();
        await abrirLista(tester);
        app.api.responder('DELETE /solicitacoes/s1', _erro(code), status);
        app.api.responder('GET /solicitacoes/minhas', paginaJson([]));

        await tester.tap(find.text('Cancelar solicitação'));
        await tester.pumpAndSettle();
        await tester.tap(find.widgetWithText(TextButton, 'Cancelar solicitação'));
        await tester.pumpAndSettle();

        expect(find.text(mensagem), findsOneWidget);
        expect(find.text('Nenhuma solicitação'), findsOneWidget);
      });
    }

    testWidgets('cancelando: botão desativado e nenhuma mensagem antes da resposta (RM-23)', (
      tester,
    ) async {
      quatroStatus();
      await abrirLista(tester);
      final resposta = Completer<http.Response>();
      app.api.rotasAssincronas['DELETE /solicitacoes/s1'] = (_) => resposta.future;

      await tester.tap(find.text('Cancelar solicitação'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(TextButton, 'Cancelar solicitação'));
      await tester.pumpAndSettle();

      final botao = tester.widget<OutlinedButton>(
        find.widgetWithText(OutlinedButton, 'Cancelar solicitação'),
      );
      expect(botao.onPressed, isNull);
      expect(find.text('Solicitação cancelada.'), findsNothing);
      resposta.complete(respostaJson('', 204));
      await tester.pumpAndSettle();
      expect(find.text('Solicitação cancelada.'), findsOneWidget);
    });

    testWidgets('cancelar sem rede: "Tentar de novo" reenvia e mostra o resultado', (tester) async {
      quatroStatus();
      await abrirLista(tester);
      var tentativas = 0;
      app.api.rotas['DELETE /solicitacoes/s1'] = (_) {
        if (tentativas++ == 0) throw http.ClientException('Connection refused');
        return respostaJson('', 204);
      };

      await tester.tap(find.text('Cancelar solicitação'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(TextButton, 'Cancelar solicitação'));
      await tester.pumpAndSettle();
      expect(find.text('Sem conexão. Verifique a rede e tente de novo.'), findsOneWidget);

      await tester.tap(find.widgetWithText(SnackBarAction, 'Tentar de novo'));
      await tester.pumpAndSettle();

      expect(tentativas, 2);
      expect(find.text('Solicitação cancelada.'), findsOneWidget);
    });

    testWidgets('vazia: explica onde pedir inscrição', (tester) async {
      app.api.responder('GET /solicitacoes/minhas', paginaJson([solicitacaoMapa('s1')]));
      await abrirTurmas(tester);
      app.api.responder('GET /solicitacoes/minhas', paginaJson([]));

      await tester.tap(find.text('Ver todas'));
      await tester.pumpAndSettle();

      expect(find.text('Nenhuma solicitação'), findsOneWidget);
    });
  });

  group('Solicitar em Turmas disponíveis (T07 → T08)', () {
    Future<void> abrirDisponiveis(WidgetTester tester) async {
      app.api.responder(
        'GET /turmas/disponiveis',
        paginaJson([
          turmaMapa('DADOS-1', nome: 'Introdução a Ciência de Dados', semestre: null),
          turmaMapa('TADS-5A-2026-2', nome: 'TADS 5º Sem A', semestre: 5),
        ]),
      );
      await abrirTurmas(tester);
      await tester.tap(find.text('Ver turmas'));
      await tester.pumpAndSettle();
    }

    Future<void> solicitarPrimeira(WidgetTester tester) async {
      await tester.tap(find.widgetWithText(FilledButton, 'Solicitar').first);
      await tester.pumpAndSettle();
    }

    testWidgets('201: folha de confirmação; "Voltar às turmas" recarrega Minhas turmas', (
      tester,
    ) async {
      await abrirDisponiveis(tester);
      app.api.responder('POST /turmas/turma-DADOS-1/solicitacoes', '{"id": "s9"}', 201);
      app.api.responder(
        'GET /solicitacoes/minhas',
        paginaJson([solicitacaoMapa('s9', nome: 'Introdução a Ciência de Dados')]),
      );

      await solicitarPrimeira(tester);

      expect(find.text('Solicitação enviada'), findsOneWidget);
      expect(
        find.textContaining('Introdução a Ciência de Dados', findRichText: true),
        findsWidgets,
      );
      expect(
        find.textContaining('A coordenação ou quem leciona na turma decide', findRichText: true),
        findsOneWidget,
      );
      expect(find.text('TADS 5º Sem A'), findsOneWidget); // a outra continua

      await tester.tap(find.text('Voltar às turmas'));
      await tester.pumpAndSettle();

      expect(find.widgetWithText(AppBar, 'Minhas turmas'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('Pendente'), 200);
      expect(find.text('Introdução a Ciência de Dados'), findsOneWidget);
    });

    testWidgets('"Ver minhas solicitações" abre a lista com a nova pendente', (tester) async {
      await abrirDisponiveis(tester);
      app.api.responder('POST /turmas/turma-DADOS-1/solicitacoes', '{"id": "s9"}', 201);
      app.api.responder(
        'GET /solicitacoes/minhas',
        paginaJson([solicitacaoMapa('s9', nome: 'Introdução a Ciência de Dados')]),
      );
      await solicitarPrimeira(tester);

      await tester.tap(find.text('Ver minhas solicitações'));
      await tester.pumpAndSettle();

      expect(find.widgetWithText(AppBar, 'Minhas solicitações'), findsOneWidget);
      expect(find.text('Cancelar solicitação'), findsOneWidget);
      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      expect(find.widgetWithText(AppBar, 'Minhas turmas'), findsOneWidget);
    });

    for (final (code, status, mensagem) in [
      ('JA_VINCULADO', 409, 'Você já faz parte desta turma.'),
      ('TURMA_INDISPONIVEL', 404, 'Esta turma não está mais aceitando inscrições.'),
    ]) {
      testWidgets('$status $code: mensagem e disponíveis recarregadas', (tester) async {
        await abrirDisponiveis(tester);
        app.api.responder('POST /turmas/turma-DADOS-1/solicitacoes', _erro(code), status);
        app.api.responder(
          'GET /turmas/disponiveis',
          paginaJson([turmaMapa('TADS-5A-2026-2', nome: 'TADS 5º Sem A', semestre: 5)]),
        );

        await solicitarPrimeira(tester);

        expect(find.text(mensagem), findsOneWidget);
        expect(find.text('Introdução a Ciência de Dados'), findsNothing);
        expect(find.text('Solicitação enviada'), findsNothing);
      });
    }

    testWidgets('409 SOLICITACAO_DUPLICADA: mensagem e abre Minhas solicitações', (tester) async {
      await abrirDisponiveis(tester);
      app.api.responder(
        'POST /turmas/turma-DADOS-1/solicitacoes',
        _erro('SOLICITACAO_DUPLICADA'),
        409,
      );
      app.api.responder('GET /solicitacoes/minhas', paginaJson([solicitacaoMapa('s1')]));

      await solicitarPrimeira(tester);

      expect(find.text('Você já tem uma solicitação pendente para esta turma.'), findsOneWidget);
      expect(find.widgetWithText(AppBar, 'Minhas solicitações'), findsOneWidget);
    });

    for (final saida in ['Voltar às turmas', 'Ver minhas solicitações']) {
      testWidgets('403 com a folha aberta: a folha fica, e "$saida" volta a Minhas turmas', (
        tester,
      ) async {
        await abrirDisponiveis(tester);
        final recusa = Completer<http.Response>();
        app.api.rotasAssincronas['POST /turmas/turma-TADS-5A-2026-2/solicitacoes'] = (_) =>
            recusa.future;
        app.api.responder('POST /turmas/turma-DADOS-1/solicitacoes', '{"id": "s9"}', 201);

        await tester.tap(find.widgetWithText(FilledButton, 'Solicitar').last);
        await tester.pump();
        // A outra turma: 201 e a folha abre. Sem `pumpAndSettle`: o indicador do envio em curso
        // não para, e o relógio chegaria ao timeout do pedido.
        await tester.tap(find.widgetWithText(FilledButton, 'Solicitar').first);
        await tester.pump();
        await tester.pump(const Duration(seconds: 1));
        expect(find.text('Solicitação enviada'), findsOneWidget);
        recusa.complete(respostaJson(_erro('SEM_PERMISSAO'), 403));
        await tester.pumpAndSettle();

        expect(find.text('Solicitação enviada'), findsOneWidget);
        await tester.tap(find.text(saida));
        await tester.pumpAndSettle();

        expect(find.text('Esta ação não está disponível para o seu perfil.'), findsOneWidget);
        expect(find.widgetWithText(AppBar, 'Minhas turmas'), findsOneWidget);
        expect(find.byKey(const Key('barra-abas')), findsOneWidget);
      });
    }

    testWidgets('resposta que chega depois de sair da tela não abre a folha nem navega', (
      tester,
    ) async {
      await abrirDisponiveis(tester);
      final resposta = Completer<http.Response>();
      app.api.rotasAssincronas['POST /turmas/turma-DADOS-1/solicitacoes'] = (_) => resposta.future;
      app.api.responder('GET /solicitacoes/minhas', paginaJson([solicitacaoMapa('s9')]));

      await tester.tap(find.widgetWithText(FilledButton, 'Solicitar').first);
      await tester.pump();
      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      resposta.complete(respostaJson('{"id": "s9"}', 201));
      await tester.pumpAndSettle();

      expect(find.text('Solicitação enviada'), findsNothing);
      expect(find.widgetWithText(AppBar, 'Minhas turmas'), findsOneWidget);
      expect(find.byKey(const Key('barra-abas')), findsOneWidget);
      expect(find.text('Pendente'), findsOneWidget); // a recarga cruzada aconteceu
    });

    testWidgets('pedido duplicado respondido depois de sair da tela não troca de tela', (
      tester,
    ) async {
      await abrirDisponiveis(tester);
      final resposta = Completer<http.Response>();
      app.api.rotasAssincronas['POST /turmas/turma-DADOS-1/solicitacoes'] = (_) => resposta.future;

      await tester.tap(find.widgetWithText(FilledButton, 'Solicitar').first);
      await tester.pump();
      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      resposta.complete(respostaJson(_erro('SOLICITACAO_DUPLICADA'), 409));
      await tester.pumpAndSettle();

      expect(find.widgetWithText(AppBar, 'Minhas turmas'), findsOneWidget);
      expect(find.byKey(const Key('barra-abas')), findsOneWidget);
    });

    testWidgets('"Tentar de novo" depois de sair da tela não quebra', (tester) async {
      await abrirDisponiveis(tester);
      app.api.falharRede('POST /turmas/turma-DADOS-1/solicitacoes');
      await tester.tap(find.widgetWithText(FilledButton, 'Solicitar').first);
      await tester.pumpAndSettle();
      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(SnackBarAction, 'Tentar de novo'));
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
      expect(find.widgetWithText(AppBar, 'Minhas turmas'), findsOneWidget);
    });

    testWidgets('sem rede: nada muda e "Tentar de novo" reenvia', (tester) async {
      await abrirDisponiveis(tester);
      var tentativas = 0;
      app.api.rotas['POST /turmas/turma-DADOS-1/solicitacoes'] = (_) {
        if (tentativas++ == 0) throw http.ClientException('Connection refused');
        return respostaJson('{"id": "s9"}', 201);
      };

      await solicitarPrimeira(tester);

      expect(find.text('Sem conexão. Verifique a rede e tente de novo.'), findsOneWidget);
      expect(find.text('Introdução a Ciência de Dados'), findsOneWidget);
      await tester.tap(find.widgetWithText(SnackBarAction, 'Tentar de novo'));
      await tester.pumpAndSettle();
      expect(find.text('Solicitação enviada'), findsOneWidget);
      expect(tentativas, 2);
    });
  });
}
