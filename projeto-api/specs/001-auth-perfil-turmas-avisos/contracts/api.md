# API Contracts: Autenticação, Perfis, Turmas e Avisos (Entregas 1 e 2)

## Convenções gerais

- JSON em requisições e respostas (`Content-Type: application/json`); datas em ISO-8601 UTC
  (`2026-10-05T14:30:00Z`); ids em UUID; campos em `snake_case` sem acento.
- Recursos protegidos aceitam **dois meios equivalentes** de autenticação (RF-32): o cabeçalho
  `Authorization: Bearer <token>`, usado pelo aplicativo mobile, ou o **cookie de sessão**
  `__Host-conecta_sessao`, usado pela plataforma web. Os dois carregam o mesmo token de 24 h. A API
  reavalia **perfil** e **ativo** do usuário no banco a cada requisição (o `perfil` do token é
  informativo).
- Quando a autenticação vier por cookie, `POST`, `PATCH` e `DELETE` exigem **CSRF por double
  submit assinado** (RF-33, emenda v2.2): o valor do cookie legível `__Host-conecta_csrf` repetido no
  cabeçalho `X-CSRF-Token`. O valor tem a forma `<aleatório>.<assinatura>`, em que a assinatura
  é um HMAC-SHA256 com a chave `CSRF_SECRET` sobre o cookie de sessão e o aleatório; a API a
  confere contra o `__Host-conecta_sessao` da mesma requisição. Ausência, divergência ou assinatura que
  não corresponde à sessão → 403 `CSRF_INVALIDO`. O cliente trata o valor como opaco. Com `Bearer`, o CSRF não é exigido.
- **Entrega**: seções 1–9 são **E1** (consumidas pelo app); seções 10–15 são **E2**
  (`/gestao/*`, consumidas pela plataforma web).

### Formato de erro

```json
{ "detail": "mensagem legível", "code": "CODIGO_ESTAVEL" }
```

Erros de validação (422) acrescentam a lista de campos:

```json
{
  "detail": "Dados inválidos",
  "code": "VALIDATION_ERROR",
  "errors": [
    { "campo": "titulo", "mensagem": "deve ter entre 3 e 150 caracteres" }
  ]
}
```

O app deve decidir comportamento por `code`, nunca pelo texto de `detail`.

### Catálogo de códigos

| Status | code | Quando |
|---|---|---|
| 401 | `NAO_AUTENTICADO` | Token ausente, inválido ou expirado |
| 401 | `CREDENCIAIS_INVALIDAS` | Login falhou (inclui provedor indisponível) |
| 403 | `USUARIO_INATIVO` | Usuário desativado |
| 403 | `ACESSO_PENDENTE` | Pedido de acesso de servidor aguardando decisão (emenda v2.3) |
| 403 | `ACESSO_RECUSADO` | Pedido de acesso recusado (emenda v2.3) |
| 403 | `SEM_PERMISSAO` | Perfil/vínculo não autoriza a ação |
| 403 | `CSRF_INVALIDO` | Escrita autenticada por cookie sem `X-CSRF-Token` válido |
| 403 | `DESTINO_NAO_PERMITIDO` | Docente usando destino fora das suas turmas |
| 404 | `TURMA_NAO_ENCONTRADA` | Turma inexistente (gestão) |
| 404 | `TURMA_INDISPONIVEL` | Turma inexistente, inativa ou com inscrições fechadas (solicitação) |
| 404 | `SOLICITACAO_NAO_ENCONTRADA` | |
| 404 | `AVISO_NAO_ENCONTRADO` | Inexistente, excluído ou não visível ao usuário |
| 404 | `USUARIO_NAO_ENCONTRADO` | |
| 404 | `VINCULO_NAO_ENCONTRADO` | |
| 409 | `JA_VINCULADO` | Aluno já vinculado à turma |
| 409 | `SOLICITACAO_DUPLICADA` | Já existe solicitação pendente |
| 409 | `SOLICITACAO_NAO_PENDENTE` | Estado final não pode mudar |
| 409 | `PERFIL_INCOMPATIVEL` | Papel do vínculo ≠ perfil do usuário, ou perfil incompatível com vínculos existentes |
| 409 | `CODIGO_TURMA_DUPLICADO` | |
| 409 | `AVISO_NAO_EDITAVEL` | Aviso arquivado ou excluído |
| 409 | `AVISO_SITUACAO_INVALIDA` | Arquivar o já arquivado / desarquivar o não arquivado |
| 409 | `ACESSO_JA_DECIDIDO` | Aprovar quem já está liberado, ou recusar o que não está pendente |
| 422 | `VALIDATION_ERROR` | Corpo ou parâmetros inválidos |
| 404 | `NAO_ENCONTRADO` | Rota inexistente |
| 405 | `METODO_NAO_PERMITIDO` | Método HTTP não suportado pela rota |
| 4xx | `ERRO_HTTP` | Outro erro HTTP do framework sem código próprio (ex.: 413) |
| 500 | `ERRO_INTERNO` | Falha inesperada no servidor (sem detalhes internos na resposta) |

