<!--
Sync Impact Report
Version change: 2.1.0 → 2.1.1 (2026-11-11), PATCH: esclarecimentos sem mudança de princípio.
  - I e "Tecnologia e Restrições": a plataforma web é React + Vite (build estático), não Next.js;
    a autorização usa o perfil relido no banco a cada requisição (como já dizia o III), não o do token; o
    provedor real é a API de autenticação do IFSul (emenda 2.1.0 estendida a esta seção).
  Motivo: alinhar o texto ao que foi implementado antes da avaliação do TCC; specs e planos não
  mudam.
Version change: 2.0.0 → 2.1.0 (2026-11-06): emenda ao II (API de autenticação do IFSul).
Version change: 1.0.0 → 2.0.0 (2026-09-30)
Modified principles:
  - III. Segurança por Padrão — perfis passam a ser administrador, coordenação, docente e aluno;
    perfil e situação do usuário reavaliados no banco a cada requisição.
  - V. API-First para Mobile → V. API-First em Entregas Incrementais — o escopo deixa de excluir
    endpoints de gestão da Plataforma Web (redefinição incompatível ⇒ MAJOR). Motivo: parecer do
    orientador exige que a especificação cubra a plataforma web de gerenciamento (objetivos
    específicos do TCC) com entregas E1 (mobile), E2 (web + fluxo completo) e E3 (agenda/horários).
  - II. Autenticação Desacoplada — o provedor passa a identificar apenas (username/nome); o
    perfil é atribuído pelo CONECTA.
Version 1.0.0 (2026-09-22): ratificação inicial.
Added sections:
  - Core Principles: I. Backend Centralizado, II. Autenticação Desacoplada do Moodle,
    III. Segurança por Padrão, IV. Separação de Responsabilidades, V. API-First para Mobile,
    VI. Simplicidade e Persistência Confiável
  - Tecnologia e Restrições
  - Fluxo de Desenvolvimento (SDD)
  - Governance
Removed sections: none
Follow-up TODOs:
  - TODO(RATIFICATION_DATE): data de ratificação original não informada pelo usuário; marcada
    como a data desta primeira adoção (2026-09-22) até confirmação em contrário.
-->

# CONECTA API Constitution

## Core Principles

### I. Backend Centralizado
Toda regra de negócio do sistema CONECTA reside na API Backend (FastAPI); os clientes
(Mobile Flutter e, futuramente, Web React/Next.js) consomem exclusivamente essa API via
REST/JSON e não implementam lógica de negócio própria. Nenhum dado é persistido ou validado
diretamente pelo cliente. Isso garante que Web e Mobile permaneçam consistentes e reutilizem
os mesmos serviços, conforme a arquitetura de referência (`CONECTA_Arquitetura.md`).

*Esclarecimento 2.1.1 (2026-11-11):* a plataforma web foi construída em React com Vite, como
build estático (constituição da web, princípio IV), e não em Next.js.

### II. Autenticação Desacoplada do Moodle (NON-NEGOTIABLE)
A validação de credenciais é abstraída por uma interface `AuthProvider`, nunca acoplada
diretamente à implementação do Moodle. Enquanto a API do Moodle não estiver acessível, o
sistema MUST operar com um `MockMoodleAuthProvider` (usuários de teste configuráveis via
seed/env), implementando o mesmo contrato que a futura `MoodleAuthProvider` real. O provedor
apenas **identifica** o usuário (username e nome); **o perfil e as permissões são atribuídos e
mantidos pelo CONECTA**, nunca derivados do provedor. A troca de
provider MUST ocorrer apenas por configuração/injeção de dependência, sem alterar rotas,
regras de autorização ou contratos de resposta ao cliente. Nenhuma senha de usuário é
armazenada pelo CONECTA, mock ou real.

*Emenda 2.1.0 (2026-11-06):* o serviço real é a **API de autenticação do IFSul** (Active
Directory), não o Moodle; as implementações passam a ser `MockAuthProvider` e `IfsulAuthProvider`.
O provedor também informa e-mail e o tipo institucional (`aluno` ou `administrativo`). O tipo só
decide, no primeiro login, se a pessoa entra como aluno ou vira um pedido de acesso que a gestão
aprova definindo o perfil — o perfil continua nunca vindo do provedor.

