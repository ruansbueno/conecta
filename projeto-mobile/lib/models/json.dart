/// Leitura tolerante do JSON da API: campo ausente ou nulo vira `null`, nunca um valor inventado.
library;

DateTime? dataOuNulo(Object? valor) => valor is String ? DateTime.parse(valor).toUtc() : null;

DateTime data(Object? valor) => DateTime.parse(valor as String).toUtc();

/// Enum a partir do nome vindo da API; valor desconhecido cai em [desconhecido].
T enumPorNome<T extends Enum>(List<T> valores, Object? nome, T desconhecido) {
  for (final v in valores) {
    if (v.name == nome) return v;
  }
  return desconhecido;
}
