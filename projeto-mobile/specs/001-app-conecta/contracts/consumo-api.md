# Contrato de Consumo da API — Aplicativo CONECTA

**Feature**: [../spec.md](../spec.md) | **Data**: 2026-10-13

Este documento descreve **o que o app chama**, não o que a API oferece. A definição dos endpoints
é de `projeto-api/specs/001-auth-perfil-turmas-avisos/contracts/api.md`; em caso de divergência,
aquele documento prevalece e esta spec é revista.

## Convenções do cliente

- Base: `API_BASE_URL` injetada por `--dart-define`; todos os caminhos são relativos a ela.
- Cabeçalhos fixos: `Content-Type: application/json`, `Accept: application/json` e, em recurso
  protegido, `Authorization: Bearer <token>`.
- Timeout de 15 s por chamada; sem repetição automática — repetir é ação do usuário.
- Toda resposta de erro é convertida em `ApiFailure`; a decisão de interface vem do `code`.
- Listas sempre com `limit=20` e `offset` múltiplo de 20.
- O app **não** chama nenhum endpoint `/gestao/*`. Receber um `403` ali seria sintoma de defeito.

---

## 1. `POST /auth/login`

**Tela**: T01 Login · **Autenticação**: não exige

**Envia**: `{ "username": "...", "password": "..." }`

**Recebe 200**: `access_token`, `token_type`, `expires_in`, `usuario { id, username, nome, perfil }`

**Efeito no app**: grava token e `expires_in` no cofre seguro, guarda o usuário na sessão, navega
para a casca de abas, dispara a carga de avisos.

| code | Status | Tratamento |
|---|---|---|
| `CREDENCIAIS_INVALIDAS` | 401 | "Usuário ou senha incorretos."; limpa o campo de senha; permanece |
| `USUARIO_INATIVO` | 403 | "Seu acesso está desativado. Procure a coordenação."; permanece |
| `VALIDATION_ERROR` | 422 | Marca os campos de `errors[]` |
| `SEM_REDE` / `TIMEOUT` | — | "Sem conexão…", com ação de repetir; nada é gravado |

**Requisitos**: RM-01, RM-02, RM-06.

---

## 2. `GET /me`

**Telas**: abertura do app, T14 Perfil, recarga após voltar do segundo plano

**Recebe 200**: `id`, `username`, `nome`, `perfil`, `turmas[] { id, codigo, nome, papel }`

**Efeito no app**: atualiza o usuário corrente e os controles dependentes de perfil; grava em
cache (`perfil`).

| code | Status | Tratamento |
|---|---|---|
| `NAO_AUTENTICADO` | 401 | Encerra a sessão, limpa cache, vai ao login com "Sua sessão expirou." |
| `USUARIO_INATIVO` | 403 | Encerra a sessão com a mensagem de acesso desativado |
| `SEM_REDE` | — | Abre com o perfil em cache e faixa de dados desatualizados |

**Requisitos**: RM-07, RM-08, RM-09.

---

## 3. `GET /avisos`

**Telas**: T02 Avisos ativos, T04 Arquivados

**Parâmetros**: `situacao` (`ativo` padrão | `arquivado`), `limit=20`, `offset`

**Recebe 200**: `items[]` no formato de aviso (com `destinos[]`), `total`, `limit`, `offset`

**Efeito no app**: substitui a lista quando `offset = 0`, concatena quando é página seguinte;
grava em cache apenas a primeira página de `situacao=ativo` (`avisos_ativos_p1`).

| code | Status | Tratamento |
|---|---|---|
| `NAO_AUTENTICADO` | 401 | Encerramento central da sessão |
| `USUARIO_INATIVO` | 403 | Encerramento central da sessão |
| `VALIDATION_ERROR` | 422 | Defeito do app (parâmetro inválido): mensagem genérica + log |
| `SEM_REDE` | — | Exibe cache com faixa de data; sem cache, estado de erro com repetir |

**Requisitos**: RM-11, RM-12, RM-14, RM-15, RM-16, RM-28, RM-29.

---

## 4. `GET /avisos/{aviso_id}`

**Tela**: T03 Detalhe do aviso

**Recebe 200**: o mesmo formato de item da lista.

**Efeito no app**: exibe conteúdo completo, autor, data de publicação e de edição; não grava cache.

| code | Status | Tratamento |
|---|---|---|
| `AVISO_NAO_ENCONTRADO` | 404 | "Este aviso não está mais disponível."; volta à lista e recarrega |
| `NAO_AUTENTICADO` | 401 | Encerramento central da sessão |

**Requisitos**: RM-13, RM-17.

**Nota**: a lista já traz o aviso inteiro. O app ainda assim chama o detalhe ao abrir, para
refletir edição ou arquivamento ocorridos depois da listagem — é o que garante o cenário 8 da
User Story 2. A tela abre imediatamente com o dado da lista e se atualiza quando a resposta chega.

