// T059: as mensagens de erro do app são as da tabela "Mensagens por código" (spec §6), nos dois
// sentidos — cada linha da tabela tem a mesma mensagem no app, e cada code do app está na tabela.
import 'dart:io';

import 'package:conecta/services/api_failure.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final spec = File('specs/001-app-conecta/spec.md').readAsStringSync();
  final inicio = spec.indexOf('### Mensagens por código');
  final tabela = spec.substring(inicio, spec.indexOf('\n## ', inicio));
  final linhas = RegExp(r'^\| ([^|]+) \| ([^|]+) \| [^|]+ \|$', multiLine: true)
      .allMatches(tabela)
      .map((m) => (m.group(1)!.trim(), m.group(2)!.trim()))
      .where((l) => l.$1 != 'code' && !l.$1.startsWith('---'))
      .toList();
  final porCode = {
    for (final (chave, mensagem) in linhas)
      if (RegExp(r'^`([A-Z_]+)`$').firstMatch(chave) case final m?) m.group(1)!: mensagem,
  };

  test('nenhuma linha da tabela fica de fora da leitura (formato inesperado)', () {
    final corpo = tabela.split('\n').where((l) => l.startsWith('|')).skip(2); // cabeçalho e ---
    expect(linhas, hasLength(corpo.length));
  });

  test('a tabela foi encontrada e tem os codes do contrato', () {
    expect(porCode.keys, containsAll(['NAO_AUTENTICADO', 'SOLICITACAO_DUPLICADA']));
  });

  test('cada code da tabela tem no app exatamente a mensagem da spec', () {
    for (final MapEntry(key: code, value: mensagem) in porCode.entries) {
      expect(ApiFailure(code: code, status: 400).mensagem, mensagem, reason: code);
    }
  });

  test('sem rede e code desconhecido usam as mensagens da tabela', () {
    final semRede = linhas.firstWhere((l) => l.$1 == 'sem rede').$2;
    final generica = linhas.firstWhere((l) => l.$1.startsWith('5xx')).$2;

    expect(const ApiFailure(code: ApiFailure.semRede).mensagem, semRede);
    expect(const ApiFailure(code: ApiFailure.timeout).mensagem, semRede);
    expect(const ApiFailure(code: 'CODE_QUE_NAO_EXISTE', status: 409).mensagem, generica);
    expect(const ApiFailure(code: 'NAO_AUTENTICADO', status: 503).mensagem, generica);
  });

  test('todo code que o app trata está na tabela da spec', () {
    final semRede = {ApiFailure.semRede, ApiFailure.timeout};
    expect(
      ApiFailure.codesConhecidos.where((c) => !semRede.contains(c)),
      everyElement(isIn(porCode.keys)),
    );
  });
}
