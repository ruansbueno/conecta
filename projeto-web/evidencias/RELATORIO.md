# Evidências da plataforma web — fase F1

28/10/2026. Fecha a fase 10 de [`tasks.md`](../specs/001-plataforma-gestao/tasks.md) (T071–T077).
A saída completa de cada verificação está em [`testes-web-2026-10-28.txt`](testes-web-2026-10-28.txt).

## Resultado das verificações

| Verificação | Como | Resultado |
|---|---|---|
| Tipos e estilo | `npm run typecheck`, `npx eslint .` (inclui as regras próprias: sem cor fora do tema, armazenamento só no rascunho, componentes sem acesso direto à API) | sem erros |
| Unidade e componente | `npx vitest run` | 275 testes em 33 arquivos, todos passam |
| Ponta a ponta | `npx playwright test`, contra o servidor falso que segue o contrato da API | 47 testes, todos passam (rodados duas vezes seguidas a cada etapa) |
| Mensagens de erro (T071) | `tests/unit/mensagens-spec.test.ts` lê a tabela da seção 6 da spec e compara com o mapa da web, nos dois sentidos | spec e web iguais |
| Acessibilidade (T072) | `e2e/acessibilidade.spec.ts`: axe com as regras WCAG 2.1 A e AA em cada tela e modal (abertos), nos três perfis, e nos estados vazio e de erro | nenhuma violação |
| Só teclado (T073) | `e2e/teclado.spec.ts`: do login à exclusão de um aviso (lista, abas, editor, seletor, publicar, detalhe, confirmar); desativar turma; vincular; recusar com motivo; alterar perfil — sem mouse | passa; foco visível e devolvido ao fechar diálogos; a mensagem final recebe o foco |
| Sem perder o digitado (T074) | `e2e/sem-perder-texto.spec.ts`: rede do navegador derrubada no envio e devolvida em seguida | login, novo e editar aviso, nova e editar turma, vincular, recusa e alterar perfil mantêm o que foi digitado ou escolhido, e o mesmo envio funciona com a rede de volta |
| Implantação (T076) | `deploy/verificar.sh`: build → nginx em Docker com HTTPS → API local real | 6 testes passam: rotas, HTTP→HTTPS, cookie `Secure`/`HttpOnly`, cache, nenhuma violação da CSP, cabeçalhos também nas fontes |

### Correções feitas nesta fase

- **Contraste:** a cor `tenue` do design (#8a99b0, 2,9:1 sobre branco) ficou abaixo do AA para texto
  pequeno. Foi escurecida na mesma matiz para #646f80 (5,1:1 sobre branco, 4,6:1 sobre a superfície
  azul).
- **Nome do link com contador:** o número de pendentes da barra lateral passou a fazer parte do nome
  do link ("Solicitações 3 pendentes"), para que quem usa comando de voz possa dizer o que vê.
- **Chip de destino:** o prefixo "Destino:" virou texto só para leitor de tela (um `aria-label` num
  `span` sem papel não é anunciado).
- **Vincular:** os resultados viraram um grupo de rádios sem itens de lista soltos.
- **Login:** o rodapé sobre o fundo navy ganhou contraste.
- **Opções indisponíveis** ("Já está na turma", "Já está no aviso", "Indisponível"): deixaram de ser
  esmaecidas com opacidade, que levava o texto abaixo do AA; agora têm fundo neutro.
- **CSP:** o zod roda sem o teste de `new Function` (`src/lib/zod-sem-eval.ts`), que gerava uma
  violação de `script-src` a cada carregamento.
- **Mensagens:** a tabela da seção 6 da spec passou a listar os `code` que a web já tratava e as
  mensagens próprias de cada tela.

## Telas comparadas com o design (T075)

Capturas em 1440×900, contra a API local real com os dados do seed. Agenda e horários (w-12, w-13)
são da fase F2 e não foram implementados.

**Em todas as telas da gestão** (diferenças deliberadas):

- A barra superior não tem o selo do período letivo ("2026/2") nem o sino: a API não informa o
  período corrente e não há notificações na F1.
- A navegação não tem Agenda, Horários (F2) nem Auditoria (sem tela nem endpoint na F1).
- A cor `tenue` está mais escura, pelo contraste AA.
- A barra superior mostra a seção e o perfil (o design às vezes mostra o curso, que a API não
  informa).