---

## 5. `GET /turmas/minhas`

**Telas**: T06 Minhas turmas, seletor de turma em T13 (F2)

**Parâmetros**: `limit=20`, `offset`

**Recebe 200**: `items[] { id, codigo, nome, semestre_curso, periodo_letivo, papel }`, `total`…

**Efeito no app**: exibe as turmas com o papel; grava em cache (`turmas_minhas`). Lista vazia é
estado normal para coordenação e administração.

| code | Status | Tratamento |
|---|---|---|
| `NAO_AUTENTICADO` | 401 | Encerramento central |
| `SEM_REDE` | — | Cache com faixa de data |

**Requisitos**: RM-18, RM-28.

---

## 6. `GET /turmas/disponiveis`

**Tela**: T07 Turmas disponíveis · **Somente perfil `aluno`**

**Parâmetros**: `limit=20`, `offset`

**Recebe 200**: `items[] { id, codigo, nome, semestre_curso, periodo_letivo }`, `total`…

| code | Status | Tratamento |
|---|---|---|
| `SEM_PERMISSAO` | 403 | "Esta ação não está disponível para o seu perfil."; volta a T06 |
| `NAO_AUTENTICADO` | 401 | Encerramento central |

**Requisitos**: RM-19, RM-20. Não é guardado em cache: a disponibilidade muda por decisão da
coordenação e um dado velho levaria o aluno a uma solicitação que falha.

---

## 7. `POST /turmas/{turma_id}/solicitacoes`

**Tela**: T07 → T08 Folha de confirmação · **Somente perfil `aluno`** · **Sem corpo**

**Recebe 201**: `{ id, turma_id, status: "pendente", solicitada_em }`

**Efeito no app**: mostra a folha de confirmação, remove a turma da lista de disponíveis e marca a
lista de solicitações para recarregar.

| code | Status | Tratamento |
|---|---|---|
| `SEM_PERMISSAO` | 403 | Mensagem de perfil; volta a T06 |
| `TURMA_INDISPONIVEL` | 404 | "Esta turma não está mais aceitando inscrições."; recarrega disponíveis |
| `JA_VINCULADO` | 409 | "Você já faz parte desta turma."; recarrega disponíveis |
| `SOLICITACAO_DUPLICADA` | 409 | "Você já tem uma solicitação pendente para esta turma."; abre T09 |
| `SEM_REDE` | — | Mantém o botão ativo e oferece repetir; nenhuma alteração local é feita antes do 201 |

**Requisitos**: RM-19, RM-23.

---

## 8. `GET /solicitacoes/minhas`

**Telas**: T09 Minhas solicitações, rodapé de T06 (`limit=3`) · **Somente perfil `aluno`**

**Parâmetros**: `status` (opcional), `limit`, `offset`

**Recebe 200**: `items[] { id, turma { id, codigo, nome }, status, solicitada_em, decidida_em,
motivo_recusa }`, `total`…

| code | Status | Tratamento |
|---|---|---|
| `SEM_PERMISSAO` | 403 | Esconde a seção para perfis não-aluno |
| `NAO_AUTENTICADO` | 401 | Encerramento central |

**Requisitos**: RM-21. Sem cache, pelo mesmo motivo do item 6.

---

## 9. `DELETE /solicitacoes/{solicitacao_id}`

**Tela**: T09, após confirmação do usuário

**Recebe 204**: sem corpo.

**Efeito no app**: recarrega a lista de solicitações e a de turmas disponíveis.

| code | Status | Tratamento |
|---|---|---|
| `SOLICITACAO_NAO_ENCONTRADA` | 404 | "Esta solicitação não existe mais."; recarrega |
| `SOLICITACAO_NAO_PENDENTE` | 409 | "Esta solicitação já foi decidida."; recarrega |

**Requisitos**: RM-22, RM-23.

---

## Fase F2 — chamadas previstas

Bloqueadas até a especificação E3 da API. Registradas para que o desenho das telas já as
contemple.

| Chamada | Tela | Observação |
|---|---|---|
| `GET /eventos?de=&ate=&incluir_encerrados=true` | T10 lista, T11 mês | O filtro por intervalo foi confirmado na spec E3 (RF-38): a visão de mês pede exatamente o mês exibido, com os encerrados, e a lista de próximos chama sem `de`/`ate` |
| `GET /eventos/{id}` | T12 | Mesmo padrão de 404 dos avisos |
| `GET /turmas/{turma_id}/horarios` | T13 | Turma escolhida entre as de `GET /turmas/minhas` |

**Pendência resolvida em 13/10/2026**: a spec E3 (`projeto-api/specs/002-agenda-horarios`)
confirmou `de`, `ate` e `incluir_encerrados` em `GET /eventos` (RF-38), que é o que a visão de mês
precisava. Resta apenas a implementação da E3 para desbloquear a fase F2.
