<!--
Sync Impact Report
Version change: 2.0.0 → 2.0.1 (2026-11-11)
Modified principles:
  - III. Token Fora do Alcance do JavaScript — esclarecimento (PATCH): a proibição vale para o
    token e qualquer dado de sessão; além do rascunho de formulário (apagado ao sair), o
    `localStorage` pode guardar preferência de interface que não identifica a pessoa (o tema,
    spec 002-modo-noturno), que permanece ao sair.
Templates: nenhum alterado.

Version change: 1.0.0 → 2.0.0 (2026-10-13)
Modified principles:
  - III. Token Fora do Navegador — o token continua inacessível ao JavaScript, mas o cookie passa
    a ser emitido pela própria API, não por um servidor da plataforma. Acrescenta proteção CSRF e
    a exigência de mesma origem entre web e API.
  - IV. Dados no Servidor, Interação no Cliente → IV. Build Estático, Sem Servidor Próprio
    (redefinição incompatível ⇒ MAJOR). Motivo: a infraestrutura do IFSul hospeda a API em Python
    e serve a plataforma como arquivos estáticos; não há servidor Node. Server Components e
    Server Actions deixam de existir, e toda chamada à API passa a sair do navegador.
Version 1.0.0 (2026-10-13): ratificação inicial, com sessão em cookie escrito por servidor Next.
Added sections: nenhuma.
Removed sections: nenhuma.
Follow-up TODOs: nenhum.
-->

# CONECTA Web Constitution

Esta constituição governa a plataforma web de gestão do CONECTA. A constituição da API
(`projeto-api/.specify/memory/constitution.md`) prevalece em tudo que diz respeito a regra de
negócio, autenticação e autorização; aqui tratamos apenas do cliente. Onde esta e a do aplicativo
mobile tratam do mesmo assunto, elas MUST dizer a mesma coisa — as duas são clientes da mesma API.

## Core Principles

### I. Cliente Sem Regra de Negócio (NON-NEGOTIABLE)

A plataforma web exibe o que a API devolve e envia o que o usuário pede. Ela MUST NOT decidir
quem pode publicar para qual destino, quem pode aprovar uma solicitação, se um aviso ainda é
editável ou se um perfil pode ser alterado. A interface pode **esconder ou desabilitar** um
controle que sabe ser inútil para o perfil corrente — e deve fazê-lo, por clareza —, mas isso é
conveniência: a recusa real é a da API, e toda tela MUST tratar `403` como resposta legítima,
inclusive onde julgava ter permissão.

Em particular, a restrição de destinos do docente é apresentada na interface, mas MUST ser
verificada pela API: receber `403 DESTINO_NAO_PERMITIDO` é um caminho previsto, não um defeito.

### II. Contrato da API como Fonte da Verdade

O comportamento diante de um erro MUST ser decidido pelo campo `code`, nunca pelo texto de
`detail` nem pelo status isolado. Campos, nomes e tipos seguem
`projeto-api/specs/001-auth-perfil-turmas-avisos/contracts/api.md`. Nenhum endpoint é consumido
sem estar nesse contrato: funcionalidade que dependa de endpoint ainda não especificado fica
bloqueada até a spec existir.

### III. Token Fora do Alcance do JavaScript (NON-NEGOTIABLE)

A plataforma MUST autenticar por sessão em cookie `httpOnly`, `Secure` e `SameSite=Strict`,
**emitido pela própria API** no login. O token MUST NOT ser lido, guardado ou manipulado por
código que roda no navegador — nada de `localStorage`, `sessionStorage`, variável global ou
cópia em memória. O navegador apenas carrega o cookie automaticamente a cada requisição
(`credentials: 'include'`).

O armazenamento do navegador (`localStorage`) MAY guardar apenas o rascunho de formulário, apagado
ao sair da conta, e preferências de interface que não identificam a pessoa nem dão acesso a
nada — hoje, o tema claro ou escuro, que permanece ao sair.

Disso decorrem duas obrigações: toda requisição de escrita MUST carregar proteção contra CSRF, na
forma definida pela API; e a plataforma MUST ser servida na **mesma origem** da API, que fica
atrás de um caminho reservado (por exemplo `/api`) no mesmo domínio.

A senha do usuário MUST NOT ser persistida nem registrada em log. Qualquer `401` encerra a
sessão: a plataforma descarta o estado local e leva ao login; `403 USUARIO_INATIVO` também
encerra.

