# 06 — Test Plan

## Test philosophy

The app must be testable without a DeepSeek API key. Fake runtime mode is not optional; it is the core test harness for UI and bridge behavior.

## Test pyramid

```text
Unit tests
  Swift sidecar manager, bridge parsing, TypeScript reducers/components

Contract tests
  Runtime adapter against fake runtime and optional real sidecar

Smoke tests
  Launch app, render fake thread, send fake turn, approve fake approval

Manual real-runtime tests
  Launch DeepSeek-TUI sidecar, create thread, stream events
```

## Required scripts

### `scripts/dev/bootstrap.sh`

Installs or checks prerequisites.

Expected behavior:

- Detect Xcode command line tools.
- Detect Node/Yarn/npm.
- Install web dependencies.
- Print missing prerequisites clearly.

### `scripts/dev/check.sh`

Runs all available checks.

Example contents:

```bash
#!/usr/bin/env bash
set -euo pipefail

if [ -d web ]; then
  cd web
  if command -v yarn >/dev/null 2>&1; then
    yarn install --immutable || yarn install
    yarn lint
    yarn typecheck
    yarn test
  else
    npm install
    npm run lint
    npm run typecheck
    npm test
  fi
  cd ..
fi

if [ -d macos ]; then
  cd macos
  bash Scripts/build_debug.sh
  bash Scripts/test_unit.sh
  cd ..
fi
```

### `scripts/dev/run_fake_runtime.sh`

Starts fake runtime or launches app in fake runtime mode.

### `scripts/dev/run_macos_app.sh`

Builds and opens unsigned debug app.

## Web tests

Minimum TypeScript tests:

- Runtime event reducer handles `item.started`, `item.delta`, `item.completed`.
- Duplicate `seq` is ignored.
- Reconnect starts from `lastSeq`.
- Approval modal dispatches correct bridge decision.
- Usage footer formats missing and present usage data.

## Swift tests

Minimum Swift unit tests:

- Sidecar command builder does not expose API key in argv.
- Dynamic token is generated and not empty.
- Binary discovery respects `DEEPSEEK_TUI_BIN`.
- Runtime API errors map to user-facing messages.
- Bridge message decoding rejects unknown or malformed payloads.

## Contract tests

Fake runtime should emulate:

1. `GET /health` -> ok.
2. `GET /v1/runtime/info` -> version/auth info.
3. `POST /v1/threads` -> new thread.
4. `POST /v1/threads/{id}/turns` -> new turn.
5. `GET /v1/threads/{id}/events` -> SSE stream.
6. `POST /v1/approvals/{approval_id}` -> accepted decision.
7. `GET /v1/usage` -> usage aggregate.

## Manual fake-runtime smoke test

Acceptance steps:

1. Launch app in fake runtime mode.
2. Pick any folder.
3. Create or select a thread.
4. Send: `Explain this project`.
5. Confirm assistant text streams in.
6. Confirm a tool card appears.
7. Confirm an approval card appears.
8. Click Allow.
9. Confirm turn completes and usage footer updates.

## Manual real-runtime smoke test

Prerequisites:

```bash
export DEEPSEEK_TUI_BIN=/absolute/path/to/deepseek-tui
export DEEPSEEK_API_KEY=...
```

Acceptance steps:

1. Launch app.
2. Set sidecar binary path if not discovered.
3. Confirm sidecar status is connected.
4. Select a small test project.
5. Create thread.
6. Send: `Use plan mode. Explain the repository structure without editing files.`
7. Confirm streamed assistant response appears.
8. Confirm no unapproved dangerous command runs.
9. Stop/restart sidecar and confirm reconnect UI.

## Failure reporting

If Codex cannot run a check, it must write:

- command attempted,
- exact error,
- missing prerequisite,
- whether fake-runtime tests still pass,
- next step for a human.
