/// O que a interface faz diante de uma falha (spec.md §6, "Mensagens por código").
enum EfeitoFalha {
  permanece,
  encerraSessao,
  voltaLista,
  recarrega,
  abreSolicitacoes,
  marcaCampos,
  repetir,
}

class ErroDeCampo {
  const ErroDeCampo({required this.campo, required this.mensagem});

  final String campo;
  final String mensagem;
}

const _semConexao = 'Sem conexão. Verifique a rede e tente de novo.';
const _generica = 'Não foi possível carregar agora. Tente de novo em instantes.';

/// Mapa único `code → (mensagem, efeito)` (D8). Nenhuma tela decide pelo texto de `detail`.
const _mapa = <String, (String, EfeitoFalha)>{
  'CREDENCIAIS_INVALIDAS': ('Usuário ou senha incorretos.', EfeitoFalha.permanece),
  'USUARIO_INATIVO': (
    'Seu acesso está desativado. Procure a coordenação.',
    EfeitoFalha.encerraSessao,
  ),
  'NAO_AUTENTICADO': ('Sua sessão expirou. Entre de novo.', EfeitoFalha.encerraSessao),
  'SEM_PERMISSAO': ('Esta ação não está disponível para o seu perfil.', EfeitoFalha.permanece),
  'TURMA_INDISPONIVEL': ('Esta turma não está mais aceitando inscrições.', EfeitoFalha.recarrega),
  'JA_VINCULADO': ('Você já faz parte desta turma.', EfeitoFalha.recarrega),
  'SOLICITACAO_DUPLICADA': (
    'Você já tem uma solicitação pendente para esta turma.',
    EfeitoFalha.abreSolicitacoes,
  ),
  'SOLICITACAO_NAO_PENDENTE': ('Esta solicitação já foi decidida.', EfeitoFalha.recarrega),
  'SOLICITACAO_NAO_ENCONTRADA': ('Esta solicitação não existe mais.', EfeitoFalha.recarrega),
  'AVISO_NAO_ENCONTRADO': ('Este aviso não está mais disponível.', EfeitoFalha.voltaLista),
  'VALIDATION_ERROR': ('Confira os campos destacados.', EfeitoFalha.marcaCampos),
  ApiFailure.semRede: (_semConexao, EfeitoFalha.repetir),
  ApiFailure.timeout: (_semConexao, EfeitoFalha.repetir),
};

/// Qualquer falha de uma chamada à API, na forma que o app entende.
class ApiFailure implements Exception {
  const ApiFailure({required this.code, this.status, this.detail, this.errors = const []});

  static const semRede = 'SEM_REDE';
  static const timeout = 'TIMEOUT';
  static const respostaInvalida = 'RESPOSTA_INVALIDA';

  /// Os codes com mensagem própria (para conferir contra a spec §6).
  static Iterable<String> get codesConhecidos => _mapa.keys;

  final String code;
  final int? status;

  /// Texto do servidor: só para log, nunca exibido (RM-06).
  final String? detail;
  final List<ErroDeCampo> errors;

  (String, EfeitoFalha) get _resolvido {
    if ((status ?? 0) >= 500) return (_generica, EfeitoFalha.repetir);
    // Code fora do catálogo: mensagem genérica; o registro em log é do ApiClient (RM-38).
    return _mapa[code] ?? (_generica, EfeitoFalha.repetir);
  }

  String get mensagem => _resolvido.$1;
  EfeitoFalha get efeito => _resolvido.$2;

  @override
  String toString() => 'ApiFailure($code, status: $status)';
}
