# API Contracts: Agenda e Horários (Entrega 3)

**Feature**: [../spec.md](../spec.md) | **Data**: 2026-10-13

Complementa `specs/001-auth-perfil-turmas-avisos/contracts/api.md`, do qual herda integralmente:
formato de erro `{detail, code}`, catálogo de códigos, paginação (`limit`/`offset`/`total`),
autenticação por `Bearer` ou cookie de sessão com CSRF nas escritas (RF-32, RF-33) e o formato de
destino.

Caminhos de consulta (clientes): `/eventos`, `/turmas/{turma_id}/horarios`.
Caminhos de gestão: `/gestao/eventos`, `/gestao/turmas/{turma_id}/horarios`.

## Códigos acrescentados

| Status | code | Quando |
|---|---|---|
| 404 | `EVENTO_NAO_ENCONTRADO` | Inexistente, excluído ou não visível ao usuário |
| 404 | `HORARIO_NAO_ENCONTRADO` | Inexistente ou de outra turma |
| 409 | `EVENTO_NAO_EDITAVEL` | Evento arquivado ou excluído |
| 409 | `EVENTO_SITUACAO_INVALIDA` | Arquivar o já arquivado / desarquivar o não arquivado |

`PERFIL_INCOMPATIVEL`, `DESTINO_NAO_PERMITIDO`, `SEM_PERMISSAO`, `TURMA_NAO_ENCONTRADA` e
`VALIDATION_ERROR` mantêm o significado da E1.

---

# Consulta (aplicativo e web)

## 1. GET /eventos

Eventos visíveis ao usuário, do mais próximo ao mais distante por `inicio`.

**Auth**: qualquer perfil.

**Query**

| Parâmetro | Padrão | Validação |
|---|---|---|
| `de` | — | data-hora ISO-8601; início do intervalo |
| `ate` | — | data-hora ISO-8601; fim do intervalo; MUST ser ≥ `de` |
| `incluir_encerrados` | `false` | boolean; `true` traz eventos cujo `fim` (ou `inicio`, se não houver `fim`) já passou |
| `tipo` | — | um dos tipos de evento |
| `situacao` | `ativo` | `ativo` ou `arquivado` |
| `turma_id` | — | UUID; filtra eventos com destino `turma` igual a esse id |
| `limit` / `offset` | 20 / 0 | ver Paginação |

Sem `de` e `ate`, devolve os eventos a partir de agora.

**200**
```json
{
  "items": [
    {
      "id": "a1b2...",
      "titulo": "Defesas de TCC II",
      "descricao": "Cinco defesas, com arguição aberta ao público.",
      "tipo": "banca",
      "inicio": "2026-10-24T17:00:00Z",
      "fim": "2026-10-24T21:00:00Z",
      "local": "Sala 203",
      "autor": { "id": "11aa...", "nome": "Marina Duarte" },
      "situacao": "ativo",
      "editado_em": null,
      "destinos": [
        { "tipo": "semestre", "turma": null, "semestre": 6 },
        { "tipo": "docentes", "turma": null, "semestre": null }
      ]
    }
  ],
  "total": 1, "limit": 20, "offset": 0
}
```

**Erros**: 401; 403 `USUARIO_INATIVO`; 422 (`ate` menor que `de`, tipo ou situação inválidos).

**Maps to**: RF-37, RF-38.

---

## 2. GET /eventos/{evento_id}

Um evento visível ao usuário (mesmo formato de item da seção 1).

**Erros**: 404 `EVENTO_NAO_ENCONTRADO` (inexistente, excluído ou sem destino que alcance o
usuário — a API não distingue os casos).

**Maps to**: RF-37.

---

## 3. GET /turmas/{turma_id}/horarios

Grade semanal da turma, ordenada por dia e hora de início.

**Auth**: usuário com vínculo na turma; administração e coordenação em qualquer turma.

**200**
```json
{
  "items": [
    {
      "id": "c9d8...",
      "turma_id": "c3f0...",
      "dia_semana": 1,
      "inicio": "19:10",
      "fim": "20:50",
      "disciplina": "Banco de Dados II",
      "local": "Lab 4",
      "docente": { "id": "22bb...", "nome": "Helena Prado" }
    }
  ],
  "total": 1, "limit": 20, "offset": 0
}
```

