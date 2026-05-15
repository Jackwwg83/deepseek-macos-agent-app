# Progress

## 2026-05-15 22:03 — Checkpoint 0

- Changed:
  - Created the implementation plan at `docs/superpowers/plans/2026-05-15-macos-agent-mvp.md`.
  - Created the initial project directories required by `CODEX_GOAL.md`.
- Verified:
  - `swift --version` works with Apple Swift 6.2.3.
  - `node --version` works with Node v25.6.1 and npm 11.9.0.
  - `xcodebuild -version` is unavailable because the active developer directory is Command Line Tools, not full Xcode.
- Failing checks:
  - Full documented checks do not exist yet; next checkpoint adds scripts and testable code.
- Blockers:
  - None for SwiftPM/AppKit MVP. Full Xcode-only workflows are not available in this environment.
- Next:
  - Implement the web fake-runtime MVP and tests.

## 2026-05-15 22:51 — Checkpoint 1

- Changed:
  - Added `web/` React/TypeScript/Vite project.
  - Added typed `AgentBridge`, `FakeAgentBridge`, WebView bridge shim, runtime DTOs, event reducer, and usage formatter.
  - Added workbench UI with thread list, project picker, active timeline, streaming assistant text, tool card, approval card, sidecar state, composer, and usage footer.
  - Added Vitest coverage for reducer replay/dedupe, fake bridge event flow, approval decision, reconnect `since_seq`, and usage formatting.
- Verified:
  - `npm run typecheck` passed.
  - `npm run lint` passed.
  - `npm test` passed with 3 files and 8 tests.
- Failing checks:
  - Full `bash scripts/dev/check.sh` does not exist yet.
- Blockers:
  - None for fake runtime web UI.
- Next:
  - Implement SwiftPM/AppKit native shell, sidecar manager, runtime clients, and Swift tests.

## 2026-05-15 23:06 — Checkpoints 2-4

- Changed:
  - Added SwiftPM/AppKit native app under `macos/`.
  - Added native settings/sidebar, project path field, DeepSeek API-key Keychain save action, sidecar path field, sidecar status, and WKWebView loading of `web/dist`.
  - Added Swift runtime protocol, fake runtime client, DeepSeek-TUI HTTP/SSE client, strict WebView bridge decoder, bridge message handler, sidecar manager, dynamic loopback port allocation, random bearer token generation, and secret redaction.
  - Added dependency-free Swift unit runner because this Command Line Tools install lacks `XCTest`.
  - Added `scripts/dev/bootstrap.sh`, `check.sh`, `run_fake_runtime.sh`, and `run_macos_app.sh`.
  - Updated README, test plan, source inventory, and acceptance checklist.
- Verified:
  - `bash scripts/dev/bootstrap.sh` passed.
  - `bash scripts/dev/check.sh` passed.
  - `bash scripts/dev/run_fake_runtime.sh` passed and reported `app-launch-ok`.
  - `bash scripts/dev/run_macos_app.sh` passed and reported `app-launch-ok`.
  - Browser UI smoke passed at `http://127.0.0.1:5173/`: rendered the workbench, sent a prompt, displayed approval, clicked Allow, and showed approval completion.
  - Real sidecar health smoke passed with `/Users/jackwu/projects/TUI-APP/DeepSeek-TUI/target/debug/deepseek-tui`, loopback host, bearer token, and `GET /health`.
- Failing checks:
  - None in the documented MVP check path.
- Blockers:
  - Full real-runtime model-turn smoke still requires a valid `DEEPSEEK_API_KEY`.
  - Full Xcode `.app` packaging is not available on this machine because `xcodebuild` reports only Command Line Tools are installed.
- Next:
  - Optional alpha work: create an `.app` bundle/signing pipeline when full Xcode is available, then run the manual real-runtime model-turn smoke with a real DeepSeek API key.

## 2026-05-15 23:16 — Full Xcode Follow-Up

- Changed:
  - Confirmed full Xcode 26.1.1 is selected at `/Users/jackwu/Applications/Xcode-26.1.1.app/Contents/Developer`.
  - Restored standard XCTest test target under `macos/Tests/DeepSeekAgentAppTests`.
  - Updated `macos/Scripts/build_debug.sh` to run `xcodebuild` when available and still produce the SwiftPM debug executable.
  - Updated `macos/Scripts/test_unit.sh` to prefer `swift test` and keep the dependency-free runner as fallback.
