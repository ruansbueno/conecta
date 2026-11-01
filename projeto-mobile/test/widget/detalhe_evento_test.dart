import 'dart:async';
import 'dart:convert';

import 'package:conecta/config/rotas.dart';
import 'package:conecta/models/evento.dart';
import 'package:conecta/ui/comum/esqueleto_lista.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import '../apoio.dart';
import '../fixtures/fabrica.dart';
import '../fixtures/fixtures.dart';
import 'app_falso.dart';

final palestra = eventoMapa(
  'e3',
  titulo: 'Carreira em infraestrutura em nuvem',
  inicio: DateTime(2030, 10, 22, 19),
  fim: DateTime(2030, 10, 22, 21),
  local: 'Auditório do câmpus',
  descricao: 'Bate-papo com egressas e egressos.',
);

void main() {
  late AppFalso app;

  setUp(() async {
    app = AppFalso();
    await app.preparar();
    app.api.responder('GET /avisos', avisosVazioJson);
  });

  Future<void> abrirDetalhe(WidgetTester tester, Object argumento) async {
    await app.abrir(tester);
    unawaited(
      Rotas.navigatorKey.currentState!.pushNamed(Rotas.eventoDetalhe, arguments: argumento),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('m-11: tipo, título, data e horas, local, descrição, público e autor', (
    tester,
  ) async {
    app.api.responder('GET /eventos/e3', jsonEncode(palestra));

    await abrirDetalhe(tester, Evento.fromJson(palestra));

    expect(find.text('Palestra'), findsOneWidget);
    expect(find.text('Carreira em infraestrutura em nuvem'), findsOneWidget);
    expect(find.text('Terça, 22 de outubro'), findsOneWidget);
    expect(find.text('19:00 – 21:00'), findsOneWidget);
    expect(find.text('Auditório do câmpus'), findsOneWidget);
    expect(find.text('Bate-papo com egressas e egressos.'), findsOneWidget);
    expect(find.text('Para quem é'), findsOneWidget);
    expect(find.text('Todos'), findsOneWidget);
    expect(find.text('Marina Duarte'), findsOneWidget);
  });

  testWidgets('revalida e mostra a versão nova; "editado em" quando houver', (tester) async {
    app.api.responder(
      'GET /eventos/e3',
      jsonEncode({
        ...palestra,
        'titulo': 'Carreira em nuvem (sala nova)',
        'editado_em': '2030-10-10T12:00:00Z',
      }),
    );

    await abrirDetalhe(tester, Evento.fromJson(palestra));

    expect(find.text('Carreira em nuvem (sala nova)'), findsOneWidget);
    expect(find.textContaining('Editado'), findsOneWidget);
  });

  testWidgets('vários dias e sem local', (tester) async {
    final semana = eventoMapa(
      's',
      titulo: 'Semana acadêmica',
      inicio: DateTime(2030, 9, 2, 19),
      fim: DateTime(2030, 9, 4, 18),
      local: null,
    );
    app.api.responder('GET /eventos/s', jsonEncode(semana));

    await abrirDetalhe(tester, Evento.fromJson(semana));

    expect(find.text('De 02/09, 19:00, a 04/09, 18:00'), findsOneWidget);
    expect(find.byIcon(Icons.place_outlined), findsNothing);
  });

  testWidgets('404: mensagem, volta e avisa a lista para recarregar', (tester) async {
    app.api.responder('GET /eventos', paginaJson([palestra]));
    app.api.responder('GET /eventos/e3', '{"detail": "x", "code": "EVENTO_NAO_ENCONTRADO"}', 404);
    await app.abrir(tester);
    await tester.tap(
      find.descendant(of: find.byKey(const Key('barra-abas')), matching: find.text('Agenda')),
    );
    await tester.pumpAndSettle();
    final antes = app.api.pedidos.where((r) => r.url.path == '/eventos').length;

    await tester.tap(find.text('Carreira em infraestrutura em nuvem'));
    await tester.pumpAndSettle();

    expect(find.text('Este evento não está mais disponível.'), findsOneWidget);
    expect(find.text('Para quem é'), findsNothing);
    expect(app.api.pedidos.where((r) => r.url.path == '/eventos').length, antes + 1);
  });

  testWidgets('sem rede: fica o que veio da lista', (tester) async {
    app.api.falharRede('GET /eventos/e3');

    await abrirDetalhe(tester, Evento.fromJson(palestra));

    expect(find.text('Carreira em infraestrutura em nuvem'), findsOneWidget);
    expect(find.textContaining('Sem conexão'), findsOneWidget);
  });

  testWidgets('erro do servidor: segue com o evento da lista, sem dizer que falta rede', (
    tester,
  ) async {
    app.api.responder('GET /eventos/e3', '{"detail": "x", "code": "ERRO_INTERNO"}', 500);

    await abrirDetalhe(tester, Evento.fromJson(palestra));

    expect(find.text('Carreira em infraestrutura em nuvem'), findsOneWidget);
    expect(find.textContaining('Sem conexão'), findsNothing);
  });

  testWidgets('aberto só com o id: esqueleto até a resposta', (tester) async {
    final resposta = Completer<http.Response>();
    app.api.rotasAssincronas['GET /eventos/e3'] = (_) => resposta.future;

    await app.abrir(tester);
    unawaited(Rotas.navigatorKey.currentState!.pushNamed(Rotas.eventoDetalhe, arguments: 'e3'));
    await tester.pump();
    await tester.pump();

    expect(find.byType(EsqueletoLista), findsOneWidget);
    resposta.complete(respostaJson(jsonEncode(palestra)));
    await tester.pumpAndSettle();
    expect(find.text('Carreira em infraestrutura em nuvem'), findsOneWidget);
  });
}
