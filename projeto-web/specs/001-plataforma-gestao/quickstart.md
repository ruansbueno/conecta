# Quickstart: Plataforma Web de Gestão

**Feature**: [spec.md](./spec.md) | **Plano**: [plan.md](./plan.md) | **Data**: 2026-10-13

Como rodar a plataforma contra a API local com o provedor de autenticação simulado. Nada aqui foi
implementado ainda — este documento é a referência que as tarefas de setup devem satisfazer.

## Pré-requisitos

- Node.js 20 LTS e npm.
- A API do CONECTA rodando localmente — ver
  `projeto-api/specs/001-auth-perfil-turmas-avisos/quickstart.md`.

## 1. Configurar o ambiente

```bash
cp .env.example .env.local
```

```ini
# .env.local — variáveis do servidor; nenhuma com prefixo NEXT_PUBLIC_
API_BASE_URL=http://localhost:8000
SESSION_COOKIE_NAME=conecta_sessao
```

> `API_BASE_URL` **não** pode ser pública: o navegador não fala com a API, só com esta
> plataforma (Princípio IV). Em homologação e produção, use HTTPS — o cookie é `Secure`.

## 2. Rodar

```bash
npm install
npm run dev     # http://localhost:3000
```

## 3. Entrar com os usuários de teste

O provedor mock da API expõe um usuário por perfil (ver o seed do `projeto-api`).

| Perfil | O que verificar |
|---|---|
| `coordenacao` | Painel completo, avisos para qualquer destino, turmas, vínculos, solicitações |
| `administrador` | O mesmo, mais Usuários e a alteração de perfil |
| `docente` | Painel próprio, só os avisos que publicou, destinos limitados às suas turmas |
| `aluno` | Tela de sem permissão e sessão encerrada |

## 4. Roteiro de verificação manual

1. **Login inválido** — senha errada devolve "Usuário ou senha incorretos", sem revelar se o
   usuário existe.
2. **Aluno na web** — entra com credenciais válidas de aluno: vê a tela de sem permissão com
   orientação para usar o aplicativo, e nenhum cookie de sessão é gravado.
3. **Token fora do navegador** — com a sessão ativa, no console do navegador: `document.cookie`
   não mostra o token, e nenhuma busca por `Bearer` no HTML ou no JavaScript o encontra.
4. **Rota protegida** — abrir `/avisos` sem sessão leva ao login e, depois de entrar, segue para
   `/avisos`.
5. **Publicar** — como coordenação, criar um aviso para três turmas; conferir no aplicativo (ou
   em `GET /avisos` com o token de um aluno dessas turmas) que só os alcançados recebem.
6. **Agendar** — criar um aviso com data futura: aparece como `Agendado` e não chega ao
   aplicativo até a data; data no passado é recusada com o campo marcado.
7. **Docente** — entrar como docente: o editor só oferece as turmas em que leciona, e `todos`,
   `semestre` e `docentes` aparecem indisponíveis com explicação.
8. **Editar** — editar um aviso e conferir no histórico a comparação do que mudou e a nova versão.
9. **Ciclo de vida** — arquivar, desarquivar e excluir um aviso, conferindo um evento por
   operação e a presença do excluído apenas no filtro de excluídos.
10. **Turma e vínculo** — criar turma, vincular um docente, remover o vínculo (confirmando o
    alerta) e verificar o efeito nos avisos daquela turma.
11. **Solicitação** — aprovar uma solicitação e conferir que o vínculo nasce na mesma operação;
    recusar outra com motivo e conferir que o aluno vê o motivo no aplicativo.
12. **Perfil** — como administrador, mudar o perfil de alguém e conferir que vale na navegação
    seguinte daquela pessoa, sem novo login.
13. **Sessão expirada** — invalidar o token no servidor e tocar qualquer ação: volta ao login com
    "Sua sessão expirou", e o texto de um formulário aberto não se perde.
14. **Teclado** — percorrer login, lista, editor e um modal usando só `Tab`, `Shift+Tab`, `Enter`
    e `Esc`, com foco sempre visível.

## 5. Testes

```bash
npm run test          # unidade e componente (Vitest + Testing Library)
npm run test:e2e      # ponta a ponta (Playwright) contra o servidor falso
npm run lint
npm run typecheck
```

Nenhum teste depende da API real: o servidor falso de `e2e/servidor-falso/` implementa o contrato
e sabe forçar `401`, `403`, `409` e lentidão.

## 6. Build

```bash
npm run build && npm start
```

Em produção, a plataforma precisa de um servidor Node — é o que mantém o token fora do navegador.