- Verified:
  - `xcodebuild -version` reported `Xcode 26.1.1` / `Build version 17B100`.
  - `xcodebuild -scheme DeepSeekAgentApp -destination 'generic/platform=macOS' build` passed.
  - `swift test` passed with 12 XCTest cases.
  - `bash macos/Scripts/test_unit.sh` passed through the standard XCTest path.
- Failing checks:
  - None in the documented MVP check path.
- Blockers:
  - Full real-runtime model-turn smoke still requires a valid `DEEPSEEK_API_KEY`.
- Next:
  - Re-run full repository checks with the Xcode-backed scripts.

## 2026-05-15 23:30 — Third-Party Runtime Smoke

- Changed:
  - Added `RuntimeSecretResolver` so scripted `DEEPSEEK_API_KEY` values take precedence over a saved Keychain key in real sidecar mode.
  - Added XCTest coverage for environment-key precedence and empty-env fallback to Keychain.
  - Updated README, test plan, and acceptance checklist for third-party OpenAI-compatible runtime configuration.
- Verified:
  - Direct HTTPS `chat/completions` call to the configured third-party endpoint returned `DIRECT_OK` with model `DeepSeek-V4-Flash-w8a8-mtp`.
  - DeepSeek-TUI Runtime API real sidecar model-turn smoke completed with reply `REAL_RUNTIME_SMOKE_OK`.
  - Real-mode macOS app launch smoke passed with `DEEPSEEK_TUI_BIN`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL`, and `DEEPSEEK_API_KEY` supplied through the environment.
- Failing checks:
  - None observed in this checkpoint.
- Blockers:
  - None for the current MVP launch path.

## 2026-05-15 23:53 — Tester Alpha Packaging

- Changed:
  - Added in-app DeepSeek URL and model settings backed by user defaults.
  - Kept API key storage in macOS Keychain and made `Save & Start Runtime` launch the real sidecar without terminal environment variables.
  - Added a switchable runtime client so the WebView bridge can move from fake runtime to real runtime after settings are saved.
  - Added bundled WebView resource loading from `Contents/Resources/web/index.html`.
  - Added tester packaging and verification scripts under `scripts/dev/`.
  - Added tester handoff documentation in `docs/TESTER_ALPHA_DELIVERY.md`.
- Verified:
  - `swift test --filter AppWebViewFactoryTests` passed.
  - `swift test --filter RuntimeSettingsStoreTests --filter SidecarManagerTests/testCommandDoesNotExposeAPIKeyInArguments` passed.
  - `swift test --filter SwitchableRuntimeClientTests` passed.
  - `bash scripts/dev/package_tester_alpha.sh` produced `build/tester-alpha/DeepSeek-Agent-alpha-macos.zip`.
  - `bash scripts/dev/verify_tester_alpha.sh` reported `packaged-app-launch-ok`, `packaged-sidecar-health-ok`, and `verify-tester-alpha-ok`.
- Failing checks:
  - None observed in this checkpoint.
- Blockers:
  - Not notarized; tester alpha is ad-hoc signed only.

## 2026-05-15 00:50 — Tester-Ready Closeout

- Changed:
  - Fixed bundled WebView loading for the packaged app by forcing relative assets and classic deferred scripts in the package output.
  - Switched the native WKWebView bridge to reply-style message handling while keeping the older resolver path as fallback.
  - Added delayed WebView probe snapshots for package verification; probe is enabled only when `DEEPSEEK_AGENT_WEBVIEW_PROBE_PATH` is set.
  - Updated `verify_tester_alpha.sh` so it validates that the packaged app renders the fake runtime UI, not just that a process starts.
  - Updated the real DeepSeek-TUI adapter to map the actual Runtime API shape: `prompt`, `workspace`, `turns`, `items`, `latest_seq`, runtime info, usage totals, and SSE event payloads.
  - Expanded XCTest coverage for real Runtime API mapping.
- Verified:
  - Packaged app native bridge render probe reached `Fake runtime demo` with no new crash report.
  - Real bundled sidecar model-turn smoke completed with `REAL_RUNTIME_SMOKE_OK` against a third-party OpenAI-compatible HTTPS endpoint.
  - Real packaged app launch probe reached `REAL` mode with no decode/boot error and no new crash report.
  - `bash scripts/dev/check.sh` passed, including web lint/typecheck/tests/build, Xcode build, 24 Swift tests, real sidecar health smoke, tester alpha packaging, packaged WebView render verification, bundled sidecar health, checksum, and package secret scan.
- Failing checks:
  - None observed in the documented closeout path.
- Blockers:
  - Not notarized; tester alpha is ad-hoc signed only.
