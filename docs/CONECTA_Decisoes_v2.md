# 1. Finalidade deste documento

Este documento registra **somente as decisões tomadas a partir do parecer** sobre a especificação v1 do CONECTA. Para cada ponto levantado, apresenta o que foi apontado, o que ficou decidido e onde a decisão está formalizada na especificação v2 (`CONECTA_API_Especificacao_SDD_v2.pdf`). O funcionamento completo do sistema está descrito na especificação v2.

**Resumo das decisões**

| # | Ponto do parecer | Decisão em uma linha |
|---|---|---|
| 1 | Escopo da entrega × objetivos do TCC | Três entregas: E1 API + app; E2 web + fluxo completo; E3 agenda e horários |
| 2 | Vínculo de docentes e outros usuários com turmas | Docente vinculado às turmas em que leciona; vínculos criados pela coordenação/administração pela web |
| 3 | Autoinscrição | Turma é vínculo real do curso; aluno **solicita**, coordenação ou docente da turma aprova |
| 4 | Perfis e quem atribui permissões | Quatro perfis do TCC; o administrador atribui; o login apenas identifica |
| 5 | Avisos: público, alteração, arquivamento, exclusão, histórico | Aviso com N destinos; versões; exclusão lógica; log de eventos |
| 6 | Detalhamento dos endpoints | Exemplos, campos obrigatórios, validações e erros em todos os endpoints das E1 e E2 |
| 7 | Mock × integração real; texto do TCC | Marcadores e checklist separados; parágrafos sugeridos para o TCC |
| 8 | Testes × requisitos; fluxo completo | Matriz requisito → objetivo → teste; cenário de ponta a ponta |
| 9 | Foco da próxima versão | Regras de negócio, dados e comportamento dos endpoints definidos antes da programação |

# 2. Ponto 1 — Relação entre a primeira entrega e os objetivos do TCC

**Apontamento.** A especificação cobria autenticação, perfil, turmas e consulta de avisos, enquanto o TCC prevê também plataforma web, agenda, eventos, horários e histórico. É preciso deixar claro o que é entregue agora e como o restante entra até a conclusão.

**Decisão.** O desenvolvimento é dividido em **três entregas**, cada uma validada antes da seguinte.

| Objetivo específico do TCC | E1 API + app | E2 Web + fluxo | E3 Agenda e horários |
|---|---|---|---|
| Plataforma web de cadastro, edição, exclusão e gestão | | Sim | Sim (eventos, horários) |
| Aplicação mobile de consulta e recebimento | Sim | | Sim |
| Autenticação por perfil | Sim | Sim (integração real, se houver acesso) | |
| Perfis administrador, coordenação, docente e aluno | Sim (modelo e verificação) | Sim (atribuição pela web) | |
| Agenda acadêmica | | | Sim |
| Horários das turmas | | | Sim |
| Módulo de avisos | Sim (leitura) | Sim (publicação e ciclo de vida) | |
| Avisos para turmas, semestres, docentes ou todos | Sim (modelo e leitura) | Sim (publicação) | |
| API REST, JSON, backend com regras de negócio | Sim | Sim | Sim |
| Banco relacional com histórico e rastreabilidade | Sim (modelo base) | Sim (versões e auditoria) | Sim |
| Estrutura modular e expansível | Sim | Sim | Sim |
| Testes funcionais e de integração com evidências | Sim | Sim (ponta a ponta) | Sim |

A E1 é a primeira a ser implementada. A E2 tem o contrato de API completo na especificação; a E3 tem visão geral e será detalhada antes de ser implementada.

**Formalizado em**: spec.md §1; apresentação §2.

# 3. Ponto 2 — Vínculo de professores e outros usuários com turmas

**Apontamento.** A inscrição era um vínculo entre aluno e turma. Professores e outros usuários também precisam estar associados às turmas? Como os vínculos são criados? Quem pode alterá-los?

**Decisão.**

- **Docentes são vinculados às turmas em que lecionam** (papel `docente`) e recebem os avisos dessas turmas. Alunos têm vínculo com papel `aluno`. A antiga "Inscrição" passa a ser um **Vínculo** único, com papel.
- **Administrador e coordenação não têm vínculo com turmas**: gerenciam pela web e, no app, recebem os avisos gerais.
- **Criação e alteração**: **pela coordenação ou administração, na plataforma web** (E2), ou, no caso de alunos, pela aprovação de uma solicitação (ponto 3). O docente não altera o próprio vínculo.
- Remover um vínculo retira imediatamente o acesso aos avisos da turma.

**Formalizado em**: spec.md §3.1; data-model.md (`VinculoTurma`); contratos §12.

# 4. Ponto 3 — Autoinscrição

