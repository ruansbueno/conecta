import 'package:conecta/services/cofre_sessao.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import '../test/fixtures/fabrica.dart';
import '../test/fixtures/fixtures.dart';
import 'apoio_integracao.dart';

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
        (q) => (
          200,
          paginaAvisosJson(total: 25, offset: int.parse(q['offset']!), situacao: q['situacao']!),
        ),
      );
  });

  tearDown(() => app.encerrar());

  int pedidosDeAvisos() => app.servidor.pedidos.where((p) => p.rota == 'GET /avisos').length;

  testWidgets('primeira carga mostra os avisos com o token do usuário', (tester) async {
    await app.abrir(tester);
    await app.entrar(tester);
    await esperar(tester, find.text('Aviso número 1'));

    final pedido = app.servidor.pedidos.firstWhere((p) => p.rota == 'GET /avisos');
    expect(pedido.query, {'situacao': 'ativo', 'limit': '20', 'offset': '0'});
    expect(pedido.autorizacao, startsWith('Bearer '));
  });

  testWidgets('rolar até o fim carrega a segunda página', (tester) async {
    await app.abrir(tester);
    await app.entrar(tester);
    await esperar(tester, find.text('Aviso número 1'));

    await tester.fling(find.byType(Scrollable).first, const Offset(0, -6000), 3000);
    await esperar(tester, find.text('Aviso número 25'));
    await tester.fling(find.byType(Scrollable).first, const Offset(0, -6000), 3000);
    await esperar(tester, find.text('Não há mais avisos.'));

    expect(app.servidor.pedidos.where((p) => p.query['offset'] == '20'), hasLength(1));
  });

  testWidgets('puxar para baixo recarrega do servidor', (tester) async {
    await app.abrir(tester);
    await app.entrar(tester);
    await esperar(tester, find.text('Aviso número 1'));
    final antes = pedidosDeAvisos();

    await tester.fling(find.text('Aviso número 1'), const Offset(0, 500), 1500);
    await esperar(tester, find.text('Aviso número 1'));
    for (var i = 0; i < 30 && pedidosDeAvisos() == antes; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }

    expect(pedidosDeAvisos(), greaterThan(antes));
  });

  testWidgets('sem rede, reabre com o conteúdo guardado e a faixa com a data', (tester) async {
    await app.abrir(tester);
    await app.entrar(tester);
    await esperar(tester, find.text('Aviso número 1'));
    final guardada = (await app.cofre.ler())!;
    expect(guardada, isA<SessaoGuardada>());

    await app.servidor.derrubar();
    await tester.pumpWidget(const SizedBox());
    await app.abrir(tester);
    await esperar(tester, find.textContaining('Mostrando dados de'));

    expect(find.text('Aviso número 1'), findsOneWidget);
    expect(find.textContaining('Sem conexão.'), findsOneWidget);
  });
}
