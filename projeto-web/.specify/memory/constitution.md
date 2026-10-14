<!--
Sync Impact Report
Version: 1.0.0 (2026-10-13) — ratificação inicial da constituição da plataforma web.
Derivada de projeto-api/.specify/memory/constitution.md v2.0.0, que continua prevalecendo
sobre regras de negócio; este documento governa apenas o cliente web de gestão.
Added sections:
  - Core Principles: I. Cliente Sem Regra de Negócio, II. Contrato da API como Fonte da Verdade,
    III. Token Fora do Navegador, IV. Dados no Servidor, Interação no Cliente,
    V. Design System Compartilhado e Acessibilidade, VI. Simplicidade de Dependências
  - Tecnologia e Restrições
  - Fluxo de Desenvolvimento (SDD)
  - Governance
Follow-up TODOs: nenhum.
-->

# CONECTA Web Constitution

Esta constituição governa a plataforma web de gestão do CONECTA (Next.js). A constituição da API
(`projeto-api/.specify/memory/constitution.md`) prevalece em tudo que diz respeito a regra de
negócio, autenticação e autorização; aqui tratamos apenas do cliente. Onde esta e a do aplicativo
mobile tratam do mesmo assunto, elas MUST dizer a mesma coisa — as duas são clientes da mesma API.

## Core Principles

### I. Cliente Sem Regra de Negócio (NON-NEGOTIABLE)

A plataforma web exibe o que a API devolve e envia o que o usuário pede. Ela MUST NOT decidir
quem pode publicar para qual destino, quem pode aprovar uma solicitação, se um aviso ainda é
editável ou se um perfil pode ser alterado. A interface pode **esconder ou desabilitar** um
controle que sabe ser inútil para o perfil corrente — e deve fazê-lo, por clareza —, mas isso é
conveniência: a recusa real é a da API, e toda tela MUST tratar `403` como resposta legítima,
inclusive onde julgava ter permissão.

Em particular, a restrição de destinos do docente é apresentada na interface, mas MUST ser
verificada pela API: receber `403 DESTINO_NAO_PERMITIDO` é um caminho previsto, não um defeito.

### II. Contrato da API como Fonte da Verdade

O comportamento diante de um erro MUST ser decidido pelo campo `code`, nunca pelo texto de
`detail` nem pelo status isolado. Campos, nomes e tipos seguem
`projeto-api/specs/001-auth-perfil-turmas-avisos/contracts/api.md`. Nenhum endpoint é consumido
sem estar nesse contrato: funcionalidade que dependa de endpoint ainda não especificado fica
bloqueada até a spec existir (caso de agenda e horários, E3).

### III. Token Fora do Navegador (NON-NEGOTIABLE)

O JWT emitido pela API MUST ser guardado em cookie `httpOnly`, `Secure` e `SameSite=Lax`, escrito
e lido apenas pelo servidor da própria plataforma. O token MUST NOT ser exposto a código que roda
no navegador — nada de `localStorage`, `sessionStorage`, variável global ou corpo de resposta
visível ao cliente. Chamadas à API partem do servidor, que anexa o token; o navegador conversa
apenas com a própria plataforma.

A senha do usuário MUST NOT ser persistida nem registrada em log. Qualquer `401` da API encerra a
sessão: o cookie é removido e o usuário vai ao login. `403 USUARIO_INATIVO` também encerra.

### IV. Dados no Servidor, Interação no Cliente

Leitura de dados MUST acontecer no servidor (Server Components e Route Handlers); componentes de
cliente existem para interação — formulários, seleção, modais, tabelas que filtram. Operações de
escrita MUST passar por Server Actions ou Route Handlers, nunca por chamada direta do navegador à
API. Nenhum segredo, URL interna ou cabeçalho de autorização MUST chegar ao pacote JavaScript
enviado ao navegador.

### V. Design System Compartilhado e Acessibilidade

Cores, tipografia, espaçamento e componentes vêm do tema central derivado de `design/README.md` —
o mesmo vocabulário visual do aplicativo mobile, a começar pelo chip de destino. Valores de cor e
tamanho MUST NOT ser escritos soltos dentro de telas.

Toda funcionalidade MUST ser operável apenas com teclado, com foco sempre visível e ordem de foco
seguindo a ordem visual. Tabelas MUST ter cabeçalhos associados; modais MUST prender o foco,
fechar com `Esc` e devolver o foco ao elemento de origem. Contraste mínimo AA (4.5:1 para texto
normal, 3:1 para texto grande). Nenhuma informação MUST ser transmitida apenas por cor — selos e
chips sempre trazem texto.

### VI. Simplicidade de Dependências

A plataforma prefere o que o framework já oferece. Uma dependência nova só entra quando resolve
uma necessidade concreta já encontrada e MUST ser justificada no `plan.md` da funcionalidade que
a introduziu. Não se adota biblioteca de estado global, de cliente HTTP nem de formulário sem que
a falta dela tenha causado um problema real. Nenhuma abstração é criada "para o futuro" — YAGNI.

## Tecnologia e Restrições

- Framework: Next.js (App Router) com TypeScript em modo estrito.
- Estilo: Tailwind CSS, configurado a partir dos tokens de `design/README.md`.
- Dados: Server Components para leitura; Server Actions para escrita; `fetch` nativo.
- Sessão: cookie `httpOnly` escrito pelo servidor da plataforma.
- Público-alvo: administração, coordenação e docentes. Alunos usam o aplicativo mobile e recebem
  `403` em qualquer rota de gestão.
- Idioma da interface: português do Brasil; datas e horas no fuso de quem acessa.
- Navegadores: duas últimas versões de Chrome, Firefox, Safari e Edge. Resolução mínima de
  projeto: 1280 px de largura.
- Backend: exclusivamente a API do CONECTA, por HTTPS em homologação e produção.

## Fluxo de Desenvolvimento (SDD)

Mesmo fluxo do `projeto-api` e do `projeto-mobile`, via Spec Kit:

1. `/speckit-constitution` — este documento.
2. `/speckit-specify` — especificação de negócio da funcionalidade.
3. `/speckit-clarify` — ambiguidades resolvidas antes do plano.
4. `/speckit-plan` — plano técnico derivado da spec.
5. `/speckit-tasks` — tarefas acionáveis.
6. `/speckit-implement` — implementação guiada pelas tarefas.

Nenhuma tela é implementada sem spec e plano aprovados. Mudança no contrato da API exige revisão
da spec da plataforma antes de qualquer alteração de código.

## Governance

Esta constituição prevalece sobre práticas conflitantes neste diretório e é subordinada à
constituição da API no que toca a regras de negócio e segurança. Emendas exigem registro do
motivo, atualização de versão e revisão do impacto nas specs já aprovadas.

Política de versionamento:

- MAJOR: remoção ou redefinição incompatível de princípio existente.
- MINOR: novo princípio ou seção, ou expansão material de princípio existente.
- PATCH: esclarecimentos e correções de redação.

Toda spec, plano e revisão de código MUST verificar conformidade com os princípios acima,
especialmente I (cliente sem regra de negócio) e III (token fora do navegador).

**Version**: 1.0.0 | **Ratified**: 2026-10-13 | **Last Amended**: 2026-10-13