### Paginação

Listas aceitam `limit` (1–100, padrão 20) e `offset` (≥ 0, padrão 0) e respondem:

```json
{ "items": [ ... ], "total": 42, "limit": 20, "offset": 0 }
```

---

# E1 — Endpoints do aplicativo

## 1. POST /auth/login

Autentica via `AuthProvider` configurado (mock ou API de autenticação do IFSul, `AUTH_PROVIDER`)
e emite o token (24 h).

**Auth**: não exige.

**Request**
```json
{ "username": "aluno.teste", "password": "senha-teste" }
```
| Campo | Obrigatório | Validação |
|---|---|---|
| username | Sim | string, 1–100 caracteres |
| password | Sim | string, 1–200 caracteres |

**200**
```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "expires_in": 86400,
  "usuario": {
    "id": "7b1c0e3a-6f64-4f43-8a58-2f3d5f0c1a11",
    "username": "aluno.teste",
    "nome": "Aluno de Teste",
    "perfil": "aluno"
  }
}
```

**Cabeçalhos da resposta** (RF-32, RF-33) — para a plataforma web; o aplicativo mobile ignora os
cookies e usa `access_token`:

```http
Set-Cookie: __Host-conecta_sessao=<token>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400
Set-Cookie: __Host-conecta_csrf=<aleatório>.<assinatura>; Secure; SameSite=Strict; Path=/; Max-Age=86400
```

O cookie de sessão é `HttpOnly` — inacessível ao JavaScript. O de CSRF é legível de propósito: ele
não autentica nada sozinho, só é devolvido em `X-CSRF-Token` nas escritas. A assinatura o prende a
este cookie de sessão: não serve para outra sessão, e não dá para fabricar um sem a `CSRF_SECRET`.

**Efeitos** (emenda v2.3): o 1º login de quem o provedor informa como **aluno** cria o usuário com
`perfil = aluno`; o de qualquer outro tipo institucional (ou sem tipo) cria um **pedido de acesso**
sem perfil e responde 403 `ACESSO_PENDENTE`, sem token nem cookies. Logins seguintes atualizam
apenas `nome`, `email`, o tipo institucional e `ultimo_login_em` — nunca o perfil nem a situação
do acesso.

**Erros**
| Status | code | Observação |
|---|---|---|
| 401 | `CREDENCIAIS_INVALIDAS` | Senha errada, usuário inexistente **ou** provedor indisponível — mesma resposta, sem detalhes internos |
| 403 | `USUARIO_INATIVO` | Credenciais corretas, usuário desativado (tem precedência) |
| 403 | `ACESSO_PENDENTE` | Credenciais corretas, pedido de acesso aguardando a gestão (sem sessão) |
| 403 | `ACESSO_RECUSADO` | Credenciais corretas, pedido de acesso recusado (sem sessão) |
| 422 | `VALIDATION_ERROR` | Campo ausente/vazio (o provedor nem é consultado) |

```json
{ "detail": "Acesso aguardando liberação", "code": "ACESSO_PENDENTE" }
```

**Maps to**: RF-01 a RF-08, RF-32, RF-33, RF-50; User Story 1.

---

## 1b. DELETE /auth/sessao

