# 11 — Decision Log

## ADR-001: Use DeepSeek-TUI as sidecar runtime

Decision: Use DeepSeek-TUI sidecar via Runtime API.

Rationale:

- Keeps upstream compatibility.
- Avoids reimplementing agent loop.
- Allows immediate GUI work.
- Fits current source structure where runtime API lives under `crates/tui`.

Rejected:

- Embed Rust runtime via Swift FFI.
- Scrape terminal output.
- Fork DeepSeek-TUI and rewrite runtime.

## ADR-002: macOS native shell with embedded React WebView

Decision: Use SwiftUI/AppKit + WKWebView + React/TypeScript.

Rationale:

- Mac-only product.
- Strong match to OpenBridge UI architecture.
- Native layer can own Keychain and sidecar lifecycle.
- Web layer is better for streaming markdown, tool cards, and diff rendering.

Rejected:

- Tauri for MVP, because cross-platform is not required.
- Pure SwiftUI chat renderer, because rich streaming/diff/tool UI will iterate faster in React.

## ADR-003: Bridge proxies runtime calls

Decision: React calls Swift bridge; Swift calls sidecar.

Rationale:

- Prevents runtime token leakage into WebView JavaScript in production.
- Allows native reconnect and redaction logic.
- Avoids CORS complexity.

Rejected:

- React directly fetches sidecar in production.

## ADR-004: Fake runtime is mandatory

Decision: Implement fake runtime mode first.

Rationale:

- Codex can test UI without DeepSeek credentials.
- CI/dev environments may lack sidecar binary.
- Enables deterministic event stream tests.

Rejected:

- Only testing against real DeepSeek-TUI.

## ADR-005: No VM sandbox in MVP

Decision: Prepare review UI, but skip VM sandbox in the first release.

Rationale:

- OpenBridge VM sandbox is valuable but heavy.
- DeepSeek-TUI already has approvals/snapshots/rollback-oriented behavior.
- Product validation should happen before expensive isolation engineering.

Future:

- Git worktree review first.
- VM/container sandbox later.

## ADR-006: DeepSeek-only provider scope

Decision: MVP supports only DeepSeek.

Rationale:

- User explicitly wants DeepSeek ecosystem.
- Reduces settings and adapter complexity.
- Allows focus on cache/cost/model UX.

Rejected:

- OpenBridge-style provider registry for many providers.
