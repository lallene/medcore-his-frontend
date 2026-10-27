#!/usr/bin/env bash
# GRC15-B08 — real browser E2E on a production-like local stack.
#
#   Chromium → node server.mjs (B05 runtime, production build) → Go API (cmd/api)
#   → throwaway PostgreSQL database medcore_b08_<random> on a local server.
#
# Local only: refuses a non-local PostgreSQL host and any database name outside
# medcore_b08_<hex>. The database is created, migrated, bootstrapped with two
# users and dropped on exit. Passwords, JWT secret and DSN are generated per
# run and never printed. No seed DEMO, no Microsoft 365, no SMTP.
#
# Usage: bash scripts/grc-b08-e2e.sh [runs]   (default 2 Playwright runs)
set -euo pipefail

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
echo "==> node $(node --version) (MedCore contract: 24, .nvmrc)"
if [ "$NODE_MAJOR" != "24" ]; then
	echo "B08 guard: Node.js 24 is required, got $(node --version)" >&2
	exit 1
fi

FRONTEND="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$(cd "$FRONTEND/../backend" && pwd)"
RUNS="${1:-2}"
PG_HOST="${GRC_B08_PGHOST:-127.0.0.1}"
PG_PORT="${GRC_B08_PGPORT:-5432}"
PG_USER="${GRC_B08_PGUSER:-$(id -un)}"
API_PORT="${GRC_B08_API_PORT:-18480}"
WEB_PORT="${GRC_B08_WEB_PORT:-14480}"
API_URL="http://127.0.0.1:${API_PORT}"
WEB_URL="http://127.0.0.1:${WEB_PORT}"

case "$PG_HOST" in
127.0.0.1 | localhost | ::1) ;;
*)
	echo "B08 guard: PostgreSQL host must be local" >&2
	exit 1
	;;
esac
for port in "$API_PORT" "$WEB_PORT"; do
	if lsof -nP -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
		echo "B08: port $port already in use" >&2
		exit 1
	fi
done

DB="medcore_b08_$(openssl rand -hex 6)"
guard_db() {
	[[ "$1" =~ ^medcore_b08_[0-9a-f]{12}$ ]] || return 1
	case "$1" in
	medcore | medcore_his | medcore_full_demo | medcore_lot12_demo | postgres) return 1 ;;
	esac
}
guard_db "$DB" || {
	echo "B08 guard: refused database name" >&2
	exit 1
}

