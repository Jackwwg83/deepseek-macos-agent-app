# AGENTS.md — DeepSeek macOS Agent App

This repository builds a macOS-only GUI agent app that uses DeepSeek-TUI as the runtime sidecar.

## Product contract

- Build a local macOS app, not a web-only app.
- Runtime core is DeepSeek-TUI. Do not reimplement the agent loop, model client, tool execution, approvals, or thread runtime in the GUI.
- Only support DeepSeek models for the MVP.
- Use OpenBridge as UI/product reference, not as runtime foundation.
- Prefer SwiftUI/AppKit + WKWebView + React/TypeScript for the first implementation.
- The WebView should communicate with Swift through a typed bridge. Swift proxies sidecar calls so the runtime token does not need to live in browser JavaScript.

## Required reading before code changes

Read these files before implementing or modifying behavior:

1. `CODEX_GOAL.md`
2. `docs/01_PRODUCT_SPEC.md`
3. `docs/02_ARCHITECTURE.md`
4. `docs/03_RUNTIME_ADAPTER.md`
5. `docs/04_UI_DESIGN_OPENBRIDGE_REFERENCE.md`
6. `docs/06_TEST_PLAN.md`
7. `docs/07_SECURITY_AND_PACKAGING.md`
8. `docs/08_UPSTREAM_COMPATIBILITY.md`

## Development rules

- Keep changes small and checkpointed.
- Do not vendor or fork OpenBridge code.
- Do not copy large DeepSeek-TUI source trees into this app repository.
- Locate or bundle a `deepseek-tui`/`deepseek` binary and run it as a sidecar.
- Add a fake runtime mode so the app can be tested without a DeepSeek API key.
- Never commit API keys, bearer tokens, local app bundles, DerivedData, build products, VM images, or runtime logs containing secrets.
- Prefer dependency injection for sidecar clients and stores.
- Keep native app state explicit; avoid global mutable singletons except for app lifecycle entry points.
- Keep the React UI independent from concrete sidecar HTTP details. It should call a bridge interface, not `fetch()` the runtime directly in production mode.

## Validation expectations

After every material change, run the smallest relevant checks. Before marking the goal complete, run all available checks from `docs/06_TEST_PLAN.md`.

A successful MVP must satisfy at least:

- Web UI typecheck and tests pass.
- Swift app builds in unsigned debug mode.
- Fake runtime smoke test passes.
- Real sidecar smoke test is documented and passes when `DEEPSEEK_TUI_BIN` and `DEEPSEEK_API_KEY` are available.
- The app launches and shows a testable chat UI with project picker, thread list, message stream, approval UI placeholder, and usage footer.

## Review guidelines

When reviewing diffs, focus on:

- Whether runtime ownership stays in DeepSeek-TUI.
- Whether secret handling avoids leaking tokens into WebView JavaScript.
- Whether sidecar lifecycle is robust: start, health check, reconnect, terminate, restart.
- Whether event replay uses `since_seq` and avoids duplicate rendering.
- Whether user-visible errors include actionable recovery steps.
- Whether tests can run without external DeepSeek access.
