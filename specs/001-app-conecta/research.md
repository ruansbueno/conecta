# Research: Aplicativo CONECTA (Flutter)

**Feature**: [spec.md](./spec.md) | **Plano**: [plan.md](./plan.md) | **Data**: 2026-10-13

Cada decisão registra a alternativa considerada e o motivo da escolha. O critério geral é o
Princípio VI da constituição do app: o mínimo de dependências que resolve um problema concreto.

---

## D1 — Gerenciamento de estado: `provider`

**Decisão**: `provider` com `ChangeNotifier`, um controller por área (sessão, avisos, turmas,
solicitações).

**Alternativas**: Riverpod (mais recursos, menos acoplado ao `BuildContext`); BLoC (fluxo de
eventos explícito, muito usado em trabalhos acadêmicos); `setState` puro.

**Motivo**: o app tem nove telas e um fluxo de dados simples — buscar, exibir, recarregar. O
`provider` é a solução recomendada na documentação do Flutter, tem a menor curva de explicação na
defesa do TCC e resolve o que precisamos: estado compartilhado entre abas e reconstrução por
escopo. BLoC acrescentaria eventos e estados por tela sem ganho proporcional; `setState` puro não
compartilha a sessão entre abas.

**Consequência**: os controllers são classes simples com `notifyListeners()`; nada de código
gerado. Testes de controller não precisam de Flutter, apenas de um repositório falso.

---

## D2 — Navegação: `Navigator` com rotas nomeadas

**Decisão**: tabela de rotas em `config/rotas.dart`, navegação imperativa; a casca de abas mantém
o estado de cada aba com `IndexedStack`.

**Alternativas**: `go_router` (rotas declarativas, deep links).

**Motivo**: não há deep link nem URL a honrar — é um app de telefone com cinco abas e três telas
empilhadas. O `Navigator` já resolve, sem dependência adicional. Se a notificação push entrar no
futuro (abrir um aviso específico), a necessidade de deep link será concreta e aí o `go_router`
pode ser reavaliado.

---

## D3 — Rede: pacote `http` com `ApiClient` próprio

**Decisão**: pacote `http`, encapsulado por `ApiClient`, que injeta o cabeçalho de autorização,
aplica timeout de 15 s, decodifica JSON e converte erro em `ApiFailure`.

**Alternativas**: `dio` (interceptores, retry e cancelamento prontos).

**Motivo**: precisamos de duas coisas que o `dio` ofereceria — injeção de token e tratamento
central de erro — e ambas cabem em cerca de 80 linhas sobre o `http`, que é mantido pelo próprio
time do Dart. Manter a camada própria também torna trivial trocar o cliente por `MockClient` nos
testes, sem configurar interceptores.

**Consequência**: `ApiClient` recebe um `http.Client` no construtor; todo teste injeta o seu.

---

## D4 — Token em `flutter_secure_storage`

**Decisão**: token e `expires_in` no Keychain (iOS) / Keystore (Android), via
`flutter_secure_storage`.

**Alternativas**: `shared_preferences` (texto simples).

**Motivo**: exigência do Princípio III. `shared_preferences` grava em arquivo legível em aparelho
com root/jailbreak e em backup do sistema; o token dá acesso a dados acadêmicos por 24 h.

---

## D5 — Cache de conteúdo em `shared_preferences`, com chave por usuário

**Decisão**: JSON bruto da resposta, guardado como `cache:{usuario_id}:{recurso}` junto da data de
coleta. Recursos guardados: perfil, primeira página de avisos ativos, turmas do usuário.

**Alternativas**: SQLite/Drift (consulta local, offline completo); nenhum cache.

**Motivo**: o objetivo é abrir o app sem rede e ver o que havia, não trabalhar offline. Guardar a
resposta inteira evita duplicar as regras de montagem de tela e mantém o cache fiel ao contrato.
Um banco local traria esquema, migração e sincronização para um problema que não temos.