**Apontamento.** Qualquer aluno poderá entrar em qualquer turma? Ele passaria a ter acesso aos avisos sem fazer parte dela academicamente. As turmas são vínculos reais do curso ou grupos abertos? Pode ser necessária validação ou aprovação.

**Decisão.**

- **Turmas representam vínculos reais do curso**, não grupos abertos.
- A autoinscrição livre foi substituída por **solicitação de inscrição**: o aluno solicita (status *pendente*, sem nenhum acesso) e **coordenação, administrador ou o docente da própria turma** aprova ou recusa. A aprovação cria o vínculo; a recusa registra decisor, data e motivo.
- O aluno só vê para solicitar as turmas **ativas, com inscrições abertas**, em que não tem vínculo nem solicitação pendente. Pode acompanhar o status e cancelar pendentes; após recusa ou cancelamento, pode solicitar novamente.

**Formalizado em**: spec.md §3.2 e US3; data-model.md (`SolicitacaoInscricao`); contratos §5–7 e §13.

# 5. Ponto 4 — Perfis e quem atribui as permissões

**Apontamento.** O TCC fala em administrador, coordenação, docente e aluno; a especificação, em aluno, professor, servidor e servidor/coordenação. É preciso padronizar, explicar o que cada um pode fazer e quem atribui as permissões — reconhecer o usuário no login é diferente de decidir o que ele pode fazer.

**Decisão.**

- **Perfis padronizados conforme o TCC**: `administrador`, `coordenacao`, `docente`, `aluno`. O perfil "servidor" deixa de existir.
- **O login apenas identifica** (username e nome, vindos do Moodle ou do provedor simulado). **O CONECTA decide o que a pessoa pode fazer.**
- No primeiro login, o usuário é criado como **aluno**. **Somente o administrador** altera perfis e ativa/desativa usuários (pela web, E2). O primeiro administrador é criado por seed de implantação.
- O perfil é reavaliado no banco a cada requisição, de modo que promover ou desativar alguém vale imediatamente.
- **Matriz de permissões** definida na especificação (resumo):

| Ação | Administrador | Coordenação | Docente | Aluno |
|---|---|---|---|---|
| Atribuir perfis | Sim | Não | Não | Não |
| Criar/editar turmas e gerir vínculos | Sim | Sim | Não | Não |
| Aprovar solicitação de inscrição | Sim | Sim | Só nas suas turmas | Não |
| Publicar aviso para qualquer público | Sim | Sim | Não | Não |
| Publicar aviso para suas turmas | Sim | Sim | Sim | Não |
| Editar/arquivar/excluir avisos | Todos | Todos | Só os seus | Não |
| Solicitar inscrição | Não | Não | Não | Sim |
| Consultar perfil, turmas e avisos | Sim | Sim | Sim | Sim |

**Formalizado em**: spec.md §2; constituição v2.0.0 (princípios II e III); research.md.

# 6. Ponto 5 — Avisos: público, alteração, arquivamento, exclusão e histórico

**Apontamento.** O TCC prevê direcionamento por turmas, semestres, docentes e outros grupos; a especificação tinha aviso geral ou para uma única turma. Como representar um comunicado que chegue a três turmas? O que acontece quando um aviso é alterado, arquivado ou excluído, e o que fica no histórico?

**Decisão.**

**Público.** Um aviso tem de **1 a 20 destinos**; é visível a quem for alcançado por **ao menos um**.

| Tipo de destino | Quem recebe |
|---|---|
| `todos` | Todo usuário ativo |
| `turma` | Usuários vinculados à turma |
| `semestre` | Usuários vinculados a turma ativa daquele semestre do curso |
| `docentes` | Todos os docentes |

*Exemplo (três turmas)*: um aviso com três destinos `turma` — cada pessoa o vê uma única vez. Novos grupos (ex.: curso) entram como novo tipo de destino. Docentes só publicam para turmas em que lecionam.

**Ciclo de vida.**

| Operação | Efeito | Registro |
|---|---|---|
| Editar | Mesmo aviso, com marca "editado em"; quem deixou de ser destinatário deixa de vê-lo | Nova versão (a anterior é preservada) + evento com o que mudou |
| Arquivar | Sai da lista ativa; segue na lista de arquivados dos destinatários | Evento `arquivado` (e `desarquivado`) |
| Excluir | Some do app e das listas; exclusão **lógica** | Evento `excluido`; dados ficam para auditoria |

**Histórico registrado.** (1) **Autor e data de criação**; (2) **cada alteração** — quem, quando e o que mudou (valor anterior e novo) — em log imutável gravado junto da operação; (3) todas as **versões** do conteúdo e dos destinos. Não fazem parte desta fase: registro de leitura pelos usuários e snapshot separado do público na época (o público de cada versão já fica guardado na própria versão).

