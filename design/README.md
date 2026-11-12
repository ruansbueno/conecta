# CONECTA — design de telas

Mockups estáticos do aplicativo mobile e da plataforma web de gestão, desenhados a partir de
`projeto-api/specs/001-auth-perfil-turmas-avisos/spec.md` e de `CONECTA_Arquitetura.md`.

> **Proposta original, de outubro de 2026.** As telas preveem o login validado pelo Moodle e usam o
> curso de Tecnologia em Sistemas para Internet como exemplo. No sistema implementado, o login é
> feito pela API de autenticação do IFSul e o curso é Análise e Desenvolvimento de Sistemas. As
> demais diferenças entre o desenho e as telas implementadas estão nos relatórios de evidências
> (`projeto-web/evidencias/` e `projeto-mobile/evidencias/`).

As imagens são renderizadas a partir de HTML/CSS (`_src/`, `_assets/`) com o Chrome headless:

```bash
cd design/_src
python3 build.py          # gera todas as telas
python3 build.py w-04     # gera só as telas cujo nome contém "w-04"
```

PNGs em `mobile/` (390×844, @2x) e `web/` (1440×900, @2x). O HTML intermediário fica em `_html/`.

## Identidade

| Papel | Valor |
|---|---|
| Navy (texto, marca) | `#132A4E` |
| Navy suave | `#2A4374` |
| Azul de ação | `#2563EB` |
| Azul de fundo | `#EFF4FF` |
| Fundo da página | `#F5F8FC` |
| Linhas | `#E4E9F2` / `#EFF2F7` |
| Texto secundário | `#5B6B86` / `#8A99B0` |
| Agendado / pendente | `#B45309` sobre `#FDF4E6` |
| Aprovado / ativo | `#15803D` sobre `#E9F6EE` |
| Recusado / excluído | `#B91C1C` sobre `#FCECEC` |

Tipografia: **Inter** (400–800) em toda a interface, sem serifa. Títulos com entreletra negativa
(−0,02 em), corpo em 13–14 px no app e 13,5 px na web.

Superfícies brancas com borda de 1 px (sem sombra), raio de 10–12 px. A sombra aparece só em
camadas sobrepostas (modais e folhas).

O **chip de destino** é o elemento recorrente das duas plataformas: um ponto colorido por tipo de
destino — azul para turma, navy para semestre, verde para todos, âmbar para docentes — seguido do
nome. É o que torna visível, em qualquer lista, a regra de público da especificação.

## Telas — aplicativo mobile

| Arquivo | Tela | Requisitos relacionados |
|---|---|---|
| `m-01-login` | Login com provedor externo | RF-01, RF-06 |
| `m-02-avisos` | Lista de avisos ativos com destinos | RF-21 |
| `m-03-aviso-detalhe` | Aviso aberto, com marca de edição | RF-23, RF-25 |
| `m-04-avisos-arquivados` | Lista de arquivados | RF-23, 3.4 |
| `m-05-avisos-vazio` | Sem avisos (lista vazia não é erro) | Edge cases |
| `m-06-minhas-turmas` | Turmas vinculadas, papel e solicitações | RF-16 |
| `m-07-turmas-disponiveis` | Turmas ativas com inscrições abertas | RF-12 |
| `m-08-solicitacao-enviada` | Confirmação da solicitação pendente | RF-13 |
| `m-09-minhas-solicitacoes` | Status pendente, aprovada e recusada | RF-15 |
| `m-10-agenda` | Lista dos próximos eventos, provas e datas | RF-31 (E3) |
| `m-10b-agenda-mes` | Mês inteiro em grade, com marcadores por dia e as atividades do dia escolhido | RF-31 (E3) |
| `m-11-evento-detalhe` | Evento aberto com público | RF-31 (E3) |
| `m-12-horarios` | Grade semanal da turma | RF-31 (E3) |
| `m-13-perfil` | Perfil, vínculos e saída | RF-11 |

## Telas — plataforma web de gestão

| Arquivo | Tela | Perfil | Requisitos relacionados |
|---|---|---|---|
| `w-01-login` | Entrada da gestão | — | RF-01 |
| `w-02-painel-coordenacao` | Painel com avisos, solicitações e agenda | Coordenação | — |
| `w-03-avisos-lista` | Avisos por situação, com versões | Coordenação | RF-24, RF-26 |
| `w-04-aviso-editor` | Novo aviso: destinos, agendamento, prévia | Coordenação | RF-20, RF-22, RF-24 |
| `w-05-aviso-destinos` | Seletor de destinos (turmas, semestres, grupos) | Coordenação | RF-20 |
| `w-06-aviso-historico` | Linha do tempo de eventos e versões | Coordenação | RF-25, RF-27, RF-28 |
| `w-07-turmas` | Turmas ativas e inativas | Coordenação | RF-18 |
| `w-08-turma-detalhe` | Vínculos de alunos e docentes | Coordenação | RF-19 |
| `w-09-solicitacoes` | Aprovar e recusar com motivo | Coordenação | RF-17 |
| `w-10-usuarios` | Usuários, perfis e situação | Administrador | RF-09 |
| `w-11-alterar-perfil` | Troca de perfil e desativação | Administrador | RF-09, RF-04 |
| `w-12-agenda` | Eventos com o mesmo mecanismo de destinos | Coordenação | RF-31 (E3) |
| `w-13-horarios` | Grade da turma | Coordenação | RF-31 (E3) |
| `w-14-painel-docente` | Painel restrito às turmas do docente | Docente | RF-10 |
| `w-15-aviso-editor-docente` | Destinos limitados às turmas em que leciona | Docente | RF-24, 3.3 |
| `w-16-sem-permissao` | Acesso negado por perfil | Docente | RF-05 |

## Decisões de interface que vêm da especificação

- O aluno não tem plataforma web: a web é de gestão (administração, coordenação e docentes).
- A inscrição é **solicitação com aprovação** — nunca há botão que crie vínculo direto para o aluno.
- Todo aviso mostra seus destinos. Nas listas do app aparece uma única vez, mesmo alcançado por
  vários destinos.
- O docente vê os destinos de alcance geral (`todos`, `semestre`, `docentes`) desabilitados e
  explicados, em vez de escondidos.
- Arquivado, agendado e excluído são situações visíveis, com cor própria e lista própria.
- Histórico e versões são apresentados como registro imutável, incluindo o que mudou em cada edição.
- A agenda do app tem duas visões pela mesma barra de filtros: **Próximos** (lista cronológica) e
  **Mês** (grade do mês inteiro). Na grade, cada dia com atividade recebe um marcador colorido pelo
  tipo — âmbar para prova, azul para evento, navy para prazo — e tocar no dia abre a lista daquele
  dia logo abaixo. O dia de hoje aparece em azul; o dia escolhido, em círculo cheio.
