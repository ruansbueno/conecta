# CONECTA

Sistema de comunicação e gestão acadêmica para um curso superior do IFSul, desenvolvido como
Trabalho de Conclusão de Curso. Reúne uma **plataforma web** de gestão (administração,
coordenação e docentes) e um **aplicativo mobile** de consulta (todos os usuários), ambos
atendidos por uma **API REST** única.

O problema que ele resolve: avisos, prazos, bancas e mudanças de horário hoje se espalham por
murais, grupos de mensagem e e-mail, e nem sempre chegam a quem precisa. No CONECTA, cada aviso
ou evento é publicado com um **público explícito** — todos, um semestre inteiro, os docentes ou
turmas específicas — e cada pessoa vê exatamente o que a alcança.

> **Estado atual (28/10/2026)**: a API das entregas E1 e E2 está implementada; o aplicativo tem o
> marco de avisos (login, sessão e aba Avisos); a plataforma web tem login, publicação de avisos e
> a auditoria completa deles (lista, histórico e versões), turmas e vínculos, a fila de
> solicitações de inscrição, a gestão de usuários e perfis e o painel — a F1 completa, com o fluxo
> web → API → app testado, acessibilidade AA verificada e a implantação estática de referência.
> Faltam o restante do aplicativo e a agenda (E3). Veja [Andamento](#andamento).

## Estrutura do repositório

| Pasta | Conteúdo | Situação |
|---|---|---|
| [`projeto-api/`](projeto-api/) | API REST em FastAPI: regras de negócio, perfis e permissões, modelo de dados, contrato dos endpoints, código e testes | E1 e E2 implementadas |
| [`projeto-mobile/`](projeto-mobile/) | Aplicativo Flutter: especificação, plano, 66 tarefas e o código | Marco de avisos implementado (40 de 66 tarefas) |
| [`projeto-web/`](projeto-web/) | Plataforma web de gestão (React + Vite): especificação, plano, 77 tarefas, o código, as evidências e a implantação | F1 completa (77 de 77 tarefas) |
| [`design/`](design/) | 30 telas desenhadas — 14 do aplicativo e 16 da web — em PNG, geradas a partir de HTML/CSS | Concluído |
| [`CONECTA_Arquitetura.md`](CONECTA_Arquitetura.md) | Arquitetura do sistema: camadas, módulos, fluxo de autenticação, tecnologias | Concluído |

Documentos de apoio do TCC (especificação em PDF, decisões de projeto e apresentação) estão em
[`projeto-api/docs/`](projeto-api/docs/) e na raiz de `projeto-api/`.

## Como o sistema funciona

```
┌──────────────────────┐      ┌──────────────────────┐
│  Plataforma Web      │      │  Aplicativo Mobile   │
│  admin, coordenação, │      │  todos os usuários   │
│  docentes            │      │                      │
│  publica e gerencia  │      │  consulta e recebe   │
└──────────┬───────────┘      └──────────┬───────────┘
           │        REST / JSON          │
           └──────────────┬──────────────┘
                          ▼
              ┌───────────────────────┐        ┌──────────────┐
              │   API (FastAPI)       │───────▶│  Moodle      │
              │   regras de negócio,  │  auten-│  (valida     │
              │   autenticação,       │  ticação  credenciais)│
              │   autorização         │        └──────────────┘
              └───────────┬───────────┘
                          ▼
                   ┌─────────────┐
                   │ PostgreSQL  │
                   └─────────────┘
```

**Quatro decisões que organizam o sistema:**

1. **Toda regra vive na API.** Web e mobile apenas apresentam o que ela devolve. Nenhum cliente
   decide quem pode ver ou fazer o quê.
2. **O Moodle só identifica, não autoriza.** A validação de credenciais fica atrás de uma
   interface (`AuthProvider`) com implementação simulada enquanto o acesso real não existe; o
   perfil de cada pessoa é atribuído e mantido pelo próprio CONECTA.
3. **Aviso tem N destinos.** Um comunicado para três turmas é um aviso com três destinos, visto
   uma única vez por quem pertence a mais de uma delas.
4. **Nada se perde.** Editar um aviso cria uma versão nova; arquivar e excluir são operações
   lógicas; cada operação gera um evento imutável de auditoria.

Os quatro perfis — `administrador`, `coordenacao`, `docente`, `aluno` — e o que cada um pode fazer
estão na matriz de permissões da
[especificação da API](projeto-api/specs/001-auth-perfil-turmas-avisos/spec.md).

## Tecnologias

| Camada | Tecnologia | Por quê |
|---|---|---|
| API | **Python 3.12 + FastAPI** | Tipagem e validação com Pydantic, documentação automática do contrato |
| Banco | **PostgreSQL** | Relacional, com migrações versionadas (Alembic) |
| ORM | **SQLAlchemy 2.0** (async) | Acesso assíncrono, alinhado ao FastAPI |
| Autenticação | **OAuth2 + JWT** (24 h) | Perfil e situação reavaliados no banco a cada requisição |
| Aplicativo | **Flutter / Dart** | Um código para Android e iOS |
| Estado (app) | **provider** | Suficiente para o fluxo do app, com a menor curva de explicação |
| Rede (app) | **http** com cliente próprio | Injeção de token e tratamento central de erro em pouco código |
| Sessão (app) | **flutter_secure_storage** | Token no Keychain/Keystore, nunca em texto simples |
| Cache (app) | **shared_preferences** | Abrir o app sem rede com a última resposta recebida |
| Plataforma web | **React + TypeScript, construídos com Vite** | Build estático servido no mesmo domínio da API, sem servidor de aplicação próprio |
| Estilo (web) | **Tailwind CSS** | Interface densa de tabelas e formulários, com os tokens do design |
| Sessão (web) | **Cookie `httpOnly` emitido pela API** + CSRF | O JavaScript nunca vê o token; toda escrita leva o cabeçalho `X-CSRF-Token` |
| Testes (web) | Vitest, Testing Library, Playwright | Unidade, componente e ponta a ponta com API falsa |
| Testes (API) | pytest, httpx | Contrato, integração e ponta a ponta |
| Testes (app) | flutter_test, integration_test | Unidade, widget e integração com servidor falso |
| Processo | **Spec Kit (SDD)** | Constituição → spec → plano → tarefas, antes de qualquer código |

## Design das telas

As 30 telas estão em [`design/`](design/), com a paleta, a tipografia e a tabela que liga cada
tela aos requisitos em [`design/README.md`](design/README.md).

Identidade: branco com azul e navy, tipografia Inter sem serifa, superfícies de borda fina sem
sombra. O elemento recorrente é o **chip de destino** — um ponto colorido por tipo (turma,
semestre, docentes, todos) seguido do rótulo —, que torna visível, em qualquer lista, a regra de
público que organiza o sistema.

As telas são geradas a partir de HTML/CSS: `cd design/_src && python3 build.py` regera todas,
`python3 build.py w-04` regera uma só.

## Entregas planejadas

| Entrega | Conteúdo | Situação |
|---|---|---|
| **E1 — API + aplicativo** | Autenticação, perfis, consulta de perfil, turmas, solicitação de inscrição, consulta de avisos | API pronta; aplicativo com o marco de avisos |
| **E2 — Plataforma web** | Gestão de usuários, turmas, vínculos, aprovações e ciclo de vida dos avisos; fluxo completo web → API → app | API pronta; web com avisos completos (publicar e auditar) |
| **E3 — Agenda e horários** | Eventos (palestras, bancas, provas, datas importantes) e horários das turmas | Especificada em `projeto-api/specs/002-agenda-horarios`; plano e tarefas após a validação da E1 |

## Andamento

Atualizado em 28/10/2026 (F1 da web completa). Cada etapa entrou por pull request, com revisão independente e os
achados corrigidos com teste antes do merge.

### Pronto

| Parte | O que funciona | Testes | PR |
|---|---|---|---|
| **API — E1** | Login (Moodle simulado), sessão de 24 h, perfil, turmas, solicitação de inscrição e as 9 rotas do aplicativo | pytest | [#1](https://github.com/ruansbueno/conecta/pull/1) |
| **API — E2** | Rotas de gestão (`/gestao/*`): usuários e perfis, turmas, vínculos, decisão de solicitações, avisos com destinos, versões e histórico imutáveis; teste de ponta a ponta da spec §9.3 | 583 testes (E1 + E2) | [#3](https://github.com/ruansbueno/conecta/pull/3) |
| **Aplicativo — marco de avisos** | Login, sessão segura, aba Avisos (ativos e arquivados, detalhe, cache para abrir sem rede) | 151 testes (unidade e widget) + integração com servidor falso | [#2](https://github.com/ruansbueno/conecta/pull/2) |
| **Web — fases 1 a 4** | Fundação (tema, sessão por cookie + CSRF, casca), login, publicação de avisos com seletor de destinos, restrição do docente, agendamento, prévia do cartão do app e rascunho local | Vitest + Playwright | [#4](https://github.com/ruansbueno/conecta/pull/4) |
| **Web — fase 5** | Lista de avisos por situação com busca e filtros, histórico com texto antes/depois, versões, arquivar/desarquivar/excluir com confirmação | Vitest + Playwright | [#5](https://github.com/ruansbueno/conecta/pull/5) |
| **Web — fase 6** | Turmas por situação com busca e filtros, criar/editar, abrir/fechar inscrições, desativar/reativar, vínculos com origem, vincular buscando a pessoa e desvincular com alerta | Vitest + Playwright | [#7](https://github.com/ruansbueno/conecta/pull/7) |
| **Web — fase 7** | Fila de solicitações por status e turma, destaque para quem espera há mais de 3 dias, aprovar criando o vínculo, recusar com motivo, decisão com quem decidiu e quando | Vitest + Playwright | [#8](https://github.com/ruansbueno/conecta/pull/8) |
| **Web — fase 8** | Usuários por perfil e situação, alterar perfil com a descrição de cada um (só administração), ativar e desativar, mudança valendo na navegação seguinte da pessoa | Vitest + Playwright | [#9](https://github.com/ruansbueno/conecta/pull/9) |
| **Web — fase 9** | Painel da coordenação e do docente (números do `total` das listas, blocos que falham sozinhos), contador de solicitações na barra lateral e o e2e do fluxo completo web → API → app | Vitest + Playwright | [#10](https://github.com/ruansbueno/conecta/pull/10) |
| **Web — pontos menores** | Os achados menores das revisões das fases 5 a 9: textos e datas, carregamento e mensagens das listas, foco e leitores de tela, comportamento das telas e um servidor falso mais fiel à API | 271 testes (Vitest) + 30 de ponta a ponta (Playwright) | [#11](https://github.com/ruansbueno/conecta/pull/11) |
| **Web — fase 10** | Mensagens de erro conferidas contra a spec, axe (WCAG 2.1 AA) em todas as telas, uso só com teclado do login à exclusão de um aviso, nada digitado se perde sem rede, [evidências](projeto-web/evidencias/RELATORIO.md) com capturas ao lado do design e implantação estática com nginx verificada em Docker | 275 testes (Vitest) + 47 de ponta a ponta (Playwright) + 6 da implantação | [#13](https://github.com/ruansbueno/conecta/pull/13) |

O fluxo **web → API → app** já fecha para os avisos: o que a coordenação ou um docente publica na
web aparece no aplicativo para exatamente quem está nos destinos.

### Falta, em ordem

**1. Aplicativo — fases 5 a 8** — turmas, solicitação de inscrição, perfil e polimento (26 tarefas
em [`tasks.md`](projeto-mobile/specs/001-app-conecta/tasks.md)).

**2. Agenda e horários (E3)** — a especificação está pronta
([`002-agenda-horarios`](projeto-api/specs/002-agenda-horarios/spec.md)), com os endpoints de
eventos e de horários contratados; faltam o plano, as tarefas e a implementação, além das fases
F2 do aplicativo e da plataforma web.

**3. Integração real com o Moodle** — hoje tudo funciona com o provedor simulado; é a única tarefa
aberta da API (T072). A integração real só pode ser validada quando houver acesso à API da
instituição, e os testes dela são identificados à parte, para que aprovação com simulação nunca
seja confundida com validação real.

**Fora do escopo atual**: notificações push, registro de leitura de avisos, tema escuro e uso em
tablet.

## Ordem de execução

Decidida em 13/10/2026, para que o fluxo completo seja demonstrável cedo:

1. ✅ API — entrega E1 (autenticação, perfil, turmas, solicitações, avisos).
2. ✅ Aplicativo — apenas os avisos, para ter algo utilizável em mãos.
3. ✅ API — entrega E2 (endpoints de gestão).
4. ✅ Plataforma web — fase F1, fechando o ciclo web → API → app.
5. Aplicativo — fase F1 completa.
6. E3 — agenda e horários, na API e nos dois clientes.

A integração real com o Moodle tem data-limite de **13/11/2026**; depois dela, o trabalho é
concluído com o provedor simulado e a integração real passa a trabalho futuro.

## Como trabalhar neste repositório

O projeto segue Spec-Driven Development: nenhuma funcionalidade é implementada sem spec e plano
aprovados. Cada parte tem sua constituição — os princípios que prevalecem sobre decisões de
implementação:

- API: [`projeto-api/.specify/memory/constitution.md`](projeto-api/.specify/memory/constitution.md)
- Aplicativo: [`projeto-mobile/.specify/memory/constitution.md`](projeto-mobile/.specify/memory/constitution.md)
- Plataforma web: [`projeto-web/.specify/memory/constitution.md`](projeto-web/.specify/memory/constitution.md)

Para rodar a API localmente, veja
[`quickstart.md`](projeto-api/specs/001-auth-perfil-turmas-avisos/quickstart.md); para o
aplicativo, [`quickstart.md`](projeto-mobile/specs/001-app-conecta/quickstart.md); para a
plataforma web, [`quickstart.md`](projeto-web/specs/001-plataforma-gestao/quickstart.md).

## Autor

Ruan Bueno — Trabalho de Conclusão de Curso, IFSul.
