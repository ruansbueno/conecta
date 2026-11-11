# CONECTA — Arquitetura da Aplicação

> Sistema web e mobile para publicação e consulta de avisos, eventos e horários do curso, composto por uma plataforma Web de gerenciamento (administração, coordenação e docentes) e um aplicativo Mobile (todos os usuários).

---

# 1. Visão Geral

O sistema CONECTA é composto por três elementos principais:

## 1.1 Usuários

Os usuários acessam o sistema por meio de duas plataformas:

- **Plataforma Web**
  - Administradores
  - Coordenação
  - Docentes

- **Aplicativo Mobile**
  - Todos os usuários autenticados

## 1.2 API Backend

A API Backend é responsável pela comunicação entre as plataformas, banco de dados e serviços externos.

Principais responsabilidades:

- Autenticação
- Autorização
- Gerenciamento de usuários e perfis
- Gerenciamento de turmas, vínculos e solicitações de inscrição
- Gerenciamento de avisos (com versões e histórico)
- Gerenciamento da agenda (eventos, provas e datas importantes)
- Gerenciamento de horários das turmas
- Controle de permissões
- Integração com serviços externos

## 1.3 Banco de Dados

O sistema utiliza um banco de dados relacional **PostgreSQL** para armazenamento das informações da aplicação.

## 1.4 Entregas

O desenvolvimento é dividido em três entregas, cada uma validada antes da seguinte:

- **E1 — API + aplicativo:** autenticação, perfis, turmas, solicitação de inscrição e consulta de avisos.
- **E2 — Plataforma Web + fluxo completo:** gestão de usuários, turmas, vínculos e avisos; fluxo web → API → aplicativo.
- **E3 — Agenda e horários:** eventos (incluindo provas e datas importantes) e horários das turmas.

Detalhes em `projeto-api/specs/001-auth-perfil-turmas-avisos/spec.md`.

---

# 2. Autenticação e Autorização

A autenticação utiliza a **API de autenticação do IFSul**, que consulta o Active Directory da
instituição para validar as credenciais (até 06/11/2026 o projeto previa o Moodle para isso; o
serviço disponibilizado pela instituição é esta API).

### Fluxo de autenticação

1. O usuário acessa o aplicativo ou a plataforma web.
2. Informa login e senha institucionais.
3. As credenciais são enviadas para a API Backend.
4. O Backend envia as credenciais à API de autenticação do IFSul (`POST` JSON, só por HTTPS em
   produção).
5. A API do IFSul consulta o Active Directory.
6. Se as credenciais forem válidas, a API do IFSul apenas **identifica** a pessoa (login, nome,
   e-mail e tipo institucional: aluno ou administrativo); o Backend carrega o perfil e a situação do
   usuário no próprio CONECTA e gera o token de acesso.

> Reconhecer o usuário no login é diferente de decidir o que ele pode fazer: **o perfil é atribuído
> pelo CONECTA**, nunca pelo provedor. No primeiro login, um aluno é criado como `aluno`; um
> servidor (tipo administrativo) vira um **pedido de acesso**, sem sessão, até a administração ou a
> coordenação aprovar definindo o perfil. Somente o administrador altera perfis depois.

> Em desenvolvimento e nos testes, a validação é feita por um **provedor de autenticação simulado**
> (mock), trocável por configuração. Testes com usuários simulados são identificados como tais e
> não substituem a validação da integração real.

## 2.2 Geração do Token

Após a validação do usuário:

- É utilizado **OAuth2 + JWT**.
- O token possui validade de **24 horas**.
- O token contém o identificador e o perfil do usuário; a API reavalia perfil e situação no banco a cada requisição.
- O token é assinado utilizando um algoritmo seguro.

A resposta enviada ao cliente contém:

- Token JWT
- Perfil
- Dados do usuário

O token recebido pelo cliente é utilizado nas requisições seguintes como **Bearer Token**.

## 2.3 Validação das requisições

