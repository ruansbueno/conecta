import 'package:shared_preferences/shared_preferences.dart';

enum EscolhaTema { claro, escuro }

/// Spec 002 (FR-003, D-AMN-5): a escolha do tema fica nas preferências do aparelho. Não é dado do
/// usuário nem cache (constituição 1.0.1, Princípio III): sair da conta não a apaga.
class PreferenciaTema {
  PreferenciaTema(this._prefs);

  static const chave = 'conecta:tema';

  final SharedPreferences _prefs;

  /// Sem escolha, valor desconhecido ou ilegível: null (vale o tema do sistema).
  EscolhaTema? ler() {
    try {
      return switch (_prefs.getString(chave)) {
        'claro' => EscolhaTema.claro,
        'escuro' => EscolhaTema.escuro,
        _ => null,
      };
    } on Object {
      return null; // valor de outro tipo na chave
    }
  }

  /// Falha ao gravar não chega à tela: o tema muda nesta sessão mesmo assim.
  Future<void> gravar(EscolhaTema escolha) async {
    try {
      await _prefs.setString(chave, escolha.name);
    } on Object {
      // A próxima abertura segue o que estava guardado.
    }
  }
}
