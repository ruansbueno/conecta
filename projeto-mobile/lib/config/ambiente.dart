/// Configuração por ambiente, injetada no build com `--dart-define` (D12).
///
/// Emulador Android: `--dart-define=API_BASE_URL=http://10.0.2.2:8000`.
abstract final class Ambiente {
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:8000',
  );
}