PSQL=(psql -X -q -v ON_ERROR_STOP=1 -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER")
if [[ -n "$("${PSQL[@]}" -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname = '$DB'")" ]]; then
	echo "B08 guard: database already exists" >&2
	exit 1
fi

WORK="$(mktemp -d "${TMPDIR:-/tmp}/medcore-b08.XXXXXX")"
API_PID=""
WEB_PID=""
BUILD_BACKUP=""
cleanup() {
	set +e
	[[ -n "$WEB_PID" ]] && kill "$WEB_PID" 2>/dev/null && wait "$WEB_PID" 2>/dev/null
	[[ -n "$API_PID" ]] && kill -TERM "$API_PID" 2>/dev/null && wait "$API_PID" 2>/dev/null
	if guard_db "$DB"; then
		dropdb --if-exists --force -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" "$DB" &&
			echo "==> cleanup: database $DB dropped"
	fi
	if [[ -n "$BUILD_BACKUP" ]]; then
		rm -rf "$FRONTEND/build"
		mv "$BUILD_BACKUP" "$FRONTEND/build" && echo "==> cleanup: previous frontend build restored"
	fi
	rm -rf "$WORK"
	echo "==> cleanup: API, frontend and temporary files stopped/removed"
}
trap cleanup EXIT

echo "==> database safety"
echo "DB engine: PostgreSQL $("${PSQL[@]}" -d postgres -Atc 'SHOW server_version')"
echo "host class: local"
echo "database name: $DB"
echo "production guard result: PASS (local host, medcore_b08_<hex>, not a known production/demo name, did not exist)"

createdb -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" "$DB"
echo "==> step: database created"

random() { openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | cut -c1-"$1"; }
PASSWORD="$(random 24)"
# Every process runs from $WORK with an explicit environment: no .env is loaded.
run_env=(
	env -i "PATH=$PATH" "HOME=$HOME" "TMPDIR=${TMPDIR:-/tmp}"
	APP_ENV=production
	"PORT=$API_PORT"
	"DATABASE_URL=postgres://${PG_USER}@${PG_HOST}:${PG_PORT}/${DB}?sslmode=disable"
	"JWT_SECRET=$(random 48)"
	"CORS_ORIGIN=$WEB_URL"
	MEDCORE_NOTIFICATION_EMAIL_ENABLED=false
)
[[ -n "${PGPASSWORD:-}" ]] && run_env+=("PGPASSWORD=$PGPASSWORD")

(cd "$BACKEND" && go build -o "$WORK/bin/migrate" ./cmd/migrate && go build -o "$WORK/bin/api" ./cmd/api)
(cd "$WORK" && "${run_env[@]}" ./bin/migrate >"$WORK/migrate.log" 2>&1) || {
	echo "B08: migration failed" >&2
	tail -20 "$WORK/migrate.log" >&2
	exit 1
}
echo "==> step: migrations applied (cmd/migrate)"

# Minimal bootstrap: one admin and one GRC read-only user (direct GRANT overrides).
# GRC business data is created by the specs through the real API.
HASH="$(printf '%s' "$PASSWORD" | htpasswd -niBC 10 b08 | cut -d: -f2 | tr -d '\n')"
"${PSQL[@]}" -d "$DB" <<SQL
INSERT INTO users (uuid, name, email, password_hash, role, is_active, created_at, updated_at, version)
VALUES (gen_random_uuid()::text, 'Admin B08', 'b08.admin@medcore.test', '$HASH', 'admin', true, now(), now(), 1),
       (gen_random_uuid()::text, 'Lecteur GRC B08', 'b08.reader@medcore.test', '$HASH', 'staff', true, now(), now(), 1);
INSERT INTO staff_permission_overrides (user_id, permission, effect, reason, active, created_by, updated_by, created_at, updated_at)
SELECT r.id, p, 'GRANT', 'GRC15-B08 E2E', true, a.id, a.id, now(), now()
FROM users r, users a, unnest(ARRAY['grc.dashboard.read', 'grc.asset.read', 'grc.risk.read']) AS p
WHERE r.email = 'b08.reader@medcore.test' AND a.email = 'b08.admin@medcore.test';
SQL
echo "==> step: minimal E2E seed (2 users, 3 GRC read grants); no DEMO seed"

(cd "$WORK" && exec "${run_env[@]}" ./bin/api >"$WORK/api.log" 2>&1) &
API_PID=$!
for _ in $(seq 1 60); do
	curl -sf "$API_URL/health" >/dev/null && break
	kill -0 "$API_PID" 2>/dev/null || {
		echo "B08: API exited" >&2
		tail -20 "$WORK/api.log" >&2
		exit 1
	}
	sleep 0.5
done
curl -sf "$API_URL/health" >/dev/null || {
	echo "B08: API not healthy" >&2
	exit 1
}
echo "==> step: Go API ready on $API_URL (APP_ENV=production, local)"

if [[ -d "$FRONTEND/build" ]]; then
	BUILD_BACKUP="$WORK/build-backup"
	mv "$FRONTEND/build" "$BUILD_BACKUP"
fi
(cd "$FRONTEND" && PUBLIC_API_URL="$API_URL" npm run build >"$WORK/build.log" 2>&1) || {
	echo "B08: frontend build failed" >&2
	tail -20 "$WORK/build.log" >&2
	exit 1
}
grep -rqF "$API_URL" "$FRONTEND/build" || {
	echo "B08: build does not target the local API" >&2
	exit 1
}
(cd "$FRONTEND" && PORT="$WEB_PORT" PUBLIC_API_URL="$API_URL" exec node server.mjs >"$WORK/web.log" 2>&1) &
WEB_PID=$!
for _ in $(seq 1 60); do
	curl -sf "$WEB_URL/login" >/dev/null && break
	sleep 0.5
done
curl -sf "$WEB_URL/login" >/dev/null || {
	echo "B08: frontend runtime not ready" >&2
	exit 1
}
echo "==> step: production build served by server.mjs on $WEB_URL"

export GRC_B08_API_URL="$API_URL" GRC_B08_BASE_URL="$WEB_URL" GRC_B08_PASSWORD="$PASSWORD"
export GRC_B08_ADMIN_EMAIL=b08.admin@medcore.test GRC_B08_READER_EMAIL=b08.reader@medcore.test
status=0
for run in $(seq 1 "$RUNS"); do
	export GRC_B08_RESULT_FILE="$WORK/run-$run.txt"
	echo "==> RUN $run"
	(cd "$FRONTEND" && npx playwright test -c playwright.grc-b08.config.ts ${GRC_B08_GREP:+--grep "$GRC_B08_GREP"}) || status=1
done

# Audit durability (B02): every risk created through the browser has its
# GRC_RISK CREATE row, written by the admin, in the same database.
echo "==> audit durability"
checked=0
for file in "$WORK"/run-*.txt; do
	[[ -f "$file" ]] || continue
	while read -r kind id; do
		[[ "$kind" == risk && "$id" =~ ^[0-9]+$ ]] || continue
		found="$("${PSQL[@]}" -d "$DB" -Atc "SELECT count(*) FROM audit_logs l JOIN users u ON u.id = l.user_id
			WHERE l.module = 'GRC_RISK' AND l.action = 'CREATE' AND l.record_id = $id AND u.email = 'b08.admin@medcore.test'")"
		row="$("${PSQL[@]}" -d "$DB" -Atc "SELECT count(*) FROM grc_risks WHERE id = $id")"
		echo "risk $id: grc_risks=$row audit GRC_RISK/CREATE by admin=$found"
		[[ "$found" == 1 && "$row" == 1 ]] || status=1
		checked=$((checked + 1))
	done <"$file"
done
[[ "$checked" -ge 1 ]] || {
	echo "audit durability: no browser mutation recorded" >&2
	status=1
}

# No JWT and no generated password in logs or Playwright output.
leaks="$(grep -rlE 'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.' "$WORK"/*.log "$FRONTEND/test-results/grc-b08" 2>/dev/null || true)"
grep -rqF "$PASSWORD" "$WORK"/*.log 2>/dev/null && leaks="$leaks logs:password"
if [[ -n "$leaks" ]]; then
	echo "token/password leak check: FOUND in $leaks" >&2
	status=1
else
	echo "token/password leak check: none in API/build/web logs and Playwright output"
fi
grep -E '"level":"(ERROR|error)"|panic' "$WORK/api.log" | head -5 || true
exit "$status"
