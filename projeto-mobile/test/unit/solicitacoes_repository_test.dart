import 'package:conecta/repositories/solicitacoes_repository.dart';
import 'package:conecta/services/api_failure.dart';
import 'package:flutter_test/flutter_test.dart';

import '../apoio.dart';

String _erro(String code) => '{"detail": "texto da API", "code": "$code"}';

Matcher _falha(String code, String mensagem, EfeitoFalha efeito) => throwsA(
  isA<ApiFailure>()
      .having((f) => f.code, 'code', code)
      .having((f) => f.mensagem, 'mensagem', mensagem)
      .having((f) => f.efeito, 'efeito', efeito),
);

void main() {
  late ApiFalsa api;
  late SolicitacoesRepository repo;

  setUp(() {
    api = ApiFalsa();
    api.api.token = 'tok';
    repo = SolicitacoesRepository(api.api);
  });

  group('criar (contrato §7)', () {
    test('201: devolve a solicitação pendente criada', () async {
      api.responder(
        'POST /turmas/turma-1/solicitacoes',
        '{"id": "sol-9", "turma_id": "turma-1", "status": "pendente",'
            ' "solicitada_em": "2026-10-28T12:00:00Z"}',
        201,
      );

      final criada = await repo.criar('turma-1');

      expect(criada, 'sol-9');
      expect(api.pedidos.single.method, 'POST');
      expect(api.pedidos.single.headers['authorization'], 'Bearer tok');
    });

    test('404 TURMA_INDISPONIVEL: recarrega as disponíveis', () async {
      api.responder('POST /turmas/turma-1/solicitacoes', _erro('TURMA_INDISPONIVEL'), 404);

      await expectLater(
        repo.criar('turma-1'),
        _falha(
          'TURMA_INDISPONIVEL',
          'Esta turma não está mais aceitando inscrições.',
          EfeitoFalha.recarrega,
        ),
      );
    });

    test('409 JA_VINCULADO: recarrega as disponíveis', () async {
      api.responder('POST /turmas/turma-1/solicitacoes', _erro('JA_VINCULADO'), 409);

      await expectLater(
        repo.criar('turma-1'),
        _falha('JA_VINCULADO', 'Você já faz parte desta turma.', EfeitoFalha.recarrega),
      );
    });

    test('409 SOLICITACAO_DUPLICADA: abre as solicitações', () async {
      api.responder('POST /turmas/turma-1/solicitacoes', _erro('SOLICITACAO_DUPLICADA'), 409);

      await expectLater(
        repo.criar('turma-1'),
        _falha(
          'SOLICITACAO_DUPLICADA',
          'Você já tem uma solicitação pendente para esta turma.',
          EfeitoFalha.abreSolicitacoes,
        ),
      );
    });

    test('sem rede: oferece repetir', () async {
      api.falharRede('POST /turmas/turma-1/solicitacoes');

      await expectLater(
        repo.criar('turma-1'),
        throwsA(isA<ApiFailure>().having((f) => f.efeito, 'efeito', EfeitoFalha.repetir)),
      );
    });

    test('o id da turma vai codificado no caminho', () async {
      api.responder('POST /turmas/a%2Fb/solicitacoes', '{"id": "s"}', 201);

      await repo.criar('a/b');

      expect(api.pedidos.single.url.path, '/turmas/a%2Fb/solicitacoes');
    });
  });

  group('cancelar (contrato §9)', () {
    test('204: sem corpo, sem erro', () async {
      api.rotas['DELETE /solicitacoes/sol-9'] = (_) => respostaJson('', 204);

      await repo.cancelar('sol-9');

      expect(api.pedidos.single.method, 'DELETE');
    });

    test('409 SOLICITACAO_NAO_PENDENTE: recarrega', () async {
      api.responder('DELETE /solicitacoes/sol-9', _erro('SOLICITACAO_NAO_PENDENTE'), 409);

      await expectLater(
        repo.cancelar('sol-9'),
        _falha(
          'SOLICITACAO_NAO_PENDENTE',
          'Esta solicitação já foi decidida.',
          EfeitoFalha.recarrega,
        ),
      );
    });

    test('404 SOLICITACAO_NAO_ENCONTRADA: recarrega', () async {
      api.responder('DELETE /solicitacoes/sol-9', _erro('SOLICITACAO_NAO_ENCONTRADA'), 404);

      await expectLater(
        repo.cancelar('sol-9'),
        _falha(
          'SOLICITACAO_NAO_ENCONTRADA',
          'Esta solicitação não existe mais.',
          EfeitoFalha.recarrega,
        ),
      );
    });
  });
}
