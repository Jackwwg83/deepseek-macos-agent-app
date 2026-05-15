# DeepSeek macOS Agent MVP Plan

Objective: implement `CODEX_GOAL.md` until the MVP builds, runs locally in fake-runtime mode, and the documented checks pass or have precise prerequisite blockers.

## Constraints

- Native macOS app, not web-only.
- DeepSeek-TUI remains the runtime sidecar; the GUI does not reimplement the agent engine.
- Fake runtime mode must work without DeepSeek credentials.
- Production WebView JavaScript must not own the runtime bearer token or DeepSeek API key.
- Sidecar binds to `127.0.0.1` with a fresh random bearer token.

## Checkpoint 0 — Execution Rails

- Create `macos/`, `web/`, `scripts/dev/`, and `docs/PROGRESS.md`.
- Add root scripts that match `CODEX_GOAL.md`.
- Confirm SwiftPM can be used with Command Line Tools even when `xcodebuild` is unavailable.

## Checkpoint 1 — Web Fake Runtime

- Add React/TypeScript/Vite project under `web/`.
- Define a typed `AgentBridge` and runtime DTOs.
- Implement `FakeAgentBridge` that simulates thread list, streaming deltas, tool cards, approval, approval decision, usage, and completion.
- Add reducer/formatting tests for event replay, duplicate `seq`, approval dispatch, and usage formatting.

## Checkpoint 2 — Native Shell

- Add SwiftPM macOS executable under `macos/`.
- Launch an AppKit window with a project picker, settings/status header, and WKWebView content area.
- Load `web/dist/index.html` when built, or a local dev URL if configured.
- Keep fake mode as default for local launch.

## Checkpoint 3 — Runtime Bridge And Sidecar

- Add Swift `AgentRuntimeClient` protocol, `FakeRuntimeClient`, and `DeepSeekTuiRuntimeClient`.
- Add sidecar binary discovery, dynamic port allocation, random token generation, command construction, and redacted diagnostics.
- Add WebView bridge message decoding with strict method validation and bounded payload size.
- Add Swift tests for token/argv secrecy, binary discovery, runtime endpoint calls, and malformed bridge messages.

## Checkpoint 4 — Scripts, Docs, Verification

- Implement `bootstrap.sh`, `check.sh`, `run_fake_runtime.sh`, and `run_macos_app.sh`.
- Update README and acceptance checklist with evidence.
- Run web lint/typecheck/tests, Swift build/tests, and fake runtime smoke.
- Document real runtime smoke prerequisites and exact command.

## Verification Commands

```bash
bash scripts/dev/bootstrap.sh
bash scripts/dev/check.sh
bash scripts/dev/run_fake_runtime.sh
bash scripts/dev/run_macos_app.sh
```

