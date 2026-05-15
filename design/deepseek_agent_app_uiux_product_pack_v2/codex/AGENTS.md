# AGENTS.md — DeepSeek Agent macOS App

## Project intent

Build a macOS-only DeepSeek Agent App with DeepSeek-TUI as runtime core. The product should feel like a polished Codex App-style command center, not a connection form or terminal wrapper.

## Non-negotiable rules

- Do not reimplement the agent loop in the GUI.
- Do not store API keys in web/localStorage.
- Do not scrape terminal output.
- Do not fork/copy OpenBridge or Codex source code.
- Do not add multi-provider UI. DeepSeek only.
- Do not put URL/API key/model setup controls in the main workspace page.
- Do not use the old black/yellow theme.
- Keep FakeRuntimeAdapter/demo mode available.
- Preserve user control: approval and review must be explicit for risky actions.

## Design references

Use the v2 mockups and docs as source of truth:

- `PRODUCT_UI_UX_SPEC_V2.md`
- `docs/03_VISUAL_SYSTEM.md`
- `docs/04_COMPONENT_LIBRARY.md`
- `docs/08_ACCEPTANCE_CHECKLIST.md`
- `mockups/*.png`

## Implementation style

- Prefer small, testable increments.
- Keep UI components reusable.
- Keep RuntimeAdapter separate from visual components.
- Normalize runtime events before rendering.
- Use design tokens instead of hardcoded colors when possible.
- Update progress notes after each meaningful iteration.

## Testing expectations

Before considering the goal complete:

- run build,
- run tests,
- manually verify demo mode,
- verify First Run Setup, Project Command Center, Active Thread, Review Changes, Settings & Usage.

