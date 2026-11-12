# Specification Quality Checklist: Modo noturno e fim de lista (web)

**Purpose**: Validar completude e qualidade da especificação antes da implementação
**Created**: 2026-11-11
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] Focada no valor para quem usa a gestão (tela escura à noite, saber que a lista acabou)
- [x] Todas as seções obrigatórias preenchidas
- [x] Detalhes de implementação ficam no plan.md (tokens, script, hook)

## Requirement Completeness

- [x] Nenhum marcador [NEEDS CLARIFICATION]: escopo, tema inicial, lugar do botão, símbolo,
      paleta e textos decididos pelo autor em 11/11/2026
- [x] Requisitos testáveis (FR-001 a FR-012) e critérios mensuráveis (SC-001 a SC-004)
- [x] Casos de borda: `localStorage` indisponível, valor inválido, sem `matchMedia`
- [x] Fora de escopo explícito (preferência na conta, terceira opção no botão, tabelas paginadas)

## Consistência

- [x] Mesma paleta, mesmo comportamento inicial e mesmo símbolo do aplicativo
      (`projeto-mobile/specs/002-modo-noturno`)
- [x] Nenhuma regra de negócio nova; nada vai à API (Princípio I)
- [x] `localStorage` só com a preferência de tema (Princípio III, esclarecido na constituição 2.0.1)
- [x] Contraste AA nos dois temas (Princípio V)
