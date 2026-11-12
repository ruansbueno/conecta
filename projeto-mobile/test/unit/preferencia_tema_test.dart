// Spec 002 (FR-003): a escolha do tema fica nas preferências do aparelho, na chave conecta:tema.
import 'package:conecta/services/preferencia_tema.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  Future<(PreferenciaTema, SharedPreferences)> com(Map<String, Object> valores) async {
    SharedPreferences.setMockInitialValues(valores);
    final prefs = await SharedPreferences.getInstance();
    return (PreferenciaTema(prefs), prefs);
  }

  test('sem escolha: null', () async {
    final (p, _) = await com({});
    expect(p.ler(), isNull);
  });

  test('lê claro e escuro', () async {
    expect((await com({'conecta:tema': 'claro'})).$1.ler(), EscolhaTema.claro);
    expect((await com({'conecta:tema': 'escuro'})).$1.ler(), EscolhaTema.escuro);
  });

  test('valor desconhecido ou de outro tipo conta como sem escolha', () async {
    expect((await com({'conecta:tema': 'roxo'})).$1.ler(), isNull);
    expect((await com({'conecta:tema': true})).$1.ler(), isNull);
  });

  test('grava só a chave do tema', () async {
    final (p, prefs) = await com({});
    await p.gravar(EscolhaTema.escuro);
    expect(prefs.getString(PreferenciaTema.chave), 'escuro');
    expect(PreferenciaTema.chave, 'conecta:tema');
    expect(prefs.getKeys(), {'conecta:tema'});
  });
}
