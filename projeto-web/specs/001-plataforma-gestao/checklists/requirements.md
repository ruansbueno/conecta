# Specification Quality Checklist: Plataforma Web de Gestão

**Purpose**: Validar completude e qualidade da especificação antes do planejamento
**Created**: 2026-10-13
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] Sem detalhes de implementação na especificação funcional (framework e camadas ficam em plan/research)
- [x] Focada no valor para quem gerencia o curso
- [x] Escrita para stakeholders não técnicos
- [x] Todas as seções obrigatórias preenchidas

## Requirement Completeness

- [x] Nenhum marcador [NEEDS CLARIFICATION]
- [x] Requisitos testáveis e não ambíguos (RW-01 a RW-44, com fase indicada)
- [x] Critérios de sucesso mensuráveis (SC-001 a SC-008)
- [x] Cenários de aceitação e casos de borda definidos
- [x] Escopo delimitado em fases (F1, F2) e fora de escopo explícito
- [x] Cada requisito aponta para o requisito da API ou justifica sua ausência

## Consistência com o backend

- [x] Todos os endpoints citados existem em `projeto-api/.../contracts/api.md` ou estão marcados como E3
- [x] Nenhum requisito reimplementa regra de negócio da API (Princípio I)
- [x] Tratamento de erro definido por `code`, conforme o catálogo do contrato
- [x] Matriz de permissões respeitada: coordenação não altera perfil; docente restrito às suas turmas
- [x] Paginação segue `limit`/`offset`/`total`

## Consistência com o aplicativo

- [x] Os mesmos tokens visuais e o mesmo chip de destino do `projeto-mobile`
- [x] Mensagens de erro equivalentes para os mesmos `code`, ajustadas ao contexto de gestão
- [x] Nenhuma funcionalidade de aluno duplicada aqui

## Consistência com o design

- [x] Toda tela da spec tem imagem correspondente em `design/web/`
- [x] Toda imagem de `design/web/` está coberta por um item do inventário de telas
- [x] Tokens de cor e tipografia idênticos aos de `design/README.md`

## Segurança e acessibilidade

- [x] Modelo de sessão explícito e verificável (token fora do navegador, SC-003)
- [x] Toda ação destrutiva exige confirmação que descreve a consequência
- [x] Requisitos de teclado, foco, contraste e leitor de tela presentes e testáveis

## Prontidão para planejamento

- [x] Clarificações registradas na seção 10
- [x] Dependência de fase explícita (F2 bloqueada pela spec E3 da API)
- [x] Suposições registradas, inclusive a ausência de endpoint de resumo para o painel
- [x] Matriz de rastreabilidade requisito → tela → teste preenchida

**Resultado**: aprovado para `/speckit-plan`.
