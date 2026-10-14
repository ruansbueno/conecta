# CONECTA

Sistema de comunicação e gestão acadêmica para um curso superior do IFSul, desenvolvido como
Trabalho de Conclusão de Curso. Reúne uma **plataforma web** de gestão (administração,
coordenação e docentes) e um **aplicativo mobile** de consulta (todos os usuários), ambos
atendidos por uma **API REST** única.

O problema que ele resolve: avisos, prazos, bancas e mudanças de horário hoje se espalham por
murais, grupos de mensagem e e-mail, e nem sempre chegam a quem precisa. No CONECTA, cada aviso
ou evento é publicado com um **público explícito** — todos, um semestre inteiro, os docentes ou
turmas específicas — e cada pessoa vê exatamente o que a alcança.

> **Estado atual**: o projeto está na fase de especificação e design. A API, a plataforma web e o
> aplicativo estão **especificados e planejados**, com as telas desenhadas, mas **ainda não
> implementados**. Veja [O que está faltando](#o-que-está-faltando).

## Estrutura do repositório

| Pasta | Conteúdo | Situação |
|---|---|---|
| [`projeto-api/`](projeto-api/) | Especificação da API REST: regras de negócio, perfis e permissões, modelo de dados, contrato dos endpoints, plano técnico e tarefas | Especificado e planejado |
| [`projeto-mobile/`](projeto-mobile/) | Especificação do aplicativo Flutter: escopo em fases, requisitos, mapa tela → endpoint, plano, decisões técnicas e 66 tarefas | Especificado e planejado |
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
| Plataforma web | **React / Next.js** | Definido na arquitetura; ainda sem especificação própria |
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
| **E1 — API + aplicativo** | Autenticação, perfis, consulta de perfil, turmas, solicitação de inscrição, consulta de avisos | Especificada e planejada |
| **E2 — Plataforma web** | Gestão de usuários, turmas, vínculos, aprovações e ciclo de vida dos avisos; fluxo completo web → API → app | Contrato da API definido; interface web sem especificação própria |
| **E3 — Agenda e horários** | Eventos (palestras, bancas, provas, datas importantes) e horários das turmas | Visão geral definida; detalhamento pendente |

## O que está faltando

Nada de código de aplicação foi escrito ainda. Em ordem de dependência:

**1. Implementar a API (E1)** — é o que destrava todo o resto.
As 9 rotas do aplicativo estão contratadas em
[`contracts/api.md`](projeto-api/specs/001-auth-perfil-turmas-avisos/contracts/api.md) e as
tarefas, em [`tasks.md`](projeto-api/specs/001-auth-perfil-turmas-avisos/tasks.md). Inclui o
provedor de autenticação simulado, as migrações e o seed de dados de teste.

**2. Implementar o aplicativo (fase F1)** — login e sessão, avisos, turmas, solicitações, perfil e
cache local. 66 tarefas em
[`tasks.md`](projeto-mobile/specs/001-app-conecta/tasks.md); depende da API no ar.

**3. Especificar e implementar a plataforma web (E2)** — a interface ainda não tem documento
próprio: só o contrato dos endpoints `/gestao/*` e as 16 telas desenhadas. Falta a spec, o plano e
o projeto React/Next.js.

**4. Especificar a agenda e os horários (E3)** — os endpoints `GET /eventos`,
`GET /eventos/{id}` e `GET /turmas/{id}/horarios` existem apenas como visão geral. A fase F2 do
aplicativo está bloqueada até essa spec existir. Uma pendência concreta já registrada: se
`GET /eventos` aceitará filtro por intervalo de datas — a visão de mês do calendário depende
disso.

**5. Integração real com o Moodle** — hoje tudo funciona com o provedor simulado. A integração
real só pode ser validada quando houver acesso à API da instituição, e os testes dela são
identificados à parte, para que aprovação com simulação nunca seja confundida com validação real.

**Fora do escopo atual**: notificações push, registro de leitura de avisos, tema escuro e uso em
tablet.

## Como trabalhar neste repositório

O projeto segue Spec-Driven Development: nenhuma funcionalidade é implementada sem spec e plano
aprovados. Cada parte tem sua constituição — os princípios que prevalecem sobre decisões de
implementação:

- API: [`projeto-api/.specify/memory/constitution.md`](projeto-api/.specify/memory/constitution.md)
- Aplicativo: [`projeto-mobile/.specify/memory/constitution.md`](projeto-mobile/.specify/memory/constitution.md)

Para rodar a API localmente quando ela existir, veja
[`quickstart.md`](projeto-api/specs/001-auth-perfil-turmas-avisos/quickstart.md); para o
aplicativo, [`quickstart.md`](projeto-mobile/specs/001-app-conecta/quickstart.md).

## Autor

Ruan Bueno — Trabalho de Conclusão de Curso, IFSul.