### III. Segurança por Padrão
Autenticação via OAuth2 + JWT, com token de validade de 24 horas contendo as
permissões/roles do usuário. Toda requisição a recurso protegido MUST validar assinatura,
expiração e integridade do token antes de processar a regra de negócio, retornando `401`
(não autenticado) ou `403` (não autorizado) quando aplicável. Toda comunicação MUST ocorrer
sobre HTTPS em produção. Controle de acesso é sempre avaliado por perfil (`administrador`,
`coordenacao`, `docente`, `aluno`) e vínculo com turmas, nunca inferido implicitamente no
cliente. Perfil e situação (ativo/inativo) do usuário MUST ser reavaliados no banco a cada
requisição protegida; mudanças de perfil valem imediatamente.

### IV. Separação de Responsabilidades
As camadas de apresentação (rotas/schemas), autenticação, autorização, regras de negócio
(serviços) e persistência (repositórios/ORM) MUST ser mantidas em módulos distintos e
testáveis isoladamente. Integrações externas (Moodle, e-mail, notificações push) MUST ser
acessadas apenas através de interfaces/portas dedicadas, nunca chamadas diretamente do
código de rotas ou de regras de negócio.

### V. API-First em Entregas Incrementais
A API é a única porta de entrada para Web e Mobile e evolui em entregas, cada uma nascida de uma
spec (`/speckit-specify`) e validada antes da seguinte: **E1** — endpoints do aplicativo Mobile
(autenticação, perfil, turmas com solicitação de inscrição, consulta de avisos); **E2** —
endpoints de gestão da Plataforma Web (`/gestao/*`: usuários e perfis, turmas, vínculos,
aprovações, publicação e ciclo de vida de avisos) e o fluxo completo web → API → app; **E3** —
agenda (eventos) e horários das turmas. Nenhuma funcionalidade de uma entrega é implementada
durante a anterior.

### VI. Simplicidade e Persistência Confiável
PostgreSQL é o único banco de dados relacional do sistema; MUST ser usado com migrações
versionadas (nunca alteração manual de schema em produção). Novas abstrações (camadas,
interfaces, serviços) só são introduzidas quando resolvem uma necessidade concreta já
identificada (ex: `AuthProvider` para desacoplar o Moodle) — YAGNI para o restante.

## Tecnologia e Restrições

- Backend: FastAPI (Python).
- Banco de dados: PostgreSQL, acessado via ORM com migrações versionadas.
- Autenticação: OAuth2 + JWT (24h), roles/permissões embutidas no token.
- Comunicação: API REST, JSON.
- Integração externa de autenticação: API Moodle (abstraída via `AuthProvider`; mock
  enquanto o acesso real não existe).
- Infraestrutura alvo: infraestrutura própria do IFSul (não gerenciada por este repositório).
- Clientes: aplicativo Mobile (Flutter) na E1; Plataforma Web (React/Next.js) a partir da E2.

*Esclarecimento 2.1.1 (2026-11-11):* o token carrega o identificador e, só como informação, o
perfil; a autorização usa sempre o perfil e a situação relidos no banco a cada requisição
protegida (princípio III); a integração externa de
autenticação é a API de autenticação do IFSul (emenda 2.1.0); a Plataforma Web é React + Vite.

## Fluxo de Desenvolvimento (SDD)

Este projeto segue Spec-Driven Development via Spec Kit:

1. `/speckit-constitution` — este documento; qualquer mudança de princípio passa por aqui.
2. `/speckit-specify` — toda funcionalidade nova começa por uma especificação de negócio,
   sem detalhes de implementação.
3. `/speckit-clarify` — ambiguidades da spec MUST ser resolvidas antes do plano técnico.
4. `/speckit-plan` — plano técnico derivado da spec, respeitando esta constituição.
5. `/speckit-tasks` — quebra do plano em tarefas acionáveis.
6. `/speckit-implement` — implementação guiada pelas tarefas geradas.

Nenhuma implementação de código de aplicação é iniciada sem uma spec e um plano aprovados,
exceto scaffolding de infraestrutura do próprio Spec Kit.

## Governance

Esta constituição prevalece sobre qualquer prática de desenvolvimento conflitante neste
repositório. Emendas exigem: (1) registro explícito do motivo da mudança, (2) atualização de
versão conforme política semântica abaixo, e (3) revisão do impacto em specs/planos já
aprovados que dependam do princípio alterado.

Política de versionamento:
- MAJOR: remoção ou redefinição incompatível de princípio existente.
- MINOR: novo princípio ou seção adicionada, ou expansão material de princípio existente.
- PATCH: esclarecimentos, correções de redação, ajustes não semânticos.

Toda spec, plano e revisão de código MUST verificar conformidade com os princípios acima,
especialmente II (desacoplamento do Moodle) e III (segurança). Complexidade adicional em um
plano MUST ser justificada explicitamente contra o Princípio VI.

**Version**: 2.1.1 | **Ratified**: 2026-09-22 | **Last Amended**: 2026-11-11
