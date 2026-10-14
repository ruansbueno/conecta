# Research: Plataforma Web de Gestão

**Feature**: [spec.md](./spec.md) | **Plano**: [plan.md](./plan.md) | **Data**: 2026-10-13

Cada decisão registra a alternativa considerada e o motivo. O critério geral é o Princípio VI: o
mínimo de dependências que resolve um problema concreto.

> **Revisão de 13/10/2026** — D1, D2, D4 e D5 foram reescritas. A versão anterior assumia um
> servidor Node (Next.js) para guardar o cookie de sessão. A infraestrutura do IFSul hospeda a API
> em Python e serve a plataforma como arquivos estáticos; não há onde rodar esse servidor. As
> decisões abaixo preservam o objetivo de segurança trocando o mecanismo.

---

## D1 — Vite + React, com saída estática

**Decisão**: React 19 com TypeScript, construído por Vite; `npm run build` gera arquivos estáticos
servidos por nginx ou Apache.

**Alternativas**: Next.js com servidor Node; Next.js com `output: 'export'`.

**Motivo**: a restrição é de implantação — a infraestrutura disponível hospeda a API em Python e
serve arquivos estáticos, sem processo Node. Next.js com export estático entregaria o mesmo
resultado final, mas carregando o vocabulário de um framework cujas partes mais valiosas (Server
Components, Server Actions, middleware) ficariam desativadas: mais camadas para explicar, nenhum
ganho. Vite é a ferramenta que corresponde ao que de fato será entregue.

**Consequência**: a arquitetura do TCC, que menciona "React/Next.js", passa a ser atendida pela
parte React. A mudança está registrada aqui e no `plan.md`.

---

## D2 — Sessão em cookie `httpOnly` emitido pela API

**Decisão**: `POST /auth/login` é chamado com `credentials: 'include'`; a **API** responde com
`Set-Cookie` contendo o token, marcado `httpOnly`, `Secure` e `SameSite=Strict`. O JavaScript da
plataforma nunca lê, escreve ou vê o token.

**Alternativas**: token em `localStorage`; token em `sessionStorage`; token apenas em memória.

**Motivo**: sem servidor próprio, as três alternativas colocam uma credencial de gestão de 24 h ao
alcance de qualquer script que entre na página — e esta é a interface que cria turmas, altera
perfis e publica para o curso inteiro. Em memória, a credencial some a cada recarga, o que é
inviável para quem passa a manhã na ferramenta. O cookie emitido pela API mantém a propriedade que
realmente importa (token inacessível ao JavaScript) sem exigir uma camada de servidor que não
existe.

**Consequência**: muda o contrato da API — ela passa a emitir o cookie e a aceitar autenticação
por cookie, mantendo o cabeçalho `Bearer` para o aplicativo mobile. Exige D3 e D4.

---

## D3 — Mesma origem entre plataforma e API

**Decisão**: a plataforma é servida no mesmo domínio da API, que fica atrás de um caminho
reservado — por exemplo `https://conecta.ifsul…/` para a interface e `…/api` para a API, por
proxy reverso. Em desenvolvimento, o Vite reproduz isso com seu proxy.

**Alternativas**: domínios distintos com CORS e cookie `SameSite=None`.

**Motivo**: `SameSite=None` exige abrir o cookie para contextos de terceiros, que é justamente o
que a proteção contra CSRF busca evitar; junto, viria configuração de CORS com credenciais, que é
fácil de errar. Mesma origem elimina os dois problemas e simplifica a implantação.

**Consequência**: vira requisito de infraestrutura, não de código. Está registrado como risco no
`plan.md` e é o primeiro item do roteiro de verificação do `quickstart.md`.

---

## D4 — CSRF por *double submit*

**Decisão**: a API emite também um cookie **legível** com um token CSRF; o cliente o lê e o
devolve em cabeçalho a cada `POST`, `PATCH` e `DELETE`. Requisições de leitura não precisam dele.

**Alternativas**: confiar apenas em `SameSite=Strict`; token CSRF por sessão guardado no servidor
(*synchronizer token*).

**Motivo**: `SameSite=Strict` já barra a maior parte dos ataques, mas depende do navegador e não
cobre todos os casos; para uma interface que altera perfis de acesso, a camada extra se justifica.
O *synchronizer token* exigiria estado de sessão no servidor da API, que hoje é sem estado por
causa do JWT. O *double submit* preserva isso.

**Consequência**: este é o **único** cookie que o JavaScript da plataforma toca. Ele não autentica
nada sozinho — perdê-lo não dá acesso a ninguém.

---

## D5 — Chamadas a partir do navegador, sem camada intermediária

**Decisão**: `fetch` do navegador com `credentials: 'include'`, encapsulado por `api/cliente.ts`,
que anexa o cabeçalho CSRF nas escritas, aplica timeout de 15 s, valida a resposta e converte erro
em `ApiError`.

**Alternativas**: `axios`; camada intermediária de servidor (inviável, ver D1).

**Motivo**: `fetch` é nativo e resolve tudo que precisamos; o que falta — token CSRF, timeout,
erro tipado — cabe em cerca de 80 linhas. Manter a camada própria também torna trivial substituir
o `fetch` nos testes, sem configurar interceptadores.

---

## D6 — React Router no modo declarativo

**Decisão**: React Router 7 com tabela de rotas declarativa e carregamento sob demanda por rota.

**Alternativas**: roteador próprio; TanStack Router.