Encerra a sessão por cookie: invalida `__Host-conecta_sessao` e `__Host-conecta_csrf`.

**Auth**: cookie de sessão (exige `X-CSRF-Token`). Com `Bearer`, responde 204 sem efeito — o
aplicativo encerra a sessão descartando o token localmente.

**204** sem corpo. Os cookies voltam com `Max-Age=0`.

**403** `CSRF_INVALIDO` quando o CSRF falta ou não confere. Mesmo assim os dois cookies voltam com
`Max-Age=0` (emenda de 01/11/2026): sair nunca deixa a sessão no navegador, e um site de fora só
conseguiria deslogar a pessoa.

**Prefixo `__Host-`** (emenda de 01/11/2026): o navegador só aceita os dois cookies com `Secure`,
`Path=/` e sem `Domain`, e nenhum subdomínio consegue gravá-los nem substituí-los.

**Maps to**: RF-32, RF-33.

---

## 2. GET /me

Dados do usuário autenticado.

**Auth**: qualquer perfil.

**200**
```json
{
  "id": "7b1c0e3a-6f64-4f43-8a58-2f3d5f0c1a11",
  "username": "aluno.teste",
  "nome": "Aluno de Teste",
  "perfil": "aluno",
  "turmas": [
    { "id": "c3f0...", "codigo": "TADS-3A-2026-2", "nome": "TADS 3º Sem A", "papel": "aluno" }
  ]
}
```

**Erros**: 401 `NAO_AUTENTICADO`; 403 `USUARIO_INATIVO`.

**Maps to**: RF-05, RF-11; User Story 2.

---

## 3. GET /turmas/disponiveis

Turmas ativas, com inscrições abertas, nas quais o aluno **não** tem vínculo nem solicitação pendente.

**Auth**: somente `aluno`. **Query**: `limit`, `offset`.

**200**
```json
{
  "items": [
    { "id": "c3f0...", "codigo": "TADS-3B-2026-2", "nome": "TADS 3º Sem B",
      "semestre_curso": 3, "periodo_letivo": "2026/2" }
  ],
  "total": 1, "limit": 20, "offset": 0
}
```

**Erros**: 401; 403 `SEM_PERMISSAO` (perfil ≠ aluno).

**Maps to**: RF-12; User Story 3.

---

## 4. GET /turmas/minhas

Turmas em que o usuário possui vínculo.

**Auth**: qualquer perfil (administrador e coordenação recebem lista vazia). **Query**: `limit`, `offset`.

**200**
```json
{
  "items": [
    { "id": "c3f0...", "codigo": "TADS-3A-2026-2", "nome": "TADS 3º Sem A",
      "semestre_curso": 3, "periodo_letivo": "2026/2", "papel": "aluno" }
  ],
  "total": 1, "limit": 20, "offset": 0
}
```

**Maps to**: RF-16; User Story 3.

---

## 5. POST /turmas/{turma_id}/solicitacoes

Cria solicitação de inscrição (**não** cria vínculo).

**Auth**: somente `aluno`. **Corpo**: nenhum.

**201**
```json
{
  "id": "9a41...",
  "turma_id": "c3f0...",
  "status": "pendente",
  "solicitada_em": "2026-10-01T13:00:00Z"
}
```

**Erros**
| Status | code | Quando |
|---|---|---|
| 403 | `SEM_PERMISSAO` | Perfil ≠ aluno |
| 404 | `TURMA_INDISPONIVEL` | Turma inexistente, inativa ou com inscrições fechadas |
| 409 | `JA_VINCULADO` | Aluno já vinculado à turma |
| 409 | `SOLICITACAO_DUPLICADA` | Já existe solicitação pendente para a turma |
| 422 | `VALIDATION_ERROR` | `turma_id` não é UUID |

**Maps to**: RF-13, RF-14; User Story 3.

---

## 6. GET /solicitacoes/minhas

Solicitações do aluno, da mais recente à mais antiga.

**Auth**: somente `aluno`. **Query**: `status` (opcional: `pendente|aprovada|recusada|cancelada`), `limit`, `offset`.

