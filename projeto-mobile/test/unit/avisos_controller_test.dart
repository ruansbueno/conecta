import 'dart:async';

import 'package:conecta/models/aviso.dart';
import 'package:conecta/repositories/avisos_repository.dart';
import 'package:conecta/state/avisos_controller.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import '../apoio.dart';
import '../fixtures/fabrica.dart';
import '../fixtures/fixtures.dart';

void main() {
  late ApiFalsa api;
  late AvisosRepository repo;
  late AvisosController controller;

  setUp(() async {
    api = ApiFalsa();
    final (cache, _) = await armazenamentosVazios();
    api.api.token = 'tok';
    repo = AvisosRepository(api.api, cache);
    controller = AvisosController(repo, usuarioId: 'u1');
  });

  void paginado(int total, {String situacao = 'ativo'}) =>
      api.rotas['GET /avisos'] = (r) => respostaJson(
        paginaAvisosJson(
          total: total,
          offset: int.parse(r.url.queryParameters['offset']!),
          situacao: r.url.queryParameters['situacao']!,
        ),
      );

  test('carrega a primeira página: conteúdo, total e temMais', () async {
    paginado(45);

    await controller.carregar();

    expect(controller.lista.estado, EstadoLista.conteudo);
    expect(controller.lista.itens, hasLength(20));
    expect(controller.lista.temMais, isTrue);
  });

  test('lista vazia é o estado vazio, não erro', () async {
    api.responder('GET /avisos', avisosVazioJson);

    await controller.carregar();

    expect(controller.lista.estado, EstadoLista.vazio);
  });

  test('carregar mais concatena até esgotar o total', () async {
    paginado(45);
    await controller.carregar();

    await controller.carregarMais();
    await controller.carregarMais();
    await controller.carregarMais(); // já no fim: não chama a API

    expect(controller.lista.itens, hasLength(45));
    expect(controller.lista.temMais, isFalse);
    expect(api.pedidos.map((p) => p.url.queryParameters['offset']), ['0', '20', '40']);
  });

  test('chamadas simultâneas de carregar mais pedem a página uma vez só', () async {
    paginado(45);
    await controller.carregar();

    await Future.wait([controller.carregarMais(), controller.carregarMais()]);

    expect(api.pedidos.where((p) => p.url.queryParameters['offset'] == '20'), hasLength(1));
  });

  test('falha ao carregar mais mantém os itens e marca o erro do rodapé', () async {
    paginado(45);
    await controller.carregar();
    api.falharRede('GET /avisos');

    await controller.carregarMais();

    expect(controller.lista.itens, hasLength(20));
    expect(controller.lista.falhaAoCarregarMais, isNotNull);
  });

  test('sem rede e sem cache: estado de erro com a falha', () async {
    api.falharRede('GET /avisos');

    await controller.carregar();

    expect(controller.lista.estado, EstadoLista.erro);
    expect(controller.lista.falha!.mensagem, 'Sem conexão. Verifique a rede e tente de novo.');
  });

  test('sem rede com cache: conteúdo guardado e a data dos dados (RM-29)', () async {
    api.responder('GET /avisos', avisosP1Json);
    await controller.carregar();
    api.falharRede('GET /avisos');
    final outro = AvisosController(repo, usuarioId: 'u1');

    await outro.carregar();

    expect(outro.lista.estado, EstadoLista.conteudo);
    expect(outro.lista.itens, hasLength(2));
    expect(outro.lista.dadosDe, isNotNull);
  });

  test('recarregar substitui a lista e limpa a faixa de cache', () async {
    api.responder('GET /avisos', avisosP1Json);
    await controller.carregar();
    api.responder('GET /avisos', avisosVazioJson);

    await controller.recarregar();

    expect(controller.lista.estado, EstadoLista.vazio);
    expect(controller.lista.dadosDe, isNull);
  });

  test('recarregar sem rede mantém o que já estava na tela', () async {
    api.responder('GET /avisos', avisosP1Json);
    await controller.carregar();
    api.falharRede('GET /avisos');

    await controller.recarregar();

    expect(controller.lista.itens, hasLength(2));
    expect(controller.ultimaFalha!.mensagem, contains('Sem conexão'));
  });

  test('ativos e arquivados são listas independentes', () async {
    paginado(3);
    await controller.carregar();

    await controller.alternar(SituacaoAviso.arquivado);

    expect(controller.situacao, SituacaoAviso.arquivado);
    expect(controller.lista.itens.first.situacao, SituacaoAviso.arquivado);
    await controller.alternar(SituacaoAviso.ativo);
    expect(controller.lista.itens.first.situacao, SituacaoAviso.ativo);
    expect(api.pedidos, hasLength(2)); // voltar para ativos não recarrega
  });

  test('falha ao carregar mais não repete sozinha a cada rolagem; só pelo botão', () async {
    paginado(45);
    await controller.carregar();
    api.falharRede('GET /avisos');
    await controller.carregarMais();
    final pedidos = api.pedidos.length;

    await controller.carregarMais(); // rolagem de novo
    await controller.carregarMais();
    expect(api.pedidos.length, pedidos);

    paginado(45);
    await controller.carregarMais(repetir: true); // botão "Tentar de novo"
    expect(controller.lista.itens, hasLength(40));
  });

  test('recarregar durante "carregar mais": a página tardia é descartada', () async {
    paginado(45);
    await controller.carregar();
    await controller.carregarMais(); // 40 itens
    final pagina3 = Completer<http.Response>();
    api.rotasAssincronas['GET /avisos'] = (r) => r.url.queryParameters['offset'] == '40'
        ? pagina3.future
        : Future.value(respostaJson(paginaAvisosJson(total: 45)));

    final mais = controller.carregarMais();
    await controller.recarregar(); // volta a 20 itens
    pagina3.complete(respostaJson(paginaAvisosJson(total: 45, offset: 40)));
    await mais;

    expect(controller.lista.itens.map((a) => a.titulo).toList(), [
      for (var i = 1; i <= 20; i++) 'Aviso número $i',
    ]);
  });

  test('resposta que chega depois do descarte não quebra', () async {
    final resposta = Completer<http.Response>();
    api.rotasAssincronas['GET /avisos'] = (_) => resposta.future;
    final carga = controller.carregar();

    controller.dispose();
    resposta.complete(respostaJson(avisosP1Json));

    await expectLater(carga, completes);
  });
}
