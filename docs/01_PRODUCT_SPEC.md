# 01 — Product Spec

## Product name placeholder

`DeepSeek Agent App` — final branding can change.

## Product thesis

A macOS local-first coding agent app that makes DeepSeek-TUI feel like a native desktop product: project sidebar, parallel threads, chat timeline, tool cards, approvals, diffs, usage/cost visibility, and reliable sidecar status.

## Target user

- macOS developer using DeepSeek-TUI or DeepSeek API.
- Wants a Codex App/OpenBridge-like GUI without leaving DeepSeek ecosystem.
- Wants local execution and clear approval/review surfaces.

## MVP scope

### Must have

1. macOS app shell.
2. Embedded chat UI.
3. DeepSeek-TUI sidecar lifecycle.
4. Fake runtime mode.
5. Project folder selection.
6. Thread list and active thread detail.
7. Start a turn from user input.
8. SSE event stream rendering with replay using `since_seq`.
9. Approval UI that can submit allow/deny.
10. Usage/cost footer fed by `/v1/usage` and turn usage events.
11. Settings for DeepSeek API key and sidecar binary path.
12. App can build and run locally.

### Should have

- File-change/diff panel when runtime events contain patch/diff metadata.
- Shell output card.
- MCP/skills list read-only view.
- Sidecar log viewer with redaction.
- Thread archive/resume controls.

### Later

- Git worktree review workflow.
- VM/container sandbox.
- Multi-window or multi-thread parallel UI.
- JSON-RPC app-server protocol.
- IDE integration.
- Cloud/mobile control.

## Non-goals

- No provider marketplace in the MVP.
- No OpenAI/Codex model integration.
- No KWWK runtime.
- No OpenBridge fork.
- No direct terminal scraping.
- No VM sandbox in the first milestone.

## User journeys

### Journey A: first launch with fake runtime

1. User opens the app.
2. App shows onboarding and fake runtime toggle.
3. User selects a sample project folder.
4. UI shows sample thread and event timeline.
5. User sends a test message.
6. Fake runtime streams message/tool/approval/usage events.
7. User approves or denies the sample approval.

### Journey B: real DeepSeek-TUI runtime

1. User installs or points to `deepseek-tui` binary.
2. User enters DeepSeek API key in Settings.
3. App launches sidecar on loopback with bearer token.
4. App creates a thread for the selected project.
5. User sends message.
6. Runtime streams events into UI.
7. User reviews approvals and outputs.

### Journey C: recover from sidecar crash

1. Sidecar exits unexpectedly.
2. UI shows disconnected state.
3. App offers restart.
4. Restarted sidecar resumes thread list from runtime store if available.
5. UI reconnects and replays events using `since_seq`.

## Product differentiators

- DeepSeek-only, with cost/cache UX prioritized.
- Local-first sidecar runtime.
- macOS-native app feel inspired by OpenBridge.
- Strong event-card UI for tool execution and approvals.
- Designed to stay compatible with upstream DeepSeek-TUI.
