import 'package:conecta/services/api_client.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../test/fixtures/fabrica.dart';
import '../test/fixtures/fixtures.dart';
import 'apoio_integracao.dart';

/// T064 (SC-006): depois do login e do uso, o token não está nas preferências (onde fica o
/// cache) nem no log; ele mora só no armazenamento seguro.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  const token = 'eyJhbGciOiJIUzI1NiJ9.token-de-teste.assinatura';
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
      ..responderCom(
        'GET /avisos',
        (q) => (200, paginaAvisosJson(total: 3, situacao: q['situacao']!)),
      )
      ..responder('GET /turmas/minhas', paginaJson([turmaMapa('TADS-3A-2026-2', papel: 'aluno')]))
      ..responder(
        'GET /solicitacoes/minhas',
        '{"detail": "falha de teste", "code": "ERRO_INTERNO"}',
        status: 500,
      );
  });

  tearDown(() async {
    ApiClient.registrar = original;
    await app.encerrar();
  });

  testWidgets('o token fica só no armazenamento seguro', (tester) async {
    expect(loginJson, contains(token), reason: 'o teste procura o token certo');
    await app.abrir(tester);
    await app.entrar(tester);
    await esperar(tester, find.text('Aviso número 1'));
    await app.abrirAba(tester, 'Turmas'); // gera também uma falha registrada (500)
    await esperar(tester, find.text('Entrar em outra turma'));
    await app.abrirAba(tester, 'Perfil');
    await esperar(tester, find.text('Aluno de Teste'));

    final prefs = await SharedPreferences.getInstance();
    await prefs.reload();
    final armazenado = [for (final chave in prefs.getKeys()) '$chave=${prefs.get(chave)}'];
    expect(armazenado, isNotEmpty, reason: 'o cache foi gravado nas preferências');
    expect(armazenado.join('\n'), isNot(contains(token)));
    expect(armazenado.join('\n'), isNot(contains('token-de-teste')));

    expect(registro, isNotEmpty, reason: 'houve falha registrada');
    expect(registro.join('\n'), isNot(contains('token-de-teste')));

    expect((await app.cofre.ler())!.token, token); // só no cofre
  });
}
