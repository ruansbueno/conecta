# Feature Specification: Modo noturno e fim de lista (web)

**Feature Branch**: `036-modo-noturno`

**Created**: 2026-11-11

**Status**: Draft

**Input**: pedido do autor em 11/11/2026: "vamos adicionar o modo noturno [...] o símbolo de modo
noturno fica no canto superior direito e o estado fica guardado no armazenamento local. Nas telas
que podem ficar vazias se houverem poucos dados vamos colocar avisos amigáveis informando que não
há mais conteúdo ao invés de uma tela em branco." O aplicativo recebe o mesmo modo noturno pela
spec [`projeto-mobile/specs/002-modo-noturno`](../../../projeto-mobile/specs/002-modo-noturno/spec.md).

**Referências**

| Documento | Para quê |
|---|---|
| [`specs/001-plataforma-gestao/spec.md`](../001-plataforma-gestao/spec.md) | Telas, estados (RW-37) e regras visuais (RW-38) que continuam valendo |
| [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) | Princípios III (o que pode ficar no navegador) e V (tema central, contraste AA) |
| `design/README.md` | Tokens do tema claro; a paleta escura está na seção "Tema escuro" |
| `design/web-escuro/*.png` | Capturas das telas reais no tema escuro |

## 1. Escopo

**Dentro**

- Tema escuro em todas as telas da plataforma, com a mesma paleta do aplicativo.
- Botão de alternância no canto superior direito de todas as telas, inclusive o login.
- Escolha guardada no navegador; sem escolha, a plataforma segue o tema do sistema.
- Fecho "não há mais…" nas listas curtas sem paginação visível e vazios amigáveis nos blocos do
  painel, onde hoje sobra espaço em branco.

**Fora**

- Guardar a preferência na conta (API): a escolha é do aparelho, não da pessoa. Quem entra em
  outro navegador começa pelo tema do sistema.
- Terceira opção "seguir o sistema" no botão: o botão alterna só entre claro e escuro.
- Tabelas paginadas: o rodapé "1–3 de 3" já diz que a lista acabou.
- Novas capturas em `design/web/` (tema claro): continuam as da proposta original.

## 2. User Scenarios & Testing *(mandatory)*

### User Story 1 — Usar a plataforma no escuro (Priority: P1)

Uma pessoa da coordenação trabalha à noite e quer a tela escura. Ela toca no símbolo da lua, no
canto superior direito; a plataforma inteira escurece na hora, sem recarregar e sem perder o que
estava digitado. No dia seguinte, ao abrir a plataforma no mesmo navegador, continua escura.

**Independent Test**: alternar o tema numa tela com formulário preenchido, recarregar e verificar
que o tema se manteve e o texto continua no campo até a recarga.

**Acceptance Scenarios**:

1. **Given** nenhuma escolha guardada e o sistema em tema claro, **When** a pessoa abre o login,
   **Then** a plataforma aparece clara e o botão mostra a lua, com o nome "Ativar modo noturno".
2. **Given** nenhuma escolha guardada e o sistema em tema escuro, **When** a pessoa abre qualquer
   tela, **Then** a plataforma aparece escura desde o primeiro quadro, sem piscar claro, e o
   botão mostra o sol, com o nome "Desativar modo noturno".
3. **Given** a plataforma clara, **When** a pessoa aciona o botão (clique, `Enter` ou espaço),
   **Then** tudo fica escuro na hora, o botão passa a mostrar o sol e a escolha fica guardada.
4. **Given** a escolha "escuro" guardada, **When** a pessoa recarrega, sai e entra de novo, ou abre
   outra aba, **Then** a plataforma continua escura, inclusive no login.
5. **Given** a escolha "claro" guardada e o sistema em tema escuro, **When** a pessoa abre a
   plataforma, **Then** ela aparece clara: a escolha guardada vence o sistema.
6. **Given** nenhuma escolha guardada, **When** o sistema muda de tema com a plataforma aberta,
   **Then** a plataforma acompanha. Depois que a pessoa escolhe, deixa de acompanhar.
7. **Given** um formulário com texto digitado, **When** a pessoa troca o tema, **Then** o texto, o
   foco e a posição de rolagem continuam onde estavam.

### User Story 2 — Ler tudo no escuro com o mesmo conforto (Priority: P1)

**Acceptance Scenarios**:

1. **Given** o tema escuro, **When** se percorre cada tela (login, painel, avisos, editor,
   histórico, agenda, turmas, detalhe da turma, horários, solicitações, usuários, pedidos de
   acesso, sem permissão), **Then** todo texto tem contraste AA com o fundo e nenhuma área fica
   clara por esquecimento (campos, modais, menus, selos, chips, esqueletos, véu do modal).
2. **Given** o tema escuro, **When** a pessoa vê um botão principal (ex.: "Novo aviso", "Entrar"),
   **Then** ele é azul (`#2563eb`) com texto branco, como no claro.
3. **Given** o tema escuro, **When** a verificação automática de acessibilidade roda nas telas,
   **Then** não há violação de contraste.