`dia_semana`: 1 = segunda … 7 = domingo. `inicio` e `fim` são horas locais (`HH:MM`), sem data —
a grade é recorrência semanal (RF-46).

**Erros**: 401; 403 `SEM_PERMISSAO` (sem vínculo); 404 `TURMA_NAO_ENCONTRADA`.
Turma inativa não devolve grade aos clientes.

**Maps to**: RF-45.

---

# Gestão (plataforma web)

## 4. POST /gestao/eventos

**Auth**: administração e coordenação (qualquer destino); docente (apenas destinos `turma` em que
leciona).

**Request**
```json
{
  "titulo": "Defesas de TCC II",
  "descricao": "Cinco defesas, com arguição aberta ao público.",
  "tipo": "banca",
  "inicio": "2026-10-24T17:00:00Z",
  "fim": "2026-10-24T21:00:00Z",
  "local": "Sala 203",
  "destinos": [
    { "tipo": "semestre", "semestre": 6 },
    { "tipo": "docentes" }
  ]
}
```

| Campo | Obrigatório | Validação |
|---|---|---|
| titulo | Sim | 3–150 caracteres |
| descricao | Não | até 5000 caracteres |
| tipo | Sim | `palestra`, `banca`, `reuniao`, `formatura`, `prova`, `data_importante`, `outro` |
| inicio | Sim | ISO-8601 com fuso |
| fim | Não | ISO-8601; MUST ser maior que `inicio` |
| local | Não | até 120 caracteres |
| destinos | Sim | 1–20 itens, sem repetição; mesmas regras de destino do aviso |

**201**: evento de gestão (formato da seção 6), `versao_atual: 1`, `situacao: "ativo"`.
Efeito: cria versão 1 e registro de histórico `criado`.

**Erros**: 403 `DESTINO_NAO_PERMITIDO`; 403 `SEM_PERMISSAO` (aluno); 404 `TURMA_NAO_ENCONTRADA`;
422.

**Maps to**: RF-35, RF-36.

---

## 5. GET /gestao/eventos

**Auth**: administração e coordenação (todos); docente (somente os que criou).
**Query**: `situacao` (`ativo|arquivado|excluido`; padrão: todos exceto `excluido`), `tipo`,
`autor_id`, `turma_id`, `de`, `ate`, `q`, `limit`, `offset`.

**200**: lista paginada de eventos de gestão.

---

## 6. GET /gestao/eventos/{evento_id}

**200**
```json
{
  "id": "a1b2...",
  "titulo": "Defesas de TCC II",
  "descricao": "Cinco defesas, com arguição aberta ao público.",
  "tipo": "banca",
  "inicio": "2026-10-24T17:00:00Z",
  "fim": "2026-10-24T21:00:00Z",
  "local": "Sala 203",
  "autor": { "id": "11aa...", "nome": "Marina Duarte" },
  "situacao": "ativo",
  "versao_atual": 2,
  "criado_em": "2026-10-01T12:00:00Z",
  "editado_em": "2026-10-05T09:00:00Z",
  "arquivado_em": null,
  "destinos": [
    { "tipo": "semestre", "turma": null, "semestre": 6 }
  ]
}
```

**Erros**: 403 `SEM_PERMISSAO` (docente e evento de outro autor); 404 `EVENTO_NAO_ENCONTRADO`.

---

## 7. PATCH /gestao/eventos/{evento_id}

Parcial; ao menos um campo. `destinos`, se enviado, **substitui** a lista inteira. Campos e
validações iguais aos de `POST`. Se nada mudou → 422 ("nenhuma alteração").

**200**: evento atualizado, com `versao_atual` incrementada e `editado_em` preenchido.
Efeitos: nova versão + registro `editado` com `alteracoes`, no mesmo formato do aviso.

**Erros**: 403 `SEM_PERMISSAO` / `DESTINO_NAO_PERMITIDO`; 404; 409 `EVENTO_NAO_EDITAVEL`; 422.

**Maps to**: RF-39, RF-41.

---

## 8. POST /gestao/eventos/{evento_id}/arquivar · /desarquivar · DELETE /gestao/eventos/{evento_id}

Mesma semântica dos avisos: arquivar e desarquivar devolvem 200 com o evento atualizado; excluir
é lógico e devolve 204. Cada operação gera um registro de histórico.