**200**
```json
{
  "items": [
    {
      "id": "9a41...",
      "turma": { "id": "c3f0...", "codigo": "TADS-3B-2026-2", "nome": "TADS 3º Sem B" },
      "status": "recusada",
      "solicitada_em": "2026-10-01T13:00:00Z",
      "decidida_em": "2026-10-02T09:10:00Z",
      "motivo_recusa": "Turma completa"
    }
  ],
  "total": 1, "limit": 20, "offset": 0
}
```

**Erros**: 401; 403 `SEM_PERMISSAO`; 422 (`status` inválido).

**Maps to**: RF-15.

---

## 7. DELETE /solicitacoes/{solicitacao_id}

Cancela uma solicitação **pendente** do próprio aluno (muda para `cancelada`; não apaga a linha).

**Auth**: somente `aluno`, dono da solicitação.

**204** sem corpo.

**Erros**: 404 `SOLICITACAO_NAO_ENCONTRADA` (inexistente ou de outro aluno); 409 `SOLICITACAO_NAO_PENDENTE`.

**Maps to**: RF-15.

---

## 8. GET /avisos

Avisos visíveis ao usuário (regra de visibilidade em `data-model.md`), sem duplicatas, do mais
recente ao mais antigo por `publicado_em`.

**Auth**: qualquer perfil.

**Query**
| Parâmetro | Padrão | Validação |
|---|---|---|
| situacao | `ativo` | `ativo` ou `arquivado` |
| turma_id | — | UUID; filtra avisos que têm destino `turma` = esse id |
| limit / offset | 20 / 0 | ver Paginação |

**200**
```json
{
  "items": [
    {
      "id": "e5d2...",
      "titulo": "Reunião de pais e alunos",
      "conteudo": "Será realizada na sexta, às 19h, no auditório.",
      "autor": { "id": "11aa...", "nome": "Maria Coordenadora" },
      "publicado_em": "2026-10-01T12:00:00Z",
      "editado_em": null,
      "situacao": "ativo",
      "destinos": [
        { "tipo": "turma", "turma": { "id": "c3f0...", "nome": "TADS 3º Sem A" }, "semestre": null },
        { "tipo": "turma", "turma": { "id": "d7a1...", "nome": "TADS 3º Sem B" }, "semestre": null }
      ]
    }
  ],
  "total": 1, "limit": 20, "offset": 0
}
```

**Erros**: 401; 403 `USUARIO_INATIVO`; 422 (`situacao` ou `turma_id` inválidos).

**Maps to**: RF-20, RF-21, RF-22, RF-23; User Story 4.

---

## 9. GET /avisos/{aviso_id}

Um aviso visível ao usuário (mesmo formato de item da seção 8, `ativo` ou `arquivado`).

**Erros**: 404 `AVISO_NAO_ENCONTRADO` (inexistente, excluído, agendado para o futuro ou sem destino que alcance o usuário — a API não distingue os casos).

**Maps to**: RF-23.

---

# E2 — Endpoints de gestão (plataforma web)

Todos sob `/gestao`, com a matriz de permissões da `spec.md` seção 2.3. Sem permissão: 403
`SEM_PERMISSAO`. Perfis `aluno` recebem 403 em qualquer `/gestao/*`.

## 10. Usuários e perfis

### GET /gestao/usuarios
**Auth**: administrador, coordenação. **Query**: `q` (busca em nome/username; texto literal, `%` e `_` não são curingas — emenda v2.4), `perfil`, `ativo`, `limit`, `offset`.

**200**
```json
{
  "items": [
    { "id": "7b1c...", "username": "aluno.teste", "nome": "Aluno de Teste",
      "perfil": "aluno", "ativo": true, "ultimo_login_em": "2026-10-01T12:00:00Z" }
  ],
  "total": 1, "limit": 20, "offset": 0
}
```

### GET /gestao/usuarios/{usuario_id}
Mesmo formato do item, mais `turmas` (como em `/me`). 404 `USUARIO_NAO_ENCONTRADO`.

### PATCH /gestao/usuarios/{usuario_id}
**Auth**: somente administrador.