| Design | Implementado | Diferenças deliberadas |
|---|---|---|
| ![w-01](../../design/web/w-01-login.png) | ![w-01](telas/w-01-login.png) | Nenhuma de estrutura. O rodapé "IFSul · …" usa um azul claro, por contraste. |
| ![w-02](../../design/web/w-02-painel-coordenacao.png) | ![w-02](telas/w-02-painel-coordenacao.png) | Números vêm do `total` das listas: o subtítulo traz o total de ativos, não "nesta semana" (a API não filtra por data). O bloco se chama "Avisos recentes" (no design, "Publicados recentemente") porque inclui agendados e arquivados; o horário vai na própria linha, sem coluna à parte. As solicitações levam à fila em vez de ter Aprovar/Recusar no painel. Sem "Próximos na agenda" (F2) e sem "Turmas com inscrições abertas" (a API não tem esse filtro). |
| ![w-03](../../design/web/w-03-avisos-lista.png) | ![w-03](telas/w-03-avisos-lista.png) | Filtros de autor e de turma em campos de seleção (o design tem um botão "Destino"). A busca cobre título e conteúdo. Excluir fica no detalhe do aviso. |
| ![w-04](../../design/web/w-04-aviso-editor.png) | ![w-04](telas/w-04-aviso-editor.png) | Sem "Alcance estimado" (a API não calcula). Chips mostram o nome da turma (a API devolve o nome, não o código, no destino). |
| ![w-05](../../design/web/w-05-aviso-destinos.png) | ![w-05](telas/w-05-aviso-destinos.png) | A busca filtra as turmas ativas carregadas (até 100). |
| ![w-06](../../design/web/w-06-aviso-historico.png) | ![w-06](telas/w-06-aviso-historico.png) | Sem a aba "Alcance". Uma edição é um evento "Aviso editado" com todos os campos que mudaram (como a API registra), não eventos separados por campo nem "Aviso publicado". Excluir e Desarquivar ficam no cabeçalho. |
| ![w-07](../../design/web/w-07-turmas.png) | ![w-07](telas/w-07-turmas.png) | Filtros de semestre e de período letivo (RW-23) ao lado da busca. |
| ![w-08](../../design/web/w-08-turma-detalhe.png) | ![w-08](telas/w-08-turma-detalhe.png) | Só a seção Vínculos (Horários é da F2; avisos e solicitações da turma estão nas próprias telas). Coluna Origem do vínculo (RW-26). Desativar e reativar no cabeçalho. "Criada em" sem o nome de quem criou (a API não informa). |
| ![w-09](../../design/web/w-09-solicitacoes.png) | ![w-09](telas/w-09-solicitacoes.png) | Abas Aprovadas e Recusadas separadas (a API filtra um status por vez). Sem busca por aluno (a API não tem). |
| ![w-10](../../design/web/w-10-usuarios.png) | ![w-10](telas/w-10-usuarios.png) | Sem a coluna Vínculos (a listagem da API não traz turmas; o número aparece no modal). Uma só ação por linha (alterar perfil). |
| ![w-11](../../design/web/w-11-alterar-perfil.png) | ![w-11](telas/w-11-alterar-perfil.png) | Sem "docente desde" (a API não informa). A confirmação de desativar acontece dentro do próprio modal. |
| ![w-14](../../design/web/w-14-painel-docente.png) | ![w-14](telas/w-14-painel-docente.png) | Sem "Próximos na agenda" (F2). As solicitações levam à fila. |
| ![w-15](../../design/web/w-15-aviso-editor-docente.png) | ![w-15](telas/w-15-aviso-editor-docente.png) | O cartão de publicação tem os mesmos botões do editor da coordenação (o design mostra uma versão compacta). |
| ![w-16](../../design/web/w-16-sem-permissao.png) | ![w-16](telas/w-16-sem-permissao-docente.png) | A tela de sem permissão fica fora da casca e é a mesma para qualquer área recusada (o design a mostra dentro da navegação, com texto próprio de "Usuários"). Para aluno há a variante do aplicativo: [captura](telas/w-16-sem-permissao-aluno.png). |