**Erros**: 403; 404; 409 `EVENTO_SITUACAO_INVALIDA` (arquivar/desarquivar fora de situação).

**Maps to**: RF-40, RF-41.

---

## 9. GET /gestao/eventos/{evento_id}/versoes e /historico

Mesmos formatos de `GET /gestao/avisos/{id}/versoes` e `/historico` da E1, trocando os campos de
conteúdo pelos do evento (`titulo`, `descricao`, `tipo`, `inicio`, `fim`, `local`, `destinos`).
Funcionam também para eventos excluídos (administração e coordenação).

**Erros**: 403 `SEM_PERMISSAO`; 404 `EVENTO_NAO_ENCONTRADO`.

**Maps to**: RF-42.

---

## 10. POST /gestao/turmas/{turma_id}/horarios

**Auth**: administração e coordenação.

**Request**
```json
{
  "dia_semana": 1,
  "inicio": "19:10",
  "fim": "20:50",
  "disciplina": "Banco de Dados II",
  "local": "Lab 4",
  "docente_id": "22bb..."
}
```

| Campo | Obrigatório | Validação |
|---|---|---|
| dia_semana | Sim | inteiro 1–7 |
| inicio / fim | Sim | `HH:MM`; `fim` MUST ser maior que `inicio` |
| disciplina | Sim | 2–120 caracteres |
| local | Não | até 80 caracteres |
| docente_id | Não | UUID de usuário com perfil `docente` |

**201**
```json
{
  "horario": {
    "id": "c9d8...", "turma_id": "c3f0...", "dia_semana": 1,
    "inicio": "19:10", "fim": "20:50", "disciplina": "Banco de Dados II",
    "local": "Lab 4", "docente": { "id": "22bb...", "nome": "Helena Prado" }
  },
  "conflitos": [
    {
      "tipo": "sala",
      "local": "Lab 4",
      "horario_id": "f4e3...",
      "turma": { "id": "d7a1...", "codigo": "SI-3B-2026-2", "nome": "SI 3º Sem B" },
      "inicio": "19:10", "fim": "20:50"
    }
  ]
}
```

**`conflitos` nunca impede a criação** (RF-44): é informação para quem está cadastrando. Vem vazio
quando não há sobreposição. Tipos: `sala` (mesmo `local`, comparação normalizada — sem acento,
sem diferença de maiúsculas e minúsculas, espaços colapsados) e `docente` (mesmo `docente_id`).

**Erros**: 403 `SEM_PERMISSAO`; 404 `TURMA_NAO_ENCONTRADA`; 404 `USUARIO_NAO_ENCONTRADO`
(docente); 409 `PERFIL_INCOMPATIVEL` (docente informado não tem perfil `docente`); 422.

**Maps to**: RF-43, RF-44, RF-47.

---

## 11. GET /gestao/turmas/{turma_id}/horarios

Mesma lista da seção 3, sem a restrição de vínculo e incluindo turmas inativas.
**Query**: `dia_semana`, `limit`, `offset`.

---

## 12. PATCH /gestao/turmas/{turma_id}/horarios/{horario_id}

Parcial; mesmos campos e validações de `POST`. **200**: mesmo envelope de `201`
(`horario` + `conflitos`).

**Erros**: 403; 404 `HORARIO_NAO_ENCONTRADO` / `TURMA_NAO_ENCONTRADA`; 409 `PERFIL_INCOMPATIVEL`;
422.

---

## 13. DELETE /gestao/turmas/{turma_id}/horarios/{horario_id}

Remoção **física**: horário não guarda histórico, por ser dado de configuração da grade, não
comunicação. **204**.

**Erros**: 403; 404 `HORARIO_NAO_ENCONTRADO`.

**Maps to**: RF-43.

---

## Resumo para os clientes

| Cliente | Usa |
|---|---|
| Aplicativo (F2) | `GET /eventos` (com `de`, `ate`, `incluir_encerrados`), `GET /eventos/{id}`, `GET /turmas/{id}/horarios` |
| Plataforma web (F2) | `/gestao/eventos` (CRUD, arquivar, desarquivar, versões, histórico) e `/gestao/turmas/{id}/horarios` (CRUD) |

Nenhum endpoint além destes é necessário para as telas já desenhadas (RF-49).
