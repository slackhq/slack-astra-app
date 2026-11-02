#!/usr/bin/env bash
# Runs the e2e specs against one Grafana version in Docker.
#
# Usage: e2e/run.sh <grafana-image-tag> [playwright args...]
#
# Expects dist/ to hold a frontend build and a Linux backend binary for the
# Docker host's architecture (see README).
set -euo pipefail

version=${1:?usage: e2e/run.sh <grafana-image-tag> [playwright args...]}
shift
root=$(cd "$(dirname "$0")/.." && pwd)
port=${GRAFANA_PORT:-3000}
name="astra-e2e-${version//[^a-zA-Z0-9]/-}-$$"

mkdir -p "$root/e2e-results"
cleanup() {
  docker logs "$name" >"$root/e2e-results/grafana-$version.log" 2>&1 || true
  docker stop "$name" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run -d --rm --name "$name" -p "$port:3000" \
  --add-host=host.docker.internal:host-gateway \
  -v "$root/dist:/var/lib/grafana/plugins/slack-astra-app:ro" \
  -v "$root/e2e/provisioning:/etc/grafana/provisioning:ro" \
  -e GF_AUTH_ANONYMOUS_ENABLED=true \
  -e GF_AUTH_ANONYMOUS_ORG_ROLE=Admin \
  -e GF_AUTH_DISABLE_LOGIN_FORM=true \
  -e GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=slack-astra-app,slack-astra-app-backend-datasource \
  "grafana/grafana-enterprise:$version" >/dev/null

echo "Waiting for Grafana $version on port $port"
for _ in $(seq 60); do
  curl -sf "http://localhost:$port/api/health" >/dev/null && break
  sleep 2
done
curl -sf "http://localhost:$port/api/health"
echo

GRAFANA_URL="http://localhost:$port" npx playwright test -c "$root/e2e" "$@"
