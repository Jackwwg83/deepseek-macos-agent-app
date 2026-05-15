#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "Checking local prerequisites..."

if command -v swift >/dev/null 2>&1; then
  swift --version | head -n 1
else
  echo "MISSING: swift. Install Xcode Command Line Tools or Xcode."
  exit 1
fi

if xcodebuild -version >/dev/null 2>&1; then
  xcodebuild -version | head -n 1
else
  echo "NOTE: full Xcode/xcodebuild is unavailable. SwiftPM debug build is supported with Command Line Tools."
fi

if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
  echo "node $(node --version)"
  echo "npm $(npm --version)"
else
  echo "MISSING: Node.js and npm are required for web checks."
  exit 1
fi

cd "$ROOT/web"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

if [ -n "${DEEPSEEK_TUI_BIN:-}" ]; then
  if [ -x "$DEEPSEEK_TUI_BIN" ]; then
    echo "DeepSeek sidecar: $DEEPSEEK_TUI_BIN"
  else
    echo "WARNING: DEEPSEEK_TUI_BIN is set but not executable: $DEEPSEEK_TUI_BIN"
  fi
else
  CANDIDATE="$ROOT/../DeepSeek-TUI/target/debug/deepseek-tui"
  if [ -x "$CANDIDATE" ]; then
    echo "DeepSeek sidecar candidate: $CANDIDATE"
  else
    echo "NOTE: no DeepSeek sidecar found. Fake runtime mode still works."
  fi
fi

echo "bootstrap-ok"

