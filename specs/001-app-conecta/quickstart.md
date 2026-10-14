# Quickstart: Aplicativo CONECTA

**Feature**: [spec.md](./spec.md) | **Plano**: [plan.md](./plan.md) | **Data**: 2026-10-13

Como rodar o app contra a API local com o provedor de autenticação simulado. Nada aqui foi
implementado ainda — este documento é a referência que as tarefas de setup devem satisfazer.

## Pré-requisitos

- Flutter no canal estável (`flutter --version` ≥ 3.24) e `flutter doctor` sem erro bloqueante.
- A API do CONECTA rodando localmente — ver `projeto-api/specs/001-auth-perfil-turmas-avisos/quickstart.md`.
- Um emulador Android ou simulador iOS, ou um aparelho com depuração ativada.

## 1. Apontar para a API

A URL entra por `--dart-define`, nunca no código:

```bash
# emulador Android: o host da máquina é 10.0.2.2
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000

# simulador iOS ou aparelho na mesma rede
flutter run --dart-define=API_BASE_URL=http://localhost:8000
flutter run --dart-define=API_BASE_URL=http://192.168.0.10:8000
```

Sem `API_BASE_URL`, o app usa `http://localhost:8000`, o padrão de desenvolvimento.

> Android bloqueia HTTP em claro por padrão. Para desenvolvimento, a configuração de rede do
> projeto libera apenas `localhost` e `10.0.2.2`; homologação e produção usam HTTPS.

## 2. Entrar com os usuários de teste

O provedor mock da API expõe um usuário por perfil (ver o seed do `projeto-api`). O perfil
**nunca** vem do provedor: quem define é o CONECTA, e no primeiro login o usuário nasce `aluno`.

| Perfil esperado | Para verificar |
|---|---|
| `aluno` | Avisos de turma, turmas disponíveis, solicitação de inscrição |
| `docente` | Avisos de `docentes` e das suas turmas; ausência do botão de solicitar |
| `coordenacao` | Só avisos de destino `todos`; lista de turmas vazia com estado explicativo |

## 3. Roteiro de verificação manual

1. **Login inválido** — senha errada devolve "Usuário ou senha incorretos", sem revelar se o
   usuário existe.
2. **Login válido** — abre em Avisos com a lista preenchida em menos de 5 s.
3. **Destinos** — um aviso com três turmas aparece uma única vez, com os três chips.
4. **Arquivados** — alternar o filtro muda a lista e mostra a explicação da aba.
5. **Detalhe** — abrir um aviso editado mostra "publicado … · editado …".
6. **Solicitação** — como aluno, solicitar uma turma disponível, ver a folha de confirmação, achar
   o item pendente em Minhas solicitações e cancelá-lo.
7. **Duplicada** — solicitar duas vezes a mesma turma devolve a mensagem de solicitação pendente.
8. **Sessão expirada** — invalidar o token no servidor (ou desativar o usuário) e tocar em
   qualquer aba: o app volta ao login com "Sua sessão expirou".
9. **Offline** — ativar o modo avião e reabrir: Avisos, Turmas e Perfil abrem com a faixa
   "Mostrando dados de …".
10. **Sair** — após sair, reabrir o app leva ao login e o cache do usuário sumiu.

## 4. Testes

```bash
flutter test                      # unidade e widget
flutter test integration_test     # fluxos com servidor falso em memória
flutter analyze                   # análise estática
```

Nenhum teste depende da API real: unidade e widget usam `MockClient`; a integração sobe um
`HttpServer` local que responde conforme `contracts/consumo-api.md`.

## 5. Build

```bash
flutter build apk --release    --dart-define=API_BASE_URL=https://<host-homolog>
flutter build ipa --release    --dart-define=API_BASE_URL=https://<host-homolog>
```