**Formalizado em**: spec.md §3.3–3.5; data-model.md (`AvisoDestino`, `AvisoVersao`, `AvisoEvento`); contratos §14–15.

# 7. Ponto 6 — Detalhamento dos endpoints

**Apontamento.** É preciso enxergar o que cada endpoint recebe e devolve: exemplos de requisição e resposta, campos obrigatórios, validações e erros esperados.

**Decisão.**

- Todos os endpoints das **E1 (9 endpoints do app)** e **E2 (endpoints de gestão `/gestao/*`)** passam a ter, em `contracts/api.md`: requisição e resposta com exemplo, campos obrigatórios, regras de validação, permissões e erros esperados. Os da E3 ficam em visão geral.
- **Erros padronizados** com código estável: `{ "detail": "...", "code": "TURMA_INDISPONIVEL" }`; validação (422) lista os campos inválidos. O aplicativo decide por `code`, não pelo texto.
- **Listas paginadas** (`limit`, `offset`, `total`).
- Os endpoints de gestão (aprovar solicitações, vínculos, perfis, publicar avisos) pertencem à E2. Na E1 essas informações entram por seed.

**Formalizado em**: contracts/api.md; apresentação §9.

# 8. Ponto 7 — Provedor simulado × integração real; texto do TCC

**Apontamento.** O provedor de autenticação simulado é adequado enquanto não há acesso ao Moodle, mas é preciso distinguir os testes com usuários simulados da validação da integração real. O texto do TCC deve refletir a escolha por Python/FastAPI e a decisão sobre a autenticação pelo Moodle.

**Decisão.**

- **Duas camadas de teste**: os testes que dependem do provedor simulado são marcados `mock_auth`; os da integração real são marcados `moodle_real` e só rodam quando houver acesso. O relatório de testes lista os dois grupos separadamente — **aprovação com mock não é tratada como validação da integração real**.
- **Checklist de validação real** (login válido, senha inválida, Moodle indisponível, sincronização de nome sem alterar perfil, ausência de senha em log/banco, troca apenas por configuração), a ser executado e registrado quando houver acesso ao Moodle.
- **Texto do TCC**: parágrafos sugeridos na seção 12 deste documento.

**Formalizado em**: spec.md §9.1 e §9.4; research.md; tasks.md (T006, T064, T069, T072).

# 9. Ponto 8 — Testes relacionados aos requisitos e fluxo completo

**Apontamento.** Consultar avisos inseridos por seed valida filtros, mas é preciso demonstrar o fluxo completo: alguém autorizado publica pela web, a API registra, e o aluno recebe no aplicativo respeitando o público.

**Decisão.**

- **Matriz de rastreabilidade** requisito → objetivo do TCC → entrega → testes (spec.md §9.2).
- **Cenário de ponta a ponta** (E2): a coordenação publica um aviso para três turmas; alunos dessas turmas o veem e quem está fora delas não; a edição que retira uma turma faz o aluno dela deixar de ver; arquivamento, versões, histórico e exclusão; docente barrado ao publicar para público não permitido; solicitação de inscrição aprovada pelo docente passa a dar acesso aos avisos da turma.
- Os testes com avisos de seed continuam, mas apenas para validar filtros (E1); a **demonstração do fluxo** é o teste de ponta a ponta da E2, executado contra a API com o provedor simulado.

**Formalizado em**: spec.md §9.2–9.3 (RF-30, SC-007); apresentação §10.

# 10. Ponto 9 — Foco da próxima versão

**Apontamento.** Detalhar regras de negócio, dados e comportamento de cada endpoint, de modo que quem lê a especificação entenda como o sistema funciona sem deixar decisões (quem entra em uma turma, como o professor se vincula, o que acontece quando um aviso é alterado) para a programação.

**Decisão.** A especificação v2 (revisão do `spec.md`, `data-model.md`, `contracts/api.md`, `research.md`, `plan.md`, `tasks.md` e da constituição) responde às três perguntas citadas — entrada em turma (ponto 3), vínculo de docente (ponto 2) e alteração de aviso (ponto 5) — e as demais decisões acima, antes de qualquer implementação.

# 11. Decisões complementares assumidas (a confirmar)

Estas decisões foram necessárias para fechar a especificação e **não constam do parecer**; vale confirmá-las com o orientador.

