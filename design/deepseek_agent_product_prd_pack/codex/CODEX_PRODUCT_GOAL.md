# Codex Goal: Implement Product Journey for DeepSeek Agent macOS MVP

## Goal

Build a usable macOS MVP for **DeepSeek Agent**, using DeepSeek-TUI as the runtime core and DeepSeek-only product scope. The app must behave like a real product, not a static mockup.

The MVP must support the complete product journey:

```text
First Run Setup
  -> Demo Mode or DeepSeek API key setup
  -> Project Command Center
  -> New Thread
  -> Send Prompt
  -> Agent/FakeRuntime Response
  -> Review Changes
  -> Apply/Reject
  -> Settings & Usage
```

## Core constraints

- DeepSeek-only. Do not add OpenAI, Codex, Anthropic, Gemini, or generic provider support.
- Runtime core is DeepSeek-TUI sidecar or FakeRuntimeAdapter. Do not rewrite the agent runtime.
- Demo Mode must work without API key.
- No system Keychain password prompt should appear during normal usage.
- No fake macOS traffic-light window buttons inside the content UI.
- No large blue/purple marketing background inside the real app content area.
- Every visible button must be wired, disabled with a reason, or hidden.
- Do not leave static mock buttons.
- Do not make `Commit 0 files` an enabled primary action.

## Required screens

1. First Run Setup
2. Project Command Center
3. Active Thread
4. Review Changes
5. Settings & Usage
6. Automations skeleton
7. Skills skeleton
8. Runtime Diagnostics or status surface

## Required journeys

### Journey 1: Demo setup

- Launch app without API key.
- Enable Demo Mode.
- Choose workspace or demo workspace.
- Complete setup.
- Land on Project Command Center.

### Journey 2: New thread

- Click New thread.
- Enter prompt.
- Send prompt.
- FakeRuntime emits agent response, file changes, test evidence.
- Active Thread updates without freezing.

### Journey 3: Review changes

- Open Review Changes.
- Select a changed file.
- See diff or structured placeholder.
- Apply selected.
- Reject selected.
- Commit button enabled only when accepted files > 0 and message exists.

### Journey 4: Settings

- Open Settings.
- Change model between deepseek-v4-flash and deepseek-v4-pro.
- Toggle workspace preferences.
- Save/delete API key through non-invasive Keychain or mockable key storage.
- See usage and runtime status.

## Implementation order

1. Inspect current project and identify tech stack.
2. Fix App shell: no fake window chrome, no blue background bleed.
3. Implement or stabilize FakeRuntimeAdapter.
4. Implement routing between screens.
5. Wire all sidebar and menu actions.
6. Implement First Run Setup state.
7. Implement Thread state and composer behavior.
8. Implement Review Changes state and actions.
9. Implement Settings state and DeepSeek-only model controls.
10. Implement Keychain behavior or mockable abstraction without system password prompts.
11. Add tests/smoke checks.
12. Update PROGRESS.md with results.

## Acceptance checklist

Use `docs/07_ACCEPTANCE_CHECKLIST.md` as the source of truth. Continue iterating until the checklist passes or a precise blocker is found.

## Output requirements

At the end of each iteration, report:

- Files changed
- Build command and result
- Test command and result
- Which user journeys were manually or automatically verified
- Known remaining issues
- Next step

Do not stop after only improving visual design. The product must be clickable and testable.
