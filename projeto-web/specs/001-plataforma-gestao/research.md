# Research: Plataforma Web de Gestão

**Feature**: [spec.md](./spec.md) | **Plano**: [plan.md](./plan.md) | **Data**: 2026-10-13

Cada decisão registra a alternativa considerada e o motivo. O critério geral é o Princípio VI: o
mínimo de dependências que resolve um problema concreto.

---

## D1 — Next.js com App Router

**Decisão**: Next.js 15, App Router, TypeScript em modo estrito.

**Alternativas**: SPA com Vite + React Router; Next.js com Pages Router.

**Motivo**: a arquitetura do TCC já define React/Next.js, e o App Router dá exatamente o que o
Princípio III exige: um servidor próprio onde o token pode viver sem nunca chegar ao navegador.
Numa SPA, o token precisaria estar acessível ao JavaScript da página — o oposto do que queremos.
O Pages Router resolveria com `getServerSideProps`, mas sem Server Actions a escrita voltaria a
sair do navegador.

**Consequência**: a plataforma passa a ter um servidor Node em produção. É um custo de
implantação real, aceito em troca do modelo de sessão.

---

## D2 — Sessão em cookie `httpOnly`

**Decisão**: o JWT da API é guardado em cookie `httpOnly`, `Secure`, `SameSite=Lax`, com validade
igual à do token (24 h), escrito por um Route Handler da própria plataforma.

**Alternativas**: token em `localStorage`; token em memória do React.

**Motivo**: `localStorage` é legível por qualquer script que entre na página, e o token dá acesso
a dados acadêmicos e a operações de gestão por 24 h. Em memória, o usuário precisaria entrar de
novo a cada recarga — inviável para quem passa a manhã na ferramenta. O cookie `httpOnly` resolve
os dois: sobrevive ao recarregar e não é visível ao JavaScript.

**Consequência**: toda chamada à API sai do servidor. `SameSite=Lax` basta porque o navegador
nunca envia o cookie para a API diretamente — ele vai só para a própria plataforma.

---

## D3 — `server-only` como garantia, não como combinado

**Decisão**: `src/server/` importa o pacote `server-only`; qualquer componente de cliente que
tente importar dali quebra a compilação.

**Alternativas**: convenção de pastas e revisão de código.

**Motivo**: o Princípio III é inegociável e disciplina humana falha. Com `server-only`, o erro
aparece no build, antes de qualquer revisão.

---

## D4 — Sem biblioteca de dados no cliente

**Decisão**: leitura em Server Components chamando `fetch`; sem TanStack Query, SWR ou similar.

**Alternativas**: TanStack Query, com cache e revalidação no navegador.

**Motivo**: uma biblioteca de cache no cliente pressupõe que o cliente busca dados — e aqui ele
não busca. Quem busca é o servidor, e o cache de requisição do próprio Next cobre o caso de duas
partes da página pedirem `GET /me`. Filtros e paginação vivem na URL, o que já dá navegação para
trás, link compartilhável e recarga correta sem estado algum no navegador.

---

## D5 — Escrita por Server Actions

**Decisão**: toda operação de escrita é uma Server Action, com `revalidatePath` da lista afetada.

**Alternativas**: Route Handlers chamados por `fetch` do navegador.

**Motivo**: Server Actions mantêm a chamada no servidor (Princípio IV), funcionam com formulário
HTML mesmo antes de o JavaScript carregar e dispensam a camada de rotas intermediárias. O único
Route Handler que permanece é o da sessão, porque precisa escrever o cookie e responder a um
formulário que ainda não tem sessão.

---

## D6 — Sem biblioteca de formulário

**Decisão**: formulários nativos com `useActionState` para erro e estado de envio; validação de
entrada com `zod` dentro da Server Action.

**Alternativas**: React Hook Form com resolver.

**Motivo**: os formulários da plataforma são curtos — turma, vínculo, recusa, perfil — e o único
complexo é o editor de aviso, cuja parte difícil é o seletor de destinos, não a validação. A
validação que importa é a da API; a do cliente serve para evitar viagem inútil e marcar campo.

---

## D7 — `zod` para validar a resposta da API

