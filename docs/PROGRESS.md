# Progress

## 2026-05-17 - Alpha.9 Workspace Browse Fix

### Changed

- Replaced the First Run Setup `Browse` placeholder with a native macOS folder picker.
- Added WebView bridge support for `chooseWorkspaceFolder`.
- Added frontend and Swift bridge regression tests for workspace folder selection.
- Bumped tester package metadata and README release link to `v0.1.0-alpha.9`.

### Verification

Completed:

- `npm --prefix web test -- appInteractions.test.tsx`: 1 file, 10 tests passed.
- `cd macos && swift test --filter BridgeMessageTests/testDecodesChooseWorkspaceFolderMethod`: passed.
- `bash scripts/dev/check.sh`: `check-ok`.

## 2026-05-16 - TUI-Aligned Product Reset

### Changed

- Rewrote `codex/CODEX_PRODUCT_GOAL.md` as the active PRD for a DeepSeek-TUI-aligned GUI.
- Rewrote `docs/07_ACCEPTANCE_CHECKLIST.md` around setup, thread workbench, TUI mode, approval policy, tool timeline, settings, diagnostics, and native smoke.
- Replaced the previous product-navigation model with a thread-first workbench.
- Removed primary GUI state for client-owned review, apply, commit, automations, and skills workflows.
- Removed the native Review menu command.
- Updated Demo Mode so it demonstrates a TUI-style `exec_shell` request, approval card, decision, tool result, and assistant response.
- Updated the packaged WebView interaction probe to validate the TUI flow instead of client-owned review/apply/commit behavior.
- Wired approval policy behavior so Plan/Never block, Auto/YOLO approve, and saved `Always allow` rules approve future matching tool requests.
- Added clearable scoped auto-allow rules and visible warnings for remote self-hosted `http://` endpoints.
- Fixed native fake-runtime history materialization so stopped approvals remain `Stopped` after refresh.
- Kept key storage, sidecar lifecycle, runtime health, model selection, diagnostics, and package verification in the native/runtime boundary.

### Verification

Completed:

- `npm --prefix web test`: 5 files, 19 tests passed.
- `npm --prefix web run lint`: passed.
- `npm --prefix web run typecheck`: passed.
- `npm --prefix web run build`: passed.
- `swift test`: 32 XCTest cases passed inside `check.sh`.
- `bash scripts/dev/check.sh`: `check-ok`.
- `bash scripts/dev/verify_tester_alpha.sh`: `verify-tester-alpha-ok`.
- `DEEPSEEK_AGENT_WEBVIEW_INTERACTION_PROBE=1 bash scripts/dev/verify_tester_alpha.sh`: `packaged-app-interaction-ok`; covers Allow once, Deny, Stop, Always allow, and future auto-approval.
- Zip-download simulation: checksum OK, ad-hoc signature valid, bundled WebView render OK.
- Live self-hosted runtime smoke: bundled `deepseek-tui serve` reached `https://iruidong.com/v1` with model `deepseek-v4-flash` and returned `REAL_RUNTIME_SMOKE_OK` from an agent message.
- Packaged app screenshot: `/tmp/deepseek-agent-user-smoke-window-latest.png`.
- Computer Use attempt: blocked with `cgWindowNotFound`; CoreGraphics proved the packaged app window was onscreen.

### Known Limitations

- The alpha is ad-hoc signed and not notarized.
- Demo Mode is still present only as an offline UX/approval-flow diagnostic.
- Real filesystem edits, shell execution, diffs, and commits belong to DeepSeek-TUI tools/runtime behavior, not separate client-owned buttons.
