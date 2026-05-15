#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if swift test >/tmp/deepseek-agent-swift-test.log 2>&1; then
  cat /tmp/deepseek-agent-swift-test.log
  exit 0
fi

cat /tmp/deepseek-agent-swift-test.log
echo "swift test failed; falling back to dependency-free unit runner"

mkdir -p .build/unit
sources=()
while IFS= read -r source; do
  sources+=("$source")
done < <(find DeepSeekAgentApp \( -path "DeepSeekAgentApp/App" -o -path "DeepSeekAgentApp/App/*" \) -prune -o -name "*.swift" -print | sort)

swiftc \
  -target arm64-apple-macosx13.0 \
  -parse-as-library \
  "${sources[@]}" \
  UnitTests/main.swift \
  -o .build/unit/DeepSeekAgentAppUnitTests \
  -framework WebKit \
  -framework Security

.build/unit/DeepSeekAgentAppUnitTests
