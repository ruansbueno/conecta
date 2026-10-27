# Data Model: Plataforma Web de Gestão

**Feature**: [spec.md](./spec.md) | **Plano**: [plan.md](./plan.md) | **Data**: 2026-10-13

Os tipos da plataforma são **projeções do contrato da API**, não um modelo de domínio próprio.
Nenhum deles contém regra de negócio: não decidem permissão, visibilidade nem elegibilidade.

Convenções: campos da API em `snake_case` viram `camelCase`; datas ISO-8601 UTC viram `Date`,
convertidas para o fuso de quem acessa só na exibição; toda resposta é validada por um esquema
`zod` na função de recurso, antes de virar tipo (D7). Campo ausente vira `null` — a plataforma
não inventa valor que a API não mandou.

---

## Sessao

Existe apenas no servidor. O navegador vê, no máximo, o nome do cookie.

| Campo | Tipo | Origem |
|---|---|---|
| `token` | `string` | `access_token` de `POST /auth/login`, guardado no cookie |
| `expiraEm` | `Date` | agora + `expires_in`, usado como validade do cookie |

A senha nunca entra neste tipo, não é registrada em log e não volta ao cliente. Quem decide a
validade do token é a API, pelo `401` (RW-04).

---

## UsuarioSessao

Resultado de `GET /me`, carregado pelo layout a cada requisição.

| Campo | Tipo | Origem |
|---|---|---|
| `id`, `username`, `nome` | `string` | idem |
| `perfil` | `Perfil` | `perfil` |
| `turmas` | `TurmaVinculo[]` | `turmas` |

```ts
type Perfil = 'administrador' | 'coordenacao' | 'docente' | 'aluno' | 'desconhecido'
```

**Regras de apresentação**

| Derivado | Regra | Para quê |
|---|---|---|
| `iniciais` | duas primeiras iniciais do nome | avatar da barra lateral |
| `ehGestao` | perfil ≠ `aluno` | decidir entre painel e tela de sem permissão |
| `podeAdministrarUsuarios` | perfil = `administrador` | exibir a ação de alterar perfil |
| `podeGerirTurmas` | perfil ∈ {administrador, coordenacao} | exibir Turmas e Usuários no menu |
| `turmasQueLeciona` | turmas com papel `docente` | montar o seletor de destinos do docente |

Todos são **conveniência de interface**. A recusa real vem da API, e toda tela trata `403`
(Princípio I). `perfil` fora do conjunto vira `desconhecido`: a plataforma mostra o rótulo cru e
trata como sem permissão de gestão, em vez de adivinhar.

---

## UsuarioGestao

De `GET /gestao/usuarios` e `GET /gestao/usuarios/{id}`.

| Campo | Tipo | Origem |
|---|---|---|
| `id`, `username`, `nome` | `string` | idem |
| `perfil` | `Perfil` | `perfil` |
| `ativo` | `boolean` | `ativo` |
| `ultimoLoginEm` | `Date \| null` | `ultimo_login_em` |
| `turmas` | `TurmaVinculo[]` | só no detalhe |

**Apresentação**: selo de perfil com cor própria (administrador vermelho, coordenação âmbar,
docente azul, aluno cinza) **sempre acompanhado do texto** — nenhuma informação depende só de cor
(RW-40). `ativo: false` → selo "Inativo" e linha com texto esmaecido. `ultimoLoginEm` nulo →
"nunca acessou".

---

## Turma

De `GET /gestao/turmas` (lista) e `GET /gestao/turmas/{id}`.

| Campo | Tipo | Origem |
|---|---|---|
| `id`, `codigo`, `nome` | `string` | idem |
| `semestreCurso` | `number` | `semestre_curso` (1–12) |
| `periodoLetivo` | `string` | `periodo_letivo` (`AAAA/N`) |
| `inscricoesAbertas` | `boolean` | `inscricoes_abertas` |
| `ativa` | `boolean` | `ativa` |
| `totalAlunos`, `totalDocentes` | `number` | idem, só na lista |
| `criadoEm` | `Date` | `criado_em` |

**Apresentação**: dois selos independentes — situação (`Ativa` / `Inativa`) e inscrições
(`Abertas` / `Fechadas`) —, porque são coisas diferentes e a coordenação opera uma sem a outra.
`semestreCurso` vira "3º semestre". Validação de formulário: código de 1 a 40 caracteres, nome de
3 a 120, semestre de 1 a 12, período no padrão `AAAA/1` ou `AAAA/2` — as mesmas do contrato, para
evitar viagem inútil; a validação que vale é a da API.