**Request** (ao menos um campo)
```json
{ "perfil": "docente", "ativo": true }
```
| Campo | Validação |
|---|---|
| perfil | `administrador`, `coordenacao`, `docente`, `aluno` |
| ativo | boolean |

**200**: usuário atualizado (formato do item). Efeito imediato nas próximas requisições do usuário.

**Erros**: 403 `SEM_PERMISSAO`; 404 `USUARIO_NAO_ENCONTRADO`; 409 `PERFIL_INCOMPATIVEL` (usuário possui vínculos incompatíveis com o novo perfil); 422.
Um administrador não pode desativar a si próprio nem rebaixar o último administrador ativo (422 `VALIDATION_ERROR`).

Só usuários com acesso liberado aparecem aqui; pedidos de acesso (pendentes e recusados) ficam em
`/gestao/acessos` e dão 404 nas rotas desta seção.

**Maps to**: RF-09.

## 10a. Pedidos de acesso (emenda v2.3)

Servidores (tipo institucional `administrativo`, ou sem tipo) que entraram pela primeira vez e
aguardam a gestão. Não têm perfil até a decisão.

### GET /gestao/acessos
**Auth**: administrador, coordenação. **Query**: `situacao` (`pendente`, padrão, ou `recusado`),
`limit`, `offset`. Mais antigos primeiro.

**200**
```json
{
  "items": [
    { "id": "5d0e...", "username": "fulano.servidor", "nome": "Fulano Servidor",
      "email": "fulano@ifsul.edu.br", "tipo_institucional": "administrativo",
      "situacao": "pendente", "solicitado_em": "2026-11-06T13:00:00Z",
      "decidido_em": null, "decidido_por": null }
  ],
  "total": 1, "limit": 20, "offset": 0
}
```

### POST /gestao/acessos/{usuario_id}/aprovar
**Auth**: administrador, coordenação.

**Request**
```json
{ "perfil": "docente" }
```
| Quem decide | Perfis que pode conceder | Pedidos |
|---|---|---|
| Administrador | `administrador`, `coordenacao`, `docente`, `aluno` | pendentes e recusados |
| Coordenação | `docente`, `coordenacao` | só pendentes |

**200**: o pedido decidido, com `situacao: "liberado"`, `perfil`, `decidido_em` e
`decidido_por: {id, nome}`. O próximo login da pessoa entra com o perfil concedido.

**Erros**: 403 `SEM_PERMISSAO` (perfil ou pedido fora do alcance da coordenação); 404
`USUARIO_NAO_ENCONTRADO`; 409 `ACESSO_JA_DECIDIDO` (já liberado); 422 (`perfil` ausente ou inválido).

### POST /gestao/acessos/{usuario_id}/recusar
**Auth**: administrador, coordenação. Sem corpo.

**200**: o pedido com `situacao: "recusado"` e quem decidiu. O login passa a responder 403
`ACESSO_RECUSADO`; a administração ainda pode aprová-lo depois.

**Erros**: 404 `USUARIO_NAO_ENCONTRADO`; 409 `ACESSO_JA_DECIDIDO` (não está pendente).

**Maps to**: RF-50, RF-51.

## 11. Turmas

### POST /gestao/turmas
**Auth**: administrador, coordenação.

**Request**
```json
{
  "codigo": "TADS-3A-2026-2",
  "nome": "TADS 3º Semestre A",
  "semestre_curso": 3,
  "periodo_letivo": "2026/2",
  "inscricoes_abertas": true
}
```
| Campo | Obrigatório | Validação |
|---|---|---|
| codigo | Sim | 1–40 caracteres, único |
| nome | Sim | 3–120 caracteres |
| semestre_curso | Sim | inteiro 1–12 |
| periodo_letivo | Sim | formato `AAAA/N` (N = 1 ou 2) |
| inscricoes_abertas | Não | boolean, padrão `false` |

**201**: turma completa (todos os campos + `id`, `ativa: true`, `criado_em`).

**Erros**: 409 `CODIGO_TURMA_DUPLICADO`; 422.

### GET /gestao/turmas
**Query**: `ativa`, `semestre_curso`, `periodo_letivo`, `q` (em código e nome; texto literal, emenda v2.4), `limit`, `offset`. **200**: lista paginada de turmas completas, mais `total_alunos` e `total_docentes`.