**Consequência**: a chave por usuário impede que o conteúdo de um apareça para outro no mesmo
aparelho; o logout apaga todas as chaves com o prefixo do usuário.

---

## D6 — Tratamento central de `401`

**Decisão**: o `ApiClient` emite o evento de sessão inválida; o `SessionController` encerra a
sessão uma única vez, mesmo que várias chamadas falhem simultaneamente, e a casca reage navegando
para `/login`.

**Alternativas**: cada tela tratar seu `401`.

**Motivo**: o `401` pode chegar em qualquer chamada, inclusive em duas abas ao mesmo tempo.
Centralizar garante o comportamento único exigido por RM-04 e evita duas navegações empilhadas
para o login.

---

## D7 — Paginação por rolagem

**Decisão**: `limit=20`, `offset` incremental; carregar a próxima página ao chegar a 80% do fim da
lista, enquanto `items.length < total`; puxar para baixo reinicia em `offset = 0`.

**Alternativas**: botão "carregar mais"; paginação por página numerada.

**Motivo**: é o padrão de lista em telefone e é o que as telas desenhadas mostram. O contrato já
devolve `total`, o que torna o fim da lista determinístico, sem chamada extra.

---

## D8 — Mensagens de erro guiadas por `code`

**Decisão**: um único mapa `code → (mensagem, efeito)` em `services/api_failure.dart`, usado por
todas as telas; `code` desconhecido cai em mensagem genérica e é registrado em log local.

**Alternativas**: mensagem montada em cada tela a partir do `detail` da API.

**Motivo**: Princípio II. O `detail` é texto do servidor, pode mudar e não é feito para o usuário
final; o `code` é estável e está catalogado no contrato. Um mapa único também facilita revisar o
texto de todas as mensagens de uma vez.

---

## D9 — Testes sem rede real

**Decisão**: unidade e widget com `MockClient` do pacote `http` devolvendo JSON fixo;
`integration_test` subindo um `HttpServer` em memória que responde conforme o contrato.

**Alternativas**: testar contra a API local com provedor mock.

**Motivo**: a API local já é testada no `projeto-api`. Aqui queremos verificar o app, inclusive em
casos que a API raramente produz sob demanda — `401` no meio da navegação, `409` de solicitação
duplicada, lentidão e queda de rede. Com servidor falso, cada caso é determinístico e roda em CI
sem banco.

**Consequência**: as respostas falsas vivem em `test/fixtures/`, copiadas dos exemplos do contrato
— o que faz o teste quebrar quando o contrato mudar, que é o efeito desejado.

---

## D10 — Datas e fuso

**Decisão**: `intl` com locale `pt_BR`; converter o ISO-8601 UTC da API para o fuso do aparelho;
exibir data relativa ("há 2 h", "ontem") até 7 dias e data curta depois.

**Alternativas**: exibir a data absoluta sempre.

**Motivo**: as telas desenhadas usam data relativa nas listas e data completa no detalhe. O
`intl` já resolve o formato em português; a conversão de fuso evita o erro clássico de mostrar
19:10 como 22:10.

---

## D11 — Tema a partir dos tokens do design

**Decisão**: `theme/cores.dart` e `theme/tipografia.dart` transcrevem a tabela de
`design/README.md`; `tema.dart` monta o `ThemeData`; nenhum literal de cor fora dessa pasta,
verificado em revisão de código.

**Alternativas**: usar as cores direto nas telas.

**Motivo**: Princípio V. As mesmas cores aparecem em chips, selos e abas; um ajuste de paleta
precisa valer em todas as telas de uma vez.

---

## D12 — Configuração de ambiente

**Decisão**: URL da API por `--dart-define=API_BASE_URL=…`, lida em `config/ambiente.dart`, com
padrão apontando para a API local de desenvolvimento.

**Alternativas**: arquivo `.env` com pacote de leitura; URL fixa no código.

**Motivo**: `--dart-define` é nativo, entra no build e não corre o risco de um `.env` esquecido no
pacote publicado. Para três ambientes (local, homologação, produção), não precisa de mais.
