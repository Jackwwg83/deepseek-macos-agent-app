#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEEPSEEK_AGENT_RUNTIME=fake "$ROOT/scripts/dev/run_macos_app.sh"

