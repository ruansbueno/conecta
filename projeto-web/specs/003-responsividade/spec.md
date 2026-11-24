# Feature Specification: Responsividade da plataforma web

**Feature Branch**: `049-responsividade-web`

**Created**: 2026-11-23

**Status**: Aprovada pelo autor em 23/11/2026 (canvas de telas)

**Input**: pedido do autor em 23/11/2026: "implementar responsividade na versão web [...] imaginei
que no momento da apresentação esse pode ser um ponto levantado e é o mínimo uma aplicação ter a
versão web. todas as regras se mantém, só vamos implementar responsividade".

**Referências**

| Documento | Para quê |
|---|---|
| [`specs/001-plataforma-gestao/spec.md`](../001-plataforma-gestao/spec.md) | Telas, estados e regras visuais que continuam valendo |
| [`specs/002-modo-noturno/spec.md`](../002-modo-noturno/spec.md) | Tokens do tema escuro e botão de tema, que aparecem em todas as larguras |
| Canvas "CONECTA web — responsividade" (artefato privado do autor) | 96 telas aprovadas: celular (390 px) e tablet (768 px), claro e escuro |

## 1. Escopo

**Dentro**

- Todas as telas da gestão funcionando em celular (a partir de 360 px) e tablet, nos dois temas,
  sem rolagem horizontal da página.
- Navegação em menu recolhível abaixo de 1024 px.
- Ajuste de cabeçalhos, abas, filtros, tabelas, grade de horários, calendário, editores e modais
  às larguras menores.

**Fora**

- Qualquer mudança de regra, texto, permissão, fluxo ou contrato da API.
- Mudança no desktop (1024 px ou mais): continua idêntico aos designs `design/web/w-01` a `w-16`.
- Telas próprias de celular (tabelas como cartões, grade como lista por dia): abordagem B,
  descartada (ver §5).
- Gestos (arrastar para fechar o menu) e modo paisagem específico.

## 2. Abordagens consideradas

| | Abordagem | Troca | Decisão |
|---|---|---|---|
| A | Adaptar o que existe: menu recolhível, tabelas e grade rolam dentro do cartão, formulários empilham | Menor risco perto da apresentação; grade e tabelas pedem rolagem lateral no celular | **Escolhida** |
| B | Telas próprias de celular (cartões, lista por dia) | Melhor no celular, mas duplica componentes e testes e arrisca divergir das regras | Descartada |
| C | A + cartões só nas tabelas | Meio-termo de custo e resultado | Descartada |

## 3. Requisitos (RR = requisito de responsividade)

**Casca e navegação**

- **RR-01** A partir de 1024 px a casca é a atual (barra lateral de 252 px). Abaixo de 1024 px a
  barra lateral some e a barra superior ganha, à esquerda, o botão "Abrir menu" (três linhas).
- **RR-02** O menu abre como gaveta de 300 px sobre o conteúdo, com véu (`--color-veu`), e mostra
  exatamente o que a barra lateral mostra: marca, grupos e itens do perfil, contador de
  solicitações, pessoa, perfil e "Sair".
- **RR-03** O menu fecha ao escolher um item, no botão "Fechar menu", com `Esc` ou tocando no
  véu. Enquanto aberto, o foco fica preso nele e o conteúdo atrás fica inerte. Ao fechar, o foco
  volta ao botão "Abrir menu".
- **RR-04** A barra superior tem 60 px no celular e 68 px a partir de 640 px. O título e o perfil
  continuam, e o botão de tema fica no canto direito.
- **RR-05** O conteúdo tem margem lateral de 16 px abaixo de 640 px e de 28 px a partir daí.

**Cabeçalhos de página**

- **RR-06** Abaixo de 640 px, a ação principal da página (Novo aviso, Novo evento, Nova turma,
  Nova aula) desce para baixo do título e ocupa a largura toda. A partir de 640 px fica ao lado do
  título.
- **RR-07** Abaixo de 640 px, os cabeçalhos com voltar põem os botões numa grade abaixo do título:
  2 colunas para 2 ou 4 botões e 3 colunas para 3. Exemplos: Descartar/Publicar;
  Arquivar/Editar/Excluir; Horários/Fechar inscrições/Editar turma/Desativar turma. A partir de
  640 px eles voltam a uma linha, que quebra se precisar.
- **RR-08** O título da página tem 24 px abaixo de 640 px e mantém o tamanho atual a partir daí.

**Listas e tabelas**

- **RR-09** Abas que não cabem rolam para o lado, sem barra visível. A aba ativa continua marcada.
- **RR-10** Abaixo de 640 px, a busca ocupa a largura toda e os seletores (Autor, Turma, Semestre,
  Período, Tipo, Papel) ficam embaixo dela, em grade, com o rótulo acima do campo. Campos de
  largura fixa (`w-[300px]`) passam a ocupar a largura toda até 640 px.