### User Story 3 — Saber que a lista acabou (Priority: P2)

Com poucos dados, algumas telas terminam num bloco em branco que parece "carregando" ou
"quebrado". A plataforma passa a dizer que não há mais nada.

**Acceptance Scenarios**:

1. **Given** o painel da coordenação com todas as solicitações pendentes cabendo no bloco,
   **When** o bloco é mostrado, **Then** abaixo da última aparece "Não há mais solicitações
   esperando decisão."
2. **Given** o painel com menos avisos recentes que o limite do bloco, **When** o bloco é
   mostrado, **Then** abaixo do último aparece "Não há mais avisos recentes."
3. **Given** um bloco do painel sem nenhum item, **When** é mostrado, **Then** aparece um vazio
   amigável (ícone e frase) em vez de uma frase solta; o bloco "Meus avisos" do docente e "Avisos
   recentes" da coordenação trazem o atalho "Publicar aviso".
4. **Given** a agenda em Próximos, Realizados ou Arquivados, na última página e com ao menos um
   evento, **When** a lista termina, **Then** aparece "Não há mais eventos."
5. **Given** uma lista com mais itens do que cabem no bloco ou na página, **Then** o fecho não
   aparece (há mais conteúdo).

### Edge Cases

- `localStorage` indisponível (navegação privada restrita, cota, bloqueio): o tema segue o
  sistema e o botão continua alternando na sessão atual; nada quebra nem mostra erro.
- Valor guardado desconhecido (ex.: escrito à mão): tratado como "sem escolha".
- Navegador sem `matchMedia`: tema claro.
- JavaScript desligado: a plataforma não funciona de qualquer modo; nenhum requisito.
- Impressão: fora de escopo; o tema impresso é o que estiver na tela.

## 3. Requirements *(mandatory)*

- **FR-001**: Toda tela MUST oferecer, no canto superior direito, um botão que alterna entre os
  temas claro e escuro. Na casca da gestão ele fica na barra superior, à direita; no login, no
  canto superior direito da página.
- **FR-002**: O botão MUST mostrar a lua quando o tema efetivo é o claro e o sol quando é o
  escuro, com nome acessível "Ativar modo noturno" / "Desativar modo noturno" (o nome diz o que o
  acionamento faz; por isso sem `aria-pressed`, que com nome variável se contradiria), foco
  visível e dica ao passar o mouse com o mesmo texto.
- **FR-003**: A escolha MUST ser guardada no `localStorage` do navegador, na chave
  `conecta:tema`, com os valores `claro` ou `escuro`. Nenhum outro dado vai junto.
- **FR-004**: Sem escolha guardada, o tema efetivo MUST seguir `prefers-color-scheme` e
  acompanhar mudanças dele enquanto a página está aberta; com escolha guardada, a escolha vence.
- **FR-005**: O tema MUST estar aplicado antes da primeira pintura (sem piscar claro no escuro),
  sem violar a política de segurança de conteúdo (`script-src 'self'`).
- **FR-006**: A troca MUST ser imediata, sem recarregar, sem perder texto digitado, foco ou
  rolagem, e MUST valer para as outras abas abertas do mesmo navegador.
- **FR-007**: O tema escuro MUST vir dos mesmos tokens do claro, redefinidos (Princípio V):
  nenhuma tela escreve cor própria. A paleta está em `design/README.md`, "Tema escuro".
- **FR-008**: Todo texto no tema escuro MUST ter contraste AA (4,5:1; 3:1 para texto grande). Os
  botões principais MUST ser `#2563eb` com texto branco nos dois temas.
- **FR-009**: Controles nativos (rolagem, seletor de data, campos) MUST acompanhar o tema
  (`color-scheme`).
- **FR-010**: O painel MUST mostrar o fecho "Não há mais solicitações esperando decisão." e "Não
  há mais avisos recentes." quando todos os itens do bloco couberem nele, e um vazio amigável
  (ícone, frase e, quando houver, atalho) nos blocos sem itens.
- **FR-011**: A agenda MUST mostrar "Não há mais eventos." ao fim da última página de Próximos,
  Realizados e Arquivados quando houver ao menos um evento.
- **FR-012**: Os fechos MUST ser texto (não só cor ou ícone) e MUST NOT aparecer enquanto houver
  mais conteúdo, durante o carregamento ou no erro.

## 4. Success Criteria

- **SC-001**: Testes automatizados cobrem: escolha inicial pelo sistema, alternância, persistência
  após recarga, escolha vencendo o sistema, `localStorage` indisponível e o fecho de cada tela da
  User Story 3.
- **SC-002**: A verificação com axe roda em todas as telas da suíte de acessibilidade também no
  tema escuro, sem violação.
- **SC-003**: Recarregar no escuro não mostra nenhum quadro claro (verificado pela cor de fundo no
  primeiro quadro em teste de ponta a ponta).
- **SC-004**: Nenhuma cor escrita fora de `src/estilos/globals.css`, verificado por um teste que
  busca cores soltas no código.
