# Validação da integração com a API de autenticação do IFSul

06/11/2026 16:48 — CONECTA em `http://localhost:8001`, API do IFSul em `http://200.19.1.19/luissilva/Conecta_API_REST/public/api/v1/autenticacoes`.
Casos do item 10 da doc do IFSul. Senhas nunca são registradas; logins mascarados.

- Conta de aluno: `20*****.AD*****`

| # | Caso | Esperado | Obtido | Correto |
|---|---|---|---|---|
| 1 | Conta válida de aluno | 200, perfil aluno (ou o já concedido) | HTTP 200 perfil aluno | sim |
| 2 | Conta administrativa | 1º acesso: 403 ACESSO_PENDENTE; depois de liberada: 200 com o perfil concedido | não executado (sem a conta) | — |
| 3 | Senha incorreta | 401 CREDENCIAIS_INVALIDAS | CONECTA: HTTP 401 CREDENCIAIS_INVALIDAS; API do IFSul direto: credencial recusada | sim |
| 4 | Usuário inexistente | 401 CREDENCIAIS_INVALIDAS | CONECTA: HTTP 401 CREDENCIAIS_INVALIDAS; API do IFSul direto: credencial recusada | sim |
| 5 | Requisição sem usuário | CONECTA 422 VALIDATION_ERROR (nem chama o IFSul); IFSul direto 400 DADOS_INVALIDOS | CONECTA: HTTP 422 VALIDATION_ERROR; API do IFSul direto: HTTP 400 DADOS_INVALIDOS | sim |
| 6 | Requisição sem senha | CONECTA 422 VALIDATION_ERROR (nem chama o IFSul); IFSul direto 400 DADOS_INVALIDOS | CONECTA: HTTP 422 VALIDATION_ERROR; API do IFSul direto: HTTP 400 DADOS_INVALIDOS | sim |
| 7 | API do IFSul indisponível (simulada: endereço local sem serviço) | falha do provedor; o CONECTA responde 401 genérico, sem detalhes (RF-06) | provedor: FalhaDoProvedor (comunicação: ConnectError); o CONECTA responde 401 genérico (test_login_provider_indisponivel) | sim |
| 8 | Criação e encerramento da sessão | token e cookies emitidos; GET /me 200; DELETE /auth/sessao 204 com cookie expirado | sessão criada: token emitido, GET /me HTTP 200, 2 cookie(s) de sessão web; encerrada: DELETE /auth/sessao HTTP 204, cookie expirado: sim | sim |
| 9 | Permissões do usuário autenticado | aluno: gestão 403 e turmas disponíveis 200; administrativo pendente sem sessão | perfil aluno: GET /gestao/usuarios HTTP 403, GET /turmas/disponiveis HTTP 200; conta administrativa: sem a conta | sim |

Resultado: 8 de 8 casos executados corretos; 1 não executados (sem a conta).