- **RR-11** Toda tabela rola para o lado dentro do próprio cartão, nunca a página. Um esmaecido na
  borda direita indica que há mais colunas. A primeira coluna (aviso, código, pessoa, aluno) fica
  presa ao rolar.
- **RR-12** Na tabela de solicitações, abaixo de 640 px, "Aprovar" e "Recusar" ficam um sobre o
  outro, menores (32 px de altura, texto de 13 px), para caberem ao lado da coluna presa.
- **RR-13** Rodapés de paginação quebram de linha: o texto "Mostrando…" fica em cima e a
  navegação embaixo.

**Telas específicas**

- **RR-14** Painel: contadores em 2 colunas abaixo de 1280 px (já é assim a partir de 640 px; no
  celular passa de 1 para 2). Blocos lado a lado só a partir de 1024 px. Os itens de "Avisos
  recentes" mostram título, autoria e, embaixo, destinos e situação.
- **RR-15** Agenda (lista): cada evento mostra data, tipo, título, hora e local. No celular, o
  destino fica embaixo e as ações (editar, arquivar, histórico) numa linha abaixo dele.
- **RR-16** Agenda (mês): o calendário cabe na largura, sem rolagem. Abaixo de 640 px cada dia
  mostra só o número e a quantidade de eventos. A lista de eventos do mês continua embaixo, e
  escolher um dia continua filtrando a lista.
- **RR-17** Grade de horários: mantém a largura mínima atual (760 px) e rola dentro do cartão, com
  o esmaecido de RR-11. "Docentes nesta grade" e "Mudou alguma aula?" empilham abaixo de 1024 px.
- **RR-18** Editores de aviso e de evento: uma coluna abaixo de 1024 px. A ordem é campos → Quem
  vai receber (ou Quem vê na agenda) → Publicação → Como aparece no aplicativo. Início e Fim do
  evento empilham abaixo de 640 px.
- **RR-19** Detalhe da turma: a grade de dados tem 2 colunas abaixo de 640 px e 3 até 1024 px.
  "Vincular docente" e "Vincular aluno" dividem a largura no celular.
- **RR-20** Login: abaixo de 1024 px (onde o painel azul já some), a marca CONECTA aparece no topo,
  ao lado do botão de tema.

**Modais**

- **RR-21** Abaixo de 640 px os modais ocupam a largura menos 12 px de cada lado, têm altura
  máxima da tela menos 48 px e rolam por dentro. Os botões do rodapé dividem a largura em duas
  colunas.

**Geral**

- **RR-22** Nenhuma página rola na horizontal em 360, 390, 768 e 1024 px, nos dois temas.
- **RR-23** Áreas de toque de pelo menos 40 px em botões de ícone. A exceção são os botões de
  RR-12, que ficam com 32 px de altura e largura total da coluna.
- **RR-24** O axe continua sem violações em todas as larguras testadas.

## 4. Cenários de aceite

1. **Given** a coordenação num celular de 390 px, **When** abre o painel, **Then** vê a barra
   superior com o botão de menu, nenhuma rolagem horizontal, os contadores em 2 colunas e
   "Novo aviso" na largura toda.
2. **Given** o menu fechado em 390 px, **When** a pessoa toca em "Abrir menu" e depois em
   "Turmas", **Then** a página de turmas abre, o menu fecha e o foco fica no conteúdo.
3. **Given** o menu aberto, **When** a pessoa aperta `Esc`, **Then** o menu fecha e o foco volta
   ao botão "Abrir menu".
4. **Given** solicitações pendentes em 390 px, **When** a pessoa rola a tabela para o lado,
   **Then** o nome do aluno continua visível e os botões "Aprovar" e "Recusar" aparecem
   inteiros.
5. **Given** a agenda no mês em 390 px, **When** a pessoa toca num dia com eventos, **Then** a
   lista embaixo mostra só os eventos desse dia, como no desktop.
6. **Given** qualquer tela em 1440 px, **Then** o layout é idêntico ao atual.

## 5. Decisões do autor

- Abordagem A (23/11/2026).
- Telas aprovadas no canvas, com todas as telas no celular, as que mudam de forma no tablet e
  todas também no tema escuro (23/11/2026).
- Botões de decisão menores no celular (RR-12), pedido do autor na aprovação.
- Sem "alcance estimado" no editor de aviso: não existe na aplicação. Os designs seguem a
  aplicação real, não os PNGs antigos.

## 6. Escolhas deixadas para a implementação

- Pontos de quebra: `sm` (640 px) e `lg` (1024 px) do Tailwind, sem pontos novos.
- Como prender o foco no menu (componente próprio ou `inert` no conteúdo).
- Como reordenar os blocos do editor (ordem no DOM ou `order` do CSS), desde que a ordem de
  leitura e de teclado siga a ordem visual.