A cada requisição protegida:

1. O cliente envia o Bearer Token.
2. A API Backend verifica a assinatura do token.
3. Verifica a validade e expiração do token.
4. Carrega o perfil e a situação (ativo/inativo) do usuário.
5. Caso o token seja inválido, a API retorna `401` ou `403`.
6. Caso seja válido, a requisição continua para o recurso solicitado.

### Fluxo

```text
Usuário
   │
   ▼
Tela de Login
   │
   │ Username + Senha
   ▼
API Backend
   │
   │ Validação
   ▼
API de autenticação do IFSul
   │
   │ Usuário identificado (login, nome, e-mail, tipo institucional)
   ▼
Banco CONECTA
   │
   │ Perfil e situação (ativo/inativo)
   ▼
Geração do JWT
   │
   │ Token + Perfil + Dados
   ▼
Cliente
   │
   │ Bearer Token
   ▼
API Backend
   │
   │ Validação do Token
   ▼
Recurso solicitado
```

---

# 3. Plataformas

## 3.1 Plataforma Web

A plataforma Web é destinada a **administradores, coordenação e docentes**, cada um com as permissões do seu perfil.

### Funcionalidades

- Dashboard
- Gestão de avisos (publicar, editar, arquivar, excluir; versões e histórico)
- Gestão de eventos, provas e datas importantes (agenda)
- Gestão de horários das turmas
- Gestão de turmas e vínculos
- Aprovação de solicitações de inscrição
- Gestão de usuários e perfis (administrador)

## 3.2 Aplicativo Mobile

O aplicativo Mobile é destinado a **todos os usuários autenticados**.

### Funcionalidades

- Avisos
- Agenda (eventos, provas e datas importantes)
- Horários das turmas
- Minhas turmas
- Solicitação de inscrição em turmas
- Perfil do usuário

### Possibilidade futura

- Notificações Push

---

# 4. Módulos Funcionais

## 4.1 Usuários e Perfis

O sistema trabalha com quatro perfis:

- **Administrador**
- **Coordenação**
- **Docente**
- **Aluno**

### Atribuição

- O login (API de autenticação do IFSul ou provedor simulado) apenas identifica o usuário.
- No primeiro login o usuário é criado como **Aluno**.
- **Somente o administrador** altera perfis e ativa/desativa usuários.

### Funcionalidades

- Consulta do próprio perfil
- Cadastro e gerenciamento de usuários e perfis (administrador)
- Controle de acesso aos recursos conforme a matriz de permissões da especificação

---

## 4.2 Turmas

Responsável pelo gerenciamento das turmas acadêmicas.

### Funcionalidades

- Cadastro de turmas (representam os vínculos reais do curso)
- Vínculo de docentes e alunos às turmas (papéis `docente` e `aluno`), criado pela coordenação/administração ou pela aprovação de uma solicitação
- Solicitação de inscrição pelo aluno, aprovada ou recusada por coordenação, administrador ou docente da turma
- Lista de vinculados
- Destino de avisos e eventos por turma

---

## 4.3 Avisos

Responsável pela comunicação entre a instituição e os usuários.

### Funcionalidades

- Criação, edição, arquivamento e exclusão (lógica) de avisos
- Definição de um ou mais destinos
- Agendamento de avisos
- Versões e histórico de eventos (autor, data e o que mudou)

### Destinatários

Um aviso possui de 1 a 20 destinos e é visível a quem for alcançado por pelo menos um deles:

- Todos os usuários
- Uma ou mais turmas
- Um ou mais semestres do curso
- Docentes

---

## 4.4 Eventos

Responsável pelo gerenciamento de eventos acadêmicos.

### Funcionalidades

- Cadastro de eventos
- Definição do tipo de evento
- Definição do público (mesmos destinos dos avisos)
- Associação com turmas
- Visualização dos próximos eventos

> Entrega E3. As provas e as datas importantes (seções 4.5 e 4.6) são tratadas como tipos de evento.

