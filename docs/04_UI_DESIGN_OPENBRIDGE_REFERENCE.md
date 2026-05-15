# 04 — UI Design, OpenBridge Reference

## What to borrow from OpenBridge

OpenBridge is useful as a UI/product reference because it combines:

- macOS SwiftUI/AppKit shell,
- embedded React WebView chat/preview surfaces,
- native settings and provider management,
- local runtime orchestration,
- skills/memory/schedules UI,
- sandbox review workflow,
- security-sensitive WebView bridge boundaries.

For this product, borrow the shape, not the runtime. OpenBridge uses KWWK and a Go sandbox VM; this app uses DeepSeek-TUI sidecar.

## Main window layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Toolbar: Project ▾  Runtime ●  Model V4  Mode Agent  Cost ¥/$       │
├───────────────┬─────────────────────────────────────┬───────────────┤
│ Project/      │ Active thread timeline              │ Review/       │
│ Thread list   │                                     │ Inspector     │
│               │  User message                       │               │
│  Projects     │  Assistant streaming text           │  Changed files│
│  Threads      │  Tool card                          │  Approvals    │
│  Tasks        │  Command output                     │  Usage        │
│  Skills       │  Approval card                      │  MCP/Skills   │
│               │                                     │               │
├───────────────┴─────────────────────────────────────┴───────────────┤
│ Composer: prompt input | Attach | Plan/Agent/Yolo | Send | Stop      │
└─────────────────────────────────────────────────────────────────────┘
```

## Screens

### 1. Onboarding

- Choose DeepSeek-TUI binary path.
- Enter DeepSeek API key.
- Test sidecar launch.
- Optional: continue with fake runtime.

### 2. Project selector

- Recently opened projects.
- Add project folder.
- Per-project runtime mode and model.

### 3. Thread workspace

- Left sidebar: thread list, status, last update.
- Center: chat timeline.
- Right panel: review/diff/approvals/usage.

### 4. Settings

- DeepSeek API key stored in Keychain.
- Sidecar binary path.
- Default model/mode.
- Fake runtime toggle.
- Logs and diagnostics.

### 5. Sidecar diagnostics

- Binary path.
- Runtime API URL.
- Auth enabled.
- Version.
- Last health check.
- Start/stop/restart buttons.
- Redacted logs.

## Card types

| Card | Inputs | Behavior |
|---|---|---|
| User message | submitted prompt | Plain text/markdown. |
| Assistant message | `item.delta`/`item.completed` | Streaming markdown. |
| Reasoning summary | reasoning/status payload | Collapsible by default. |
| Tool call | `item.started` metadata | Name, input summary, status. |
| Shell command | tool metadata or command output | Command, cwd, stdout/stderr, exit code. |
| File change | file/patch metadata | Diff preview, open file, copy patch. |
| Approval | `approval.required` | Allow/Deny buttons; risk details. |
| Usage | usage payload or `/v1/usage` | Tokens, cached tokens, cost. |
| Error | failed events | Error, retry, diagnostics. |

## Approval UX

Modal and inline card should show:

- approval ID,
- thread/turn context,
- tool name,
- command or file path,
- risk explanation,
- allow once,
- allow and remember if runtime supports `remember`,
- deny,
- stop turn.

Approval decisions go through the Swift bridge to:

```http
POST /v1/approvals/{approval_id}
```

## Review panel

MVP:

- Show file-change cards when events contain file metadata.
- Show workspace status via `/v1/workspace/status` if available.
- Provide rollback guidance if runtime supports snapshots.

Future:

- Git worktree isolation.
- Accept selected hunks.
- Apply/discard review workflow inspired by OpenBridge sandbox review.

## Usage/cost UX

Because the product is DeepSeek-only, make usage highly visible:

- model,
- input tokens,
- output tokens,
- cached tokens,
- estimated cost,
- turn-level cost,
- thread-level total,
- date/model/provider grouping via `/v1/usage`.

## Visual style

- Native macOS sidebar proportions.
- Clean cards with status chips.
- Minimal color; use system colors where possible.
- Support light/dark mode.
- Use monospaced font for commands and diffs.
- Keep the interface readable before making it visually elaborate.

## Accessibility

- Keyboard navigation for thread list and composer.
- Buttons have labels, not just icons.
- Approval actions are reachable by keyboard.
- Text contrast follows macOS defaults.
- Streaming updates should not steal focus.

## OpenBridge comparison matrix

| OpenBridge concept | This app equivalent |
|---|---|
| SwiftUI shell | SwiftUI/AppKit shell. |
| Embedded React WebViews | WKWebView React chat surface. |
| KWWK runtime | DeepSeek-TUI sidecar runtime. |
| Provider registry | DeepSeek-only settings. |
| Sandbox VM review | MVP diff/approval; future worktree review. |
| Skills UI | DeepSeek-TUI skills list and toggles where exposed. |
| WebKit bridge | Swift runtime bridge. |