---

## Vinculo

De `GET /gestao/turmas/{id}/vinculos`.

| Campo | Tipo | Origem |
|---|---|---|
| `usuario` | `{ id, username, nome }` | `usuario` |
| `papel` | `'aluno' \| 'docente'` | `papel` |
| `origem` | `'manual' \| 'solicitacao'` | `origem` |
| `criadoEm` | `Date` | `criado_em` |

**Apresentação**: `origem` é exibida porque explica como a pessoa entrou — "vinculada pela
coordenação" ou "aprovada por solicitação". Remover vínculo é ação destrutiva: exige confirmação
que diz o efeito (perda imediata dos avisos da turma), conforme RW-27 e RW-41.

---

## SolicitacaoGestao

De `GET /gestao/solicitacoes`.

| Campo | Tipo | Origem |
|---|---|---|
| `id` | `string` | `id` |
| `aluno` | `{ id, username, nome }` | `aluno` |
| `turma` | `{ id, codigo, nome }` | `turma` |
| `status` | `'pendente' \| 'aprovada' \| 'recusada' \| 'cancelada'` | `status` |
| `solicitadaEm` | `Date` | `solicitada_em` |
| `decididaEm` | `Date \| null` | `decidida_em` |
| `decididaPor` | `{ id, nome } \| null` | `decidida_por` |
| `motivoRecusa` | `string \| null` | `motivo_recusa` |

**Apresentação**: pendente há mais de 3 dias recebe destaque âmbar e o texto "há N dias" — é o
sinal que faz a coordenação agir. Decidida mostra quem decidiu e quando; recusada mostra o motivo
quando houver. `podeDecidir` é `status === 'pendente'`: conveniência; a API responde
`409 SOLICITACAO_NAO_PENDENTE` se outra pessoa decidiu enquanto a tela estava aberta.

---

## AvisoGestao

De `GET /gestao/avisos` e `GET /gestao/avisos/{id}`.

| Campo | Tipo | Origem |
|---|---|---|
| `id`, `titulo`, `conteudo` | `string` | idem |
| `autor` | `{ id, nome }` | `autor` |
| `situacao` | `'ativo' \| 'arquivado' \| 'excluido'` | `situacao` |
| `publicarEm` | `Date \| null` | `publicar_em` |
| `publicadoEm` | `Date \| null` | `publicado_em` |
| `versaoAtual` | `number` | `versao_atual` |
| `criadoEm`, `editadoEm`, `arquivadoEm` | `Date \| null` | idem |
| `destinos` | `Destino[]` | `destinos` |

**Regra de apresentação da situação.** A interface mostra **quatro** situações, enquanto a API
tem três — "agendado" é derivado, não um estado do contrato:

| Exibido | Condição |
|---|---|
| `Agendado` | `situacao = ativo` e `publicarEm` no futuro |
| `Ativo` | `situacao = ativo` e já publicado |
| `Arquivado` | `situacao = arquivado` |
| `Excluído` | `situacao = excluido` |

O **selo** de cada item é derivado aqui, porque o item vem da API com `situacao: "ativo"` também
quando está agendado. A **aba** "Agendados", por outro lado, não filtra no cliente: pede
`situacao=agendado` à API (RF-34, emenda v2.1), para que `total` e a paginação saiam corretos.
Nenhuma decisão de negócio depende do selo: quem oculta o aviso até a data é a API.

Outros derivados: `foiEditado` = `editadoEm != null` → marca "editado" e o número da versão;
`podeEditar` = `situacao === 'ativo'` (conveniência; a API responde `409 AVISO_NAO_EDITAVEL`).

---

## Destino

| Campo | Tipo | Origem |
|---|---|---|
| `tipo` | `'todos' \| 'turma' \| 'semestre' \| 'docentes' \| 'desconhecido'` | `tipo` |
| `turma` | `{ id, nome } \| null` | `turma` |
| `semestre` | `number \| null` | `semestre` |

Ao **enviar** (criar ou editar), o formato é o do contrato: `{ tipo, turma_id }` ou
`{ tipo, semestre }`, e `destinos` substitui a lista inteira.

**Chip de destino** — o mesmo do aplicativo, o que faz web e mobile parecerem um produto só:

| Tipo | Rótulo | Ponto | Fundo |
|---|---|---|---|
| `todos` | Todos os usuários | `#2F855A` | `#E8F3EC` |
| `turma` | nome da turma | `#2563EB` | `#EFF4FF` |
| `semestre` | `{n}º semestre` | `#2A4374` | `#EDEFF8` |
| `docentes` | Docentes | `#C2770B` | `#FDF4E6` |
| `desconhecido` | valor cru | cinza | cinza claro |

Tipo novo criado no futuro pela API cai em `desconhecido` e aparece com o rótulo cru — a tela não
quebra.

---

## VersaoAviso

De `GET /gestao/avisos/{id}/versoes`.

| Campo | Tipo | Origem |
|---|---|---|
| `versao` | `number` | `versao` |
| `titulo`, `conteudo` | `string` | idem |
| `publicarEm` | `Date \| null` | `publicar_em` |
| `destinos` | `Destino[]` | `destinos` |
| `criadaPor` | `{ id, nome }` | `criada_por` |
| `criadaEm` | `Date` | `criada_em` |

**Apresentação**: lista da mais recente para a mais antiga; a de número igual a
`aviso.versaoAtual` recebe o selo "Atual".

---

## EventoHistorico

De `GET /gestao/avisos/{id}/historico`.

| Campo | Tipo | Origem |
|---|---|---|
| `id` | `string` | `id` |
| `tipo` | `'criado' \| 'editado' \| 'arquivado' \| 'desarquivado' \| 'excluido'` | `tipo` |
| `usuario` | `{ id, nome }` | `usuario` |
| `ocorridoEm` | `Date` | `ocorrido_em` |
| `versao` | `number \| null` | `versao` |
| `alteracoes` | `Record<string, { de: unknown; para: unknown }> \| null` | `alteracoes` |

**Apresentação da linha do tempo**: ponto colorido por tipo — criado em navy, publicado/
desarquivado em verde, editado em azul, arquivado em cinza, excluído em vermelho. Em `editado`,
cada campo de `alteracoes` vira um par de linhas: o valor anterior tachado em fundo vermelho
claro e o novo em fundo verde claro. Para `destinos`, a comparação é apresentada como conjunto —
"removido SI-3B · mantido SI-3A" —, não como texto bruto, porque é assim que a mudança é
compreendida. Eventos nunca são editáveis: a interface não oferece nenhuma ação sobre eles.

---

## ApiError

Não vem da API como entidade: é a forma que a plataforma dá a qualquer falha.

| Campo | Tipo | Conteúdo |
|---|---|---|
| `code` | `string` | `code` da resposta, ou `SEM_REDE`, `TIMEOUT`, `RESPOSTA_INVALIDA` |
| `status` | `number \| null` | status HTTP, quando houve resposta |
| `detail` | `string \| null` | texto da API — só para log do servidor, nunca exibido |
| `errors` | `{ campo: string; mensagem: string }[]` | de `VALIDATION_ERROR` |

`RESPOSTA_INVALIDA` é o caso em que a API respondeu 2xx mas fora do esquema `zod`: a plataforma
trata como falha, registra no log e mostra a mensagem genérica, em vez de renderizar dado
incerto. A mensagem exibida sai do mapa único `code → (mensagem, efeito)` da seção 6 da spec.

---

## Rascunho de formulário

Único dado que a plataforma guarda no navegador.

| Campo | Tipo | Conteúdo |
|---|---|---|
| `chave` | `string` | `rascunho:aviso:novo` ou `rascunho:aviso:{id}` |
| `titulo`, `conteudo` | `string` | o que foi digitado |
| `destinos` | `Destino[]` | o que foi escolhido |
| `salvoEm` | `Date` | momento da última digitação |

Serve para não perder texto longo em queda de rede ou sessão expirada (RW-42). **Não** contém
token, identificação de usuário nem qualquer dado vindo da API além dos destinos escolhidos. É
apagado ao salvar com sucesso, ao descartar e ao encerrar a sessão.

---

## Tipos da fase F2 (planejados)

Definidos para orientar o desenho, **sem implementação** até a spec E3 da API.

### EventoGestao

`id`, `titulo`, `descricao`, `tipo` (`palestra`, `banca`, `reuniao`, `formatura`, `prova`,
`data_importante`, `outro`), `inicio`, `fim`, `local`, `situacao`, `versaoAtual`, `destinos`.
Reaproveita chip de destino, versões e linha do tempo dos avisos.

### HorarioDeTurma

`id`, `turmaId`, `diaDaSemana` (1–7), `inicio`, `fim`, `disciplina`, `local`, `docente`.
Apresentação em grade semanal; salvar oferece criar aviso para a turma (RW-36).
