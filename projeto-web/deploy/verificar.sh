#!/usr/bin/env bash
# Verificação da implantação estática (T076): build → nginx (Docker, HTTPS autoassinado) → Playwright.
# Pré-requisito: a API local no ar em http://localhost:8000 (veja projeto-api/README.md).
# Uso: deploy/verificar.sh   (de dentro de projeto-web/)
set -euo pipefail

cd "$(dirname "$0")/.."
TMP="$(mktemp -d)"
NOME=conecta-web-verificacao
trap 'docker rm -f "$NOME" >/dev/null 2>&1 || true; rm -rf "$TMP"' EXIT

curl -fsS -o /dev/null http://localhost:8000/docs || { echo "API local fora do ar em :8000"; exit 1; }

npm run build >/dev/null
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj "/CN=localhost" \
  -keyout "$TMP/conecta.key" -out "$TMP/conecta.crt" >/dev/null 2>&1

# `api` no nginx.conf aponta para a máquina (onde a API local roda).
docker run -d --name "$NOME" --add-host=api:host-gateway \
  -p 8080:80 -p 8443:443 \
  -v "$PWD/dist:/usr/share/nginx/html:ro" \
  -v "$PWD/deploy/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$TMP:/etc/nginx/certs:ro" \
  nginx:1.27-alpine >/dev/null

for _ in $(seq 1 20); do curl -fsSk -o /dev/null https://localhost:8443/login && break; sleep 0.5; done
docker exec "$NOME" nginx -t
npx playwright test -c deploy/playwright.config.ts
