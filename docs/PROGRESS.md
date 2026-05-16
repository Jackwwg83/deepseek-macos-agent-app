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

## 2026-05-16 11:25 — GPT Pro UI Stabilization Closeout

- Changed:
  - Reworked the embedded UI to match the GPT Pro v2 stabilization pack: First Run Setup, Project Command Center, Active Thread, Review Changes, Settings & Usage, and a native-feeling light visual system.
  - Removed fake in-content traffic lights and the old demo-path UI/data artifacts from the active app surface.
  - Made real URL/key/model setup the default onboarding path and kept Demo Mode opt-in for offline diagnostics only.
  - Fixed the runtime inspector so an authenticated real runtime shows API key status as `Configured` instead of `Required`.
  - Added intentional new-chat and no-change review empty states.
  - Added accessible names for setup inputs, model selectors, demo/settings toggles, and key controls.
  - Fixed silent Keychain reads and avoided launch-time Keychain prompts.
  - Changed default runtime synchronization to thread-detail polling and made direct WebView event push opt-in via `DEEPSEEK_AGENT_ENABLE_WEBVIEW_EVENT_PUSH=1` after native probe evidence showed direct push could freeze WebKit.
  - Added `docs/IMPLEMENTATION_PROGRESS.md`, `docs/UI_QA_RESULTS.md`, and `docs/KNOWN_ISSUES.md`.
- Verified:
  - `npm run lint` passed.
  - `npm run typecheck` passed.
  - `npm test` passed.
  - `swift test` passed.
  - `bash scripts/dev/check.sh` passed and reported `check-ok`.
  - `bash scripts/dev/verify_tester_alpha.sh` passed and reported `verify-tester-alpha-ok`.
  - Real bundled-sidecar model-turn smoke passed against a user-supplied DeepSeek-compatible endpoint, key, and model.
  - Real packaged-app WebView probe reached `Project Command Center` in `real` mode and showed API key status `Configured`.
  - Optional Demo Mode packaged-app WebView interaction probe passed: setup, fresh thread, send prompt, approval card, Allow, and approval-granted completion.
  - Window capture `/tmp/deepseek-agent-window.png` confirmed the v2 UI and native window chrome.
- Failing checks:
  - Initial Computer Use attachment failed in this session; it was recovered and replaced by a passing live Computer Use desktop validation in the 17:20 checkpoint. See `docs/UI_QA_RESULTS.md`.
- Blockers:
  - None for launching and testing the MVP locally.
  - Not notarized; tester alpha remains ad-hoc signed only.

## 2026-05-16 16:10 — Product PRD Journey Closeout

- Changed:
  - Added root `codex/CODEX_PRODUCT_GOAL.md`, `codex/AGENTS_PRODUCT.md`, and `docs/07_ACCEPTANCE_CHECKLIST.md` from the GPT Pro product PRD pack.
  - Removed `deepseek-v3` from the visible model lists so only `deepseek-v4-flash` and `deepseek-v4-pro` are selectable.
  - Added Automations and Skills skeleton pages with clear empty states and disabled coming-soon actions.
  - Added a workspace Browse placeholder in setup.
  - Extended Demo Mode so approval creates reviewable files, diff placeholders, terminal evidence, and Apply/Reject/Commit state.
  - Changed approval action copy to `Allow once`, added approval metadata, and kept Stop/Deny actions wired.
  - Extended the native packaged-app interaction probe through `Review changes`, file selection, `Apply selected`, and `Commit 1 file` enablement.
- Verified:
  - `npm run lint` passed.
  - `npm run typecheck` passed.
  - `npm test` passed with 5 files and 19 tests.
  - `npm run build` passed.
  - `swift test` passed with 31 XCTest cases.
  - `bash scripts/dev/check.sh` passed and reported `check-ok`, including Xcode build, Swift tests, package build, packaged WebView render, bundled sidecar health, and tester-alpha verification.
- Failing checks:
  - None observed in the documented product checklist path.
- Blockers:
  - None for local MVP launch and tester-alpha handoff.
  - Not notarized; tester alpha remains ad-hoc signed only.

## 2026-05-16 17:20 — Desktop QA Hardening

- Changed:
  - Removed the First Run Setup nested window/card shell so setup fills the real macOS window.
  - Replaced the perceived blue outer frame with neutral gray-white sidebar and inspector surfaces.
  - Changed completed approval cards so `Stop task`, `Deny`, and `Allow once` disappear after a decision.
  - Added explicit stopped-state handling for fake runtime approval interruption.
  - Marked `docs/07_ACCEPTANCE_CHECKLIST.md` acceptance items complete after the fresh verification pass.
- Verified:
  - Computer Use attached to the packaged app and completed Setup -> Demo Mode -> Project Command Center -> New thread -> Send prompt -> Approval -> Review -> Apply selected -> Commit preview.
  - Computer Use opened Automations, Skills, Settings, Rotate key, Manage account, and Diagnostics flows.
  - `npm --prefix web test -- appInteractions.test.tsx` passed with 10 tests, including Allow, Deny, and Stop approval paths.
- Failing checks:
  - None observed in this checkpoint.
- Blockers:
  - None for local MVP launch and tester-alpha handoff.
  - Not notarized; tester alpha remains ad-hoc signed only.

## 2026-05-16 17:25 — Alpha.7 Root-Layer Recheck

- Changed:
  - Updated tester-alpha release metadata and packaged default version to `0.1.0-alpha.7`.
  - Set the remaining legacy native sidebar container and WebView fallback HTML backgrounds to white/neutral colors.
  - Updated the packaged WebView user agent version string.
- Verified:
  - `rg` found no remaining `alpha.6` references outside ignored historical/build paths.
  - `bash scripts/dev/check.sh` passed and reported `check-ok`.
  - The alpha.7 tester zip was generated at `build/tester-alpha/DeepSeek-Agent-alpha-macos.zip`.
  - Window-level capture `/tmp/deepseek-agent-alpha7-window.png` showed no blue/purple WebView root shell or nested setup shell; only native macOS titlebar/window corner/shadow pixels remain outside the white content area.
- Failing checks:
  - A fresh Computer Use attach attempt after the alpha.7 relaunch returned `cgWindowNotFound` even though CoreGraphics showed the `DeepSeek Agent` window onscreen. The earlier 17:20 live Computer Use product journey remains the latest successful desktop interaction pass.
- Blockers:
  - None for local MVP launch and tester-alpha handoff.
  - Not notarized; tester alpha remains ad-hoc signed only.
