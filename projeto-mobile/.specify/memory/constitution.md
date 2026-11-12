<!--
Sync Impact Report
Version change: 1.0.0 → 1.0.1 (2026-11-11)
Modified principles:
  - III. Sessão e Dados Sensíveis — esclarecimento (PATCH): preferências de interface que não
    identificam a pessoa (o tema, spec 002-modo-noturno) ficam em preferências simples e não são
    apagadas ao sair da conta, porque são do aparelho, não do usuário.
Templates: nenhum alterado.

Version: 1.0.0 (2026-10-13) — ratificação inicial da constituição do aplicativo mobile.
Derivada de projeto-api/.specify/memory/constitution.md v2.0.0, que continua prevalecendo
sobre regras de negócio; este documento governa apenas o cliente Flutter.
Added sections:
  - Core Principles: I. Cliente Sem Regra de Negócio, II. Contrato da API como Fonte da Verdade,
    III. Sessão e Dados Sensíveis, IV. Camadas Separadas e Testáveis, V. Design System Único,
    VI. Simplicidade de Dependências
  - Tecnologia e Restrições
  - Fluxo de Desenvolvimento (SDD)
  - Governance
Follow-up TODOs: nenhum.
-->

# CONECTA Mobile Constitution

Esta constituição governa o aplicativo mobile do CONECTA (Flutter). A constituição da API
(`projeto-api/.specify/memory/constitution.md`) prevalece em tudo que diz respeito a regra de
negócio, autenticação e autorização; aqui tratamos apenas do cliente.

## Core Principles

### I. Cliente Sem Regra de Negócio (NON-NEGOTIABLE)

O aplicativo exibe o que a API devolve e envia o que o usuário pede. Ele MUST NOT decidir quem
pode ver um aviso, quem pode solicitar inscrição, se uma turma aceita inscrição ou se um usuário
tem permissão para uma ação — essas respostas vêm da API. O app pode **esconder ou desabilitar**
um controle para refletir o que já sabe do perfil (por exemplo, não oferecer "Solicitar" a quem
não é aluno), mas isso é conveniência de interface: a recusa real é sempre a da API, e o app
MUST tratar `403` como resultado legítimo mesmo em telas que julgava permitidas.

### II. Contrato da API como Fonte da Verdade

O comportamento do app frente a um erro MUST ser decidido pelo campo `code` da resposta, nunca
pelo texto de `detail` nem pelo status HTTP isolado. Campos, nomes e tipos seguem
`projeto-api/specs/001-auth-perfil-turmas-avisos/contracts/api.md`. Nenhum endpoint é consumido
sem estar nesse contrato: funcionalidade que dependa de endpoint ainda não especificado fica
bloqueada até a spec correspondente existir (caso de agenda e horários, E3).

### III. Sessão e Dados Sensíveis

O token de acesso MUST ser guardado em armazenamento seguro do sistema operacional
(Keychain/Keystore), nunca em preferências simples nem em arquivo de cache. A senha do usuário
MUST NOT ser persistida em nenhuma hipótese, nem oferecida como "lembrar senha". Qualquer
resposta `401` encerra a sessão local e leva ao login; `403 USUARIO_INATIVO` também encerra, com
mensagem própria. Dados em cache local MUST ser apagados ao sair da conta.
Preferências de interface que não identificam a pessoa — hoje, o tema claro ou escuro — MAY ficar
em preferências simples e permanecem ao sair da conta.

### IV. Camadas Separadas e Testáveis

Interface, estado, serviços de rede e modelos MUST viver em camadas distintas: widgets não fazem
chamada HTTP, serviços não conhecem widgets, modelos não conhecem nenhuma das duas. Toda
funcionalidade MUST ser testável sem rede, por injeção de um cliente HTTP falso. Nenhum widget
depende de `BuildContext` para obter dados que poderia receber por parâmetro.

### V. Design System Único

Cores, tipografia, espaçamento e componentes vêm do tema central do app, derivado dos tokens de
`design/README.md`. Valores de cor, tamanho de fonte e raio MUST NOT ser escritos soltos dentro
de telas. Todo elemento interativo MUST ter alvo de toque de no mínimo 48 dp e contraste mínimo
AA (4.5:1 para texto normal); imagens e ícones informativos MUST ter rótulo para leitor de tela.

### VI. Simplicidade de Dependências

O app prefere o que já vem no Flutter. Uma dependência nova só entra quando resolve uma
necessidade concreta já encontrada, e MUST ser justificada no `plan.md` da funcionalidade que a
introduziu. Gerenciamento de estado é feito com `provider`; navegação, com o `Navigator` do
próprio Flutter e rotas nomeadas. Nenhuma camada de abstração é criada "para o futuro" — YAGNI.

## Tecnologia e Restrições

- Framework: Flutter (canal estável), Dart com null safety.
- Estado: `provider`. Navegação: `Navigator` + rotas nomeadas.
- Rede: pacote `http`, encapsulado por um cliente próprio do app que injeta o token, trata
  `401` de forma central e converte erros em um tipo de falha da aplicação.
- Sessão: `flutter_secure_storage`. Cache de conteúdo: `shared_preferences` (JSON).
- Plataformas-alvo: Android e iOS, em telefone, orientação retrato.
- Idioma da interface: português do Brasil; datas e horas apresentadas no fuso do dispositivo.
- Backend: exclusivamente a API do CONECTA, por HTTPS em homologação e produção.

## Fluxo de Desenvolvimento (SDD)

Mesmo fluxo do `projeto-api`, via Spec Kit:

1. `/speckit-constitution` — este documento.
2. `/speckit-specify` — especificação de negócio da funcionalidade.
3. `/speckit-clarify` — ambiguidades resolvidas antes do plano.
4. `/speckit-plan` — plano técnico derivado da spec.
5. `/speckit-tasks` — tarefas acionáveis.
6. `/speckit-implement` — implementação guiada pelas tarefas.

Nenhuma tela é implementada sem spec e plano aprovados. Mudança de contrato na API exige revisão
da spec do app antes de qualquer alteração de código.

## Governance

Esta constituição prevalece sobre práticas conflitantes neste repositório e é subordinada à
constituição da API no que toca a regras de negócio e segurança. Emendas exigem registro do
motivo, atualização de versão e revisão do impacto nas specs já aprovadas.

Política de versionamento:

- MAJOR: remoção ou redefinição incompatível de princípio existente.
- MINOR: novo princípio ou seção, ou expansão material de princípio existente.
- PATCH: esclarecimentos e correções de redação.

Toda spec, plano e revisão de código MUST verificar conformidade com os princípios acima,
especialmente I (cliente sem regra de negócio) e III (sessão e dados sensíveis).

**Version**: 1.0.1 | **Ratified**: 2026-10-13 | **Last Amended**: 2026-11-11
