# Data Model: Aplicativo CONECTA (Flutter)

**Feature**: [spec.md](./spec.md) | **Plano**: [plan.md](./plan.md) | **Data**: 2026-10-13

Os modelos do app são **projeções do contrato da API**, não um modelo de domínio próprio. Nenhum
deles contém regra de negócio: não decidem visibilidade, permissão nem elegibilidade. Todos são
imutáveis, construídos por `fromJson` e comparáveis por valor para facilitar os testes.

Convenções: campos da API em `snake_case` viram `camelCase` no Dart; datas ISO-8601 UTC viram
`DateTime` em UTC, convertidas para o fuso do aparelho só na hora de exibir; campo ausente ou nulo
no JSON vira `null` no modelo — o app nunca inventa valor padrão para dado que a API não mandou.

---

## Sessao

Guardada no cofre seguro; nunca em cache de conteúdo.

| Campo | Tipo | Origem |
|---|---|---|
| `accessToken` | `String` | `access_token` de `POST /auth/login` |
| `expiraEm` | `DateTime` | agora + `expires_in` (apenas informativo) |
| `usuario` | `Usuario` | `usuario` da resposta de login |

**Regras**
- `expiraEm` serve para exibir informação e para evitar chamada inútil; **quem decide a validade é
  a API**, pelo `401` (RM-04). O app não bloqueia uma chamada só porque considera o token vencido.
- A senha nunca entra neste modelo nem em qualquer outro.

---

## Usuario

| Campo | Tipo | Origem |
|---|---|---|
| `id` | `String` (UUID) | `id` |
| `username` | `String` | `username` |
| `nome` | `String` | `nome` |
| `perfil` | `Perfil` | `perfil` |
| `turmas` | `List<TurmaVinculada>` | `turmas` de `GET /me` |

```
enum Perfil { administrador, coordenacao, docente, aluno, desconhecido }
```

**Regras de apresentação**
- `iniciais`: duas primeiras iniciais do nome, para o avatar.
- `podeSolicitarInscricao`: `perfil == aluno`. É **conveniência de interface** para esconder
  controles; a recusa real vem da API com `403 SEM_PERMISSAO` (RM-20).
- `perfil` fora do conjunto conhecido vira `desconhecido`: o app mostra o rótulo cru devolvido pela
  API e segue funcionando, sem travar a tela.

---

## TurmaVinculada / Turma

`TurmaVinculada` aparece dentro de `GET /me` e de `GET /turmas/minhas`; `Turma` aparece em
`GET /turmas/disponiveis`, sem papel.

| Campo | Tipo | Em `/me` | Em `/turmas/minhas` | Em `/turmas/disponiveis` |
|---|---|---|---|---|
| `id` | `String` | sim | sim | sim |
| `codigo` | `String` | sim | sim | sim |
| `nome` | `String` | sim | sim | sim |
| `semestreCurso` | `int?` | não | sim | sim |
| `periodoLetivo` | `String?` | não | sim | sim |
| `papel` | `Papel?` | sim | sim | — |

```
enum Papel { aluno, docente }
```

**Regras de apresentação**
- `siglaCurta`: duas linhas a partir do código (`TADS-3A-2026-2` → `TADS` / `3A`), usada no quadro
  colorido do cartão de turma.
- `descricaoSemestre`: `3` → "3º semestre"; nulo → "Optativa" não é inferido pelo app — exibe-se
  apenas o que vier de `periodo_letivo`.

---

## Solicitacao

De `GET /solicitacoes/minhas`.

| Campo | Tipo | Origem |
|---|---|---|
| `id` | `String` | `id` |
| `turma` | `TurmaResumo` | `turma` (`id`, `codigo`, `nome`) |
| `status` | `StatusSolicitacao` | `status` |
| `solicitadaEm` | `DateTime` | `solicitada_em` |
| `decididaEm` | `DateTime?` | `decidida_em` |
| `motivoRecusa` | `String?` | `motivo_recusa` |

```
enum StatusSolicitacao { pendente, aprovada, recusada, cancelada }
```

**Regras de apresentação**

| Status | Rótulo | Selo | Ação disponível |
|---|---|---|---|
| `pendente` | Pendente | âmbar | Cancelar solicitação (com confirmação) |
| `aprovada` | Aprovada | verde | nenhuma |
| `recusada` | Recusada | vermelho | nenhuma; exibe `motivoRecusa` quando houver |
| `cancelada` | Cancelada | cinza | nenhuma |

`podeCancelar` é `status == pendente`. Novamente, é conveniência: a API responde
`409 SOLICITACAO_NAO_PENDENTE` se o estado mudou enquanto a tela estava aberta (RM-23).

---

## Aviso

De `GET /avisos` e `GET /avisos/{id}` — mesmo formato.

| Campo | Tipo | Origem |
|---|---|---|
| `id` | `String` | `id` |
| `titulo` | `String` | `titulo` |
| `conteudo` | `String` | `conteudo` |
| `autorId` | `String` | `autor.id` |
| `autorNome` | `String` | `autor.nome` |
| `publicadoEm` | `DateTime` | `publicado_em` |
| `editadoEm` | `DateTime?` | `editado_em` |
| `situacao` | `SituacaoAviso` | `situacao` |
| `destinos` | `List<Destino>` | `destinos` |

```
enum SituacaoAviso { ativo, arquivado }
```