### Tipos de eventos

- Palestra
- Banca
- Reunião
- Formatura
- Prova
- Data importante
- Outros

### Público

Um evento pode ser destinado a:

- Todos os usuários
- Turmas específicas
- Semestres
- Docentes

---

## 4.5 Provas

Responsável pelo cadastro e gerenciamento das provas.

### Informações

- Turma
- Disciplina
- Data
- Horário
- Local
- Conteúdo
- Observações
- Público de divulgação

---

## 4.6 Datas Importantes

Centraliza as principais datas acadêmicas.

### Informações

- Calendário acadêmico
- Feriados
- Prazos
- Rematrículas
- Outras datas relevantes

---

# 5. Regras de Negócio

## 5.1 Inscrição em turmas

As turmas representam vínculos reais do curso. O aluno **solicita** inscrição nas turmas disponíveis; a solicitação é aprovada ou recusada por coordenação, administrador ou docente da turma, e só então o vínculo é criado.

## 5.2 Visibilidade dos conteúdos

Avisos (e, na E3, eventos, provas e datas) são exibidos a um usuário ativo quando o conteúdo está publicado (não agendado para o futuro, nem excluído) e **ao menos um dos seus destinos alcança o usuário**:

- **Todos:** qualquer usuário ativo.
- **Turma:** usuários com vínculo (aluno ou docente) naquela turma, se ela estiver ativa.
- **Semestre:** usuários com vínculo em turma ativa daquele semestre do curso.
- **Docentes:** usuários de perfil docente.

O perfil define o que o usuário pode **gerenciar** (matriz de permissões); a **visibilidade** depende dos destinos e dos vínculos. Conteúdos arquivados saem da lista ativa, mas continuam consultáveis pelos destinatários.

## 5.3 Conteúdos gerais

Conteúdos classificados como gerais podem ser visualizados por todos os usuários que possuem permissão.

## 5.4 Acesso administrativo

Administradores, coordenação e docentes possuem acesso à plataforma Web para gerenciamento das informações acadêmicas, conforme a matriz de permissões de cada perfil (docentes gerenciam apenas o que se refere às suas turmas).

## 5.5 Aplicativo Mobile

O aplicativo Mobile está disponível para todos os usuários autenticados.

---

# 6. Arquitetura Técnica

A arquitetura técnica é organizada em camadas.

```text
┌──────────────────────────────────────┐
│              CLIENTES                │
│                                      │
│  Web (Admin/Coord./Docentes)         │
│  App Mobile (Todos os usuários)      │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│             API GATEWAY              │
│                                      │
│  • Roteamento                        │
│  • Rate Limiting                     │
│  • Segurança                         │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│          SERVIÇOS BACKEND            │
│              FastAPI                 │
│                                      │
│  • Autenticação                      │
│  • Usuários                          │
│  • Turmas                            │
│  • Avisos                            │
│  • Eventos                           │
│  • Provas                            │
│  • Datas                             │
│  • Notificações*                     │
└───────────────┬───────────────┬──────┘
                │               │
                ▼               ▼
┌──────────────────────┐   ┌──────────────────────┐
│     PostgreSQL       │   │    Serviços Externos │
│                      │   │                      │
│  Banco de Dados      │   │  • API IFSul (AD)    │
│  Relacional          │   │  • Serviço de E-mail │
│                      │   │  • Notificações Push*│
└──────────────────────┘   └──────────────────────┘

* Caso implementados
```

---

# 7. Fluxo de Dados

## 7.1 Fluxo de Login

```text
USUÁRIO
   │
   │ 1. Login
   ▼
APP / WEB
   │
   │ 2. Envia credenciais
   ▼
API BACKEND
   │
   │ 3. Consulta a API de autenticação do IFSul
   ▼
API DE AUTENTICAÇÃO DO IFSUL (Active Directory)
   │
   │ 4. Retorna usuário identificado (login, nome, e-mail e tipo: aluno ou administrativo)
   ▼
API BACKEND
   │
   │ 5. Carrega (ou cria, como aluno, no 1º login) o usuário no
   │    banco CONECTA e lê seu perfil e situação (ativo/inativo)
   │
   │ 6. Gera JWT (24h)
   │
   │ 7. Retorna token
   ▼
APP / WEB
```

