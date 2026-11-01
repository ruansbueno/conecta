import 'package:conecta/models/aula.dart';
import 'package:flutter_test/flutter_test.dart';

import '../fixtures/fabrica.dart';

void main() {
  group('Aula.fromJson (contracts E3 §3)', () {
    test('converte os campos; as horas ficam como texto, sem conversão de fuso', () {
      final a = Aula.fromJson(aulaMapa('h1', diaSemana: 3, inicio: '21:00', fim: '22:40'));
      expect(a.id, 'h1');
      expect(a.turmaId, 'turma-SI-3A');
      expect(a.diaSemana, 3);
      expect(a.inicio, '21:00');
      expect(a.fim, '22:40');
      expect(a.disciplina, 'Banco de Dados II');
      expect(a.local, 'Lab 4');
      expect(a.docenteNome, 'Helena Prado');
    });

    test('local e docente podem vir nulos', () {
      final a = Aula.fromJson(aulaMapa('h2', local: null, docente: null));
      expect(a.local, isNull);
      expect(a.docenteNome, isNull);
    });
  });
}
