import 'dart:async';
import 'dart:convert';

import 'package:conecta/main.dart';
import 'package:conecta/services/cache_local.dart';
import 'package:conecta/ui/agenda/calendario.dart';
import 'package:conecta/ui/comum/faixa_cache.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import '../apoio.dart';

import '../fixtures/fabrica.dart';
import '../fixtures/fixtures.dart';
import 'app_falso.dart';

const usuario = '7b1c0e3a-6f64-4f43-8a58-2f3d5f0c1a11';

void main() {
  late AppFalso app;
  // O mês aberto é o de hoje; os eventos de teste ficam no próximo mês, alcançado por ›.
  final hoje = DateTime.now();
  final atual = Mes.de(hoje);
  final seguinte = atual.proximo;
  DateTime noSeguinte(int dia, [int h = 0, int m = 0]) =>
      DateTime(seguinte.ano, seguinte.mes, dia, h, m);

  setUpAll(iniciarFormatos);

  setUp(() async {
    app = AppFalso();
    await app.preparar();
    app.api.responder('GET /avisos', avisosVazioJson);
  });

  Iterable<Map<String, String>> pedidosDoMes() => app.api.pedidos
      .where((r) => r.url.path == '/eventos' && r.url.queryParameters.containsKey('de'))
      .map((r) => r.url.queryParameters);

  Future<void> abrirMes(WidgetTester tester) async {
    await app.abrir(tester);
    await tester.tap(
      find.descendant(of: find.byKey(const Key('barra-abas')), matching: find.text('Agenda')),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Mês'));
    await tester.pumpAndSettle();
  }

  Finder dia(int n, Mes m) => find.bySemanticsLabel(
    RegExp('^$n, ${RegExp.escape(tituloDoDia(DateTime(m.ano, m.mes, n)).toLowerCase())}'),
  );

  final eventos = [
    eventoMapa(
      'p',
      titulo: 'Prova de BD',
      tipo: 'prova',
      inicio: noSeguinte(16, 19, 10),
      fim: noSeguinte(16, 20, 50),
      local: 'Lab 4',
    ),
    eventoMapa(
      'd',
      titulo: 'Entrega da lista 5',
      tipo: 'data_importante',
      inicio: noSeguinte(16, 23, 59),
    ),
    eventoMapa('s', titulo: 'Semana acadêmica', inicio: noSeguinte(20, 8), fim: noSeguinte(22, 18)),
  ];

  testWidgets('cabeçalho D S T Q Q S S; ‹ › pedem a janela da grade com os encerrados', (
    tester,
  ) async {
    app.api.responder('GET /eventos', paginaJson(eventos));
    final semantica = tester.ensureSemantics();

    await abrirMes(tester);
    expect(find.text(atual.nome), findsOneWidget);
    final janela = janelaDaGrade(atual);
    expect(pedidosDoMes().last, {
      'de': janela.de.toUtc().toIso8601String(),
      'ate': janela.ate.toUtc().toIso8601String(),
      'incluir_encerrados': 'true',
      'limit': '100',
      'offset': '0',
    });

    await tester.tap(find.byTooltip('Próximo mês'));
    await tester.pumpAndSettle();
    expect(find.text(seguinte.nome), findsOneWidget);
    expect(pedidosDoMes().last['de'], janelaDaGrade(seguinte).de.toUtc().toIso8601String());

    await tester.tap(find.byTooltip('Mês anterior'));
    await tester.pumpAndSettle();
    expect(find.text(atual.nome), findsOneWidget);
    semantica.dispose();
  });

  testWidgets('hoje escolhido ao abrir; tocar num dia lista as atividades dele', (tester) async {
    app.api.responder('GET /eventos', paginaJson(eventos));
    final semantica = tester.ensureSemantics();

    await abrirMes(tester);
    expect(find.text(tituloDoDia(hoje)), findsOneWidget);

    await tester.tap(find.byTooltip('Próximo mês'));
    await tester.pumpAndSettle();
    // Fora do mês de hoje, o dia 1 vem escolhido.
    expect(find.text(tituloDoDia(DateTime(seguinte.ano, seguinte.mes))), findsOneWidget);
    expect(find.text('Nenhuma atividade neste dia'), findsOneWidget);

    await tester.tap(dia(16, seguinte));
    await tester.pumpAndSettle();
    expect(find.text(tituloDoDia(noSeguinte(16))), findsOneWidget);
    expect(find.text('2 atividades'), findsOneWidget);
    expect(find.text('Prova de BD'), findsOneWidget);
    expect(find.text('19:10'), findsOneWidget);
    expect(find.text('23:59'), findsOneWidget);
    // O nome do dia começa pelo número visível e diz quantas atividades há.
    expect(dia(16, seguinte), findsOneWidget);
    expect(
      tester.getSemantics(dia(16, seguinte)),
      matchesSemantics(
        label: '16, ${tituloDoDia(noSeguinte(16)).toLowerCase()}, 2 atividades',
        isButton: true,
        isSelected: true,
        hasTapAction: true,
        hasSelectedState: true,
      ),
    );

    // Dia do meio de um evento de vários dias.
    await tester.tap(dia(21, seguinte));
    await tester.pumpAndSettle();
    expect(find.text('o dia todo'), findsOneWidget);
    semantica.dispose();
  });

  testWidgets('acima de 100 eventos na janela, a faixa avisa', (tester) async {
    app.api.responder('GET /eventos', paginaJson(eventos, total: 130, limit: 100));
    await abrirMes(tester);
    expect(find.text('Mostrando 3 de 130 atividades deste mês.'), findsOneWidget);
  });

  testWidgets('o tipo filtrado vale também no mês, que continua no mesmo mês e dia', (
    tester,
  ) async {
    app.api.responder('GET /eventos', paginaJson(eventos));
    await abrirMes(tester);
    await tester.tap(find.byTooltip('Próximo mês'));
    await tester.pumpAndSettle();
    await tester.tap(dia(16, seguinte));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Filtrar por tipo'));
    await tester.pumpAndSettle();
    // "Prova" também é o tipo de uma atividade do dia, atrás da folha.
    await tester.tap(find.descendant(of: find.byType(BottomSheet), matching: find.text('Prova')));
    await tester.pumpAndSettle();

    expect(pedidosDoMes().last['tipo'], 'prova');
    expect(pedidosDoMes().last['de'], janelaDaGrade(seguinte).de.toUtc().toIso8601String());
    expect(find.text(seguinte.nome), findsOneWidget);
    expect(find.text(tituloDoDia(noSeguinte(16))), findsOneWidget);
  });

  testWidgets('trocar de mês depressa: a resposta atrasada do mês anterior é descartada', (
    tester,
  ) async {
    final atrasada = Completer<http.Response>();
    app.api.rotasAssincronas['GET /eventos'] = (r) {
      final de = DateTime.parse(r.url.queryParameters['de'] ?? '1970-01-01T00:00:00Z');
      // O mês de hoje responde tarde, com um evento que não pode aparecer no mês seguinte.
      if (r.url.queryParameters.containsKey('de') && de == janelaDaGrade(atual).de.toUtc()) {
        return atrasada.future;
      }
      return Future.value(respostaJson(paginaJson([])));
    };

    await abrirMes(tester);
    await tester.tap(find.byTooltip('Próximo mês'));
    await tester.pumpAndSettle();
    atrasada.complete(
      respostaJson(
        paginaJson([
          eventoMapa(
            'x',
            titulo: 'Do mês errado',
            inicio: DateTime(seguinte.ano, seguinte.mes, 1, 10),
          ),
        ]),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text(seguinte.nome), findsOneWidget);
    expect(find.text('Do mês errado'), findsNothing);
    expect(find.text('Nenhuma atividade neste dia'), findsOneWidget);
  });

  testWidgets('sem rede: o mês corrente guardado, com a faixa', (tester) async {
    await app.cache.gravar(usuario, RecursoCache.agendaMes, {
      'mes': atual.chave,
      'pagina': jsonDecode(
        paginaJson([
          eventoMapa(
            'h',
            titulo: 'Hoje tem',
            inicio: DateTime(hoje.year, hoje.month, hoje.day, 23, 58),
          ),
        ]),
      ),
    });
    app.api.falharRede('GET /eventos');

    await abrirMes(tester);

    expect(find.byType(FaixaCache), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Hoje tem'),
      200,
      scrollable: find.byType(Scrollable).last,
    );
    expect(find.text('Hoje tem'), findsOneWidget);
  });
}
