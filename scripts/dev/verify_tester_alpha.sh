#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BUILD_ROOT="${DEEPSEEK_AGENT_BUILD_ROOT:-$ROOT/build/tester-alpha}"
PACKAGE_DIR="$BUILD_ROOT/DeepSeek-Agent-alpha-macos"
APP_NAME="${DEEPSEEK_AGENT_APP_NAME:-DeepSeek Agent}"
APP_DIR="$PACKAGE_DIR/$APP_NAME.app"
APP_EXEC="$APP_DIR/Contents/MacOS/DeepSeekAgentApp"
SIDE_BIN="$APP_DIR/Contents/Resources/bin/deepseek-tui"
WEB_INDEX="$APP_DIR/Contents/Resources/web/index.html"
ZIP_PATH="$BUILD_ROOT/DeepSeek-Agent-alpha-macos.zip"

require_file() {
  if [ ! -f "$1" ]; then
    echo "verify-failed: missing file $1"
    exit 1
  fi
}

require_executable() {
  if [ ! -x "$1" ]; then
    echo "verify-failed: missing executable $1"
    exit 1
  fi
}

require_file "$APP_DIR/Contents/Info.plist"
require_executable "$APP_EXEC"
require_executable "$SIDE_BIN"
require_file "$WEB_INDEX"
require_file "$APP_DIR/Contents/Resources/THIRD_PARTY_NOTICES.txt"
require_file "$PACKAGE_DIR/README-TESTERS.txt"
require_file "$PACKAGE_DIR/CHECKSUMS.txt"
require_file "$ZIP_PATH"
require_file "$ZIP_PATH.sha256"

plutil -lint "$APP_DIR/Contents/Info.plist" >/dev/null

if rg -n 'src="/assets|href="/assets' "$WEB_INDEX" >/dev/null 2>&1; then
  echo "verify-failed: web index uses absolute asset paths that break file:// bundled loading"
  exit 1
fi
if rg -n 'type="module"|crossorigin' "$WEB_INDEX" >/dev/null 2>&1; then
  echo "verify-failed: web index uses module/crossorigin attributes that break bundled WKWebView file loading"
  exit 1
fi

if command -v codesign >/dev/null 2>&1; then
  codesign --verify --deep --strict --verbose=2 "$APP_DIR" >/tmp/deepseek-agent-codesign-verify.log 2>&1 || {
    cat /tmp/deepseek-agent-codesign-verify.log
    exit 1
  }
fi

LOG="/tmp/deepseek-agent-packaged-app.log"
PROBE="/tmp/deepseek-agent-packaged-app-probe.json"
rm -f "$LOG" "$PROBE"
rm -rf "$HOME/Library/Saved Application State/app.deepseek.agent.savedState"
DEEPSEEK_AGENT_RUNTIME=fake DEEPSEEK_AGENT_WEBVIEW_PROBE_PATH="$PROBE" "$APP_EXEC" >"$LOG" 2>&1 &
PID=$!
cleanup_app() {
  kill "$PID" >/dev/null 2>&1 || true
  wait "$PID" >/dev/null 2>&1 || true
  rm -rf "$HOME/Library/Saved Application State/app.deepseek.agent.savedState"
}
trap cleanup_app EXIT
APP_OK=0
for _ in 1 2 3 4 5 6 7 8 9 10 11 12; do
  if ! kill -0 "$PID" >/dev/null 2>&1; then
    echo "packaged-app-launch-failed"
    sed -n '1,160p' "$LOG"
    exit 1
  fi
  if [ -f "$PROBE" ] && rg -q '"containsV2Shell":true' "$PROBE" && rg -q '"rootHTMLLength":[1-9][0-9]*' "$PROBE"; then
    APP_OK=1
    break
  fi
  sleep 1
done
if [ "$APP_OK" != "1" ]; then
  echo "packaged-app-render-failed"
  [ -f "$PROBE" ] && sed -n '1,160p' "$PROBE"
  sed -n '1,160p' "$LOG"
  exit 1
fi
cleanup_app
trap - EXIT
echo "packaged-app-render-ok"

PORT="${DEEPSEEK_AGENT_PACKAGE_SMOKE_PORT:-18789}"
TOKEN="codex-package-smoke-token"
SIDE_LOG="/tmp/deepseek-agent-packaged-sidecar.log"
rm -f "$SIDE_LOG"
DEEPSEEK_API_KEY="${DEEPSEEK_API_KEY:-dummy}" "$SIDE_BIN" serve --http --host 127.0.0.1 --port "$PORT" --auth-token "$TOKEN" >"$SIDE_LOG" 2>&1 &
SIDE_PID=$!
cleanup_sidecar() { kill "$SIDE_PID" >/dev/null 2>&1 || true; wait "$SIDE_PID" >/dev/null 2>&1 || true; }
trap cleanup_sidecar EXIT
SIDE_OK=0
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS -H "Authorization: Bearer $TOKEN" "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
    SIDE_OK=1
    break
  fi
  sleep 0.5
done
if [ "$SIDE_OK" != "1" ]; then
  echo "packaged-sidecar-health-failed"
  sed -n '1,160p' "$SIDE_LOG"
  exit 1
fi
cleanup_sidecar
trap - EXIT
echo "packaged-sidecar-health-ok"

shasum -a 256 -c "$ZIP_PATH.sha256" >/dev/null
SECRET_PATTERN='DEEPSEEK_API_KEY=.*s''k-|s''k-[A-Za-z0-9_-]{16,}'
if rg -n "$SECRET_PATTERN" "$PACKAGE_DIR" >/dev/null 2>&1; then
  echo "verify-failed: package contains an API-key-looking secret"
  exit 1
fi

echo "verify-tester-alpha-ok"
