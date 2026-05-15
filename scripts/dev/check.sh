#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

cd "$ROOT/web"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi
npm run lint
npm run typecheck
npm test
npm run build

cd "$ROOT/macos"
bash Scripts/build_debug.sh
bash Scripts/test_unit.sh

BIN="${DEEPSEEK_TUI_BIN:-$ROOT/../DeepSeek-TUI/target/debug/deepseek-tui}"
if [ -x "$BIN" ]; then
  PORT="${DEEPSEEK_AGENT_SMOKE_PORT:-18787}"
  TOKEN="codex-smoke-token"
  LOG="/tmp/deepseek-agent-sidecar-smoke.log"
  rm -f "$LOG"
  DEEPSEEK_API_KEY="${DEEPSEEK_API_KEY:-dummy}" "$BIN" serve --http --host 127.0.0.1 --port "$PORT" --auth-token "$TOKEN" >"$LOG" 2>&1 &
  PID=$!
  SMOKE_OK=0
  cleanup() { kill "$PID" >/dev/null 2>&1 || true; wait "$PID" >/dev/null 2>&1 || true; }
  trap cleanup EXIT
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if curl -fsS -H "Authorization: Bearer $TOKEN" "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
      echo "real-sidecar-health-smoke-ok"
      SMOKE_OK=1
      cleanup
      trap - EXIT
      break
    fi
    sleep 0.5
  done
  if [ "$SMOKE_OK" != "1" ]; then
    echo "real-sidecar-health-smoke-failed"
    sed -n '1,120p' "$LOG"
    cleanup
    exit 1
  fi
else
  echo "real-sidecar-health-smoke-skipped: set DEEPSEEK_TUI_BIN to an executable deepseek-tui binary"
fi

bash "$ROOT/scripts/dev/package_tester_alpha.sh"
bash "$ROOT/scripts/dev/verify_tester_alpha.sh"

echo "check-ok"
