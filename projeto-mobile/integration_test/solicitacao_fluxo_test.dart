import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import '../test/fixtures/fabrica.dart';
import '../test/fixtures/fixtures.dart';
import 'apoio_integracao.dart';

/// Servidor com o estado de uma solicitação de inscrição em "Introdução a Ciência de Dados",
/// seguindo as regras da API: a turma com pedido pendente sai de disponíveis.
class _Inscricao {
  String? status; // null: nunca pedida

  /// Simula uma lista de disponíveis desatualizada (outro aparelho, cache de servidor).
  bool disponiveisDesatualizadas = false;

  void instalar(AppSobTeste app) => app.servidor
    ..responder('POST /auth/login', loginJson)
    ..responder('GET /me', meJson)
    ..responder('GET /avisos', avisosVazioJson)
    ..responder(
      'GET /turmas/minhas',
      paginaJson([turmaMapa('TADS-3A-2026-2', nome: 'TADS 3º Sem A', papel: 'aluno')]),
    )
    ..responderCom(
      'GET /turmas/disponiveis',
      (_) => (
        200,
        paginaJson([
          if (status != 'pendente' || disponiveisDesatualizadas)
            turmaMapa('DADOS-1', nome: 'Introdução a Ciência de Dados', semestre: null),
          turmaMapa('TADS-5A-2026-2', nome: 'TADS 5º Sem A', semestre: 5),
        ]),
      ),
    )
    ..responderCom(
      'GET /solicitacoes/minhas',
      (_) => (
        200,
        paginaJson([
          if (status != null)
            solicitacaoMapa(
              'sol-1',
              codigo: 'DADOS-1',
              nome: 'Introdução a Ciência de Dados',
              status: status!,
              decididaEm: status == 'pendente' ? null : '2026-10-28T12:00:00Z',
            ),
        ]),
      ),
    )
    ..responderCom('POST /turmas/turma-DADOS-1/solicitacoes', (_) {
      if (status == 'pendente') {
        return (409, '{"detail": "Duplicada", "code": "SOLICITACAO_DUPLICADA"}');
      }
      status = 'pendente';
      return (201, '{"id": "sol-1", "turma_id": "turma-DADOS-1", "status": "pendente"}');
    })
    ..responderCom('DELETE /solicitacoes/sol-1', (_) {
      if (status != 'pendente') {
        return (409, '{"detail": "Já decidida", "code": "SOLICITACAO_NAO_PENDENTE"}');
      }
      status = 'cancelada';
      return (204, '');
    });
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  late AppSobTeste app;
  late _Inscricao inscricao;

  setUp(() async {
    app = await AppSobTeste.preparar();
    inscricao = _Inscricao()..instalar(app);
  });

  tearDown(() => app.encerrar());

  Future<void> abrirDisponiveis(WidgetTester tester) async {
    await tester.tap(find.text('Ver turmas'));
    await esperar(tester, find.text('TADS 5º Sem A'));
  }

  Future<void> solicitarDados(WidgetTester tester) async {
    await tester.tap(find.bySemanticsLabel('Solicitar inscrição em Introdução a Ciência de Dados'));
  }

  testWidgets('solicitar → ver pendente → cancelar → a turma volta a disponíveis', (tester) async {
    await app.abrir(tester);
    await app.entrar(tester);
    await app.abrirAba(tester, 'Turmas');
    await esperar(tester, find.text('Entrar em outra turma'));
    await abrirDisponiveis(tester);

    await solicitarDados(tester);
    await esperar(tester, find.text('Solicitação enviada'));
    await tester.tap(find.text('Ver minhas solicitações'));
    await esperar(tester, find.text('Cancelar solicitação'));
    expect(find.text('Pendente'), findsOneWidget);

    await tester.tap(find.text('Cancelar solicitação'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(TextButton, 'Cancelar solicitação'));
    await esperar(tester, find.text('Solicitação cancelada.'));
    await esperar(tester, find.text('Cancelada'));

    await tester.tap(find.byType(BackButton));
    await esperar(tester, find.text('Entrar em outra turma'));
    await abrirDisponiveis(tester);
    expect(find.text('Introdução a Ciência de Dados'), findsOneWidget);
    expect(
      app.servidor.pedidos.map((p) => p.rota),
      containsAllInOrder(['POST /turmas/turma-DADOS-1/solicitacoes', 'DELETE /solicitacoes/sol-1']),
    );
  });

  testWidgets('solicitar duas vezes a mesma turma: o segundo pedido abre Minhas solicitações', (
    tester,
  ) async {
    inscricao.disponiveisDesatualizadas = true;
    await app.abrir(tester);
    await app.entrar(tester);
    await app.abrirAba(tester, 'Turmas');
    await esperar(tester, find.text('Entrar em outra turma'));
    await abrirDisponiveis(tester);
    await solicitarDados(tester);
    await esperar(tester, find.text('Voltar às turmas'));
    await tester.tap(find.text('Voltar às turmas'));
    await esperar(tester, find.text('Entrar em outra turma'));

    await abrirDisponiveis(tester); // a lista desatualizada ainda traz a turma
    await solicitarDados(tester);

    await esperar(tester, find.text('Você já tem uma solicitação pendente para esta turma.'));
    await esperar(tester, find.text('Cancelar solicitação'));
    expect(find.widgetWithText(AppBar, 'Minhas solicitações'), findsOneWidget);
    expect(
      app.servidor.pedidos.where((p) => p.rota == 'POST /turmas/turma-DADOS-1/solicitacoes'),
      hasLength(2),
    );
  });
}