## 7.2 Fluxo de uma requisição autenticada

```text
USUÁRIO
   │
   ▼
APP / WEB
   │
   │ 8. Requisição + Bearer Token
   ▼
API BACKEND
   │
   │ 9. Valida token, perfil e situação
   ▼
BANCO DE DADOS
   │
   │ 10. Consulta / grava dados
   ▼
API BACKEND
   │
   │ 11. Retorna dados
   ▼
APP / WEB
   │
   │ 12. Exibe resultado
   ▼
USUÁRIO
```

## 7.3 Fluxo completo

```text
┌─────────┐
│ Usuário │
└────┬────┘
     │
     │ Login
     ▼
┌─────────────┐
│   App/Web   │
└──────┬──────┘
       │
       │ Credenciais
       ▼
┌─────────────┐
│ API Backend │
└──────┬──────┘
       │
       │ Validação
       ▼
┌─────────────┐
│ API IFSul   │
└──────┬──────┘
       │
       │ Usuário identificado
       ▼
┌─────────────┐
│ API Backend │
└──────┬──────┘
       │
       │ Perfil e situação
       ▼
┌─────────────┐
│ PostgreSQL  │
└──────┬──────┘
       │
       │ Perfil
       ▼
┌─────────────┐
│ Geração JWT │
└──────┬──────┘
       │
       │ Token
       ▼
┌─────────────┐
│   App/Web   │
└──────┬──────┘
       │
       │ Requisição autenticada
       ▼
┌─────────────┐
│ API Backend │
└──────┬──────┘
       │
       │ Consulta
       ▼
┌─────────────┐
│  PostgreSQL │
└──────┬──────┘
       │
       │ Dados
       ▼
┌─────────────┐
│ API Backend │
└──────┬──────┘
       │
       │ Resposta
       ▼
┌─────────────┐
│   App/Web   │
└─────────────┘
```

---

# 8. Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend Web | React / Next.js |
| Aplicativo Mobile | Flutter |
| Backend | FastAPI (Python) |
| Banco de Dados | PostgreSQL |
| Autenticação | OAuth2 + JWT |
| Comunicação | API REST / JSON |
| Integração externa | API de autenticação do IFSul (Active Directory) |
| Infraestrutura | Infraestrutura própria do IFSul |

---

# 9. Segurança

A arquitetura utiliza mecanismos de segurança para proteger a autenticação, comunicação e acesso aos recursos.

## 9.1 Autenticação

- OAuth2
- JWT
- Expiração dos tokens em 24 horas

## 9.2 Proteção de credenciais

- Armazenamento seguro das credenciais
- Senhas institucionais não são armazenadas nem registradas em log pelo CONECTA

## 9.3 Comunicação

- HTTPS
- Comunicação através de APIs REST
- JSON como formato de comunicação

## 9.4 Autorização

- Validação do token em todas as requisições protegidas
- Controle de permissões baseado em perfil
- Validação do perfil e da situação (ativo/inativo) a cada requisição
- Controle de acesso aos recursos

## 9.5 Validação do JWT

O Backend deve verificar:

1. Assinatura do token
2. Expiração
3. Integridade
4. Perfil e situação do usuário

Tokens inválidos ou expirados devem resultar em respostas HTTP apropriadas, como:

```text
401 Unauthorized
403 Forbidden
```

---

# 10. Estrutura Geral da Arquitetura

