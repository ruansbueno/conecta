# Contrato de Consumo da API — Plataforma Web de Gestão

**Feature**: [../spec.md](../spec.md) | **Data**: 2026-10-13

Este documento descreve **o que a plataforma chama**, não o que a API oferece. A definição dos
endpoints é de `projeto-api/specs/001-auth-perfil-turmas-avisos/contracts/api.md`; em caso de
divergência, aquele documento prevalece e esta spec é revista.

## Convenções do cliente

- Base: `VITE_API_BASE_URL`, embutida no build. É pública por natureza e aponta para o caminho da
  API na mesma origem (por exemplo `/api`).
- Toda chamada parte do navegador, com `credentials: 'include'`; a autenticação viaja no cookie de
  sessão emitido pela API, nunca em cabeçalho montado pelo JavaScript (Princípio III).
- Cabeçalhos: `Content-Type: application/json`, `Accept: application/json` e, nos métodos de
  escrita, o cabeçalho de proteção CSRF definido pela API.
- Timeout de 15 s; sem repetição automática — repetir é ação do usuário.
- Toda resposta 2xx é validada por esquema `zod` antes de virar tipo; fora do esquema →
  `RESPOSTA_INVALIDA`.
- Listas sempre com `limit` e `offset` vindos da URL da página.
- `401` em qualquer chamada: a plataforma chama `DELETE /auth/sessao`, descarta o estado local,
  guarda o destino pretendido e leva ao login.
- A plataforma **não** chama os endpoints de aluno (`/turmas/disponiveis`,
  `/solicitacoes/minhas`, `POST /turmas/{id}/solicitacoes`, `GET /avisos`).

---

## Sessão

### `POST /auth/login`

**Origem**: T01 · **Sem sessão**

**Envia**: `{ username, password }` com `credentials: 'include'` ·
**Recebe 200**: `usuario`, `expires_in` e o cookie de sessão em `Set-Cookie` (o corpo também traz
`access_token`, que a plataforma **ignora** — ele existe para o aplicativo mobile).

**Efeito**: a plataforma chama em seguida `GET /me`. Se o perfil for `aluno`, encerra a sessão
(`DELETE /auth/sessao`) e leva a `/sem-permissao`. Nos demais, segue para o destino pretendido ou
para `/painel`.

| code | Status | Tratamento |
|---|---|---|
| `CREDENCIAIS_INVALIDAS` | 401 | "Usuário ou senha incorretos."; permanece |
| `USUARIO_INATIVO` | 403 | Mensagem de acesso desativado; permanece |
| `VALIDATION_ERROR` | 422 | Marca os campos |
| `SEM_REDE` / `TIMEOUT` | — | "Não foi possível conectar."; nada é gravado |

**Requisitos**: RW-01, RW-02, RW-06.

### `DELETE /auth/sessao`

**Origem**: botão Sair e todo encerramento automático (aluno autenticado, `401`,
`403 USUARIO_INATIVO`). Remove o cookie de sessão no servidor da API. A plataforma descarta o
estado local em seguida.

**Requisitos**: RW-05, RW-06, RW-09.

### `GET /me`

**Origem**: `layout` do grupo `(gestao)`, a cada requisição; e logo após o login.

**Recebe 200**: `id`, `username`, `nome`, `perfil`, `turmas[]`

**Efeito**: define o usuário da requisição, monta a barra lateral e libera ou nega a área.

| code | Status | Tratamento |
|---|---|---|
| `NAO_AUTENTICADO` | 401 | Apaga o cookie; login com "Sua sessão expirou." |
| `USUARIO_INATIVO` | 403 | Apaga o cookie; login com a mensagem de acesso desativado |

**Requisitos**: RW-04, RW-05, RW-10, RW-11.

---

## Painel

Três chamadas em paralelo, no servidor; os números saem do `total` de cada uma (D13).

| Chamada | Para quê |
|---|---|
| `GET /gestao/avisos?limit=5` | Publicados recentemente e o total de avisos |
| `GET /gestao/solicitacoes?status=pendente&limit=4` | Fila de decisão e total de pendentes |
| `GET /gestao/turmas?ativa=true&limit=1` | Total de turmas ativas |

