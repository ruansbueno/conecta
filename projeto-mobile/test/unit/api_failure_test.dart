import 'package:conecta/services/api_failure.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  ApiFailure falha(String code, [int? status]) => ApiFailure(code: code, status: status);

  test('mensagens e efeitos da seção 6 da spec, por code', () {
    expect(falha('CREDENCIAIS_INVALIDAS', 401).mensagem, 'Usuário ou senha incorretos.');
    expect(falha('CREDENCIAIS_INVALIDAS', 401).efeito, EfeitoFalha.permanece);
    expect(
      falha('USUARIO_INATIVO', 403).mensagem,
      'Seu acesso está desativado. Procure a coordenação.',
    );
    expect(falha('USUARIO_INATIVO', 403).efeito, EfeitoFalha.encerraSessao);
    expect(falha('NAO_AUTENTICADO', 401).mensagem, 'Sua sessão expirou. Entre de novo.');
    expect(falha('NAO_AUTENTICADO', 401).efeito, EfeitoFalha.encerraSessao);
    expect(falha('AVISO_NAO_ENCONTRADO', 404).mensagem, 'Este aviso não está mais disponível.');
    expect(falha('AVISO_NAO_ENCONTRADO', 404).efeito, EfeitoFalha.voltaLista);
    expect(falha('EVENTO_NAO_ENCONTRADO', 404).mensagem, 'Este evento não está mais disponível.');
    expect(falha('EVENTO_NAO_ENCONTRADO', 404).efeito, EfeitoFalha.voltaLista);
    expect(falha('VALIDATION_ERROR', 422).efeito, EfeitoFalha.marcaCampos);
    expect(
      falha('SEM_PERMISSAO', 403).mensagem,
      'Esta ação não está disponível para o seu perfil.',
    );
    expect(falha('SOLICITACAO_NAO_ENCONTRADA', 404).mensagem, 'Esta solicitação não existe mais.');
    expect(falha('SOLICITACAO_NAO_ENCONTRADA', 404).efeito, EfeitoFalha.recarrega);
  });

  test('sem rede e timeout oferecem repetir', () {
    for (final code in [ApiFailure.semRede, ApiFailure.timeout]) {
      expect(falha(code).mensagem, 'Sem conexão. Verifique a rede e tente de novo.');
      expect(falha(code).efeito, EfeitoFalha.repetir);
    }
  });

  test('5xx e code desconhecido caem na mensagem genérica, com repetir', () {
    const generica = 'Não foi possível carregar agora. Tente de novo em instantes.';
    expect(falha('ERRO_INTERNO', 500).mensagem, generica);
    expect(falha('CODIGO_QUE_NAO_EXISTE', 409).mensagem, generica);
    expect(falha(ApiFailure.respostaInvalida, 502).efeito, EfeitoFalha.repetir);
  });

  test('o texto de detail nunca é a mensagem exibida (RM-06)', () {
    const f = ApiFailure(code: 'CREDENCIAIS_INVALIDAS', status: 401, detail: 'texto do servidor');

    expect(f.mensagem, isNot(contains('texto do servidor')));
  });
}