### GET /gestao/turmas/{turma_id}
**200**: turma completa. 404 `TURMA_NAO_ENCONTRADA`.

### PATCH /gestao/turmas/{turma_id}
Altera qualquer campo de `POST` (parcial) e `ativa`. **Erros**: 404; 409 `CODIGO_TURMA_DUPLICADO`; 422.

### DELETE /gestao/turmas/{turma_id}
Desativação lógica (`ativa = false`). **204**. 404 `TURMA_NAO_ENCONTRADA`.

**Maps to**: RF-18.

## 12. Vínculos

### GET /gestao/turmas/{turma_id}/vinculos
**Auth**: administrador, coordenação; docente vinculado à turma (somente leitura).

**200**
```json
{
  "items": [
    { "usuario": { "id": "7b1c...", "username": "aluno.teste", "nome": "Aluno de Teste" },
      "papel": "aluno", "origem": "solicitacao", "criado_em": "2026-10-02T09:10:00Z" }
  ],
  "total": 1, "limit": 20, "offset": 0
}
```
**Query**: `papel`, `limit`, `offset`.

### POST /gestao/turmas/{turma_id}/vinculos
**Auth**: administrador, coordenação.

**Request**
```json
{ "usuario_id": "7b1c...", "papel": "docente" }
```
**201**: o vínculo (formato do item acima). 

**Erros**: 404 `TURMA_NAO_ENCONTRADA` / `USUARIO_NAO_ENCONTRADO`; 409 `JA_VINCULADO`; 409 `PERFIL_INCOMPATIVEL` (papel diferente do perfil, ou perfil sem vínculo — administrador/coordenação); 422.

### DELETE /gestao/turmas/{turma_id}/vinculos/{usuario_id}
**204**. 404 `VINCULO_NAO_ENCONTRADO`.

**Maps to**: RF-19.

## 13. Solicitações de inscrição

### GET /gestao/solicitacoes
**Auth**: administrador e coordenação (todas); docente (somente das turmas em que leciona).
**Query**: `status` (padrão `pendente`), `turma_id`, `limit`, `offset`.

**200**
```json
{
  "items": [
    { "id": "9a41...",
      "aluno": { "id": "7b1c...", "username": "aluno.teste", "nome": "Aluno de Teste" },
      "turma": { "id": "c3f0...", "codigo": "TADS-3B-2026-2", "nome": "TADS 3º Sem B" },
      "status": "pendente", "solicitada_em": "2026-10-01T13:00:00Z",
      "decidida_em": null, "decidida_por": null, "motivo_recusa": null }
  ],
  "total": 1, "limit": 20, "offset": 0
}
```

### POST /gestao/solicitacoes/{solicitacao_id}/aprovar
**Auth**: administrador, coordenação, docente da turma. **Corpo**: nenhum.
**200**: solicitação com `status: "aprovada"`, `decidida_por`, `decidida_em`; o vínculo (papel `aluno`, origem `solicitacao`) é criado na mesma transação.

### POST /gestao/solicitacoes/{solicitacao_id}/recusar
**Request** (opcional): `{ "motivo": "Turma completa" }` — `motivo` até 300 caracteres.
**200**: solicitação com `status: "recusada"`.

**Erros (ambos)**: 403 `SEM_PERMISSAO` (docente de outra turma); 404 `SOLICITACAO_NAO_ENCONTRADA`; 409 `SOLICITACAO_NAO_PENDENTE`; 409 `JA_VINCULADO` (vínculo criado por outra via entre o pedido e a decisão — a solicitação é marcada `recusada` automaticamente).

**Maps to**: RF-17; User Story 3.

## 14. Avisos — publicação e ciclo de vida

### POST /gestao/avisos
**Auth**: administrador, coordenação (qualquer destino); docente (apenas destinos `turma` em que leciona).