**Origem**: T02 (coordenação) e T14 (docente) — a mesma rota; a API já restringe o conteúdo pelo
perfil, e a plataforma não filtra nada (Princípio I).

**Erros**: `401` encerra a sessão; falha em uma das três não derruba a página — o cartão
correspondente mostra estado de erro com ação de recarregar.

**Requisitos**: RW-10, RW-37.

---

## Avisos

### `GET /gestao/avisos`

**Origem**: T03 · **Parâmetros**: `situacao`, `autor_id`, `turma_id`, `q`, `limit`, `offset` —
todos vindos da URL.

A aba "Agendados" é um filtro da plataforma sobre `situacao=ativo` com `publicar_em` no futuro;
"Excluídos" usa `situacao=excluido` e só aparece para administração e coordenação.

| code | Status | Tratamento |
|---|---|---|
| `SEM_PERMISSAO` | 403 | Tela de sem permissão |
| `NAO_AUTENTICADO` | 401 | Encerra a sessão |

**Requisitos**: RW-13, RW-14.

### `POST /gestao/avisos`

**Origem**: T04 e T15.

**Envia**: `{ titulo, conteudo, publicar_em?, destinos[] }` — `destinos` com 1 a 20 itens no
formato `{ tipo, turma_id? , semestre? }`.

| code | Status | Tratamento |
|---|---|---|
| `DESTINO_NAO_PERMITIDO` | 403 | "Você só pode publicar para as turmas em que leciona."; recarrega as turmas; **mantém o texto** |
| `TURMA_NAO_ENCONTRADA` | 404 | Marca o destino problemático, não o formulário inteiro |
| `VALIDATION_ERROR` | 422 | Marca os campos de `errors[]` (inclui `publicar_em` no passado e destino repetido) |

**Requisitos**: RW-15, RW-16, RW-17, RW-42.

### `PATCH /gestao/avisos/{id}`

**Origem**: T04 e T15 em modo de edição.

**Envia**: apenas os campos alterados; `destinos`, quando enviado, **substitui a lista inteira**.

| code | Status | Tratamento |
|---|---|---|
| `AVISO_NAO_EDITAVEL` | 409 | Explica a situação e oferece desarquivar, quando couber |
| `SEM_PERMISSAO` | 403 | Tela de sem permissão (docente editando aviso alheio) |
| `VALIDATION_ERROR` | 422 | Inclui "nenhuma alteração": informa sem tratar como falha |

**Requisitos**: RW-18.

### `GET /gestao/avisos/{id}`

**Origem**: detalhe do aviso e carga do editor em modo de edição.

| code | Status | Tratamento |
|---|---|---|
| `AVISO_NAO_ENCONTRADO` | 404 | "Este aviso não está mais disponível."; volta à lista |
| `SEM_PERMISSAO` | 403 | Tela de sem permissão |

### `POST /gestao/avisos/{id}/arquivar` · `POST /gestao/avisos/{id}/desarquivar` · `DELETE /gestao/avisos/{id}`

**Origem**: T03 e detalhe, com confirmação prévia em arquivar e excluir.

| code | Status | Tratamento |
|---|---|---|
| `AVISO_SITUACAO_INVALIDA` | 409 | "Este aviso já está nessa situação."; recarrega |
| `SEM_PERMISSAO` | 403 | Tela de sem permissão |

A confirmação de exclusão diz o que acontece: some do aplicativo e das listas, e permanece
consultável por administração e coordenação para auditoria.

**Requisitos**: RW-19, RW-41.

### `GET /gestao/avisos/{id}/versoes` e `GET /gestao/avisos/{id}/historico`

**Origem**: T06, carregadas em paralelo com `GET /gestao/avisos/{id}`.

Funcionam também para avisos excluídos (administração e coordenação). Em `historico`, o campo
`alteracoes` alimenta a comparação lado a lado; `destinos` é apresentado como conjunto (removido,
mantido, acrescentado).

**Requisitos**: RW-20, RW-21.

---

## Turmas e vínculos

