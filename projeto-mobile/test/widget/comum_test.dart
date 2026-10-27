import 'package:conecta/models/destino.dart';
import 'package:conecta/theme/cores.dart';
import 'package:conecta/theme/tema.dart';
import 'package:conecta/ui/comum/avatar.dart';
import 'package:conecta/ui/comum/chip_destino.dart';
import 'package:conecta/ui/comum/esqueleto_lista.dart';
import 'package:conecta/ui/comum/estado_erro.dart';
import 'package:conecta/ui/comum/estado_vazio.dart';
import 'package:conecta/ui/comum/faixa_cache.dart';
import 'package:conecta/ui/comum/faixa_informativa.dart';
import 'package:conecta/ui/comum/selo_situacao.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';

Widget _app(Widget filho) => MaterialApp(
  theme: temaConecta(),
  home: Scaffold(body: filho),
);

void main() {
  setUpAll(() => initializeDateFormatting('pt_BR'));

  group('ChipDestino', () {
    testWidgets('rótulo, cor do ponto por tipo e leitura para leitor de tela', (tester) async {
      const destino = Destino(tipo: TipoDestino.todos, tipoBruto: 'todos');
      final semantica = tester.ensureSemantics();

      await tester.pumpWidget(_app(const ChipDestino(destino)));

      expect(find.text('Todos'), findsOneWidget);
      final ponto = tester.widget<DecoratedBox>(find.byKey(const Key('ponto-destino')));
      expect((ponto.decoration as BoxDecoration).color, CoresDestino.todosPonto);
      expect(find.bySemanticsLabel('Destino: Todos'), findsOneWidget);
      semantica.dispose();
    });

    testWidgets('tipo desconhecido usa o rótulo cru e cor neutra', (tester) async {
      const destino = Destino(tipo: TipoDestino.desconhecido, tipoBruto: 'curso');

      await tester.pumpWidget(_app(const ChipDestino(destino)));

      expect(find.text('curso'), findsOneWidget);
      final ponto = tester.widget<DecoratedBox>(find.byKey(const Key('ponto-destino')));
      expect((ponto.decoration as BoxDecoration).color, CoresDestino.desconhecidoPonto);
    });
  });

  testWidgets('Avatar mostra as iniciais e é anunciado pelo nome', (tester) async {
    final semantica = tester.ensureSemantics();

    await tester.pumpWidget(_app(const Avatar(nome: 'Ricardo Lemos')));

    expect(find.text('RL'), findsOneWidget);
    expect(find.bySemanticsLabel('Ricardo Lemos'), findsOneWidget);
    semantica.dispose();
  });

  testWidgets('SeloSituacao renderiza o texto', (tester) async {
    await tester.pumpWidget(_app(const SeloSituacao('Arquivado', tom: TomSelo.neutro)));

    expect(find.text('Arquivado'), findsOneWidget);
  });

  group('EstadoVazio', () {
    testWidgets('título, explicação e ação com alvo de 48 dp', (tester) async {
      var tocou = false;
      final semantica = tester.ensureSemantics();

      await tester.pumpWidget(
        _app(
          EstadoVazio(
            icone: Icons.inbox_outlined,
            titulo: 'Nenhum aviso por enquanto',
            texto: 'Você verá aqui os avisos.',
            acao: 'Ver turmas disponíveis',
            onAcao: () => tocou = true,
          ),
        ),
      );
      await tester.tap(find.text('Ver turmas disponíveis'));

      expect(tocou, isTrue);
      expect(find.text('Nenhum aviso por enquanto'), findsOneWidget);
      await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
      await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
      semantica.dispose();
    });

    testWidgets('sem ação não mostra botão', (tester) async {
      await tester.pumpWidget(
        _app(const EstadoVazio(icone: Icons.inbox_outlined, titulo: 'Vazio', texto: 'Nada aqui.')),
      );

      expect(find.byType(OutlinedButton), findsNothing);
    });
  });

  testWidgets('EstadoErro mostra a mensagem e repete com alvo de 48 dp', (tester) async {
    var repetiu = 0;
    final semantica = tester.ensureSemantics();

    await tester.pumpWidget(
      _app(
        EstadoErro(
          mensagem: 'Sem conexão. Verifique a rede e tente de novo.',
          onRepetir: () => repetiu++,
        ),
      ),
    );
    await tester.tap(find.text('Tentar de novo'));

    expect(repetiu, 1);
    expect(find.text('Sem conexão. Verifique a rede e tente de novo.'), findsOneWidget);
    await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
    await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
    semantica.dispose();
  });

  testWidgets('EsqueletoLista é anunciado como carregando', (tester) async {
    final semantica = tester.ensureSemantics();

    await tester.pumpWidget(_app(const EsqueletoLista()));

    expect(find.bySemanticsLabel('Carregando'), findsOneWidget);
    semantica.dispose();
  });

  testWidgets('FaixaCache mostra a data dos dados e oferece tentar de novo', (tester) async {
    var repetiu = false;
    final coleta = DateTime(2026, 10, 25, 14, 30).toUtc();

    await tester.pumpWidget(_app(FaixaCache(coletadoEm: coleta, onRepetir: () => repetiu = true)));
    await tester.tap(find.text('Tentar de novo'));

    expect(find.textContaining('Mostrando dados de 25/10 às 14:30. Sem conexão.'), findsOneWidget);
    expect(repetiu, isTrue);
    await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
  });

  testWidgets('FaixaInformativa renderiza o texto', (tester) async {
    await tester.pumpWidget(_app(const FaixaInformativa('Avisos arquivados ficam aqui.')));

    expect(find.text('Avisos arquivados ficam aqui.'), findsOneWidget);
  });
}
