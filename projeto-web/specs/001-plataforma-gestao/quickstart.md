# Quickstart: Plataforma Web de Gestão

**Feature**: [spec.md](./spec.md) | **Plano**: [plan.md](./plan.md) | **Data**: 2026-10-13

Como rodar a plataforma contra a API local com o provedor de autenticação simulado. Nada aqui foi
implementado ainda — este documento é a referência que as tarefas de setup devem satisfazer.

## Pré-requisitos

- Node.js 20 LTS e npm — apenas como ferramenta de build; **o resultado é um site estático**.
- A API do CONECTA rodando localmente — ver
  `projeto-api/specs/001-auth-perfil-turmas-avisos/quickstart.md`.

## 0. Verificar a premissa de implantação

A sessão depende de **mesma origem** entre a plataforma e a API: o cookie é `httpOnly`, `Secure` e
`SameSite=Strict`, emitido pela API. Antes de escrever código, confirme com quem administra a
infraestrutura do IFSul que é possível servir:

- a plataforma em `https://<dominio>/` (arquivos estáticos);
- a API no mesmo domínio, sob `/api`, por proxy reverso;
- com HTTPS — sem ele o cookie `Secure` não é gravado.

Se isso não for possível, a decisão D2 de `research.md` precisa ser reaberta **antes** do
desenvolvimento, não depois.

## 1. Configurar o ambiente

```bash
cp .env.example .env.local
```

```ini
# .env.local — tudo aqui entra no build e é público
VITE_API_BASE_URL=/api
```

Em desenvolvimento, `vite.config.ts` encaminha `/api` para `http://localhost:8000`, reproduzindo a
mesma origem que haverá em produção. Assim o cookie funciona igual nos dois ambientes.

> Não existe segredo nesta camada: todo valor embutido no build pode ser lido por qualquer pessoa
> que abra o site.

## 2. Rodar

```bash
npm install
npm run dev        # http://localhost:5173
```

## 3. Entrar com os usuários de teste

O provedor mock da API expõe um usuário por perfil (ver o seed do `projeto-api`).

| Perfil | O que verificar |
|---|---|
| `coordenacao` | Painel completo, avisos para qualquer destino, turmas, vínculos, solicitações |
| `administrador` | O mesmo, mais Usuários e a alteração de perfil |
| `docente` | Painel próprio, só os avisos que publicou, destinos limitados às suas turmas |
| `aluno` | Tela de sem permissão, com a sessão encerrada na API |

## 4. Roteiro de verificação manual

1. **Login inválido** — senha errada devolve "Usuário ou senha incorretos", sem revelar se o
   usuário existe.
2. **Aluno na web** — entra com credenciais válidas de aluno: a plataforma encerra a sessão e
   mostra a tela de sem permissão, com orientação para usar o aplicativo.
3. **Token inacessível** — com a sessão ativa, no console do navegador: `document.cookie` não
   mostra o token (só o cookie CSRF), e `localStorage` e `sessionStorage` estão vazios. Nas
   ferramentas de desenvolvedor, o cookie de sessão aparece com `HttpOnly`, `Secure` e
   `SameSite=Strict`.
4. **CSRF** — repetir uma ação de escrita removendo o cabeçalho CSRF: a API recusa.
5. **Rota protegida** — abrir `/avisos` sem sessão leva ao login e, depois de entrar, segue para
   `/avisos`.
6. **Recarregar em rota profunda** — abrir `/avisos/<id>/historico` e recarregar a página: com a
   regra de reescrita para `index.html`, a tela carrega normalmente.
7. **Publicar** — como coordenação, criar um aviso para três turmas; conferir no aplicativo (ou em
   `GET /avisos` com um aluno dessas turmas) que só os alcançados recebem.
8. **Agendar** — criar um aviso com data futura: aparece como `Agendado` e não chega ao aplicativo
   até a data; data no passado é recusada com o campo marcado.
9. **Docente** — o editor só oferece as turmas em que leciona; `todos`, `semestre` e `docentes`
   aparecem indisponíveis com explicação.
10. **Editar** — editar um aviso e conferir no histórico a comparação do que mudou e a nova versão.
11. **Ciclo de vida** — arquivar, desarquivar e excluir, conferindo um evento por operação e a
    presença do excluído apenas no filtro de excluídos.
12. **Turma e vínculo** — criar turma, vincular um docente, remover o vínculo (confirmando o
    alerta) e verificar o efeito nos avisos daquela turma.
13. **Solicitação** — aprovar uma (o vínculo nasce junto) e recusar outra com motivo.
14. **Perfil** — como administrador, mudar o perfil de alguém e conferir que vale na navegação
    seguinte daquela pessoa, sem novo login.
15. **Sessão expirada** — invalidar o token no servidor e tocar qualquer ação: volta ao login com
    "Sua sessão expirou", e o texto de um formulário aberto não se perde.
16. **Teclado** — percorrer login, lista, editor e um modal usando só `Tab`, `Shift+Tab`, `Enter` e
    `Esc`, com foco sempre visível.

## 5. Testes

```bash
npm run test          # unidade e componente (Vitest + Testing Library)
npm run test:e2e      # ponta a ponta (Playwright) contra o servidor falso
npm run lint
npm run typecheck
```

Nenhum teste depende da API real: o servidor falso de `e2e/servidor-falso/` implementa o contrato,
inclusive o cookie de sessão e o cookie CSRF, e sabe forçar `401`, `403`, `409` e lentidão.

## 6. Build e implantação

```bash
npm run build     # gera dist/
npm run preview   # confere o build localmente
```

Publicar é copiar `dist/` para o servidor web. A única configuração necessária é a reescrita de
rotas desconhecidas para `index.html` — por exemplo, no nginx:

```nginx
location / {
  root /var/www/conecta;
  try_files $uri $uri/ /index.html;
}

location /api/ {
  proxy_pass http://127.0.0.1:8000/;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

Não há processo de aplicação para manter no ar nesta camada: só arquivos.
