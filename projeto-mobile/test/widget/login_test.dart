import 'package:conecta/repositories/auth_repository.dart';
import 'package:conecta/state/session_controller.dart';
import 'package:conecta/theme/tema.dart';
import 'package:conecta/ui/login/login_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import '../apoio.dart';
import '../fixtures/fixtures.dart';

void main() {
  late ApiFalsa api;
  late SessionController sessao;

  Future<void> abrir(WidgetTester tester) async {
    api = ApiFalsa();
    final (cache, cofre) = await armazenamentosVazios();
    sessao = SessionController(
      api: api.api,
      auth: AuthRepository(api.api, cache),
      cofre: cofre,
      cache: cache,
    );
    await tester.pumpWidget(
      ChangeNotifierProvider.value(
        value: sessao,
        child: MaterialApp(theme: temaConecta(), home: const LoginPage()),
      ),
    );
  }

  Finder campo(String rotulo) => find.widgetWithText(TextField, rotulo);

  Future<void> entrar(
    WidgetTester tester, {
    String usuario = 'aluno.teste',
    String senha = 'x',
  }) async {
    await tester.enterText(find.byKey(const Key('campo-usuario')), usuario);
    await tester.enterText(find.byKey(const Key('campo-senha')), senha);
    await tester.tap(find.text('Entrar'));
    await tester.pumpAndSettle();
  }

  String senhaDigitada(WidgetTester tester) => tester
      .widget<TextField>(
        find.descendant(of: find.byKey(const Key('campo-senha')), matching: find.byType(TextField)),
      )
      .controller!
      .text;

  testWidgets('identidade da tela: marca, campos e aviso sobre a senha', (tester) async {
    await abrir(tester);

    expect(find.text('CONECTA'), findsOneWidget);
    expect(find.text('Usuário'), findsOneWidget);
    expect(find.text('Senha'), findsOneWidget);
    expect(find.textContaining('O CONECTA não armazena sua senha'), findsOneWidget);
    expect(campo('seu.usuario'), findsOneWidget);
  });

  testWidgets('campo vazio é indicado sem chamar a API', (tester) async {
    await abrir(tester);

    await tester.tap(find.text('Entrar'));
    await tester.pumpAndSettle();

    expect(find.text('Informe o usuário.'), findsOneWidget);
    expect(find.text('Informe a senha.'), findsOneWidget);
    expect(api.pedidos, isEmpty);
  });

  testWidgets('credencial inválida: mensagem, senha limpa, permanece', (tester) async {
    await abrir(tester);
    api.responder('POST /auth/login', erroCredenciaisInvalidasJson, 401);

    await entrar(tester, senha: 'errada');

    expect(find.text('Usuário ou senha incorretos.'), findsOneWidget);
    expect(senhaDigitada(tester), isEmpty);
    expect(sessao.estado, isNot(EstadoSessao.logado));
  });

  testWidgets('usuário desativado: mensagem própria', (tester) async {
    await abrir(tester);
    api.responder('POST /auth/login', erroUsuarioInativoJson, 403);

    await entrar(tester);

    expect(find.text('Seu acesso está desativado. Procure a coordenação.'), findsOneWidget);
    expect(senhaDigitada(tester), isEmpty);
  });

  testWidgets('sem rede: mensagem com repetir, que reenvia sem redigitar', (tester) async {
    await abrir(tester);
    api.falharRede('POST /auth/login');

    await entrar(tester, senha: 'senha-teste');
    expect(find.text('Sem conexão. Verifique a rede e tente de novo.'), findsOneWidget);
    expect(senhaDigitada(tester), 'senha-teste');

    api.responder('POST /auth/login', loginJson);
    api.responder('GET /me', meJson);
    await tester.tap(find.text('Tentar de novo'));
    await tester.pumpAndSettle();

    expect(sessao.estado, EstadoSessao.logado);
    expect(api.pedidos.where((p) => p.url.path == '/auth/login'), hasLength(2));
  });

  testWidgets('erro de validação da API marca o campo', (tester) async {
    await abrir(tester);
    api.responder('POST /auth/login', erroValidationErrorJson, 422);

    await entrar(tester);

    expect(find.text('Confira os campos destacados.'), findsOneWidget);
    expect(find.text('deve ter ao menos 1 caractere(s)'), findsOneWidget);
  });

  testWidgets('sucesso entra na sessão', (tester) async {
    await abrir(tester);
    api.responder('POST /auth/login', loginJson);
    api.responder('GET /me', meJson);

    await entrar(tester, senha: 'senha-teste');

    expect(sessao.estado, EstadoSessao.logado);
    expect(sessao.usuario!.username, 'aluno.teste');
  });

  testWidgets('mostra o motivo de um encerramento de sessão anterior', (tester) async {
    await abrir(tester);
    api.responder('POST /auth/login', loginJson);
    api.responder('GET /me', meJson);
    await entrar(tester, senha: 'senha-teste');
    api.responder('GET /avisos', erroNaoAutenticadoJson, 401);
    await api.api.get('/avisos').catchError((_) => <String, dynamic>{});
    await tester.pumpAndSettle();

    expect(find.text('Sua sessão expirou. Entre de novo.'), findsOneWidget);
  });

  testWidgets('cada campo é precedido pelo seu rótulo na ordem de leitura', (tester) async {
    final semantica = tester.ensureSemantics();
    await abrir(tester);

    final rotuloSenha = tester.getRect(find.text('Senha'));
    final campoSenha = tester.getRect(find.byType(TextField).last);

    expect(find.bySemanticsLabel('Senha'), findsOneWidget);
    expect(rotuloSenha.bottom, lessThanOrEqualTo(campoSenha.top));
    semantica.dispose();
  });

  testWidgets('alvos de toque e rótulos acessíveis', (tester) async {
    final semantica = tester.ensureSemantics();
    await abrir(tester);

    await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
    await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
    semantica.dispose();
  });
}