```text
                              ┌──────────────────┐
                              │     USUÁRIOS     │
                              └────────┬─────────┘
                                       │
                         ┌─────────────┴─────────────┐
                         │                           │
                         ▼                           ▼
                ┌────────────────┐         ┌────────────────┐
                │  WEB           │         │  MOBILE        │
                │ React / Next   │         │ Flutter        │
                │                │         │                │
                │ Admin/Coord.   │         │ Todos usuários │
                │ Docentes       │         │ autenticados   │
                └───────┬────────┘         └───────┬────────┘
                        │                          │
                        └────────────┬─────────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │   API GATEWAY   │
                            │                 │
                            │ • Roteamento    │
                            │ • Rate Limiting │
                            │ • Segurança     │
                            └────────┬────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │  API BACKEND    │
                            │    FastAPI      │
                            │                 │
                            │ • Autenticação  │
                            │ • Usuários      │
                            │ • Turmas        │
                            │ • Avisos        │
                            │ • Eventos       │
                            │ • Provas        │
                            │ • Datas         │
                            └──────┬─────┬────┘
                                   │     │
                    ┌──────────────┘     └──────────────┐
                    │                                   │
                    ▼                                   ▼
           ┌──────────────────┐                ┌──────────────────┐
           │    PostgreSQL    │                │   API IFSul (AD) │
           │                  │                │                  │
           │ Banco relacional │                │ Autenticação     │
           │                  │                │ de usuários      │
           └──────────────────┘                └──────────────────┘
```

---

# 11. Responsabilidades por Camada

| Camada | Responsabilidade |
|---|---|
| **Web** | Interface de gestão para administradores, coordenação e docentes |
| **Mobile** | Interface de comunicação e consulta para usuários |
| **API Gateway** | Roteamento, segurança e controle de requisições |
| **Backend** | Regras de negócio, autenticação, autorização e processamento |
| **PostgreSQL** | Persistência dos dados da aplicação |
| **API de autenticação do IFSul** | Validação das credenciais no Active Directory e identificação dos usuários (o perfil é do CONECTA) |
| **Serviços externos** | E-mail e notificações, quando implementados |

---

# 12. Princípios da Arquitetura

A arquitetura do CONECTA busca:

- **Centralização:** todas as plataformas utilizam a mesma API Backend.
- **Separação de responsabilidades:** frontend, backend, banco e integrações possuem responsabilidades distintas.
- **Segurança:** autenticação baseada em OAuth2 + JWT e controle de permissões.
- **Escalabilidade:** possibilidade de expansão dos serviços sem alteração significativa das interfaces clientes.
- **Manutenibilidade:** regras de negócio centralizadas no Backend.
- **Reutilização:** Web e Mobile compartilham os mesmos serviços e APIs.
- **Integração:** comunicação com a API de autenticação do IFSul e outros serviços externos através de APIs.
- **Controle de acesso:** recursos disponibilizados conforme perfil, permissões e vínculo com turmas; o perfil é atribuído pelo CONECTA, não pelo provedor de autenticação.

---

# 13. Resumo

O **CONECTA** utiliza uma arquitetura baseada em **cliente-servidor**, na qual as aplicações Web e Mobile funcionam como clientes de uma **API REST desenvolvida em FastAPI**.

A API centraliza as regras de negócio e realiza a comunicação com o **PostgreSQL**, responsável pela persistência dos dados, e com a **API de autenticação do IFSul**, responsável pela validação das credenciais dos usuários.

A autenticação utiliza **OAuth2 + JWT**, com tokens válidos por 24 horas; as permissões decorrem do perfil (administrador, coordenação, docente ou aluno), mantido pelo CONECTA e reavaliado a cada requisição.

A arquitetura permite que diferentes tipos de usuários acessem diferentes funcionalidades, mantendo uma separação entre:

- Apresentação
- Autenticação
- Autorização
- Regras de negócio
- Persistência
- Integrações externas

Dessa forma, o sistema pode atender simultaneamente às necessidades de **comunicação acadêmica, gestão de turmas e gerenciamento de informações institucionais** através de uma infraestrutura centralizada.