**Request**
```json
{
  "titulo": "Reunião de pais e alunos",
  "conteudo": "Será realizada na sexta, às 19h, no auditório.",
  "publicar_em": "2026-10-03T12:00:00Z",
  "destinos": [
    { "tipo": "turma", "turma_id": "c3f0..." },
    { "tipo": "turma", "turma_id": "d7a1..." },
    { "tipo": "turma", "turma_id": "f2b9..." }
  ]
}
```
| Campo | Obrigatório | Validação |
|---|---|---|
| titulo | Sim | 3–150 caracteres |
| conteudo | Sim | 1–5000 caracteres |
| publicar_em | Não | ISO-8601 com fuso, **futuro**; omitido = publica imediatamente |
| destinos | Sim | 1–20 itens, sem repetição |
| destinos[].tipo | Sim | `todos`, `turma`, `semestre`, `docentes` |
| destinos[].turma_id | Se `turma` | UUID de turma **ativa**; proibido nos demais tipos |
| destinos[].semestre | Se `semestre` | inteiro 1–12; proibido nos demais tipos |

**201**: aviso de gestão (formato de `GET /gestao/avisos/{aviso_id}` abaixo), `versao_atual: 1`, `situacao: "ativo"`.
Efeito: cria versão 1 e evento `criado`.

**Erros**: 403 `DESTINO_NAO_PERMITIDO` (docente com destino fora das suas turmas ou de tipo ≠ `turma`);
403 `SEM_PERMISSAO` (aluno); 404 `TURMA_NAO_ENCONTRADA` (turma referenciada); 422 `VALIDATION_ERROR`
(campos, `publicar_em` no passado, destino repetido, turma inativa).

### GET /gestao/avisos
**Auth**: administrador e coordenação (todos); docente (somente os que publicou).
**Query**: `situacao` (`ativo|agendado|arquivado|excluido`; padrão: todos exceto `excluido`), `autor_id`, `turma_id`, `q` (em título e conteúdo; texto literal, emenda v2.4), `limit`, `offset`.

`situacao=agendado` devolve os avisos **ativos cuja `publicar_em` ainda não chegou** (RF-34);
`situacao=ativo` devolve os ativos **já publicados**. A distinção existe para que a plataforma web
pagine corretamente a aba de agendados — no banco, os dois são `ativo`.
**200**: lista paginada de avisos de gestão.

### GET /gestao/avisos/{aviso_id}
**200**
```json
{
  "id": "e5d2...",
  "titulo": "Reunião de pais e alunos",
  "conteudo": "Será realizada na sexta, às 19h, no auditório.",
  "autor": { "id": "11aa...", "nome": "Maria Coordenadora" },
  "situacao": "ativo",
  "publicar_em": "2026-10-03T12:00:00Z",
  "publicado_em": "2026-10-03T12:00:00Z",
  "versao_atual": 2,
  "criado_em": "2026-10-01T12:00:00Z",
  "editado_em": "2026-10-02T08:00:00Z",
  "arquivado_em": null,
  "destinos": [
    { "tipo": "turma", "turma": { "id": "c3f0...", "nome": "TADS 3º Sem A" }, "semestre": null }
  ]
}
```
**Erros**: 403 `SEM_PERMISSAO` (docente e aviso de outro autor); 404 `AVISO_NAO_ENCONTRADO`.

### PATCH /gestao/avisos/{aviso_id}
**Auth**: administrador, coordenação (qualquer aviso); docente (só os seus; destinos restritos como na criação).

**Request** (parcial; ao menos um campo; `destinos`, se enviado, **substitui** a lista inteira)
```json
{
  "conteudo": "Reunião transferida para sábado, às 10h.",
  "destinos": [
    { "tipo": "turma", "turma_id": "c3f0..." },
    { "tipo": "turma", "turma_id": "d7a1..." }
  ]
}
```
Campos e validações: os mesmos de `POST`. Se nada mudou de fato → 422 `VALIDATION_ERROR` ("nenhuma alteração").
`publicar_em` só muda enquanto o aviso está agendado (`null` publica já). Num aviso já publicado, `publicar_em` enviado, com qualquer valor, → 422 `VALIDATION_ERROR` no campo `publicar_em` ("aviso já publicado não pode ser reagendado"; emenda v2.4). No histórico, as datas de `alteracoes` vêm em UTC.

