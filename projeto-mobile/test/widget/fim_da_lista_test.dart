// Spec 002, User Story 3 (FR-008): ao fim das listas curtas, o app diz que não há mais nada, em vez
// de terminar num espaço em branco. Com mais páginas, carregando ou com falha, o fecho não aparece.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import '../apoio.dart';
import '../fixtures/fabrica.dart';
import '../fixtures/fixtures.dart';
import 'app_falso.dart';

final _prova = eventoMapa(
  'e1',
  titulo: 'Prova de Banco de Dados II',
  tipo: 'prova',
  inicio: DateTime(2030, 10, 16, 19, 10),
  fim: DateTime(2030, 10, 16, 20, 50),
);
final _palestra = eventoMapa('e2', titulo: 'Palestra', inicio: DateTime(2030, 10, 21, 19));

void main() {
  late AppFalso app;

  setUp(() async {
    app = AppFalso();
    await app.preparar();
    app.api
      ..responder('GET /avisos', avisosVazioJson)
      ..responder('GET /turmas/minhas', paginaJson([turmaMapa('SI-3A', papel: 'aluno')]))
      ..responder('GET /solicitacoes/minhas', paginaJson([]));
  });

  Future<void> aba(WidgetTester tester, String nome) async {
    await tester.tap(
      find.descendant(of: find.byKey(const Key('barra-abas')), matching: find.text(nome)),
    );
    await tester.pumpAndSettle();
  }

  Future<void> rolarAteOFim(WidgetTester tester) async {
    await tester.drag(find.byType(Scrollable).last, const Offset(0, -2000));
    await tester.pumpAndSettle();
  }

  group('Agenda', () {
    testWidgets('por vir, sem mais páginas: "Não há mais eventos por vir."', (tester) async {
      app.api.responder('GET /eventos', paginaJson([_prova, _palestra]));
      await app.abrir(tester);
      await aba(tester, 'Agenda');

      expect(find.text('Não há mais eventos por vir.'), findsOneWidget);
    });

    testWidgets('provas, sem mais páginas: "Não há mais provas marcadas."', (tester) async {
      app.api.responder('GET /eventos', paginaJson([_prova]));
      await app.abrir(tester);
      await aba(tester, 'Agenda');
      await tester.tap(find.text('Provas'));
      await tester.pumpAndSettle();

      expect(find.text('Não há mais provas marcadas.'), findsOneWidget);
      expect(find.text('Não há mais eventos por vir.'), findsNothing);
    });

    testWidgets('com mais páginas, sem fecho; depois da última, com fecho', (tester) async {
      app.api.rotas['GET /eventos'] = (r) {
        final offset = int.parse(r.url.queryParameters['offset']!);
        return respostaJson(
          paginaJson(
            [
              for (var i = offset; i < (offset + 20).clamp(0, 22); i++)
                eventoMapa('x$i', titulo: 'Evento $i', inicio: DateTime(2030, 11, 1 + i)),
            ],
            total: 22,
            offset: offset,
          ),
        );
      };
      await app.abrir(tester);
      await aba(tester, 'Agenda');
      expect(find.text('Não há mais eventos por vir.'), findsNothing);

      await tester.dragUntilVisible(
        find.text('Não há mais eventos por vir.'),
        find.byType(Scrollable).last,
        const Offset(0, -400),
      );
      expect(find.text('Evento 21'), findsOneWidget);
    });

    testWidgets('falha ao carregar mais: "Tentar de novo", sem fecho', (tester) async {
      app.api.rotas['GET /eventos'] = (r) {
        final offset = int.parse(r.url.queryParameters['offset']!);
        if (offset > 0) throw http.ClientException('Connection refused');
        return respostaJson(
          paginaJson([
            for (var i = 0; i < 20; i++)
              eventoMapa('x$i', titulo: 'Evento $i', inicio: DateTime(2030, 11, 1 + i)),
          ], total: 22),
        );
      };
      await app.abrir(tester);
      await aba(tester, 'Agenda');
      await tester.dragUntilVisible(
        find.text('Tentar de novo'),
        find.byType(Scrollable).last,
        const Offset(0, -400),
      );

      expect(find.text('Não há mais eventos por vir.'), findsNothing);
    });

    testWidgets('vazio: o estado vazio, sem fecho', (tester) async {
      app.api.responder('GET /eventos', paginaJson([]));
      await app.abrir(tester);
      await aba(tester, 'Agenda');

      expect(find.text('Nenhum evento por vir'), findsOneWidget);
      expect(find.text('Não há mais eventos por vir.'), findsNothing);
    });
  });

  testWidgets('Turmas disponíveis: "Não há mais turmas disponíveis."', (tester) async {
    app.api.responder(
      'GET /turmas/disponiveis',
      paginaJson([turmaMapa('TADS-5A-2026-2', nome: 'TADS 5º Sem A', semestre: 5)]),
    );
    await app.abrir(tester);
    await aba(tester, 'Turmas');
    await tester.tap(find.text('Ver turmas'));
    await tester.pumpAndSettle();

    expect(find.text('Não há mais turmas disponíveis.'), findsOneWidget);
  });

  testWidgets('Minhas solicitações: "Não há mais solicitações."', (tester) async {
    app.api.responder(
      'GET /solicitacoes/minhas',
      paginaJson([solicitacaoMapa('s1', nome: 'Redes II')]),
    );
    await app.abrir(tester);
    await aba(tester, 'Turmas');
    await tester.tap(find.text('Ver todas'));
    await tester.pumpAndSettle();
    await rolarAteOFim(tester);

    expect(find.text('Não há mais solicitações.'), findsOneWidget);
  });

  group('Horários', () {
    testWidgets('aula em alguns dias: "Não há aulas nos outros dias da semana."', (tester) async {
      app.api.responder(
        'GET /turmas/turma-SI-3A/horarios',
        paginaJson([aulaMapa('h1'), aulaMapa('h2', diaSemana: 3)]),
      );
      await app.abrir(tester);
      await aba(tester, 'Horários');
      await rolarAteOFim(tester);

      expect(find.text('Não há aulas nos outros dias da semana.'), findsOneWidget);
    });

    testWidgets('aula em todos os dias: sem fecho', (tester) async {
      app.api.responder(
        'GET /turmas/turma-SI-3A/horarios',
        paginaJson([for (var d = 1; d <= 7; d++) aulaMapa('h$d', diaSemana: d)]),
      );
      await app.abrir(tester);
      await aba(tester, 'Horários');
      await rolarAteOFim(tester);

      expect(find.text('Não há aulas nos outros dias da semana.'), findsNothing);
    });
  });
}
