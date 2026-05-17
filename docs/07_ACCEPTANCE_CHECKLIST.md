# TUI-Aligned Acceptance Checklist

Status: PASS on 2026-05-17.

## 1. Launch and Window

- [x] App launches locally.
- [x] Uses real macOS window chrome.
- [x] Content area has no fake traffic-light controls.
- [x] Content area has no blue/purple background bleed.
- [x] Sidebar, timeline, and inspector fill the available window.
- [x] Resize/layout constraints are covered by fixed shell min size and responsive WebView layout.

## 2. First Run Setup

- [x] No saved configuration opens First Run Setup.
- [x] DeepSeek URL input accepts `https://` and self-hosted `http://` endpoints.
- [x] API key input accepts a key and does not write it into a plain config file.
- [x] Model selector only shows DeepSeek models.
- [x] Workspace path is visible, editable, and supports a native macOS Browse folder picker.
- [x] Demo Mode works without an API key.
- [x] Complete Setup lands on the thread workbench, not Project Command Center.
- [x] No system Keychain password prompt appears during normal setup.

## 3. Thread Workbench

- [x] Left sidebar is thread/workspace oriented.
- [x] There is no primary `Project Command Center` entry.
- [x] There is no primary `Review Changes` entry.
- [x] There are no primary placeholder `Automations` or `Skills` entries.
- [x] New thread is available and creates/selects a thread.
- [x] Empty thread state tells the user to send a prompt.
- [x] Prompt input remains responsive.
- [x] Empty prompt keeps Send disabled.
- [x] Non-empty prompt enables Send.
- [x] Running turn shows Stop.

## 4. TUI Modes and Policies

- [x] Active mode is visible as `Plan`, `Agent`, or `YOLO`.
- [x] `Plan` is labeled read-only investigation.
- [x] `Agent` is labeled tool use with approvals.
- [x] `YOLO` is visually marked as trusted auto-approval/dangerous.
- [x] Approval policy is visible as suggest/auto/never.
- [x] Workspace boundary and sandbox/trust summary are visible.
- [x] Settings can change mode/policy locally.
- [x] `Always allow in this workspace` auto-approves later matching tool requests.
- [x] Saved auto-allow rules can be cleared from the UI.

## 5. Tool Timeline

- [x] Demo Mode sends a TUI-like event sequence: user message, assistant/status, tool call, approval, tool result, assistant response.
- [x] Tool cards show tool name, status, command/input summary, cwd/target when available, and output summary.
- [x] Large output is summarized rather than blocking the entire UI.
- [x] Tool status transitions are visible.
- [x] The UI does not fabricate review files.
- [x] The UI does not show client-owned Apply/Reject/Commit controls.

## 6. Approval Flow

- [x] Approval card shows action type, tool, target, expected side effect, command when present, and risk.
- [x] Pending approval exposes `Allow once`.
- [x] Pending approval exposes `Always allow in this workspace`.
- [x] Pending approval exposes `Deny`.
- [x] Pending approval exposes `Stop`.
- [x] Allow once records an approved decision.
- [x] Always allow records an approved decision and a scoped local auto-allow rule in Demo Mode.
- [x] Future matching tool requests are auto-approved by the saved scoped rule.
- [x] Deny records a denied decision.
- [x] Stop cancels or marks the pending task stopped.
- [x] Pending buttons disappear after a decision.

## 7. Settings and Diagnostics

- [x] Settings page opens.
- [x] DeepSeek URL/model can be saved.
- [x] API key save/update/delete has behavior or an explicit unavailable state.
- [x] TUI mode selector is visible.
- [x] Approval policy selector is visible.
- [x] Runtime capabilities/features are shown when available.
- [x] Diagnostics refresh is wired.
- [x] Runtime unavailable state is explicit and recoverable.
- [x] Demo Mode is clearly labeled as local simulation.

## 8. DeepSeek-Only Product Language

- [x] No OpenAI/Codex/Anthropic/Gemini provider names appear in user-facing provider UI.
- [x] The product is named DeepSeek Agent.
- [x] Empty states guide the next TUI-aligned step.
- [x] Error states explain cause and action.

## 9. Automated Checks

- [x] Web unit/interaction tests pass.
- [x] Swift/native tests pass.
- [x] Sidecar smoke passes.
- [x] Packaging verification passes.

## 10. Native Smoke

- [x] Packaged native app launches.
- [x] Setup can complete in Demo Mode without an API key.
- [x] Post-setup screen is thread workbench.
- [x] Send prompt shows tool and approval flow.
- [x] Allow once path works.
- [x] Always allow path works.
- [x] Deny path works.
- [x] Stop path works.
- [x] Settings/Diagnostics can be opened and controls are either wired or disabled with reasons.

## Closeout Evidence

Build command: `npm --prefix web run build`, `swift build`, and `bash scripts/dev/package_tester_alpha.sh`

Test command: `bash scripts/dev/check.sh` reported `check-ok`; `DEEPSEEK_AGENT_WEBVIEW_INTERACTION_PROBE=1 bash scripts/dev/verify_tester_alpha.sh` reported `packaged-app-interaction-ok` and `verify-tester-alpha-ok`.

Native smoke path: packaged app at `build/tester-alpha/DeepSeek-Agent-alpha-macos/DeepSeek Agent.app`; zip-download simulation at `/tmp/deepseek-agent-user-smoke/DeepSeek-Agent-alpha-macos/DeepSeek Agent.app`; latest screenshot at `/tmp/deepseek-agent-user-smoke-window-latest.png`.

Interaction probe coverage: Demo setup, New thread, prompt send, `Allow once`, `Deny`, `Stop`, `Always allow in this workspace`, and subsequent saved-rule auto-approval.

Live runtime evidence: bundled `deepseek-tui serve` called the self-hosted DeepSeek-compatible endpoint `https://iruidong.com/v1` with model `deepseek-v4-flash`; a no-tool agent message returned `REAL_RUNTIME_SMOKE_OK`.

Remaining known issues: ad-hoc signed and not notarized; Computer Use cannot attach because Accessibility reports zero windows while CoreGraphics shows an onscreen app window.

Screenshots or screen descriptions: First Run Setup fills the real macOS window with neutral sidebar/content surfaces, DeepSeek-only model selection, editable workspace, and Demo Mode toggle.
