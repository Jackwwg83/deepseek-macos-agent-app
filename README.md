# DeepSeek macOS Agent App — Codex Goal Design Pack

## MVP implementation status

This repository now contains a locally launchable MVP:

- `macos/`: SwiftPM/AppKit app with native settings/sidebar, DeepSeek URL/model settings, Keychain API-key storage, sidecar discovery, sidecar command builder, typed runtime clients, and WKWebView bridge.
- `web/`: React/TypeScript embedded chat UI with fake runtime, thread list, active timeline, streaming assistant text, tool card, approval card, sidecar state, composer, and usage footer.
- `scripts/dev/`: bootstrap, full check, fake-runtime launch, app launch, tester packaging, and package verification scripts.
- `docs/PROGRESS.md`: checkpoint log and validation evidence.

Run the full local check:

```bash
bash scripts/dev/bootstrap.sh
bash scripts/dev/check.sh
```

Launch a short fake-runtime app smoke:

```bash
bash scripts/dev/run_fake_runtime.sh
```

Keep the app open for manual use:

```bash
KEEP_OPEN=1 bash scripts/dev/run_macos_app.sh
```

The app defaults to fake runtime mode, so no DeepSeek credentials are required for local UI and bridge testing.

## Tester alpha package

Create and verify a tester handoff package:

```bash
bash scripts/dev/package_tester_alpha.sh
bash scripts/dev/verify_tester_alpha.sh
```

Deliver this zip to testers:

```text
build/tester-alpha/DeepSeek-Agent-alpha-macos.zip
```

The package contains `DeepSeek Agent.app`, bundled `web/dist`, and bundled `deepseek-tui`. Test users only need to open the app, enter their DeepSeek URL, API key, choose or type a model, then click `Save & Start Runtime`.

## Real sidecar mode

Real mode uses DeepSeek-TUI as a loopback sidecar:

```bash
export DEEPSEEK_TUI_BIN=/absolute/path/to/deepseek-tui
export DEEPSEEK_API_KEY=...
export DEEPSEEK_BASE_URL=https://your-openai-compatible-endpoint/v1
export DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_AGENT_RUNTIME=real KEEP_OPEN=1 bash scripts/dev/run_macos_app.sh
```

The native layer launches:

```bash
deepseek-tui serve --http --host 127.0.0.1 --port <dynamic> --auth-token <random>
```

The bearer token is generated per launch and stays in Swift. The DeepSeek API key is passed to the sidecar through the environment or saved in macOS Keychain from the native settings sidebar; it is not passed as a command-line argument and is not committed. The DeepSeek URL and model are saved in user defaults. For scripted development launches, `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, and `DEEPSEEK_MODEL` in the environment take precedence over saved settings.

## Local environment note

This machine now has full Xcode selected:

```text
Xcode 26.1.1
Build version 17B100
```

`macos/Scripts/build_debug.sh` runs `xcodebuild -scheme DeepSeekAgentApp -destination 'generic/platform=macOS' build` when Xcode is available, then also runs `swift build` so `scripts/dev/run_macos_app.sh` has a runnable SwiftPM debug executable.

## Known limitations

- The tester package is ad-hoc signed but not notarized; downloaded builds may require right-click `Open` or quarantine removal.
- Real-runtime model-turn smoke requires a valid `DEEPSEEK_API_KEY` and an OpenAI-compatible HTTPS endpoint.
- Standard `swift test` now runs the XCTest target. `macos/Scripts/test_unit.sh` keeps the dependency-free Swift runner as a fallback for CLT-only machines.
- The WebView bridge and HTTP/SSE adapter are intentionally narrow; upstream DeepSeek-TUI API drift should be handled inside the typed adapter modules.

## License notice plan

The project does not vendor OpenBridge or DeepSeek-TUI source. The tester alpha package bundles a DeepSeek-TUI binary plus `THIRD_PARTY_NOTICES.txt`, `licenses/DeepSeek-TUI-LICENSE.txt`, and package checksums as described in `docs/07_SECURITY_AND_PACKAGING.md`.

---

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
