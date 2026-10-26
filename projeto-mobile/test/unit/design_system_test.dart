// Princípio V / RM-33: cores só existem em lib/theme/. Nenhuma tela usa literal de cor.
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

final _literalDeCor = RegExp(r'\bColor\(\s*0x|\bColors\.(?!transparent\b)');

void main() {
  test('nenhum literal de cor fora de lib/theme/', () {
    final violacoes = <String>[];
    final arquivos = Directory('lib')
        .listSync(recursive: true)
        .whereType<File>()
        .where((f) => f.path.endsWith('.dart'))
        .where((f) => !f.path.startsWith('lib${Platform.pathSeparator}theme'));
    for (final arquivo in arquivos) {
      final linhas = arquivo.readAsLinesSync();
      for (var i = 0; i < linhas.length; i++) {
        if (_literalDeCor.hasMatch(linhas[i])) {
          violacoes.add('${arquivo.path}:${i + 1}: ${linhas[i].trim()}');
        }
      }
    }

    expect(violacoes, isEmpty, reason: 'Use as constantes de lib/theme/cores.dart');
  });
}
