import 'package:conecta/models/solicitacao.dart';
import 'package:conecta/repositories/solicitacoes_repository.dart';
import 'package:conecta/repositories/turmas_repository.dart';
import 'package:conecta/services/api_failure.dart';
import 'package:conecta/state/avisos_controller.dart' show EstadoLista;
import 'package:conecta/state/turmas_controller.dart';
import 'package:flutter_test/flutter_test.dart';

import '../apoio.dart';
import '../fixtures/fabrica.dart';

const _semPermissaoJson = '{"detail": "Sem permissão", "code": "SEM_PERMISSAO"}';

void main() {
  late ApiFalsa api;
  late TurmasRepository turmas;
  late SolicitacoesRepository solicitacoes;

  setUp(() async {
    api = ApiFalsa();
    final (cache, _) = await armazenamentosVazios();
    api.api.token = 'tok';
    turmas = TurmasRepository(api.api, cache);
    solicitacoes = SolicitacoesRepository(api.api);
  });

  MinhasTurmasController minhas({bool aluno = true}) =>
      MinhasTurmasController(turmas, solicitacoes, usuarioId: 'u1', aluno: aluno);

  void turmasPaginadas(int total) => api.rotas['GET /turmas/minhas'] = (r) {
    final offset = int.parse(r.url.queryParameters['offset']!);
    final fim = (offset + 20).clamp(0, total);
    return respostaJson(
      paginaJson([for (var i = offset; i < fim; i++) turmaMapa('T-$i', papel: 'aluno')], total: total, offset: offset),
    );
  };

  group('MinhasTurmasController (RM-18)', () {
    test('aluno: carrega as turmas e as três solicitações mais recentes', () async {
      api.responder('GET /turmas/minhas', paginaJson([turmaMapa('TADS-3A-2026-2', papel: 'aluno')]));
      api.responder(
        'GET /solicitacoes/minhas',
        paginaJson([solicitacaoMapa('s1'), solicitacaoMapa('s2', status: 'recusada')], limit: 3),
      );
      final c = minhas();

      await c.carregar();

      expect(c.turmas.estado, EstadoLista.conteudo);
      expect(c.turmas.itens.single.codigo, 'TADS-3A-2026-2');
      expect(c.recentes!.map((s) => s.status), [StatusSolicitacao.pendente, StatusSolicitacao.recusada]);
      final pedido = api.pedidos.firstWhere((p) => p.url.path == '/solicitacoes/minhas');
      expect(pedido.url.queryParameters['limit'], '3');
    });

    test('quem não é aluno não pede solicitações; lista vazia é estado vazio', () async {
      api.responder('GET /turmas/minhas', paginaJson([]));
      final c = minhas(aluno: false);

      await c.carregar();

      expect(c.turmas.estado, EstadoLista.vazio);
      expect(c.recentes, isNull);
      expect(api.pedidos.map((p) => p.url.path), ['/turmas/minhas']);
    });

    test('SEM_PERMISSAO ou falha nas solicitações esconde só o rodapé', () async {
      api.responder('GET /turmas/minhas', paginaJson([turmaMapa('A', papel: 'aluno')]));
      api.responder('GET /solicitacoes/minhas', _semPermissaoJson, 403);
      final c = minhas();

      await c.carregar();

      expect(c.turmas.estado, EstadoLista.conteudo);
      expect(c.recentes, isNull);
    });

    test('sem rede, mostra as turmas guardadas com a data da coleta', () async {
      api.responder('GET /turmas/minhas', paginaJson([turmaMapa('A', papel: 'aluno')]));
      api.responder('GET /solicitacoes/minhas', paginaJson([]));
      await minhas().carregar();
      api.falharRede('GET /turmas/minhas');
      final c = minhas();

      await c.carregar();

      expect(c.turmas.estado, EstadoLista.conteudo);
      expect(c.turmas.itens.single.codigo, 'A');
      expect(c.turmas.dadosDe, isNotNull);
      expect(c.turmas.temMais, isFalse);
    });

    test('sem rede e sem cache, estado de erro com a mensagem de conexão', () async {
      api.falharRede('GET /turmas/minhas');
      final c = minhas(aluno: false);

      await c.carregar();

      expect(c.turmas.estado, EstadoLista.erro);
      expect(c.turmas.falha!.code, ApiFailure.semRede);
    });

    test('carregar mais traz a página seguinte até o total', () async {
      turmasPaginadas(25);
      final c = minhas(aluno: false);
      await c.carregar();
      expect(c.turmas.temMais, isTrue);

      await c.carregarMais();

      expect(c.turmas.itens, hasLength(25));
      expect(c.turmas.temMais, isFalse);
    });

    test('recarregar com falha mantém a lista e guarda a falha para um aviso breve', () async {
      api.responder('GET /turmas/minhas', paginaJson([turmaMapa('A', papel: 'aluno')]));
      final c = minhas(aluno: false);
      await c.carregar();
      api.falharRede('GET /turmas/minhas');

      await c.recarregar();

      expect(c.turmas.itens.single.codigo, 'A');
      expect(c.ultimaFalha!.code, ApiFailure.semRede);
    });

    test('recarregar também atualiza as solicitações recentes (recarga cruzada, RM-19)', () async {
      api.responder('GET /turmas/minhas', paginaJson([]));
      api.responder('GET /solicitacoes/minhas', paginaJson([]));
      final c = minhas();
      await c.carregar();
      expect(c.recentes, isEmpty);
      api.responder('GET /solicitacoes/minhas', paginaJson([solicitacaoMapa('nova')]));

      await c.recarregar();

      expect(c.recentes!.single.id, 'nova');
    });
  });

  group('DisponiveisController (RM-19, RM-20)', () {
    test('carrega as turmas abertas', () async {
      api.responder('GET /turmas/disponiveis', paginaJson([turmaMapa('TADS-5A-2026-2')]));
      final c = DisponiveisController(turmas);

      await c.carregar();

      expect(c.lista.estado, EstadoLista.conteudo);
      expect(c.lista.itens.single.codigo, 'TADS-5A-2026-2');
    });

    test('403 SEM_PERMISSAO marca semPermissao com a mensagem de perfil', () async {
      api.responder('GET /turmas/disponiveis', _semPermissaoJson, 403);
      final c = DisponiveisController(turmas);

      await c.carregar();

      expect(c.semPermissao, isTrue);
      expect(c.lista.falha!.mensagem, 'Esta ação não está disponível para o seu perfil.');
    });

    test('sem rede não há cache: estado de erro', () async {
      api.falharRede('GET /turmas/disponiveis');
      final c = DisponiveisController(turmas);

      await c.carregar();

      expect(c.lista.estado, EstadoLista.erro);
      expect(c.semPermissao, isFalse);
    });
  });
}
