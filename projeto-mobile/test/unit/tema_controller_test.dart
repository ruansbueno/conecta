// Spec 002 (FR-004, D-AMN-5): sem escolha, o tema segue o sistema; o botão grava o oposto do que
// está na tela.
import 'package:conecta/services/preferencia_tema.dart';
import 'package:conecta/state/tema_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  Future<TemaController> com(Map<String, Object> valores) async {
    SharedPreferences.setMockInitialValues(valores);
    return TemaController(PreferenciaTema(await SharedPreferences.getInstance()));
  }

  test('sem escolha: segue o sistema', () async {
    expect((await com({})).modo, ThemeMode.system);
  });

  test('com escolha: o modo da escolha', () async {
    expect((await com({'conecta:tema': 'escuro'})).modo, ThemeMode.dark);
    expect((await com({'conecta:tema': 'claro'})).modo, ThemeMode.light);
  });

  test('alternar a partir do que está na tela: claro vira escuro e vice-versa, e grava', () async {
    final c = await com({});
    var avisos = 0;
    c.addListener(() => avisos++);

    await c.alternar(Brightness.light);
    expect(c.modo, ThemeMode.dark);
    expect((await SharedPreferences.getInstance()).getString('conecta:tema'), 'escuro');

    await c.alternar(Brightness.dark);
    expect(c.modo, ThemeMode.light);
    expect((await SharedPreferences.getInstance()).getString('conecta:tema'), 'claro');
    expect(avisos, 2);
  });

  test('sistema escuro sem escolha: o primeiro toque grava claro', () async {
    final c = await com({});
    await c.alternar(Brightness.dark);
    expect(c.modo, ThemeMode.light);
  });
}
