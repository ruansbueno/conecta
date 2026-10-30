import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import '../test/fixtures/fabrica.dart';
import '../test/fixtures/fixtures.dart';
import 'apoio_integracao.dart';

/// T062 (SC-005): com o cache preenchido e sem rede, as abas Avisos, Turmas e Perfil abrem com
/// conteúdo e a faixa com a data dos dados.
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
}
