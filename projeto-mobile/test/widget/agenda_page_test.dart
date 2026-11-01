import 'dart:convert';

import 'package:conecta/services/cache_local.dart';
import 'package:conecta/ui/comum/chip_destino.dart';
import 'package:conecta/ui/comum/faixa_cache.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../apoio.dart';
import '../fixtures/fabrica.dart';
import '../fixtures/fixtures.dart';
import 'app_falso.dart';

// Datas futuras fixas: a lista de próximos é a que a API devolver (o servidor é falso).
final dia16 = DateTime(2030, 10, 16);
Map<String, dynamic> provaBd = eventoMapa(
  'e1',
  titulo: 'Prova de Banco de Dados II',
  tipo: 'prova',
  inicio: DateTime(2030, 10, 16, 19, 10),
  fim: DateTime(2030, 10, 16, 20, 50),
  local: 'Lab 4',
  destinos: [
    {
      'tipo': 'turma',
      'turma': {'id': 't1', 'codigo': 'SI-3A', 'nome': 'SI-3A'},
      'semestre': null,
    },
  ],
);
Map<String, dynamic> entrega = eventoMapa(
  'e2',
  titulo: 'Entrega da lista 5',
  tipo: 'data_importante',
  inicio: DateTime(2030, 10, 16, 23, 59),
  local: 'Entrega on-line',
);
Map<String, dynamic> palestra = eventoMapa(
  'e3',
  titulo: 'Palestra: carreira em nuvem',
  inicio: DateTime(2030, 10, 21, 19),
  fim: DateTime(2030, 10, 21, 21),
);

