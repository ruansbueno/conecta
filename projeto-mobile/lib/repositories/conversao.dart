import '../services/api_client.dart';
import '../services/api_failure.dart';

/// Converte o JSON da API em modelo; formato inesperado vira `RESPOSTA_INVALIDA` em vez de uma
/// exceção crua que deixaria a tela presa em "carregando". A conversão acontece depois que o
/// [ApiClient] já devolveu a resposta, então a falha é registrada aqui, com o pedido de [origem]
/// ("GET /avisos"), no mesmo log local (RM-38): é o caso de mudança de contrato da API.
T converter<T>(T Function() construir, {required String origem}) {
  try {
    return construir();
  } on ApiFailure {
    rethrow;
  } on Object {
    ApiClient.registrarFalha('$origem → ${ApiFailure.respostaInvalida}');
    throw const ApiFailure(code: ApiFailure.respostaInvalida);
  }
}