**200**: aviso de gestão atualizado, com `versao_atual` incrementada e `editado_em` preenchido.
Efeitos: nova versão; evento `editado` com `alteracoes`, por exemplo
```json
{ "conteudo": { "de": "Será realizada na sexta, às 19h...", "para": "Reunião transferida..." },
  "destinos": { "de": [ ...3 turmas... ], "para": [ ...2 turmas... ] } }
```

**Erros**: 403 `SEM_PERMISSAO` / `DESTINO_NAO_PERMITIDO`; 404; 409 `AVISO_NAO_EDITAVEL` (arquivado ou excluído); 422.

### POST /gestao/avisos/{aviso_id}/arquivar
**200**: aviso com `situacao: "arquivado"` e `arquivado_em`. Evento `arquivado`.
**Erros**: 403; 404 (inexistente ou excluído, emenda v2.4); 409 `AVISO_SITUACAO_INVALIDA` (já arquivado).

### POST /gestao/avisos/{aviso_id}/desarquivar
**200**: aviso com `situacao: "ativo"`. Evento `desarquivado`. **Erros**: 403; 404 (inexistente ou excluído, emenda v2.4); 409 `AVISO_SITUACAO_INVALIDA` (não está arquivado).

### DELETE /gestao/avisos/{aviso_id}
Exclusão lógica (`situacao = excluido`, `excluido_em`). **204**. Evento `excluido`.
**Erros**: 403; 404 `AVISO_NAO_ENCONTRADO`. Excluído deixa de aparecer em `/avisos` e `/gestao/avisos` (exceto com `situacao=excluido`, apenas administrador e coordenação).

**Maps to**: RF-24, RF-25, RF-26; User Story 6.

## 15. Versões e histórico do aviso

### GET /gestao/avisos/{aviso_id}/versoes
**Auth**: administrador, coordenação; docente (avisos próprios). Funciona também para avisos excluídos (administrador/coordenação).

**200** (da mais recente para a mais antiga)
```json
{
  "items": [
    {
      "versao": 2,
      "titulo": "Reunião de pais e alunos",
      "conteudo": "Reunião transferida para sábado, às 10h.",
      "publicar_em": "2026-10-03T12:00:00Z",
      "destinos": [
        { "tipo": "turma", "turma_id": "c3f0..." },
        { "tipo": "turma", "turma_id": "d7a1..." }
      ],
      "criada_por": { "id": "11aa...", "nome": "Maria Coordenadora" },
      "criada_em": "2026-10-02T08:00:00Z"
    }
  ],
  "total": 2, "limit": 20, "offset": 0
}
```

### GET /gestao/avisos/{aviso_id}/historico
Mesmas permissões. **200** (do mais recente para o mais antigo)
```json
{
  "items": [
    { "id": "ev3...", "tipo": "arquivado", "usuario": { "id": "11aa...", "nome": "Maria Coordenadora" },
      "ocorrido_em": "2026-10-04T10:00:00Z", "versao": null, "alteracoes": null },
    { "id": "ev2...", "tipo": "editado", "usuario": { "id": "11aa...", "nome": "Maria Coordenadora" },
      "ocorrido_em": "2026-10-02T08:00:00Z", "versao": 2,
      "alteracoes": { "conteudo": { "de": "…", "para": "…" } } },
    { "id": "ev1...", "tipo": "criado", "usuario": { "id": "11aa...", "nome": "Maria Coordenadora" },
      "ocorrido_em": "2026-10-01T12:00:00Z", "versao": 1, "alteracoes": null }
  ],
  "total": 3, "limit": 20, "offset": 0
}
```

**Erros (ambos)**: 403 `SEM_PERMISSAO`; 404 `AVISO_NAO_ENCONTRADO`.

**Maps to**: RF-27, RF-28.

---

# E3 — Endpoints previstos (visão geral)

Detalhamento em especificação própria antes da implementação. Seguirão o mesmo padrão:

- App: `GET /eventos`, `GET /eventos/{id}`, `GET /turmas/{id}/horarios`.
- Gestão: CRUD `/gestao/eventos` (com `destinos`, versões e histórico) e `/gestao/turmas/{id}/horarios`.
