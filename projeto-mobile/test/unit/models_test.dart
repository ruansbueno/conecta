import 'dart:convert';

import 'package:conecta/models/aviso.dart';
import 'package:conecta/models/destino.dart';
import 'package:conecta/models/pagina.dart';
import 'package:conecta/models/sessao.dart';
import 'package:conecta/models/solicitacao.dart';
import 'package:conecta/models/turma.dart';
import 'package:conecta/models/usuario.dart';
import 'package:flutter_test/flutter_test.dart';

import '../fixtures/fixtures.dart';

Map<String, dynamic> _json(String s) => jsonDecode(s) as Map<String, dynamic>;

void main() {
  group('Sessao', () {
    test('vem da resposta de login, sem senha', () {
      final agora = DateTime.utc(2026, 10, 25, 12);

      final sessao = Sessao.fromLogin(_json(loginJson), agora: agora);

      expect(sessao.accessToken, 'eyJhbGciOiJIUzI1NiJ9.token-de-teste.assinatura');
      expect(sessao.expiraEm, DateTime.utc(2026, 10, 26, 12));
      expect(sessao.usuario.username, 'aluno.teste');
      expect(sessao.usuario.perfil, Perfil.aluno);
      expect(sessao.usuario.turmas, isNull); // o login não traz turmas; o app não inventa
    });
  });

  group('Usuario', () {
    test('de GET /me, com turmas vinculadas e papel', () {
      final usuario = Usuario.fromJson(_json(meJson));

      expect(usuario.id, '7b1c0e3a-6f64-4f43-8a58-2f3d5f0c1a11');
      expect(usuario.nome, 'Aluno de Teste');
      expect(usuario.turmas, [
        const TurmaVinculada(
          id: 'c3f0a1b2-0000-4000-8000-000000000001',
          codigo: 'TADS-3A-2026-2',
          nome: 'TADS 3º Sem A',
          papel: Papel.aluno,
        ),
      ]);
    });

    test('perfil fora do conjunto conhecido vira desconhecido e guarda o valor cru', () {
      final json = _json(meJson)..['perfil'] = 'monitor';

      final usuario = Usuario.fromJson(json);

      expect(usuario.perfil, Perfil.desconhecido);
      expect(usuario.perfilBruto, 'monitor');
    });

    test('igualdade por valor', () {
      expect(Usuario.fromJson(_json(meJson)), Usuario.fromJson(_json(meJson)));
    });

    test('podeSolicitarInscricao só para aluno', () {
      final aluno = Usuario.fromJson(_json(meJson));
      final docente = Usuario.fromJson(_json(meJson)..['perfil'] = 'docente');

      expect(aluno.podeSolicitarInscricao, isTrue);
      expect(docente.podeSolicitarInscricao, isFalse);
    });

    test('iniciais: primeira letra do primeiro e do último nome, sem partículas', () {
      expect(iniciaisDe('Ricardo Lemos'), 'RL');
      expect(iniciaisDe('Aluno de Teste'), 'AT');
      expect(iniciaisDe('Coordenação do curso'), 'CC');
      expect(iniciaisDe('Helena'), 'HE');
      expect(iniciaisDe('  maria   da   silva  '), 'MS');
      expect(iniciaisDe(''), '?');
    });
  });

  group('Aviso', () {
    late Pagina<Aviso> pagina;

    setUp(() {
      pagina = Pagina.fromJson(_json(avisosP1Json), Aviso.fromJson);
    });

    test('campos do contrato, com autor e datas em UTC', () {
      final aviso = pagina.items.first;

      expect(aviso.id, 'e5d20000-0000-4000-8000-000000000001');
      expect(aviso.titulo, 'Reunião de pais e alunos');
      expect(aviso.autorId, '11aa0000-0000-4000-8000-000000000001');
      expect(aviso.autorNome, 'Maria Coordenadora');
      expect(aviso.publicadoEm, DateTime.utc(2026, 10, 1, 12));
      expect(aviso.publicadoEm.isUtc, isTrue);
      expect(aviso.editadoEm, isNull);
      expect(aviso.foiEditado, isFalse);
      expect(aviso.situacao, SituacaoAviso.ativo);
    });

    test('data com microssegundos e aviso editado', () {
      final aviso = pagina.items[1];

      expect(aviso.publicadoEm, DateTime.utc(2026, 9, 29, 12, 12, 0, 123, 456));
      expect(aviso.editadoEm, DateTime.utc(2026, 9, 29, 17, 5));
      expect(aviso.foiEditado, isTrue);
    });

    test('todos os destinos, na ordem recebida', () {
      expect(pagina.items[1].destinos.map((d) => d.tipo), [
        TipoDestino.todos,
        TipoDestino.semestre,
        TipoDestino.docentes,
      ]);
      expect(pagina.items.first.destinos.first.turmaNome, 'TADS 3º Sem A');
    });

    test('trecho corta em limite de palavra, com reticências', () {
      final longo = List.filled(60, 'palavra').join(' ');
      final json = _json(avisosP1Json)['items'][0] as Map<String, dynamic>;

      final aviso = Aviso.fromJson({...json, 'conteudo': longo});

      expect(aviso.trecho.length, lessThanOrEqualTo(161));
      expect(aviso.trecho, endsWith('…'));
      expect(aviso.trecho, isNot(contains('palavr…')));
      expect(pagina.items.first.trecho, 'Será realizada na sexta, às 19h, no auditório.');
    });
  });

  group('Destino', () {
    Destino destino(Map<String, dynamic> json) => Destino.fromJson(json);

    test('rótulos por tipo', () {
      expect(destino({'tipo': 'todos', 'turma': null, 'semestre': null}).rotulo, 'Todos');
      expect(destino({'tipo': 'docentes', 'turma': null, 'semestre': null}).rotulo, 'Docentes');
      expect(destino({'tipo': 'semestre', 'turma': null, 'semestre': 3}).rotulo, '3º semestre');
      expect(
        destino({
          'tipo': 'turma',
          'turma': {'id': 'c3f0a1b2-0000', 'nome': 'TADS 3º Sem A'},
          'semestre': null,
        }).rotulo,
        'TADS 3º Sem A',
      );
    });

    test('turma sem nome usa o id curto', () {
      final d = destino({
        'tipo': 'turma',
        'turma': {'id': 'c3f0a1b2-0000-4000-8000-000000000001'},
        'semestre': null,
      });

      expect(d.rotulo, 'c3f0a1b2');
    });

    test('tipo novo da API vira desconhecido com o rótulo cru, sem quebrar', () {
      final d = destino({'tipo': 'curso', 'turma': null, 'semestre': null});

      expect(d.tipo, TipoDestino.desconhecido);
      expect(d.rotulo, 'curso');
    });
  });

  group('Pagina', () {
    test('temMais segue offset + itens < total', () {
      Pagina<int> p(int total, int offset, int n) =>
          Pagina(items: List.filled(n, 0), total: total, limit: 20, offset: offset);

      expect(p(42, 0, 20).temMais, isTrue);
      expect(p(42, 40, 2).temMais, isFalse);
      expect(Pagina.fromJson(_json(avisosVazioJson), Aviso.fromJson).temMais, isFalse);
    });
  });

  group('Turma e Solicitacao', () {
    test('turma de /turmas/disponiveis, sem papel', () {
      final turma = Turma.fromJson({
        'id': 'c3f0',
        'codigo': 'TADS-3B-2026-2',
        'nome': 'TADS 3º Sem B',
        'semestre_curso': 3,
        'periodo_letivo': '2026/2',
      });

      expect(turma.semestreCurso, 3);
      expect(turma.periodoLetivo, '2026/2');
    });

    test('solicitação recusada com motivo; status desconhecido não quebra', () {
      final json = {
        'id': '9a41',
        'turma': {'id': 'c3f0', 'codigo': 'TADS-3B-2026-2', 'nome': 'TADS 3º Sem B'},
        'status': 'recusada',
        'solicitada_em': '2026-10-01T13:00:00Z',
        'decidida_em': '2026-10-02T09:10:00Z',
        'motivo_recusa': 'Turma completa',
      };

      final s = Solicitacao.fromJson(json);
      final estranha = Solicitacao.fromJson({...json, 'status': 'em_analise'});

      expect(s.status, StatusSolicitacao.recusada);
      expect(s.motivoRecusa, 'Turma completa');
      expect(s.podeCancelar, isFalse);
      expect(estranha.status, StatusSolicitacao.desconhecido);
    });
  });
}
