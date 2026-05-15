# DeepSeek macOS Agent App — Codex Goal Design Pack

This document pack is designed to be copied into a new repository or an existing prototype repository and then used with Codex `/goal` mode.

The product target is a **macOS-only local agent app**:

- **Runtime core:** DeepSeek-TUI, launched as a local sidecar process.
- **Model ecosystem:** DeepSeek only.
- **UI reference:** OpenBridge-style macOS native shell + embedded React WebView chat surface.
- **Development agent:** Codex, using `/goal` mode to iterate until a testable MVP exists.

## Recommended first implementation

Use a native macOS app architecture:

```text
SwiftUI/AppKit shell
  ├─ Settings, project picker, sidecar lifecycle, Keychain secrets
  ├─ WKWebView embedded chat UI
  └─ Native bridge proxying requests to the sidecar

React/TypeScript embedded web UI
  ├─ Chat timeline
  ├─ Tool cards
  ├─ Approval modal
  ├─ Diff/review panel
  └─ Usage/cost footer

DeepSeek-TUI sidecar
  └─ deepseek-tui serve --http --host 127.0.0.1 --port <dynamic> --auth-token <random>
```

Do **not** make the GUI scrape terminal output. Do **not** rewrite the DeepSeek-TUI runtime. The first version should treat DeepSeek-TUI as a sidecar runtime and talk to its HTTP/SSE Runtime API.

## How to use this pack with Codex

1. Copy this folder into the repository where the app will be developed.
2. Add the provided `AGENTS.md` to the repository root.
3. Enable Codex goals if needed.
4. Start Codex in the repository root and paste the goal from `CODEX_GOAL.md`.

Example:

```text
/goal Implement CODEX_GOAL.md. Keep iterating until the MVP can be launched locally and all documented checks pass, or stop with a precise blocker and evidence.
```

## Document map

| File | Purpose |
|---|---|
| `CODEX_GOAL.md` | Main `/goal` objective for Codex. |
| `AGENTS.md` | Repository instructions Codex should read before work. |
| `.codex/config.toml.example` | Suggested Codex config for this project. |
| `docs/01_PRODUCT_SPEC.md` | Product definition and MVP scope. |
| `docs/02_ARCHITECTURE.md` | macOS app, web UI, bridge, and sidecar architecture. |
| `docs/03_RUNTIME_ADAPTER.md` | DeepSeek-TUI Runtime API integration contract. |
| `docs/04_UI_DESIGN_OPENBRIDGE_REFERENCE.md` | UI and UX reference derived from OpenBridge. |
| `docs/05_IMPLEMENTATION_ROADMAP.md` | Goal-friendly implementation phases. |
| `docs/06_TEST_PLAN.md` | Validation commands and test strategy. |
| `docs/07_SECURITY_AND_PACKAGING.md` | Keychain, token, sidecar, signing, and license guidance. |
| `docs/08_UPSTREAM_COMPATIBILITY.md` | Strategy for staying compatible with DeepSeek-TUI updates. |
| `docs/09_CODEX_GOAL_WORKFLOW.md` | How to run this project with Codex `/goal`. |
| `docs/10_SOURCE_INVENTORY.md` | What was inspected in DeepSeek-TUI and why it matters. |
| `docs/11_DECISION_LOG.md` | Architecture decisions and tradeoffs. |
| `docs/12_ACCEPTANCE_CHECKLIST.md` | Checklist for the first testable app. |


## External references used

- Codex `/goal` use case: https://developers.openai.com/codex/use-cases/follow-goals
- Codex Goals cookbook: https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex
- Codex slash commands: https://developers.openai.com/codex/cli/slash-commands
- Codex AGENTS.md guidance: https://developers.openai.com/codex/guides/agents-md
- Codex best practices: https://developers.openai.com/codex/learn/best-practices
- Codex app-server protocol reference: https://developers.openai.com/codex/app-server
- Codex app product reference: https://developers.openai.com/codex/app
- OpenBridge repository: https://github.com/AFK-surf/OpenBridge
- OpenBridge architecture: https://github.com/AFK-surf/OpenBridge/blob/main/docs/ARCHITECTURE.md
- OpenBridge AGENTS.md: https://github.com/AFK-surf/OpenBridge/blob/main/AGENTS.md
- OpenBridge sandbox-vm README: https://github.com/AFK-surf/OpenBridge/blob/main/sandbox-vm/README.md
- OpenBridge security policy: https://github.com/AFK-surf/OpenBridge/security

## Local source inspected

- Uploaded archive: `/mnt/data/DeepSeek-TUI-main.zip`
- Extracted root: `/mnt/data/deepseek_tui_src/DeepSeek-TUI-main`
- Important files inspected:
  - `Cargo.toml`
  - `crates/tui/src/runtime_api.rs`
  - `crates/tui/src/runtime_threads.rs`
  - `crates/tui/src/core/engine.rs`
  - `crates/tui/src/core/events.rs`
  - `crates/cli/src/lib.rs`