void main() {
  late AppFalso app;

  setUp(() async {
    app = AppFalso();
    await app.preparar();
    app.api.responder('GET /avisos', avisosVazioJson);
  });

  Future<void> abrirAgenda(WidgetTester tester) async {
    await app.abrir(tester);
    await tester.tap(
      find.descendant(of: find.byKey(const Key('barra-abas')), matching: find.text('Agenda')),
    );
    await tester.pumpAndSettle();
  }

  Iterable<Map<String, String>> pedidosDeEventos() =>
      app.api.pedidos.where((r) => r.url.path == '/eventos').map((r) => r.url.queryParameters);

  testWidgets('Próximos: cartão como na m-10, com a data só no primeiro evento do dia', (
    tester,
  ) async {
    app.api.responder('GET /eventos', paginaJson([provaBd, entrega, palestra]));

    await abrirAgenda(tester);

    expect(pedidosDeEventos().single, {'limit': '20', 'offset': '0'});
    expect(find.text('Prova'), findsWidgets);
    expect(find.text('Prova de Banco de Dados II'), findsOneWidget);
    expect(find.text('19:10 – 20:50'), findsOneWidget);
    expect(find.text('Lab 4'), findsOneWidget);
    expect(find.widgetWithText(ChipDestino, 'SI-3A'), findsOneWidget);
    expect(find.text('até 23:59'), findsOneWidget);
    expect(find.text('Data importante'), findsOneWidget);
    // Dois eventos no dia 16: a coluna da data aparece uma vez.
    expect(find.text('16'), findsOneWidget);
    expect(find.text('21'), findsOneWidget);
  });

  testWidgets('rolagem infinita pede a página seguinte', (tester) async {
    app.api.rotas['GET /eventos'] = (r) {
      final offset = int.parse(r.url.queryParameters['offset']!);
      final itens = [
        for (var i = offset; i < (offset + 20).clamp(0, 25); i++)
          eventoMapa(
            'x$i',
            titulo: 'Evento $i',
            inicio: DateTime(2030, 11, 1).add(Duration(days: i)),
          ),
      ];
      return respostaJson(paginaJson(itens, total: 25, offset: offset));
    };

    await abrirAgenda(tester);
    await tester.dragUntilVisible(
      find.text('Evento 24'),
      find.byType(ListView).last,
      const Offset(0, -400),
    );

    expect(pedidosDeEventos().map((q) => q['offset']), ['0', '20']);
  });

  testWidgets('Provas: tipo=prova; a folha de tipos fica desabilitada', (tester) async {
    app.api.responder('GET /eventos', paginaJson([provaBd]));

    await abrirAgenda(tester);
    await tester.tap(find.text('Provas'));
    await tester.pumpAndSettle();

    expect(pedidosDeEventos().last['tipo'], 'prova');
    final filtro = tester.widget<IconButton>(find.widgetWithIcon(IconButton, Icons.filter_list));
    expect(filtro.onPressed, isNull);
  });

  testWidgets('filtro por tipo: folha, consulta e título', (tester) async {
    app.api.responder('GET /eventos', paginaJson([palestra]));

    await abrirAgenda(tester);
    await tester.tap(find.byTooltip('Filtrar por tipo'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Banca'));
    await tester.pumpAndSettle();

    expect(pedidosDeEventos().last['tipo'], 'banca');
    expect(find.text('Agenda · Banca'), findsOneWidget);

    await tester.tap(find.byTooltip('Filtrar por tipo (Banca)'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Todos os tipos'));
    await tester.pumpAndSettle();
    expect(pedidosDeEventos().last.containsKey('tipo'), isFalse);
    expect(find.text('Agenda · Banca'), findsNothing);
    expect(find.byTooltip('Filtrar por tipo'), findsOneWidget);
  });

  testWidgets('o filtro ativo é dito ao leitor de tela; em Provas, o título não o mostra', (
    tester,
  ) async {
    app.api.responder('GET /eventos', paginaJson([palestra]));

    await abrirAgenda(tester);
    await tester.tap(find.byTooltip('Filtrar por tipo'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Banca'));
    await tester.pumpAndSettle();
    expect(find.byTooltip('Filtrar por tipo (Banca)'), findsOneWidget);

    await tester.tap(find.text('Provas'));
    await tester.pumpAndSettle();
    expect(find.text('Agenda · Banca'), findsNothing);
  });

  testWidgets('vazio de Próximos e de Provas', (tester) async {
    app.api.responder('GET /eventos', paginaJson([]));
    await abrirAgenda(tester);
    expect(find.text('Nenhum evento por vir'), findsOneWidget);

    await tester.tap(find.text('Provas'));
    await tester.pumpAndSettle();
    expect(find.text('Nenhuma prova marcada'), findsOneWidget);
  });

  testWidgets('sem rede: o que estava guardado, com a faixa', (tester) async {
    await app.cache.gravar(
      '7b1c0e3a-6f64-4f43-8a58-2f3d5f0c1a11',
      RecursoCache.agendaProximosP1,
      jsonDecode(paginaJson([palestra])) as Map<String, dynamic>,
    );
    app.api.falharRede('GET /eventos');

    await abrirAgenda(tester);

    expect(find.text('Palestra: carreira em nuvem'), findsOneWidget);
    expect(find.byType(FaixaCache), findsOneWidget);
  });

  testWidgets('erro sem cache: mensagem e tentar de novo', (tester) async {
    app.api.falharRede('GET /eventos');
    await abrirAgenda(tester);
    expect(find.text('Tentar de novo'), findsOneWidget);

    app.api.responder('GET /eventos', paginaJson([palestra]));
    await tester.tap(find.text('Tentar de novo'));
    await tester.pumpAndSettle();
    expect(find.text('Palestra: carreira em nuvem'), findsOneWidget);
  });

  testWidgets('tocar no cartão abre o detalhe', (tester) async {
    app.api.responder('GET /eventos', paginaJson([palestra]));
    app.api.responder('GET /eventos/e3', jsonEncode(palestra));

    await abrirAgenda(tester);
    await tester.tap(find.text('Palestra: carreira em nuvem'));
    await tester.pumpAndSettle();

    expect(find.text('Para quem é'), findsOneWidget);
  });
}
