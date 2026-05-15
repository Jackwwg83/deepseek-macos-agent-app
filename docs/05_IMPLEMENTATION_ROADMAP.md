# 05 — Implementation Roadmap

This roadmap is written for Codex `/goal`: each milestone has a concrete artifact and validation command.

## Milestone 0 — Repository bootstrap

Create:

```text
macos/
web/
scripts/dev/
docs/PROGRESS.md
```

Add scripts:

```text
scripts/dev/bootstrap.sh
scripts/dev/check.sh
scripts/dev/run_fake_runtime.sh
scripts/dev/run_macos_app.sh
```

Validation:

```bash
bash scripts/dev/check.sh
```

Expected result: script exists and reports available/missing prerequisites clearly.

## Milestone 1 — Web UI fake runtime

Build the React chat surface first with fake data.

Required:

- TypeScript project.
- `AgentBridge` interface.
- `FakeAgentBridge` implementation.
- Thread list.
- Chat timeline.
- Simulated streaming events.
- Approval card.
- Usage footer.

Validation:

```bash
cd web
# install package manager dependencies as chosen by Codex
npm test || yarn test || pnpm test
npm run typecheck || yarn typecheck || pnpm typecheck
npm run lint || yarn lint || pnpm lint
```

## Milestone 2 — macOS shell and WKWebView

Create a native macOS app that loads the embedded web UI.

Required:

- App launches in unsigned debug mode.
- Window has sidebar/content layout or WebView-hosted equivalent.
- Native bridge can answer `health` using fake runtime.
- Build script exists.

Validation:

```bash
cd macos
bash Scripts/build_debug.sh
bash Scripts/test_unit.sh
```

## Milestone 3 — Runtime bridge

Implement Swift-to-WebView bridge and native runtime client abstraction.

Required:

- `AgentRuntimeClient` protocol.
- `FakeRuntimeClient`.
- `DeepSeekTuiRuntimeClient` skeleton.
- Web bridge message schema.
- Tests for bridge message parsing.

Validation:

```bash
bash scripts/dev/check.sh
```

## Milestone 4 — Sidecar process manager

Implement sidecar launch and health checks.

Required:

- Binary discovery order.
- Dynamic port and token.
- Start/stop/restart.
- Redacted logs.
- Runtime status in UI.
- Graceful failure when binary missing.

Validation:

```bash
DEEPSEEK_TUI_BIN=/path/to/deepseek-tui bash scripts/dev/run_macos_app.sh
```

If no binary exists, fake runtime mode must still pass.

## Milestone 5 — Real Runtime API adapter

Implement real calls to DeepSeek-TUI Runtime API.

Required:

- `GET /health`.
- `GET /v1/runtime/info`.
- `GET/POST /v1/threads`.
- `GET /v1/threads/{id}`.
- `POST /v1/threads/{id}/turns`.
- SSE event subscription with `since_seq`.
- Approval decision.
- Interrupt/steer.
- Usage query.

Validation:

```bash
DEEPSEEK_TUI_BIN=/path/to/deepseek-tui DEEPSEEK_API_KEY=... bash scripts/dev/run_macos_app.sh
```

Manual smoke:

1. Select project.
2. Create thread.
3. Send prompt.
4. See streaming events.
5. Stop or approve when needed.

## Milestone 6 — UI polish and diagnostics

Required:

- Error states.
- Sidecar diagnostics panel.
- Settings screen.
- Keychain storage for API key.
- Export debug info with secrets redacted.
- Docs updated.

Validation:

```bash
bash scripts/dev/check.sh
```

## Milestone 7 — Packaging notes

MVP does not require notarized release, but must document:

- how to bundle sidecar,
- how to run unsigned debug app,
- how to set sidecar path manually,
- license notices,
- future signing/notarization steps.

Validation:

```bash
open macos/.build/.../DeepSeekAgentApp.app
```

or documented equivalent.

## Codex progress log requirement

After each milestone, append to `docs/PROGRESS.md`:

```markdown
## YYYY-MM-DD HH:mm — Milestone N

- Changed:
- Verified:
- Failing checks:
- Blockers:
- Next:
```
