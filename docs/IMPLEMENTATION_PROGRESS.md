# Implementation Progress

## 2026-05-16 - TUI-Aligned GUI

### Product Logic

The app is now scoped to the same operating model as DeepSeek-TUI:

- User configures a DeepSeek-compatible endpoint, API key, model, and workspace.
- User works in a thread-first interface.
- The model drives work through tool calls.
- The client displays tool calls, permission requests, tool results, and assistant output.
- The client does not own code review, file apply, git commit, automations, or skills workflows.

### Implemented

- Rewrote the Codex product goal into a TUI-aligned PRD.
- Rewrote the acceptance checklist around setup, thread workbench, TUI mode, approval policy, tool timeline, settings, and diagnostics.
- Replaced the WebView UI with First Run Setup, Thread Workbench, Runtime Inspector, and Runtime Settings.
- Removed primary navigation and state for Project Command Center, Review Changes, Automations, and Skills.
- Removed native Review menu dispatch.
- Changed Demo Mode to stream a TUI-style `exec_shell` tool call, approval card, and tool result instead of fake review files.
- Added scoped auto-allow rule display for `Always allow in this workspace`.
- Updated packaged WebView probes to validate Thread Workbench and approval flow.

### Validation

Completed validation:

- `npm --prefix web test`: 5 files, 19 tests passed.
- `npm --prefix web run lint`: passed.
- `npm --prefix web run typecheck`: passed.
- `npm --prefix web run build`: passed.
- `swift test`: 31 XCTest cases passed inside `bash scripts/dev/check.sh`.
- `bash scripts/dev/check.sh`: reported `check-ok`.
- `bash scripts/dev/verify_tester_alpha.sh`: reported `packaged-app-render-ok`, `packaged-sidecar-health-ok`, and `verify-tester-alpha-ok`.
- `DEEPSEEK_AGENT_WEBVIEW_INTERACTION_PROBE=1 bash scripts/dev/verify_tester_alpha.sh`: reported `packaged-app-interaction-ok`, `packaged-sidecar-health-ok`, and `verify-tester-alpha-ok`.
- Packaged window screenshot captured at `/tmp/deepseek-agent-tui-aligned-window-final.png`.

Computer Use was attempted but could not attach because the accessibility bridge reports zero windows for the visible packaged app while CoreGraphics reports the onscreen window. This is documented in `docs/UI_QA_RESULTS.md`.
