# Histórico do desenvolvimento

Como o CONECTA foi construído, entrega por entrega. O estado atual e o guia de avaliação estão no
[README](../README.md). Os números de testes de cada linha são os daquela etapa; as execuções
finais estão listadas no README e no Apêndice B do TCC.

## Ordem de execução

Decidida em 13/10/2026, para que o fluxo completo seja demonstrável cedo:

1. ✅ API — entrega E1 (autenticação, perfil, turmas, solicitações, avisos).
2. ✅ Aplicativo — apenas os avisos, para ter algo utilizável em mãos.
3. ✅ API — entrega E2 (endpoints de gestão).
4. ✅ Plataforma web — fase F1, fechando o ciclo web → API → app.
5. ✅ Aplicativo — fase F1 completa.
6. ✅ E3 — agenda e horários, na API e nos dois clientes.
7. ✅ Login pela API de autenticação do IFSul no lugar do Moodle (06/11/2026), com o roteiro contra a
   API real.

## Entregas

| Entrega | Conteúdo | Situação |
|---|---|---|
| **E1 — API + aplicativo** | Autenticação, perfis, consulta de perfil, turmas, solicitação de inscrição, consulta de avisos | ✅ Login pela API de autenticação do IFSul validado com uma conta real de aluno; o caso da conta de servidor não foi executado |
| **E2 — Plataforma web** | Gestão de usuários, turmas, vínculos, aprovações e ciclo de vida dos avisos; fluxo completo web → API → app | ✅ |
| **E3 — Agenda e horários** | Eventos (palestras, bancas, provas, datas importantes) e horários das turmas | ✅ Na API, na web e no aplicativo |

## Pull requests

Cada etapa entrou por pull request, com revisão independente e os achados corrigidos com teste
antes do merge.