| Chamada | Origem | Erros tratados |
|---|---|---|
| `GET /gestao/turmas` (`ativa`, `semestre_curso`, `periodo_letivo`, `q`, `limit`, `offset`) | T07; também alimenta o seletor de destinos com `ativa=true` | 401, 403 |
| `POST /gestao/turmas` | T07, modal de nova turma | 409 `CODIGO_TURMA_DUPLICADO` → marca o campo código; 422 |
| `GET /gestao/turmas/{id}` | T08 | 404 `TURMA_NAO_ENCONTRADA` |
| `PATCH /gestao/turmas/{id}` | T08, edição e abrir/fechar inscrições | 409, 422 |
| `DELETE /gestao/turmas/{id}` | T08, desativar (lógico) | 404 |
| `GET /gestao/turmas/{id}/vinculos` (`papel`, `limit`, `offset`) | T08 | 403 (docente de outra turma) |
| `POST /gestao/turmas/{id}/vinculos` | T08, vincular pessoa | 409 `JA_VINCULADO`; 409 `PERFIL_INCOMPATIVEL`; 404 `USUARIO_NAO_ENCONTRADO` |
| `DELETE /gestao/turmas/{id}/vinculos/{usuario_id}` | T08, remover vínculo | 404 `VINCULO_NAO_ENCONTRADO` |
| `GET /gestao/usuarios?q=` | T08, busca de pessoa ao vincular | 403 |

Antes de desativar uma turma, a confirmação explica: vínculos preservados, avisos por turma e por
semestre deixam de ser entregues. Antes de remover um vínculo: perda imediata do acesso aos
avisos da turma.

**Requisitos**: RW-23 a RW-27, RW-41.

---

## Solicitações

| Chamada | Origem | Erros tratados |
|---|---|---|
| `GET /gestao/solicitacoes` (`status`, `turma_id`, `limit`, `offset`) | T09 e painel | 401, 403 |
| `POST /gestao/solicitacoes/{id}/aprovar` | T09 | 403 (docente de outra turma); 404; 409 `SOLICITACAO_NAO_PENDENTE`; 409 `JA_VINCULADO` |
| `POST /gestao/solicitacoes/{id}/recusar` (`{ motivo? }`, até 300 caracteres) | T09, modal de recusa | os mesmos |

`409 JA_VINCULADO` na decisão significa que o vínculo surgiu por outra via: a plataforma informa
que a solicitação foi encerrada automaticamente e recarrega a lista.

**Requisitos**: RW-28 a RW-30.

---

## Usuários e perfis

| Chamada | Origem | Erros tratados |
|---|---|---|
| `GET /gestao/usuarios` (`q`, `perfil`, `ativo`, `limit`, `offset`) | T10 | 401, 403 (coordenação lê; aluno nunca chega aqui) |
| `GET /gestao/usuarios/{id}` | T10, detalhe com vínculos | 404 `USUARIO_NAO_ENCONTRADO` |
| `PATCH /gestao/usuarios/{id}` (`{ perfil?, ativo? }`) | T11, somente administração | 403 `SEM_PERMISSAO`; 404; 409 `PERFIL_INCOMPATIVEL`; 422 (autodesativação e último administrador ativo) |

O seletor de perfil apresenta, junto de cada opção, o que aquele perfil pode fazer, conforme a
matriz de permissões da API — e avisa que a mudança vale na requisição seguinte da pessoa.

**Requisitos**: RW-31 a RW-33.

---

## Fase F2 — chamadas previstas

Bloqueadas até a especificação E3 da API. Registradas para que o desenho já as contemple.

| Chamada | Tela | Observação |
|---|---|---|
| `GET /gestao/eventos`, `POST`, `PATCH`, `DELETE`, `…/arquivar` | T12 | Espera-se o mesmo mecanismo de destinos, versões e histórico dos avisos |
| `GET /gestao/eventos/{id}/versoes` e `…/historico` | T12 | Reaproveita a linha do tempo |
| `GET /gestao/turmas/{id}/horarios`, `POST`, `PATCH`, `DELETE` | T13 | Grade semanal da turma |

**Pendências a levar para a spec E3**: (1) se eventos terão filtro por intervalo de datas — a
agenda da web e a visão de mês do aplicativo dependem disso; (2) se a grade de horários terá
verificação de conflito de sala ou de docente no mesmo horário, ou se isso fica a cargo de quem
cadastra.
