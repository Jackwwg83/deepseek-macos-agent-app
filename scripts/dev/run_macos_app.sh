#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MODE="${DEEPSEEK_AGENT_RUNTIME:-fake}"

cd "$ROOT/web"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi
npm run build

cd "$ROOT/macos"
bash Scripts/build_debug.sh

APP_BIN="$ROOT/macos/.build/debug/DeepSeekAgentApp"
if [ ! -x "$APP_BIN" ]; then
  echo "MISSING: $APP_BIN"
  exit 1
fi

echo "Launching DeepSeekAgentApp in $MODE mode..."
DEEPSEEK_AGENT_RUNTIME="$MODE" \
DEEPSEEK_AGENT_WEB_DIST="$ROOT/web/dist" \
"$APP_BIN" >/tmp/deepseek-agent-app.log 2>&1 &
PID=$!

sleep "${DEEPSEEK_AGENT_LAUNCH_WAIT_SECONDS:-3}"
if ! kill -0 "$PID" >/dev/null 2>&1; then
  echo "app-launch-failed"
  sed -n '1,160p' /tmp/deepseek-agent-app.log
  exit 1
fi

echo "app-launch-ok pid=$PID"
if [ "${KEEP_OPEN:-0}" = "1" ]; then
  echo "KEEP_OPEN=1, leaving app running. Log: /tmp/deepseek-agent-app.log"
  wait "$PID"
else
  kill "$PID" >/dev/null 2>&1 || true
  wait "$PID" >/dev/null 2>&1 || true
  echo "app-smoke-stopped"
fi

