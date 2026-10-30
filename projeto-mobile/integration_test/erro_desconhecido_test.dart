import 'package:conecta/services/api_client.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import '../test/fixtures/fixtures.dart';
import 'apoio_integracao.dart';

/// T063 (RM-38): um `code` fora do catálogo da API cai na mensagem genérica, e a falha fica no
/// log local com método, endpoint e code.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  late AppSobTeste app;
  late List<String> registro;
  late void Function(String) original;

  setUp(() async {
    app = await AppSobTeste.preparar();
    registro = [];
    original = ApiClient.registrar;
    ApiClient.registrar = registro.add;
    app.servidor
      ..responder('POST /auth/login', loginJson)
      ..responder('GET /me', meJson)
      ..responder(
        'GET /avisos',
        '{"detail": "Algo que o app não conhece", "code": "CODE_NOVO_DA_API"}',
        status: 422,
      );
  });

  tearDown(() async {
    ApiClient.registrar = original;
    await app.encerrar();
  });

  testWidgets('code desconhecido: mensagem genérica na tela e registro no log', (tester) async {
    await app.abrir(tester);
    await app.entrar(tester);

    await esperar(
      tester,
      find.text('Não foi possível carregar agora. Tente de novo em instantes.'),
    );
    expect(find.text('Tentar de novo'), findsOneWidget);
    expect(find.textContaining('Algo que o app não conhece'), findsNothing); // detail nunca aparece
    expect(registro, contains('GET /avisos → 422 CODE_NOVO_DA_API'));
  });
}
