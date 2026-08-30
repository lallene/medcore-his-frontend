#!/usr/bin/env bash
# LOT 23G.1 — build frontend against a QA API then run scheduling Playwright.
# Requires a live backend at QA_API_URL (default http://127.0.0.1:18082) with LOT 23F.1 routes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

QA_API_URL="${QA_API_URL:-http://127.0.0.1:18082}"
QA_BASE_URL="${QA_BASE_URL:-http://127.0.0.1:4173}"
QA_SUITE="${QA_SUITE:-critical}"
PREVIEW_PORT="${PREVIEW_PORT:-4173}"

echo "==> Probing QA API ${QA_API_URL}"
code="$(curl -s -o /dev/null -w '%{http_code}' "${QA_API_URL}/health" || true)"
if [[ "$code" != "200" ]]; then
  echo "QA API health failed (HTTP ${code}). Start backend 49fcac8 on the QA port first." >&2
  exit 1
fi
types_code="$(curl -s -o /dev/null -w '%{http_code}' "${QA_API_URL}/api/appointment-types" || true)"
if [[ "$types_code" != "401" ]]; then
  echo "GET /api/appointment-types returned ${types_code} (want 401). Stale API without 23F.1?" >&2
  exit 1
fi

echo "==> Building frontend with PUBLIC_API_URL=${QA_API_URL} (build-time bake)"
PUBLIC_API_URL="${QA_API_URL}" npm run build

echo "==> Starting preview on ${PREVIEW_PORT}"
# Stop leftover preview on port if any (best-effort)
if command -v lsof >/dev/null 2>&1; then
  pid="$(lsof -nP -iTCP:"${PREVIEW_PORT}" -sTCP:LISTEN -t 2>/dev/null || true)"
  if [[ -n "${pid}" ]]; then
    kill "${pid}" 2>/dev/null || true
    sleep 1
  fi
fi

npm run preview -- --host 127.0.0.1 --port "${PREVIEW_PORT}" --strictPort >/tmp/medcore-preview-qa.log 2>&1 &
PREVIEW_PID=$!
cleanup() {
  kill "${PREVIEW_PID}" 2>/dev/null || true
}
trap cleanup EXIT

for i in $(seq 1 60); do
  if curl -sf "${QA_BASE_URL}/login" >/dev/null; then
    break
  fi
  if ! kill -0 "${PREVIEW_PID}" 2>/dev/null; then
    echo "Preview died; see /tmp/medcore-preview-qa.log" >&2
    exit 1
  fi
  sleep 0.5
done

echo "==> Playwright suite=${QA_SUITE} base=${QA_BASE_URL} api=${QA_API_URL}"
QA_SUITE="${QA_SUITE}" \
QA_BASE_URL="${QA_BASE_URL}" \
QA_API_URL="${QA_API_URL}" \
QA_SKIP_WEB_SERVER=1 \
QA_ENVIRONMENT="${QA_ENVIRONMENT:-local}" \
npx playwright test "$@"