| Parte | O que funciona | Testes | PR |
|---|---|---|---|
| **API — E1** | Login (provedor simulado), sessão de 24 h, perfil, turmas, solicitação de inscrição e as 9 rotas do aplicativo | pytest | [#1](https://github.com/ruansbueno/conecta/pull/1) |
| **API — E2** | Rotas de gestão (`/gestao/*`): usuários e perfis, turmas, vínculos, decisão de solicitações, avisos com destinos, versões e histórico imutáveis; teste de ponta a ponta da spec §9.3 | 583 testes (E1 + E2) | [#3](https://github.com/ruansbueno/conecta/pull/3) |
| **Aplicativo — marco de avisos** | Login, sessão segura, aba Avisos (ativos e arquivados, detalhe, cache para abrir sem rede) | 151 testes (unidade e widget) + integração com servidor falso | [#2](https://github.com/ruansbueno/conecta/pull/2) |
| **Aplicativo — fase 5** | Aba Turmas: minhas turmas com o papel em cada uma, estado vazio por perfil, turmas disponíveis para o aluno e as solicitações recentes; cache para abrir sem rede | 188 testes (unidade e widget) | [#14](https://github.com/ruansbueno/conecta/pull/14) |
| **Aplicativo — fase 6** | Solicitar inscrição numa turma disponível, folha de confirmação, Minhas solicitações com os quatro status e o motivo da recusa, cancelar a pendente; Minhas turmas sempre atualizada | 226 testes (unidade e widget) + integração no emulador | [#15](https://github.com/ruansbueno/conecta/pull/15) |
| **Aplicativo — fase 7** | Perfil com curso, período, vínculos e saída com confirmação; perfil reavaliado ao abrir a aba e ao voltar do segundo plano, ajustando as abas sem novo login | 236 testes (unidade e widget) + integração no emulador | [#16](https://github.com/ruansbueno/conecta/pull/16) |
| **Aplicativo — pontos menores** | Os achados menores das revisões das fases 4 a 7: respostas fora de ordem, recargas repetidas, faixa de dados guardados, telas empilhadas quando o perfil muda | 252 testes (unidade e widget) + 13 de integração | [#17](https://github.com/ruansbueno/conecta/pull/17) |
| **Aplicativo — fase 8** | Mensagens conferidas contra a spec, acessibilidade (regras do Flutter) e fonte a 200% em todas as telas, uso sem rede nas três abas, log local de toda falha de API, token só no armazenamento seguro, [evidências](../projeto-mobile/evidencias/RELATORIO.md) com capturas ao lado do design | 273 testes (unidade e widget) + 16 de integração no emulador | [#18](https://github.com/ruansbueno/conecta/pull/18) |
| **Web — fases 1 a 4** | Fundação (tema, sessão por cookie + CSRF, casca), login, publicação de avisos com seletor de destinos, restrição do docente, agendamento, prévia do cartão do app e rascunho local | Vitest + Playwright | [#4](https://github.com/ruansbueno/conecta/pull/4) |
| **Web — fase 5** | Lista de avisos por situação com busca e filtros, histórico com texto antes/depois, versões, arquivar/desarquivar/excluir com confirmação | Vitest + Playwright | [#5](https://github.com/ruansbueno/conecta/pull/5) |
| **Web — fase 6** | Turmas por situação com busca e filtros, criar/editar, abrir/fechar inscrições, desativar/reativar, vínculos com origem, vincular buscando a pessoa e desvincular com alerta | Vitest + Playwright | [#7](https://github.com/ruansbueno/conecta/pull/7) |
| **Web — fase 7** | Fila de solicitações por status e turma, destaque para quem espera há mais de 3 dias, aprovar criando o vínculo, recusar com motivo, decisão com quem decidiu e quando | Vitest + Playwright | [#8](https://github.com/ruansbueno/conecta/pull/8) |
| **Web — fase 8** | Usuários por perfil e situação, alterar perfil com a descrição de cada um (só administração), ativar e desativar, mudança valendo na navegação seguinte da pessoa | Vitest + Playwright | [#9](https://github.com/ruansbueno/conecta/pull/9) |
| **Web — fase 9** | Painel da coordenação e do docente (números do `total` das listas, blocos que falham sozinhos), contador de solicitações na barra lateral e o e2e do fluxo completo web → API → app | Vitest + Playwright | [#10](https://github.com/ruansbueno/conecta/pull/10) |
| **Web — pontos menores** | Os achados menores das revisões das fases 5 a 9: textos e datas, carregamento e mensagens das listas, foco e leitores de tela, comportamento das telas e um servidor falso mais fiel à API | 271 testes (Vitest) + 30 de ponta a ponta (Playwright) | [#11](https://github.com/ruansbueno/conecta/pull/11) |
| **Web — fase 10** | Mensagens de erro conferidas contra a spec, axe (WCAG 2.1 AA) em todas as telas, uso só com teclado do login à exclusão de um aviso, nada digitado se perde sem rede, [evidências](../projeto-web/evidencias/RELATORIO.md) com capturas ao lado do design e implantação estática com nginx verificada em Docker | 275 testes (Vitest) + 47 de ponta a ponta (Playwright) + 6 da implantação | [#13](https://github.com/ruansbueno/conecta/pull/13) |
| **API — CSRF assinado** | Emenda v2.2 (RF-33): o token CSRF da web passa a ser assinado com chave própria (`CSRF_SECRET`) e preso à sessão; token de outra sessão, adulterado ou sem assinatura é recusado | 594 testes (API) + 8 da implantação contra a API real | [#19](https://github.com/ruansbueno/conecta/pull/19) |
| **API — nomenclatura do banco** | Tabelas com `tb_` e colunas com prefixo (`id_`, `nm_`, `cod_`, `txt_`, `fl_`, `dt_`, `hr_`, `nr_`, `st_`, `tp_`), como no diagrama ER; só os nomes mudam, a API e os clientes ficam iguais | 599 testes (API) + 8 da implantação contra a API real | [#20](https://github.com/ruansbueno/conecta/pull/20) |
| **API — E3, eventos** | Agenda: criar evento para o público certo (regra de alcance única, compartilhada com os avisos), consulta com intervalo e encerrados, gestão com versões e histórico imutáveis | 733 testes (API) | [#22](https://github.com/ruansbueno/conecta/pull/22) |
| **API — E3, horários** | Grade semanal das turmas com conflitos de sala e de docente informados sem bloquear, consulta por vínculo, eventos de vários dias em cada dia que cobrem, matriz de permissões, ponta a ponta e seed da agenda: E3 completa na API | 886 testes (API) | [#23](https://github.com/ruansbueno/conecta/pull/23) |
| **Web — F2, agenda** | Agenda com abas Próximos, Mês (calendário), Realizados e Arquivados, editor de evento com o seletor de destinos dos avisos, histórico e versões; `quando=proximos\|realizados` na API | 339 testes (Vitest) + 47 de ponta a ponta (Playwright) | [#25](https://github.com/ruansbueno/conecta/pull/25) |
| **Web — F2, horários** | Grade semanal da turma, modal de aula, conflitos como atenção, "avisar a turma"; E2E, axe e teclado da F2, validação visual contra a API real | 385 testes (Vitest) + 54 de ponta a ponta | [#26](https://github.com/ruansbueno/conecta/pull/26) |
| **Aplicativo — F2, agenda** | Aba Agenda: Próximos e Provas com filtro de tipo, mês de domingo a sábado com marcadores, detalhe do evento, sem rede | 328 testes (unidade e widget) + 19 de integração | [#28](https://github.com/ruansbueno/conecta/pull/28) |
| **Aplicativo — F2, horários** | Aba Horários com troca de turma, sem rede, fonte a 200% conferida no aparelho, [evidências](../projeto-mobile/evidencias/RELATORIO-F2.md) | 348 testes (unidade e widget) + 22 de integração | [#29](https://github.com/ruansbueno/conecta/pull/29) |
| **Fechamento** | Cookies com prefixo `__Host-`; sair sempre expira a sessão; nginx sem a documentação da API exposta e com redirecionamentos (HTTP→HTTPS e os da API) que ficam na mesma origem; Descartar no editor nunca sai da aplicação; pontos menores das revisões corrigidos na web e no app | API 891, web 397 (Vitest) + 57 (Playwright) + 11 da implantação, app 354 + 22 de integração | [#30](https://github.com/ruansbueno/conecta/pull/30) |
| **Login pelo IFSul** | API de autenticação do IFSul no lugar do Moodle; servidores que entram pela primeira vez viram pedido de acesso, aprovado pela administração ou pela coordenação na web (aba Aguardando acesso); primeiro administrador por script; roteiro de validação real (casos sem conta já validados contra a API do IFSul) | API 985, web 414 (Vitest) + 61 (Playwright), app 357 | [#31](https://github.com/ruansbueno/conecta/pull/31) |
| **Login pelo IFSul — conta real** | Roteiro com uma conta real de aluno contra a API do IFSul (8 de 8 casos executados corretos); nova tentativa quando a conexão com o IFSul nem abre; seed que não reabre pedido decidido; servidor falso da web na ordem de verificação da API | API 995, web 414 (Vitest) + 62 (Playwright) | [#33](https://github.com/ruansbueno/conecta/pull/33) |
| **Evidências finais** | Registros das suítes completas, da implantação, da integração no emulador e do roteiro integrado em 01/11 e 06/11 | — | [#32](https://github.com/ruansbueno/conecta/pull/32) |
| **Evidências por teste** | Registros da web e do aplicativo com cada teste pelo nome (10/11) | web 414 (Vitest) + 62 (Playwright), app 357 | [#34](https://github.com/ruansbueno/conecta/pull/34) |
| **Pronto para a banca** | README da raiz como guia para a avaliação, histórico e documentos superados em `docs/`, nome do curso corrigido nos clientes, "Tentar de novo" do rodapé dos avisos repetindo a página que falhou, licença MIT | API 995, web 414 (Vitest), app 358 | [#35](https://github.com/ruansbueno/conecta/pull/35) |
| **Modo noturno** | Web e aplicativo: botão de lua e sol no canto superior direito de todas as telas, tema que segue o sistema até a pessoa escolher, escolha guardada no navegador ou no aparelho, paleta escura com contraste AA conferido nos dois temas; fecho "não há mais" nas listas curtas e avisos nos blocos vazios do painel (specs 002) | web 465 (Vitest) + 74 (Playwright) + 11 da implantação, app 408 + 22 de integração | [#36](https://github.com/ruansbueno/conecta/pull/36) |
| **Modelo de dados** | ER do SQL Power Architect em `docs/modelo-de-dados/` com os tipos do banco (UUID, TEXT, JSONB, TIMESTAMPTZ) e linhas que saem da coluna FK, a partir da validação externa do DER; dois CHECK registrados para aplicar depois (`pendente-restricoes.sql`) | — (sem mudança de código) | [#37](https://github.com/ruansbueno/conecta/pull/37) |
| **Restrições do banco** | Os dois CHECK do #37 aplicados pela migração `212a05273ad8`: decisor obrigatório fora de pendente (na cancelada, o próprio aluno) e tipo institucional só aluno, administrativo ou nulo; decisor obrigatório no serviço e no script de aprovação | API 1011 | [#38](https://github.com/ruansbueno/conecta/pull/38) |
| **Evidências de 12/11** | Execução final depois do modo noturno, do modelo de dados e das restrições do banco, cada teste pelo nome: API, web (com a implantação), aplicativo (com a integração no emulador) e roteiro integrado (9 de 9) | API 1011, web 465 (Vitest) + 74 (Playwright) + 11 da implantação, app 408 + 22 de integração | [#39](https://github.com/ruansbueno/conecta/pull/39) |
| **Revisão de código** | Corrida entre troca de perfil e vínculo; aviso excluído com 404 ao arquivar; histórico do aviso em UTC; mesmo erro para reagendar aviso publicado; busca com `%` e `_` literais; destinos e decisores numa consulta; gestão comum a avisos e eventos (emenda v2.4, specs/003) | API 1028, web 466 (Vitest) + 74 (Playwright) + 11 da implantação, roteiro 9 de 9 | [#40](https://github.com/ruansbueno/conecta/pull/40) |
| **Puxar para atualizar e pedidos na aba** | App: puxar para atualizar no Mês e no Perfil, e o Mês buscado de novo ao voltar ao chip; web: bolinha com o número de pedidos na aba Aguardando acesso | web 468 (Vitest) + 74 (Playwright), app 417 + 22 | [#42](https://github.com/ruansbueno/conecta/pull/42) |
| **Docente: provas e aulas** | Emenda E3.1 da API: ao docente, só as provas que ele criou na consulta de eventos (RF-53) e `GET /horarios/minhas` com as aulas dele em todas as turmas (RF-54); no app, Horários do docente com as próprias aulas | API 1041, app 425 + 23 | [#43](https://github.com/ruansbueno/conecta/pull/43) |

**Evidências finais** (suítes completas, implantação, integração no emulador e o roteiro integrado
web → API → app contra a API real): no fechamento, em 01/11/2026
([API](../projeto-api/evidencias/testes-final-2026-11-01.txt),
[web](../projeto-web/evidencias/testes-web-final-2026-11-01.txt),
[app](../projeto-mobile/evidencias/testes-app-final-2026-11-01.txt),
[roteiro](../projeto-api/evidencias/roteiro-integrado-2026-11-01.txt)), e depois do login pelo IFSul,
em 06/11/2026 ([API](../projeto-api/evidencias/testes-final-2026-11-06.txt),
[web](../projeto-web/evidencias/testes-web-final-2026-11-06.txt),
[app](../projeto-mobile/evidencias/testes-app-final-2026-11-06.txt),
[roteiro](../projeto-api/evidencias/roteiro-integrado-2026-11-06.txt)). O roteiro é
`projeto-api/scripts/roteiro_integrado.py`.

O fluxo **web → API → app** fecha para avisos, eventos e horários: o que a coordenação ou um
docente publica na web aparece no aplicativo para exatamente quem está nos destinos.