| # | Decisão | Motivo |
|---|---|---|
| C1 | "Semestre" nos destinos é o **semestre do curso** (1º–12º), atributo da turma; o período letivo (ex.: 2026/2) é informativo | O parecer cita "semestres" como grupo de destino; o sentido mais útil à comunicação é o do curso |
| C2 | Administrador e coordenação não têm vínculo com turmas e, no app, veem apenas avisos para `todos` | Gerenciam pela web; evita vínculos artificiais |
| C3 | Perfil e situação do usuário são reavaliados no banco a cada requisição | Promoção/desativação valem na hora, sem esperar os 24 h do token |
| C4 | Após solicitação recusada ou cancelada, o aluno pode solicitar de novo | Evita bloqueio permanente por engano |
| C5 | Aviso excluído não é recuperável pela API (permanece no banco para auditoria) | Simplicidade; "excluir" tem efeito real para os usuários |
| C6 | Provas e datas importantes (previstas na arquitetura) entram como tipos de evento na E3 | Cabem no objetivo da agenda e reaproveitam destinos |
| C7 | Aprovam solicitação: administrador, coordenação ou docente da turma (qualquer um) | Definido na conversa; docente limitado às suas turmas |
| C8 | Na E1 não há plataforma web: vínculos, aprovações e avisos entram por seed; os endpoints `/gestao/*` são da E2 | Mantém a E1 pequena e validável |
| C9 | A constituição do projeto foi emendada (v2.0.0) para permitir endpoints de gestão web | O princípio V da v1 excluía a gestão web |
| C10 | Não há registro de leitura de aviso, notificação push nem limite de vagas nesta fase | Fora do escopo dos objetivos do TCC |

# 12. Ajustes necessários no texto do TCC

Parágrafos sugeridos (adaptar à numeração e ao estilo do texto).

**Tecnologia do backend (substitui a menção à tecnologia anterior)**

> O backend do CONECTA foi desenvolvido em Python, com o framework FastAPI, que expõe uma API REST com troca de dados em JSON. O acesso ao banco de dados relacional PostgreSQL é feito por meio do SQLAlchemy, com as alterações de estrutura controladas por migrações versionadas (Alembic). A validação dos dados de entrada e saída é feita com Pydantic, e a documentação dos endpoints é gerada a partir da própria API.

**Autenticação pelo Moodle**

> A autenticação dos usuários é feita por meio da integração com a API do Moodle, que valida as credenciais informadas. O CONECTA utiliza o Moodle apenas para **identificar** o usuário (nome de usuário e nome); as senhas não são armazenadas pelo sistema. Após a validação, a API emite um token JWT com validade de 24 horas. O que cada usuário pode fazer no sistema é definido pelo próprio CONECTA, por meio do perfil (administrador, coordenação, docente ou aluno), atribuído pelo administrador: o primeiro acesso cria o usuário como aluno.

**Provedor simulado e validação da integração real**

> Como o acesso à API do Moodle ainda não está disponível, o sistema foi projetado com uma interface de autenticação que admite duas implementações: um provedor simulado, com usuários de teste, utilizado durante o desenvolvimento, e o provedor real do Moodle, que substitui o simulado apenas por configuração. Os testes que dependem de usuários simulados são identificados como tais e não substituem a validação da integração real, registrada em etapa própria por meio de um roteiro de verificação assim que o acesso for concedido.

**Organização do desenvolvimento em entregas**

> O desenvolvimento foi organizado em três entregas incrementais: (1) a API e o aplicativo móvel, com autenticação, perfis, turmas, solicitação de inscrição e consulta de avisos direcionados; (2) a plataforma web de gerenciamento, com a publicação, edição, arquivamento e exclusão de avisos, a gestão de usuários, turmas e vínculos, e a demonstração do fluxo completo entre web, API e aplicativo; e (3) a agenda acadêmica de eventos e os horários das turmas. Cada entrega é validada por testes funcionais e de integração antes do início da seguinte.

**Avisos direcionados e rastreabilidade**

> Cada aviso pode ter vários destinos — todos os usuários, turmas, semestres do curso ou docentes —, de modo que um mesmo comunicado alcance, por exemplo, três turmas ao mesmo tempo. Alterações, arquivamentos e exclusões são registradas em histórico imutável, com o autor, a data e o que foi modificado, e as versões anteriores do aviso são preservadas, garantindo a rastreabilidade das informações.

# 13. Pendências

- Confirmar com o orientador as decisões complementares C1 a C10.
- Atualizar o texto do TCC com os parágrafos da seção 12.
- Alinhar `CONECTA_Arquitetura.md` aos novos perfis e escopo (hoje ainda lista aluno, professor, servidor e servidor/coordenação, e provas/datas como módulos próprios).
- Especificar a interface da plataforma web (E2) e detalhar a E3 antes de suas implementações.
- Executar a validação da integração real com o Moodle quando houver acesso.
