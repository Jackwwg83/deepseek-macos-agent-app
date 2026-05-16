# Codex Goal: TUI-Aligned DeepSeek Agent macOS Client

## Goal

Build a customer-testable macOS GUI for **DeepSeek Agent** that matches the
DeepSeek-TUI product model as closely as a native desktop shell can:

```text
First Run Setup
  -> Workspace + DeepSeek endpoint/key/model
  -> Thread-first workbench
  -> Prompt
  -> Tool call cards
  -> Approval decision
  -> Tool result
  -> Assistant response
```

The GUI must not invent a separate product workflow. It is a local supervisor
for the DeepSeek-TUI runtime, not a project manager, code review product, or git
client.

## Product Principles

- DeepSeek-only. Do not add OpenAI, Codex, Anthropic, Gemini, or generic
  provider UI.
- DeepSeek-TUI is the runtime source of truth for threads, turns, events, tools,
  approvals, tasks, workspace boundaries, and usage.
- The GUI surfaces the TUI concepts directly: `Plan`, `Agent`, `YOLO`, approval
  policy, workspace boundary, sandbox/trust state, tool calls, and approvals.
- Git diff, run tests, apply patch, shell commands, MCP calls, and commit flows
  are model tool calls. They appear in the timeline when requested by the
  runtime; they are not fixed product buttons.
- The user-facing control point is permission: approve once, always allow in a
  scoped way, deny, or stop.
- Demo Mode may exist only as an offline simulation of the TUI flow. It must not
  create fake review queues, fake changed files, or fake commit workflows.
- Every visible control is wired to real state, disabled with a clear reason, or
  hidden.

## Required Screens

1. First Run Setup
2. Thread Workbench
3. Runtime Settings
4. Runtime Diagnostics

No primary `Project Command Center`, `Review Changes`, `Automations`, or
`Skills` screens are allowed unless they become thin runtime introspection over
real `/v1/*` data. They must not be placeholder product pages.

## Required Journeys

### Journey 1: Setup

- Launch with no saved runtime configuration.
- User enters DeepSeek-compatible URL, API key, model, and workspace.
- User can choose Demo Mode for offline diagnostics without an API key.
- User completes setup and lands on the thread workbench.
- No system Keychain password prompt appears during normal setup.

### Journey 2: Thread and Tool Flow

- User creates or selects a thread.
- User enters a prompt and sends it.
- Demo Mode emits a TUI-like sequence:
  - user message,
  - assistant planning/status,
  - tool call card,
  - approval required card,
  - approval decision,
  - tool result,
  - assistant response.
- The UI does not fabricate changed files or commit actions.

### Journey 3: Approval Flow

- Approval cards show tool name, action type, command when present, workspace
  target, expected side effect, and risk.
- Pending approvals expose:
  - `Allow once`
  - `Always allow in this workspace`
  - `Deny`
  - `Stop`
- After a decision, pending action buttons disappear and the recorded decision
  remains visible.
- `Always allow in this workspace` records a scoped local rule in Demo Mode and
  must be ready to map to DeepSeek-TUI `auto_allow` when the runtime endpoint is
  available.

### Journey 4: TUI Mode and Runtime Settings

- The active thread shows `Plan`, `Agent`, or `YOLO`.
- Settings expose:
  - DeepSeek URL,
  - model,
  - API key save/delete,
  - workspace path,
  - TUI mode,
  - approval policy,
  - sandbox/trust summary,
  - feature flags/capabilities when reported by runtime.
- `Plan` is described as read-only investigation.
- `Agent` is described as multi-step tool use with approvals.
- `YOLO` is described as trusted auto-approval and must look visually dangerous.

### Journey 5: Runtime Diagnostics

- Runtime status is always visible.
- Diagnostics can be refreshed.
- Real runtime unavailable states must be explicit and recoverable.
- Demo Mode is clearly labeled as a local simulation.

## Explicit Non-Goals

- No client-owned Apply/Reject/Commit workflow.
- No fake review queue.
- No fake diff viewer standing in for runtime changes.
- No client-owned `Open in IDE`, `Run tests`, or `View diffs` buttons unless the
  runtime has emitted those as tool calls or exposes a real endpoint.
- No placeholder Automations or Skills product pages.
- No VM sandbox implementation in this milestone.
- No notarization requirement for this alpha, but tester docs must explain the
  Gatekeeper workaround.

## Implementation Order

1. Replace old product docs/checklists with this TUI-aligned PRD.
2. Add failing UI tests for the new product contract.
3. Remove primary navigation and state for Project Command Center, Review
   Changes, Automations, and Skills.
4. Make the post-setup default screen the thread workbench.
5. Add TUI mode and approval policy state to the UI.
6. Replace review/commit controls with tool/approval cards and scoped
   permission controls.
7. Update Demo Mode to emit TUI-like tool and approval events only.
8. Update Settings and Diagnostics to expose runtime concepts.
9. Run automated checks and package smoke tests.
10. Use Computer Use to validate the native app journey end-to-end.

## Acceptance Checklist

Use `docs/07_ACCEPTANCE_CHECKLIST.md` as the source of truth. Continue iterating
until the checklist passes or a precise blocker is found with evidence.

## Output Requirements

At the end, report:

- Files changed
- Build command and result
- Test command and result
- Native app smoke path and result
- Remaining known issues
- Screenshots or screen descriptions
