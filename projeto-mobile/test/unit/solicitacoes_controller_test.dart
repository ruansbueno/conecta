import 'dart:async';

import 'package:conecta/models/solicitacao.dart';
import 'package:conecta/models/turma.dart';
import 'package:conecta/repositories/solicitacoes_repository.dart';
import 'package:conecta/repositories/turmas_repository.dart';
import 'package:conecta/services/api_failure.dart';
import 'package:conecta/state/avisos_controller.dart' show EstadoLista;
import 'package:conecta/state/solicitacoes_controller.dart';
import 'package:conecta/state/turmas_controller.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import '../apoio.dart';
import '../fixtures/fabrica.dart';

String _erro(String code) => '{"detail": "texto", "code": "$code"}';

void main() {
  late ApiFalsa api;
  late TurmasRepository turmas;
  late SolicitacoesRepository solicitacoes;
  late MudancasDeSolicitacao mudancas;
  late int avisos;

  setUp(() async {
    api = ApiFalsa();
    final (cache, _) = await armazenamentosVazios();
    api.api.token = 'tok';
    turmas = TurmasRepository(api.api, cache);
    solicitacoes = SolicitacoesRepository(api.api);
    mudancas = MudancasDeSolicitacao();
    avisos = 0;
    mudancas.addListener(() => avisos++);
  });

  group('SolicitacoesController (RM-21, RM-22)', () {
    SolicitacoesController controller() => SolicitacoesController(solicitacoes, mudancas);

    test('lista as solicitações com limit 20, todos os status', () async {
      api.responder(
        'GET /solicitacoes/minhas',
        paginaJson([
          solicitacaoMapa('s1'),
          solicitacaoMapa('s2', status: 'aprovada', decididaEm: '2026-09-03T12:00:00Z'),
        ]),
      );
      final c = controller();

      await c.carregar();

      expect(api.pedidos.single.url.queryParameters, {'limit': '20', 'offset': '0'});
      expect(c.lista.itens.map((s) => s.status), [
        StatusSolicitacao.pendente,
        StatusSolicitacao.aprovada,
      ]);
    });

    test('cancelar: DELETE, recarrega a lista e avisa a mudança', () async {
      api.responder('GET /solicitacoes/minhas', paginaJson([solicitacaoMapa('s1')]));
      final c = controller();
      await c.carregar();
      api.rotas['DELETE /solicitacoes/s1'] = (_) => respostaJson('', 204);
      api.responder(
        'GET /solicitacoes/minhas',
        paginaJson([
          solicitacaoMapa('s1', status: 'cancelada', decididaEm: '2026-10-28T12:00:00Z'),
        ]),
      );

      final falha = await c.cancelar(c.lista.itens.single);

      expect(falha, isNull);
      expect(c.lista.itens.single.status, StatusSolicitacao.cancelada);
      expect(avisos, 1);
    });

    test('cancelar já decidida (409): devolve a falha, recarrega e avisa', () async {
      api.responder('GET /solicitacoes/minhas', paginaJson([solicitacaoMapa('s1')]));
      final c = controller();
      await c.carregar();
      api.responder('DELETE /solicitacoes/s1', _erro('SOLICITACAO_NAO_PENDENTE'), 409);
      api.responder(
        'GET /solicitacoes/minhas',
        paginaJson([solicitacaoMapa('s1', status: 'aprovada', decididaEm: '2026-10-28T12:00:00Z')]),
      );

      final falha = await c.cancelar(c.lista.itens.single);

      expect(falha!.mensagem, 'Esta solicitação já foi decidida.');
      expect(c.lista.itens.single.status, StatusSolicitacao.aprovada);
      expect(avisos, 1);
    });

    test('cancelar sem rede: nada muda, sem aviso', () async {
      api.responder('GET /solicitacoes/minhas', paginaJson([solicitacaoMapa('s1')]));
      final c = controller();
      await c.carregar();
      api.falharRede('DELETE /solicitacoes/s1');

      final falha = await c.cancelar(c.lista.itens.single);

      expect(falha!.efeito, EfeitoFalha.repetir);
      expect(c.lista.itens.single.status, StatusSolicitacao.pendente);
      expect(avisos, 0);
    });

    test('marca a solicitação em cancelamento enquanto a API responde', () async {
      api.responder('GET /solicitacoes/minhas', paginaJson([solicitacaoMapa('s1')]));
      final c = controller();
      await c.carregar();
      final resposta = Completer<http.Response>();
      api.rotasAssincronas['DELETE /solicitacoes/s1'] = (_) => resposta.future;

      final cancelando = c.cancelar(c.lista.itens.single);
      expect(c.cancelando('s1'), isTrue);
      resposta.complete(respostaJson('', 204));
      await cancelando;

      expect(c.cancelando('s1'), isFalse);
    });
  });

  group('DisponiveisController.solicitar (RM-19, RM-23)', () {
    DisponiveisController controller() => DisponiveisController(turmas, solicitacoes, mudancas);
    const turmaA = Turma(id: 'turma-A', codigo: 'A', nome: 'Turma A');

    Future<DisponiveisController> carregada() async {
      api.responder('GET /turmas/disponiveis', paginaJson([turmaMapa('A'), turmaMapa('B')]));
      final c = controller();
      await c.carregar();
      return c;
    }

    test('201: a turma sai da lista e a mudança é avisada', () async {
      final c = await carregada();
      api.responder('POST /turmas/turma-A/solicitacoes', '{"id": "s9"}', 201);

      final falha = await c.solicitar(c.lista.itens.first);

      expect(falha, isNull);
      expect(c.lista.itens.map((t) => t.codigo), ['B']);
      expect(c.lista.total, 1);
      expect(avisos, 1);
    });

    test('a última turma solicitada deixa a lista vazia', () async {
      api.responder('GET /turmas/disponiveis', paginaJson([turmaMapa('A')]));
      final c = controller();
      await c.carregar();
      api.responder('POST /turmas/turma-A/solicitacoes', '{"id": "s9"}', 201);

      await c.solicitar(turmaA);

      expect(c.lista.estado, EstadoLista.vazio);
    });

    test(
      'JA_VINCULADO ou TURMA_INDISPONIVEL: devolve a falha e recarrega as disponíveis',
      () async {
        final c = await carregada();
        api.responder('POST /turmas/turma-A/solicitacoes', _erro('TURMA_INDISPONIVEL'), 404);
        api.responder('GET /turmas/disponiveis', paginaJson([turmaMapa('B')]));

        final falha = await c.solicitar(c.lista.itens.first);

        expect(falha!.code, 'TURMA_INDISPONIVEL');
        expect(c.lista.itens.map((t) => t.codigo), ['B']);
        expect(avisos, 1, reason: 'a turma mudou na API: Minhas turmas também recarrega');
      },
    );

    test(
      'SOLICITACAO_DUPLICADA também avisa (há uma pendente que Minhas turmas não mostra)',
      () async {
        final c = await carregada();
        api.responder('POST /turmas/turma-A/solicitacoes', _erro('SOLICITACAO_DUPLICADA'), 409);

        await c.solicitar(c.lista.itens.first);

        expect(avisos, 1);
      },
    );

    test('sem rede: nada muda antes do 201 (RM-23)', () async {
      final c = await carregada();
      api.falharRede('POST /turmas/turma-A/solicitacoes');

      final falha = await c.solicitar(c.lista.itens.first);

      expect(falha!.efeito, EfeitoFalha.repetir);
      expect(c.lista.itens.map((t) => t.codigo), ['A', 'B']);
      expect(avisos, 0);
    });

    test('enviando: só a turma pedida fica ocupada, e um segundo toque não reenvia', () async {
      final c = await carregada();
      final resposta = Completer<http.Response>();
      api.rotasAssincronas['POST /turmas/turma-A/solicitacoes'] = (_) => resposta.future;

      final envio = c.solicitar(c.lista.itens.first);
      expect(c.enviando('turma-A'), isTrue);
      expect(c.enviando('turma-B'), isFalse);
      expect(await c.solicitar(c.lista.itens.first), isNull);
      resposta.complete(respostaJson('{"id": "s9"}', 201));
      await envio;

      expect(api.pedidos.where((p) => p.method == 'POST'), hasLength(1));
      expect(c.enviando('turma-A'), isFalse);
    });
  });

  test('Minhas turmas recarrega turmas e solicitações quando uma mudança é avisada', () async {
    api.responder('GET /turmas/minhas', paginaJson([]));
    api.responder('GET /solicitacoes/minhas', paginaJson([]));
    final c = MinhasTurmasController(
      turmas,
      solicitacoes,
      usuarioId: 'u1',
      aluno: true,
      mudancas: mudancas,
    );
    await c.carregar();
    api.responder('GET /solicitacoes/minhas', paginaJson([solicitacaoMapa('nova')]));

    mudancas.avisar();
    await pumpEventQueue();

    expect(c.recentes!.single.id, 'nova');
    c.dispose();
    mudancas.avisar(); // depois de descartado, não escuta mais
  });
}