**Regras de apresentação**
- `foiEditado`: `editadoEm != null` → marca "editado" na lista e a linha completa no detalhe.
- `trecho`: primeiras 160 caracteres do conteúdo, cortadas em limite de palavra, para a lista.
- `dataRelativa`: "há 2 h", "ontem", "seg, 09:12" até 7 dias; depois, data curta ("12 set").
- O app **não** ordena nem filtra a lista: mantém a ordem devolvida pela API (RM-11, RM-39).
- A lista nunca deduplica: a API já garante uma ocorrência por aviso.

---

## Destino

| Campo | Tipo | Origem |
|---|---|---|
| `tipo` | `TipoDestino` | `tipo` |
| `turmaId` | `String?` | `turma.id` |
| `turmaNome` | `String?` | `turma.nome` |
| `semestre` | `int?` | `semestre` |

```
enum TipoDestino { todos, turma, semestre, docentes, desconhecido }
```

**Regra de apresentação (chip de destino)**

| Tipo | Rótulo | Ponto | Fundo |
|---|---|---|---|
| `todos` | Todos | `#2F855A` | `#E8F3EC` |
| `turma` | `turmaNome` (ou `turmaId` curto, se o nome não vier) | `#2563EB` | `#EFF4FF` |
| `semestre` | `{n}º semestre` | `#2A4374` | `#EDEFF8` |
| `docentes` | Docentes | `#C2770B` | `#FDF4E6` |
| `desconhecido` | valor cru recebido | cinza | cinza claro |

Um tipo novo criado no futuro pela API (por exemplo `curso`) cai em `desconhecido` e aparece com o
rótulo cru — a tela não quebra, conforme a extensibilidade prevista na spec da API (seção 3.3).

---

## Pagina&lt;T&gt;

Envelope de toda lista paginada.

| Campo | Tipo | Origem |
|---|---|---|
| `items` | `List<T>` | `items` |
| `total` | `int` | `total` |
| `limit` | `int` | `limit` |
| `offset` | `int` | `offset` |

`temMais` = `offset + items.length < total`. É o único critério de fim de lista (RM-14).

---

## ApiFailure

Não vem da API como entidade: é a forma que o app dá a qualquer falha.

| Campo | Tipo | Conteúdo |
|---|---|---|
| `code` | `String` | `code` da resposta, ou `SEM_REDE`, `TIMEOUT`, `RESPOSTA_INVALIDA` |
| `status` | `int?` | status HTTP, quando houve resposta |
| `detail` | `String?` | texto da API — usado só em log, nunca exibido |
| `errors` | `List<ErroDeCampo>` | de `VALIDATION_ERROR`: `campo` e `mensagem` |

A mensagem exibida ao usuário sai do mapa único `code → (mensagem, efeito)` descrito na seção 6 da
spec. `code` desconhecido → mensagem genérica + registro em log local (RM-38).

---

## ConteudoGuardado

Representa uma entrada do cache local.

| Campo | Tipo | Conteúdo |
|---|---|---|
| `chave` | `String` | `cache:{usuarioId}:{recurso}` |
| `coletadoEm` | `DateTime` | momento da resposta bem-sucedida |
| `dados` | `Map<String, dynamic>` | JSON bruto da resposta |

**Recursos guardados**: `perfil`, `avisos_ativos_p1`, `turmas_minhas` (RM-28).

**Regras**
- A escrita só acontece após resposta 2xx.
- A leitura devolve também a idade do dado, usada na faixa "Mostrando dados de …".
- Encerrar a sessão apaga todas as chaves com o prefixo do usuário (RM-30, RM-31).
- Nada relativo a solicitações é guardado: é informação que muda por decisão de terceiros e seria
  enganosa fora de linha.

---

## Modelos da fase F2

Decisões em [`plan-f2.md`](./plan-f2.md).

### Evento

`id`, `titulo`, `descricao?`, `tipo` (`palestra`, `banca`, `reuniao`, `formatura`, `prova`,
`data_importante`, `outro`; qualquer outro valor vira `desconhecido`), `inicio` (UTC), `fim?`
(UTC), `local?`, `autor` (`id`, `nome`), `editadoEm?`, `destinos` (o `Destino` da F1).

Apresentação:

- **Cor por tipo:** prova em âmbar, data importante em navy, os demais em azul. Vale na barra do
  cartão, no rótulo e nos pontos do mês.
- **Faixa de horas:**
  - "19:10 – 20:50" quando há fim;
  - "até 23:59" para data importante sem fim;
  - só o início para os outros tipos sem fim;
  - "de 02/09 a 04/09" para vários dias.
- **Na lista:** agrupado por dia.
- **No mês:** marcador em cada dia que o evento toca, no máximo três pontos por dia.

### Aula (horário de turma)

`id`, `turmaId`, `diaSemana` (1 = segunda … 7 = domingo), `inicio` e `fim` (`HH:MM`, hora local,
sem conversão), `disciplina`, `local?`, `docente?` (`id`, `nome`).

Apresentação:

- grade agrupada por dia da semana, só os dias com aula, em ordem de início;
- cada linha com disciplina, "início–fim · local" e docente;
- seletor de turma a partir de `GET /turmas/minhas`.

### Recursos de cache acrescentados

`agenda_proximos_p1`, `agenda_mes` (mês corrente, com o mês na própria entrada) e
`horarios:{turmaId}`. Mesmo formato de `ConteudoGuardado`; o logout remove todos pelo prefixo do
usuário.
