# Feature Specification: Modo noturno e fim de lista (aplicativo)

**Feature Branch**: `036-modo-noturno`

**Created**: 2026-11-11

**Status**: Draft

**Input**: pedido do autor em 11/11/2026: "vamos adicionar o modo noturno [...] o símbolo de modo
noturno fica no canto superior direito e o estado fica guardado no armazenamento local. Nas telas
que podem ficar vazias se houverem poucos dados vamos colocar avisos amigáveis informando que não
há mais conteúdo ao invés de uma tela em branco." A plataforma web recebe o mesmo modo noturno
pela spec [`projeto-web/specs/002-modo-noturno`](../../../projeto-web/specs/002-modo-noturno/spec.md),
que traz a paleta completa.

**Referências**

| Documento | Para quê |
|---|---|
| [`specs/001-app-conecta/spec.md`](../001-app-conecta/spec.md) | Telas e estados que continuam valendo |
| [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) | Princípios III (o que fica no aparelho) e V (tema central, contraste AA) |
| `design/README.md` | Tokens do tema claro; a paleta escura está na seção "Tema escuro" |
| `design/mobile-escuro/*.png` | Capturas das telas reais no tema escuro |

## 1. Escopo

**Dentro**

- Tema escuro em todas as telas do aplicativo, com a mesma paleta da plataforma web.
- Botão de alternância no canto superior direito de todas as telas, inclusive o login e os
  detalhes de aviso e de evento.
- Escolha guardada no aparelho; sem escolha, o app segue o tema do sistema.
- Fecho "não há mais…" no fim das listas curtas que hoje terminam em branco.

**Fora**

- Guardar a preferência na conta (API): a escolha é do aparelho.
- Terceira opção "seguir o sistema" no botão.
- Tela de abertura nativa do Android: já segue o sistema (`values-night`), antes de o app saber
  a escolha guardada.
- iOS: o app não é publicado para iOS nesta versão.

## 2. User Scenarios & Testing *(mandatory)*

### User Story 1 — Usar o app no escuro (Priority: P1)

Um aluno lê os avisos à noite. Ele toca na lua, no canto superior direito; o app escurece na hora.
Ao abrir o app no dia seguinte, continua escuro, mesmo depois de sair e entrar de novo.

**Acceptance Scenarios**:

1. **Given** nenhuma escolha guardada e o sistema claro, **When** o app abre, **Then** aparece
   claro e o botão mostra a lua, com a dica "Ativar modo noturno".
2. **Given** nenhuma escolha guardada e o sistema escuro, **When** o app abre, **Then** aparece
   escuro e o botão mostra o sol, com a dica "Desativar modo noturno".
3. **Given** o app claro, **When** o aluno toca no botão em qualquer tela, **Then** tudo escurece,
   o botão vira sol e a escolha fica guardada.
4. **Given** a escolha guardada, **When** o app é fechado e aberto, ou a pessoa sai da conta,
   **Then** o tema escolhido continua, inclusive no login.
5. **Given** a escolha "claro" e o sistema escuro, **When** o app abre, **Then** aparece claro.
6. **Given** nenhuma escolha, **When** o sistema muda de tema com o app aberto, **Then** o app
   acompanha; depois da escolha, deixa de acompanhar.
7. **Given** o login com usuário digitado, **When** o tema muda, **Then** o texto continua no campo.

### User Story 2 — Ler tudo no escuro (Priority: P1)

**Acceptance Scenarios**:

1. **Given** o tema escuro, **When** se percorre cada tela (login, avisos, detalhe do aviso,
   agenda em lista e em mês, detalhe do evento, horários, minhas turmas, turmas disponíveis,
   minhas solicitações, perfil, folhas de confirmação e de escolha), **Then** todo texto tem
   contraste AA e nenhuma área fica clara por esquecimento.
2. **Given** o tema escuro, **When** aparece um botão principal (ex.: "Entrar", "Solicitar"),
   **Then** ele é azul (`#2563eb`) com texto branco.
3. **Given** o tema escuro, **Then** a barra de status do Android usa ícones claros.

### User Story 3 — Saber que a lista acabou (Priority: P2)

**Acceptance Scenarios**:

1. **Given** a agenda em "Por vir", com eventos e sem mais páginas, **Then** ao fim aparece "Não
   há mais eventos por vir."; no filtro de provas, "Não há mais provas marcadas."
2. **Given** turmas disponíveis, com turmas e sem mais páginas, **Then** ao fim aparece "Não há
   mais turmas disponíveis."
3. **Given** minhas solicitações, com pedidos e sem mais páginas, **Then** ao fim aparece "Não há
   mais solicitações."
4. **Given** a grade de horários com aulas em alguns dias, **Then** ao fim aparece "Não há aulas
   nos outros dias da semana."; com aula em todos os dias da semana, nada aparece.
5. **Given** mais páginas a carregar, carregamento ou falha ao carregar mais, **Then** o fecho não
   aparece (o rodapé mostra o carregamento ou o "Tentar de novo", como hoje).

### Edge Cases

- Preferência ilegível ou desconhecida no aparelho: tratada como "sem escolha".
- Falha ao gravar a preferência: o tema muda na sessão atual; na próxima abertura, segue o que
  estava guardado.
- Sair da conta apaga o cache do usuário (RM-30), mas não a preferência de tema, que é do aparelho.
- Fonte a 200% (RM-36): o botão continua com alvo de 48 dp e não empurra o título para fora.

## 3. Requirements *(mandatory)*

- **FR-001**: Toda tela MUST oferecer, no canto superior direito, um botão que alterna entre os
  temas claro e escuro: como última ação da barra superior; no login e na tela "Sem conexão",
  no canto superior direito, dentro da área segura.
- **FR-002**: O botão MUST mostrar a lua no tema claro e o sol no escuro, com dica e rótulo de
  leitor de tela "Ativar modo noturno" / "Desativar modo noturno", e alvo de 48 dp (RM-34).
- **FR-003**: A escolha MUST ser guardada nas preferências do aparelho (`shared_preferences`), na
  chave `conecta:tema`, com `claro` ou `escuro`, e MUST sobreviver a sair da conta.
- **FR-004**: Sem escolha guardada, o tema MUST seguir o do sistema e acompanhar mudanças; com
  escolha, a escolha vence.
- **FR-005**: O primeiro quadro do app MUST já usar o tema certo (a preferência é lida antes de
  desenhar).
- **FR-006**: O tema escuro MUST vir do tema central (Princípio V): nenhuma tela usa cor fixa;
  todas as cores vêm do tema ativo.
- **FR-007**: Todo texto no tema escuro MUST ter contraste AA. Botões principais MUST ser
  `#2563eb` com texto branco nos dois temas.
- **FR-008**: As listas da User Story 3 MUST mostrar o fecho em texto ao fim, somente quando não
  há mais páginas e há ao menos um item.

## 4. Success Criteria

- **SC-001**: Testes cobrem tema inicial pelo sistema, alternância, persistência após reabrir e
  após sair da conta, escolha vencendo o sistema, preferência inválida, e cada fecho.
- **SC-002**: Teste de unidade confere o contraste AA dos pares de texto × fundo nos dois temas.
- **SC-003**: Teste confere que nenhuma tela usa cor fora do tema ativo.
- **SC-004**: A verificação de acessibilidade das telas (`acessibilidade_test.dart`) roda também
  no tema escuro, incluindo `textContrastGuideline`.
