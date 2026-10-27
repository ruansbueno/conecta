import '../services/api_failure.dart';

/// Converte o JSON da API em modelo; formato inesperado vira `RESPOSTA_INVALIDA` em vez de uma
/// exceção crua que deixaria a tela presa em "carregando".
T converter<T>(T Function() construir) {
  try {
    return construir();
  } on ApiFailure {
    rethrow;
  } on Object {
    throw const ApiFailure(code: ApiFailure.respostaInvalida);
  }
}