**Decisão**: cada resposta é validada por um esquema `zod` derivado do contrato, na função de
recurso.

**Alternativas**: confiar na tipagem do TypeScript (`as`).

**Motivo**: `as` é uma promessa, não uma verificação: se a API mudar um campo, a tela quebra em
um ponto distante, com erro difícil de ler. Validando na borda, a falha aparece onde a API
respondeu diferente do contrato — e, como o esquema é cópia do contrato, o teste quebra quando o
contrato mudar, que é o efeito desejado.

**Consequência**: `zod` é a única dependência de produção que não vem do framework. Vale pelo que
protege.

---

## D8 — Tailwind configurado a partir dos tokens do design

**Decisão**: Tailwind 4 com os tokens de `design/README.md` declarados no tema; nenhuma cor
literal nas telas, verificado por regra de lint.

**Alternativas**: CSS Modules; biblioteca de componentes pronta (shadcn/ui, MUI).

**Motivo**: a plataforma é densa — tabelas, chips, selos, modais — e Tailwind mantém o estilo
junto do markup sem inventar nomes para cada variação. Uma biblioteca pronta traria um visual que
não é o desenhado, e adaptá-la custaria mais do que escrever os oito componentes de que
precisamos.

---

## D9 — Componentes acessíveis próprios

**Decisão**: modal, menu e tabela escritos no projeto, seguindo as práticas WAI-ARIA: foco preso
no modal, fechamento com `Esc`, devolução do foco à origem, cabeçalhos associados e anúncio de
carregamento.

**Alternativas**: Radix UI ou Headless UI.

**Motivo**: são dois componentes interativos de verdade — modal e confirmação. O custo de
escrevê-los é menor que o de adotar e configurar uma biblioteca, e a acessibilidade fica
explícita no código, o que é defensável na banca. Se surgirem combobox e menus aninhados, a
necessidade será concreta e o Radix volta à mesa.

---

## D10 — Filtros e paginação na URL

**Decisão**: `situacao`, `q`, `perfil`, `turma_id`, `limit` e `offset` são parâmetros de busca da
URL, lidos no servidor.

**Alternativas**: estado em React, com a URL fixa.

**Motivo**: a coordenação trabalha com listas filtradas e precisa compartilhar o que está vendo
("olha as solicitações pendentes desta turma"). Na URL, isso é um link. De quebra, a navegação
para trás passa a funcionar como se espera e nada precisa ser guardado.

---

## D11 — Testes em três níveis, sem API real

**Decisão**: Vitest + Testing Library para unidade e componente; Playwright para ponta a ponta,
contra um servidor falso que implementa o contrato e sabe forçar `401`, `403`, `409` e lentidão.

**Alternativas**: testar contra a API local com provedor mock.

**Motivo**: a API já tem os próprios testes. Aqui interessa verificar a plataforma, inclusive nos
casos que a API raramente produz sob demanda — sessão expirando no meio de um formulário, destino
que deixou de ser permitido, solicitação decidida por outra pessoa. Com servidor falso, cada caso
é determinístico e roda em CI sem banco.

---

## D12 — Configuração por variável de ambiente

**Decisão**: `API_BASE_URL` e `SESSION_COOKIE_NAME` em variáveis de ambiente do servidor, sem
prefixo `NEXT_PUBLIC_`; nenhuma delas chega ao navegador.

**Alternativas**: expor a URL da API ao cliente.

**Motivo**: o navegador não precisa conhecer a API — ele fala só com a plataforma. Manter a URL
fora do pacote evita que alguém, por conveniência, passe a chamar a API direto do cliente e
contorne o modelo de sessão.

---

## D13 — Painel sem endpoint de resumo

**Decisão**: os números do painel vêm do campo `total` de listas consultadas com `limit` pequeno:
avisos recentes, solicitações pendentes e turmas ativas.

**Alternativas**: pedir um endpoint de resumo à API.

**Motivo**: são três chamadas baratas, feitas em paralelo no servidor, e evitam acrescentar
superfície à API por uma tela só. Fica registrado como suposição na spec: se o painel crescer, o
endpoint de resumo passa a se justificar.
