# Implementation Plan: Aplicativo CONECTA (Fase F1; F2 planejada)

**Branch**: `001-app-conecta` | **Date**: 2026-10-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-app-conecta/spec.md`

## Summary

Aplicativo Flutter para Android e iOS que consome a API do CONECTA. **Esta implementação cobre a
fase F1**: login e sessão, avisos (ativos, arquivados, detalhe), minhas turmas, turmas disponíveis,
solicitação e cancelamento de inscrição, minhas solicitações, perfil e cache local para abertura
sem rede. A fase F2 (agenda, visão de mês, evento e horários) está especificada e aguarda a
implementação da E3 na API (`projeto-api/specs/002-agenda-horarios`).

O app não implementa regra de negócio: ele chama os endpoints E1, apresenta o que vier e trata
cada `code` de erro com um comportamento definido. O estado é gerenciado com `provider`, a
navegação usa o `Navigator` com rotas nomeadas e a rede usa o pacote `http` encapsulado por um
`ApiClient` próprio que injeta o token, converte erros em `ApiFailure` e dispara o encerramento de
sessão em `401`.

## Technical Context

**Language/Version**: Dart 3.x, Flutter canal estável (3.2x)

**Primary Dependencies**: `provider` (estado), `http` (rede), `flutter_secure_storage` (token),
`shared_preferences` (cache de conteúdo), `intl` (datas em pt-BR). Em teste: `flutter_test`,
`integration_test`, `mocktail` (dublês), `http` `MockClient`.

**Storage**: nenhum banco local. Token no armazenamento seguro do sistema; respostas de leitura
guardadas como JSON em `shared_preferences`, com chave por usuário.

**Testing**: `flutter test` para unidade e widget; `integration_test` para fluxos ponta a ponta
contra um servidor HTTP falso em memória — nenhum teste depende da API real.

**Target Platform**: Android (minSdk 23) e iOS 13+; telefone, orientação retrato.

**Project Type**: mobile (aplicativo único, sem backend neste repositório)

**Performance Goals**: login até lista de avisos em 5 s (SC-001); abertura com cache, sem rede,
imediata; listas de 20 itens com rolagem a 60 fps em aparelho mediano.

**Constraints**: nenhuma regra de visibilidade no cliente (Princípio I); token só em armazenamento
seguro (Princípio III); comportamento por `code`, nunca por `detail` (Princípio II); HTTPS em
homologação e produção; URL da API injetada por configuração de ambiente.

**Scale/Scope**: escala institucional; escopo desta fase: 9 telas de F1 e 9 endpoints E1.

## Constitution Check

*GATE: verificado antes da Fase 0 e revisto após a Fase 1.*

| Princípio | Como o plano atende |
|---|---|
| I. Cliente sem regra de negócio | Nenhum filtro de visibilidade no app; os repositórios devolvem o que a API retornou. Controles escondidos por perfil são conveniência, e todo `403` tem tratamento |
| II. Contrato como fonte da verdade | `ApiFailure` carrega `code`; um único mapa `code → mensagem/efeito` concentra as decisões; modelos espelham os campos do contrato |
| III. Sessão e dados sensíveis | Token em `flutter_secure_storage`; senha nunca persistida; `SessionController` apaga token e cache em `401` e em `403 USUARIO_INATIVO` |
| IV. Camadas separadas | `models / services / repositories / state / ui`, com dependência em sentido único; widgets recebem dados por parâmetro ou por `Consumer` |
| V. Design system único | `theme/` concentra cores, tipografia e componentes; nenhum literal de cor fora dele |
| VI. Simplicidade | Cinco dependências de produção, todas justificadas em `research.md`; sem camada de injeção de dependência além do `provider` |

**Resultado**: conforme, sem desvio a registrar.

## Project Structure

```text
projeto-mobile/
├── lib/
│   ├── main.dart                     # bootstrap, providers raiz, tema, rotas
│   ├── config/
│   │   ├── ambiente.dart             # URL da API por ambiente (--dart-define)
│   │   └── rotas.dart                # nomes de rota e tabela do Navigator
│   ├── theme/
│   │   ├── cores.dart                # tokens de design/README.md
│   │   ├── tipografia.dart
│   │   └── tema.dart                 # ThemeData do app
│   ├── models/
│   │   ├── usuario.dart              # perfil, turmas vinculadas
│   │   ├── turma.dart
│   │   ├── solicitacao.dart
│   │   ├── aviso.dart                # inclui destinos
│   │   ├── destino.dart
│   │   └── pagina.dart               # items/total/limit/offset
│   ├── services/
│   │   ├── api_client.dart           # http + token + timeout + parse de erro
│   │   ├── api_failure.dart          # code, status, mensagem, campos de validação
│   │   ├── cofre_sessao.dart         # flutter_secure_storage
│   │   └── cache_local.dart          # shared_preferences por usuário, com data
│   ├── repositories/
│   │   ├── auth_repository.dart      # POST /auth/login, GET /me
│   │   ├── avisos_repository.dart    # GET /avisos, GET /avisos/{id}
│   │   ├── turmas_repository.dart    # GET /turmas/minhas, /turmas/disponiveis
│   │   └── solicitacoes_repository.dart
│   ├── state/
│   │   ├── session_controller.dart   # sessão, usuário corrente, logout central
│   │   ├── avisos_controller.dart    # lista paginada, situação, recarga
│   │   ├── turmas_controller.dart
│   │   └── solicitacoes_controller.dart
│   └── ui/
│       ├── login/login_page.dart
│       ├── casca/casca_abas.dart     # barra de abas
│       ├── avisos/{lista_page,detalhe_page,aviso_card}.dart
│       ├── turmas/{minhas_page,disponiveis_page,turma_card}.dart
│       ├── solicitacoes/{lista_page,folha_confirmacao}.dart
│       ├── perfil/perfil_page.dart
│       └── comum/{chip_destino,selo_situacao,estado_vazio,estado_erro,
│                  faixa_cache,esqueleto_lista}.dart
├── test/
│   ├── unit/                         # modelos, api_client, cache, mapa de erros
│   └── widget/                       # uma pasta por tela
├── integration_test/                 # fluxos ponta a ponta com servidor falso
└── specs/001-app-conecta/            # esta documentação
```

**Structure Decision**: aplicativo único com camadas por responsabilidade (`models`, `services`,
`repositories`, `state`, `ui`) em vez de pastas por funcionalidade. Com nove telas, a árvore fica
rasa e a fronteira entre camadas — exigida pelo Princípio IV — fica visível na própria estrutura.
A UI é a única camada que conhece widgets; os repositórios são a única que conhece endpoints.

## Phase 0 — Pesquisa

Registrada em [research.md](./research.md). Decisões fechadas: gerenciamento de estado, navegação,
cliente HTTP, armazenamento do token, formato do cache, tratamento central de `401`, estratégia de
paginação e abordagem de testes sem rede.

## Phase 1 — Projeto

- [data-model.md](./data-model.md): modelos do app, conversão a partir do JSON da API e regras de
  apresentação (datas relativas, cor por tipo de destino, rótulo de status).
- [contracts/consumo-api.md](./contracts/consumo-api.md): cada chamada que o app faz — método,
  caminho, parâmetros, resposta esperada, erros tratados e a tela de origem.
- [quickstart.md](./quickstart.md): como rodar o app contra a API local com provedor mock.

### Fluxos centrais

**Abertura do app**

1. `main` cria `SessionController` e tenta ler o token do cofre.
2. Sem token → `/login`.
3. Com token → chama `GET /me`. Sucesso: guarda o usuário, segue para a casca de abas. `401` ou
   `403 USUARIO_INATIVO`: limpa sessão e cache, vai para `/login` com a mensagem correspondente.
   Falha de rede: entra com o perfil em cache, marcando o conteúdo como desatualizado.

**Chamada autenticada**

`ApiClient` monta a URL, injeta `Authorization`, aplica timeout de 15 s e interpreta a resposta:
2xx vira modelo; corpo de erro vira `ApiFailure(code, status, detail, errors)`; falha de transporte
vira `ApiFailure.semRede()`. Ao ver `401`, o `ApiClient` notifica o `SessionController`, que encerra
a sessão uma única vez, independentemente de quantas chamadas tenham falhado juntas.

**Lista paginada**

O controller mantém `items`, `total`, `offset` e os sinalizadores de carregando/carregando mais. A
primeira página vem do cache (se houver) e é revalidada em seguida; o fim da rolagem pede a página
seguinte enquanto `items.length < total`; puxar para baixo reinicia de `offset = 0`.

**Cache local**

Chave `cache:{usuario_id}:{nome_do_recurso}`, valor `{ "coletado_em": ISO-8601, "dados": <json> }`.
Guardam-se perfil, primeira página de avisos ativos e turmas do usuário. Toda leitura informa a
idade do dado para a faixa da interface. O logout remove todas as chaves do usuário.

### Constitution Check (pós-projeto)

Sem mudanças: nenhuma regra de negócio foi introduzida no cliente, as camadas permaneceram
separadas e nenhuma dependência nova entrou além das cinco previstas.

## Complexity Tracking

Nenhum desvio aos princípios. Dependências de produção: `provider`, `http`,
`flutter_secure_storage`, `shared_preferences`, `intl` — cada uma justificada em `research.md`.

## Fase F2 (planejada, não implementada)

Entra quando a spec E3 da API for publicada. Previsão de impacto: três endpoints novos, modelos
`Evento` e `HorarioDeTurma`, dois controllers, quatro telas (lista, mês, detalhe, grade) e duas
abas. Nenhuma alteração esperada nas camadas de sessão, rede ou cache — o que confirma a
separação adotada aqui.
