# Specification Quality Checklist: Modo noturno e fim de lista (aplicativo)

**Purpose**: Validar completude e qualidade da especificação antes da implementação
**Created**: 2026-11-11
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] Focada no valor para quem usa o app (ler à noite, saber que a lista acabou)
- [x] Todas as seções obrigatórias preenchidas
- [x] Detalhes de implementação ficam no plan.md

## Requirement Completeness

- [x] Nenhum marcador [NEEDS CLARIFICATION]: escopo, tema inicial, lugar do botão, símbolo,
      paleta e textos decididos pelo autor em 11/11/2026
- [x] Requisitos testáveis (FR-001 a FR-008) e critérios mensuráveis (SC-001 a SC-004)
- [x] Casos de borda: preferência inválida, falha ao gravar, sair da conta, fonte a 200%
- [x] Fora de escopo explícito (preferência na conta, terceira opção, abertura nativa, iOS)

## Consistência

- [x] Mesma paleta, comportamento inicial e símbolo da plataforma web
      (`projeto-web/specs/002-modo-noturno`)
- [x] Nenhuma regra de negócio nova; nada vai à API (Princípio I)
- [x] Preferência fora do armazenamento seguro e fora do cache do usuário (Princípio III,
      esclarecido na constituição 1.0.1)
- [x] Cores só do tema ativo, contraste AA nos dois temas (Princípio V)