### IV. Build Estático, Sem Servidor Próprio

A plataforma MUST ser distribuída como arquivos estáticos (HTML, CSS e JavaScript) servidos por
um servidor web comum, sem processo de aplicação próprio. Nenhuma funcionalidade MUST depender de
renderização no servidor, de rota de API própria ou de segredo em tempo de execução: **não existe
lugar seguro para segredo nesta camada**. Toda configuração embutida no build é pública por
natureza, e a URL da API é a única que pode estar ali.

Toda chamada à API parte do navegador, autenticada pelo cookie de sessão. A plataforma MUST
funcionar quando servida por nginx, Apache ou qualquer servidor de arquivos, sem configuração
além do redirecionamento de rotas desconhecidas para `index.html`.

### V. Design System Compartilhado e Acessibilidade

Cores, tipografia, espaçamento e componentes vêm do tema central derivado de `design/README.md` —
o mesmo vocabulário visual do aplicativo mobile, a começar pelo chip de destino. Valores de cor e
tamanho MUST NOT ser escritos soltos dentro de telas.

Toda funcionalidade MUST ser operável apenas com teclado, com foco sempre visível e ordem de foco
seguindo a ordem visual. Tabelas MUST ter cabeçalhos associados; modais MUST prender o foco,
fechar com `Esc` e devolver o foco ao elemento de origem. Contraste mínimo AA (4.5:1 para texto
normal, 3:1 para texto grande). Nenhuma informação MUST ser transmitida apenas por cor — selos e
chips sempre trazem texto.

### VI. Simplicidade de Dependências

A plataforma prefere o que a linguagem e o navegador já oferecem. Uma dependência nova só entra
quando resolve uma necessidade concreta já encontrada e MUST ser justificada no `plan.md` da
funcionalidade que a introduziu. Não se adota biblioteca de estado global, de cliente HTTP nem de
formulário sem que a falta dela tenha causado um problema real. Nenhuma abstração é criada "para
o futuro" — YAGNI.

## Tecnologia e Restrições

- Build: Vite com React e TypeScript em modo estrito; saída estática.
- Estilo: Tailwind CSS, configurado a partir dos tokens de `design/README.md`.
- Dados: `fetch` do navegador com `credentials: 'include'`; roteamento no cliente.
- Sessão: cookie `httpOnly` emitido pela API, em mesma origem.
- Público-alvo: administração, coordenação e docentes. Alunos usam o aplicativo mobile e recebem
  `403` em qualquer rota de gestão.
- Idioma da interface: português do Brasil; datas e horas no fuso de quem acessa.
- Navegadores: duas últimas versões de Chrome, Firefox, Safari e Edge. Resolução mínima de
  projeto: 1280 px de largura.
- Implantação: arquivos estáticos na infraestrutura do IFSul, no mesmo domínio da API, por HTTPS.

## Fluxo de Desenvolvimento (SDD)

Mesmo fluxo do `projeto-api` e do `projeto-mobile`, via Spec Kit:

1. `/speckit-constitution` — este documento.
2. `/speckit-specify` — especificação de negócio da funcionalidade.
3. `/speckit-clarify` — ambiguidades resolvidas antes do plano.
4. `/speckit-plan` — plano técnico derivado da spec.
5. `/speckit-tasks` — tarefas acionáveis.
6. `/speckit-implement` — implementação guiada pelas tarefas.

Nenhuma tela é implementada sem spec e plano aprovados. Mudança no contrato da API exige revisão
da spec da plataforma antes de qualquer alteração de código.

## Governance

Esta constituição prevalece sobre práticas conflitantes neste diretório e é subordinada à
constituição da API no que toca a regras de negócio e segurança. Emendas exigem registro do
motivo, atualização de versão e revisão do impacto nas specs já aprovadas.

Política de versionamento:

- MAJOR: remoção ou redefinição incompatível de princípio existente.
- MINOR: novo princípio ou seção, ou expansão material de princípio existente.
- PATCH: esclarecimentos e correções de redação.

Toda spec, plano e revisão de código MUST verificar conformidade com os princípios acima,
especialmente I (cliente sem regra de negócio), III (token fora do alcance do JavaScript) e IV
(build estático).

**Version**: 2.0.1 | **Ratified**: 2026-10-13 | **Last Amended**: 2026-11-11
