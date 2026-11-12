import 'package:flutter/material.dart';

import '../services/preferencia_tema.dart';

/// Spec 002 (FR-004): sem escolha, o app segue o tema do sistema; o botão grava o oposto do tema
/// que está na tela, e a escolha passa a valer sobre o sistema.
class TemaController extends ChangeNotifier {
  TemaController(this._preferencia) : _escolha = _preferencia.ler();

  final PreferenciaTema _preferencia;
  EscolhaTema? _escolha;

  ThemeMode get modo => switch (_escolha) {
    null => ThemeMode.system,
    EscolhaTema.claro => ThemeMode.light,
    EscolhaTema.escuro => ThemeMode.dark,
  };

  Future<void> alternar(Brightness naTela) {
    final nova = naTela == Brightness.dark ? EscolhaTema.claro : EscolhaTema.escuro;
    _escolha = nova;
    notifyListeners();
    return _preferencia.gravar(nova);
  }
}