**Motivo**: são 12 rotas, três delas com parâmetro, e uma guarda de sessão. React Router é o
padrão do ecossistema, e o carregamento sob demanda mantém o pacote inicial pequeno. O modo com
*loaders* e *actions* foi descartado: ele imita o que o servidor faria e acrescenta um modelo
mental extra sem resolver nada que `useEffect` e uma função de recurso já resolvam aqui.

---

## D7 — Sem biblioteca de estado nem de cache de dados

**Decisão**: cada página busca o que precisa e controla seus estados de carregamento, dados e
erro. O usuário autenticado vive em um contexto React, carregado uma vez por `GET /me`.

**Alternativas**: TanStack Query; Redux ou Zustand.

**Motivo**: não há dado compartilhado entre telas além do usuário, e as listas são sempre
recarregadas quando a URL muda — cache traria risco de mostrar informação velha numa interface de
gestão, onde o que está na tela vira decisão. Filtros e paginação vivem na URL (D10), que é o
"estado global" de que precisamos.

---

## D8 — Sem biblioteca de formulário

**Decisão**: formulários controlados simples; validação de entrada com `zod` antes de enviar.

**Alternativas**: React Hook Form com resolver.

**Motivo**: os formulários são curtos — turma, vínculo, recusa, perfil — e o único complexo é o
editor de aviso, cuja parte difícil é o seletor de destinos, não a validação. A validação que vale
é a da API; a do cliente serve para evitar viagem inútil e marcar campo.

---

## D9 — `zod` para validar a resposta da API

**Decisão**: cada resposta é validada por um esquema `zod` derivado do contrato, dentro da função
de recurso.

**Alternativas**: confiar na tipagem do TypeScript (`as`).

**Motivo**: `as` é uma promessa, não uma verificação: se a API mudar um campo, a tela quebra em um
ponto distante, com erro difícil de ler. Validando na borda, a falha aparece onde a API respondeu
diferente do contrato — e, como o esquema é cópia do contrato, o teste quebra quando o contrato
mudar, que é o efeito desejado.

**Consequência**: `zod` é a única dependência de produção que não é framework nem estilo. Vale
pelo que protege.

---

## D10 — Filtros e paginação na URL

**Decisão**: `situacao`, `q`, `perfil`, `turma_id`, `limit` e `offset` são parâmetros de busca da
URL.

**Alternativas**: estado em React, com a URL fixa.

**Motivo**: a coordenação trabalha com listas filtradas e precisa compartilhar o que está vendo
("olha as solicitações pendentes desta turma"). Na URL, isso é um link. De quebra, a navegação
para trás passa a funcionar como se espera e nada precisa ser guardado.

---

## D11 — Tailwind configurado a partir dos tokens do design

**Decisão**: Tailwind 4 com os tokens de `design/README.md` declarados no tema; nenhuma cor
literal nas telas, verificado por regra de lint.

**Alternativas**: CSS Modules; biblioteca de componentes pronta.

**Motivo**: a plataforma é densa — tabelas, chips, selos, modais — e Tailwind mantém o estilo
junto do markup sem inventar nome para cada variação. Uma biblioteca pronta traria um visual que
não é o desenhado, e adaptá-la custaria mais do que escrever os oito componentes de que
precisamos.

---

## D12 — Componentes acessíveis próprios

**Decisão**: modal, confirmação e tabela escritos no projeto, seguindo as práticas WAI-ARIA: foco
preso no modal, fechamento com `Esc`, devolução do foco à origem, cabeçalhos associados e anúncio
de carregamento.

**Alternativas**: Radix UI ou Headless UI.

**Motivo**: são dois componentes interativos de verdade. O custo de escrevê-los é menor que o de
adotar e configurar uma biblioteca, e a acessibilidade fica explícita no código, o que é
defensável na banca.

---

## D13 — Testes em três níveis, sem API real

**Decisão**: Vitest + Testing Library para unidade e componente; Playwright para ponta a ponta,
contra um servidor falso que implementa o contrato, **inclusive o cookie de sessão e o token
CSRF**, e sabe forçar `401`, `403`, `409` e lentidão.

**Alternativas**: testar contra a API local com provedor mock.

**Motivo**: a API já tem os próprios testes. Aqui interessa verificar a plataforma, inclusive nos
casos que a API raramente produz sob demanda — sessão expirando no meio de um formulário, destino
que deixou de ser permitido, solicitação decidida por outra pessoa. Com servidor falso, cada caso
é determinístico e roda em CI sem banco.

---

## D14 — Configuração embutida no build

**Decisão**: `VITE_API_BASE_URL` é a única variável, embutida no build, apontando para o caminho
da API na mesma origem (padrão `/api`).

**Alternativas**: arquivo de configuração carregado em tempo de execução.

**Motivo**: com mesma origem, o caminho é praticamente fixo, e um arquivo de configuração extra
acrescentaria uma requisição e um ponto de falha. Fica registrado o que todo build estático
implica: **não existe segredo aqui** — tudo que entra no pacote é público.

---

## D15 — Painel sem endpoint de resumo

**Decisão**: os números do painel vêm do campo `total` de listas consultadas com `limit` pequeno:
avisos recentes, solicitações pendentes e turmas ativas.

**Alternativas**: pedir um endpoint de resumo à API.

**Motivo**: são três chamadas baratas, disparadas em paralelo, e evitam acrescentar superfície à
API por uma tela só. Fica registrado como suposição na spec: se o painel crescer, o endpoint de
resumo passa a se justificar.
