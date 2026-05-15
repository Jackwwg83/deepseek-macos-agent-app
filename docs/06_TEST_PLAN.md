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

### `scripts/dev/package_tester_alpha.sh`

Builds a tester handoff package under `build/tester-alpha/`. The package includes:

- `DeepSeek Agent.app`
- bundled `web/dist`
- bundled `deepseek-tui`
- DeepSeek-TUI license and third-party notices
- tester README
- zip and checksum files

### `scripts/dev/verify_tester_alpha.sh`

Verifies the packaged `.app` and zip, launches the packaged app in fake mode, waits for the embedded WebView to render the fake runtime demo through the native bridge, and checks the bundled sidecar `/health` endpoint.

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

Current local note: full Xcode 26.1.1 is selected and standard `swift test` runs these XCTest cases. `macos/Scripts/test_unit.sh` falls back to a dependency-free Swift runner only if `swift test` is unavailable on a CLT-only machine.

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

For development scripts, the runtime can still be configured through environment variables:

```bash
export DEEPSEEK_TUI_BIN=/absolute/path/to/deepseek-tui
export DEEPSEEK_API_KEY=...
export DEEPSEEK_BASE_URL=https://your-openai-compatible-endpoint/v1
export DEEPSEEK_MODEL=deepseek-v4-flash
```

Local automated coverage performs a narrow real sidecar health smoke when a binary is available: it starts `deepseek-tui serve --http` on `127.0.0.1` with a random test bearer token and verifies `GET /health`. Swift adapter tests also cover the actual DeepSeek-TUI Runtime API response shape for runtime info, threads, thread detail, start-turn `prompt` requests, and usage totals.

For packaged tester builds, no environment variables should be required. Testers open `DeepSeek Agent.app` and use the First Run Setup screen. Demo Mode can be completed without an API key. For real DeepSeek mode, testers turn Demo Mode off, enter their DeepSeek URL, API key, and model, then click `Complete Setup`. Both `https://` and self-hosted `http://` endpoints are accepted; remote HTTP shows a non-blocking warning because API keys are not protected by TLS.

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

## Packaged tester smoke test

Acceptance steps:

1. Run `bash scripts/dev/package_tester_alpha.sh`.
2. Run `bash scripts/dev/verify_tester_alpha.sh`.
3. Confirm `packaged-app-render-ok`.
4. Confirm `packaged-sidecar-health-ok`.
5. Confirm `verify-tester-alpha-ok`.

## Failure reporting

If Codex cannot run a check, it must write:

- command attempted,
- exact error,
- missing prerequisite,
- whether fake-runtime tests still pass,
- next step for a human.
