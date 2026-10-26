// Respostas copiadas dos exemplos de projeto-api/.../contracts/api.md (D9).
// Em Dart, e não em .json, porque os testes de integração rodam no aparelho.
// ignore_for_file: lines_longer_than_80_chars

const avisosP1Json = r'''
{
  "items": [
    {
      "id": "e5d20000-0000-4000-8000-000000000001",
      "titulo": "Reunião de pais e alunos",
      "conteudo": "Será realizada na sexta, às 19h, no auditório.",
      "autor": {
        "id": "11aa0000-0000-4000-8000-000000000001",
        "nome": "Maria Coordenadora"
      },
      "publicado_em": "2026-10-01T12:00:00Z",
      "editado_em": null,
      "situacao": "ativo",
      "destinos": [
        {
          "tipo": "turma",
          "turma": {
            "id": "c3f0a1b2-0000-4000-8000-000000000001",
            "nome": "TADS 3º Sem A"
          },
          "semestre": null
        },
        {
          "tipo": "turma",
          "turma": {
            "id": "d7a10000-0000-4000-8000-000000000002",
            "nome": "TADS 3º Sem B"
          },
          "semestre": null
        }
      ]
    },
    {
      "id": "e5d20000-0000-4000-8000-000000000002",
      "titulo": "Entrega do trabalho de Redes adiada para 30/10",
      "conteudo": "O prazo de entrega do trabalho prático de Redes foi estendido para 30 de outubro, às 23h59.",
      "autor": {
        "id": "22bb0000-0000-4000-8000-000000000002",
        "nome": "Ricardo Lemos"
      },
      "publicado_em": "2026-09-29T12:12:00.123456Z",
      "editado_em": "2026-09-29T17:05:00Z",
      "situacao": "ativo",
      "destinos": [
        {
          "tipo": "todos",
          "turma": null,
          "semestre": null
        },
        {
          "tipo": "semestre",
          "turma": null,
          "semestre": 6
        },
        {
          "tipo": "docentes",
          "turma": null,
          "semestre": null
        }
      ]
    }
  ],
  "total": 2,
  "limit": 20,
  "offset": 0
}''';

const avisosVazioJson = r'''
{
  "items": [],
  "total": 0,
  "limit": 20,
  "offset": 0
}''';

const erroAvisoNaoEncontradoJson = r'''
{
  "detail": "Aviso não encontrado",
  "code": "AVISO_NAO_ENCONTRADO"
}''';

const erroCredenciaisInvalidasJson = r'''
{
  "detail": "Usuário ou senha inválidos",
  "code": "CREDENCIAIS_INVALIDAS"
}''';

const erroNaoAutenticadoJson = r'''
{
  "detail": "Token inválido ou expirado",
  "code": "NAO_AUTENTICADO"
}''';

const erroSemPermissaoJson = r'''
{
  "detail": "Sem permissão para esta ação",
  "code": "SEM_PERMISSAO"
}''';

const erroUsuarioInativoJson = r'''
{
  "detail": "Usuário desativado",
  "code": "USUARIO_INATIVO"
}''';

const erroValidationErrorJson = r'''
{
  "detail": "Dados inválidos",
  "code": "VALIDATION_ERROR",
  "errors": [
    {
      "campo": "username",
      "mensagem": "deve ter ao menos 1 caractere(s)"
    }
  ]
}''';

const loginJson = r'''
{
  "access_token": "eyJhbGciOiJIUzI1NiJ9.token-de-teste.assinatura",
  "token_type": "bearer",
  "expires_in": 86400,
  "usuario": {
    "id": "7b1c0e3a-6f64-4f43-8a58-2f3d5f0c1a11",
    "username": "aluno.teste",
    "nome": "Aluno de Teste",
    "perfil": "aluno"
  }
}''';

const meJson = r'''
{
  "id": "7b1c0e3a-6f64-4f43-8a58-2f3d5f0c1a11",
  "username": "aluno.teste",
  "nome": "Aluno de Teste",
  "perfil": "aluno",
  "turmas": [
    {
      "id": "c3f0a1b2-0000-4000-8000-000000000001",
      "codigo": "TADS-3A-2026-2",
      "nome": "TADS 3º Sem A",
      "papel": "aluno"
    }
  ]
}''';
