import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../fixtures/fixtures.dart';
import 'app_falso.dart';

const _idEditado = 'e5d20000-0000-4000-8000-000000000002';

Map<String, dynamic> _avisoEditado() =>
    ((jsonDecode(avisosP1Json) as Map<String, dynamic>)['items'] as List)[1]
        as Map<String, dynamic>;

void main() {
  late AppFalso app;

  setUp(() async {
    app = AppFalso();
    await app.preparar();
    app.api.responder('GET /avisos', avisosP1Json);
  });

  Future<void> abrirDetalhe(WidgetTester tester) async {
    await app.abrir(tester);
    await tester.tap(find.text('Entrega do trabalho de Redes adiada para 30/10'));
    await tester.pumpAndSettle();
  }

  testWidgets('conteúdo completo, autor e destinos', (tester) async {
    app.api.responder('GET /avisos/$_idEditado', jsonEncode(_avisoEditado()));

    await abrirDetalhe(tester);

    expect(find.byType(BackButton), findsOneWidget);
    expect(
      find.text(
        'O prazo de entrega do trabalho prático de Redes foi estendido para 30 de '
        'outubro, às 23h59.',
      ),
      findsOneWidget,
    );
    expect(find.text('Ricardo Lemos'), findsOneWidget);
    expect(find.text('6º semestre'), findsOneWidget);
    expect(app.api.pedidos.last.url.path, '/avisos/$_idEditado'); // revalida ao abrir
  });

  testWidgets('linha "Publicado … · editado …" quando o aviso foi editado', (tester) async {
    app.api.responder('GET /avisos/$_idEditado', jsonEncode(_avisoEditado()));

    await abrirDetalhe(tester);

    expect(find.textContaining(RegExp(r'^Publicado .+ · editado .+$')), findsOneWidget);
  });

  testWidgets('a revalidação atualiza o conteúdo exibido', (tester) async {
    app.api.responder(
      'GET /avisos/$_idEditado',
      jsonEncode({..._avisoEditado(), 'conteudo': 'Conteúdo corrigido depois da lista.'}),
    );

    await abrirDetalhe(tester);

    expect(find.text('Conteúdo corrigido depois da lista.'), findsOneWidget);
  });

  testWidgets('404: avisa que não está mais disponível, volta e recarrega a lista', (tester) async {
    app.api.responder('GET /avisos/$_idEditado', erroAvisoNaoEncontradoJson, 404);
    final pedidosAntes = app.api.pedidos.length;

    await abrirDetalhe(tester);

    expect(find.text('Este aviso não está mais disponível.'), findsOneWidget);
    expect(find.byType(BackButton), findsNothing);
    final recargas = app.api.pedidos
        .skip(pedidosAntes)
        .where((p) => p.url.path == '/avisos')
        .length;
    expect(recargas, greaterThanOrEqualTo(1));
  });

  testWidgets('sem rede no detalhe: continua mostrando o dado da lista', (tester) async {
    app.api.falharRede('GET /avisos/$_idEditado');

    await abrirDetalhe(tester);

    expect(find.text('Entrega do trabalho de Redes adiada para 30/10'), findsOneWidget);
    expect(find.byType(BackButton), findsOneWidget);
  });
}
