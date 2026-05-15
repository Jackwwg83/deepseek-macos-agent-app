#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
if command -v xcodebuild >/dev/null 2>&1 && xcodebuild -version >/dev/null 2>&1; then
  xcodebuild -scheme DeepSeekAgentApp -destination 'generic/platform=macOS' build
fi
swift build
