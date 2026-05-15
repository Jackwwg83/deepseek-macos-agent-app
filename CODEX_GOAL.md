# Codex Goal: Build a testable DeepSeek macOS Agent App MVP

## Goal statement

Implement a macOS-only GUI agent app that uses **DeepSeek-TUI as its runtime sidecar** and presents an **OpenBridge-inspired native shell + embedded WebView chat interface**. Keep iterating until the repository contains a locally buildable, testable MVP with fake-runtime support and documented real-runtime sidecar support.

## What “done” means

The goal is complete only when concrete evidence shows all of the following are true:

1. A macOS app project exists and builds in unsigned debug mode.
2. The app has a native shell with project selection, settings, sidecar status, and a WKWebView-hosted chat UI.
3. The embedded web UI renders:
   - thread list,
   - active chat timeline,
   - streaming assistant text,
   - tool/command/file-change cards or stable placeholders,
   - approval modal or approval card,
   - usage/cost footer,
   - sidecar connection state.
4. The app can run in **fake runtime mode** without DeepSeek credentials and demonstrate the full UI event flow.
5. The app can run in **real runtime mode** by launching a `deepseek-tui` or `deepseek` sidecar with `serve --http` on `127.0.0.1`, a dynamic port, and a random bearer token.
6. The app uses a typed runtime adapter so UI code is insulated from upstream DeepSeek-TUI API drift.
7. The runtime token and DeepSeek API key are not committed and are not stored in WebView JavaScript state.
8. Validation commands pass or, if a local machine lacks Xcode/Node/DeepSeek binary, the repository includes a precise explanation of the missing prerequisite and the command that will pass once installed.

## Required implementation boundaries

- Do not reimplement DeepSeek-TUI’s agent engine.
- Do not scrape terminal output.
- Do not fork OpenBridge or copy its source code.
- Do not introduce a general provider marketplace in the MVP. DeepSeek only.
- Do not implement a VM sandbox in the MVP. Use DeepSeek-TUI approvals/snapshots where available and prepare the UI for future workspace review.
- Do not expose the sidecar server beyond loopback.
- Do not store API keys in plaintext files unless there is an explicit fallback path clearly labeled insecure/dev-only.

## Required repository structure

Create or converge toward this structure:

```text
macos/
  DeepSeekAgentApp/
    App/
    Sidecar/
    RuntimeBridge/
    Settings/
    WebView/
  Scripts/
    build_debug.sh
    test_unit.sh
web/
  package.json
  src/
    embedded/chat/
    bridge/
    runtime/
    components/
    test/
scripts/
  dev/
    bootstrap.sh
    check.sh
    run_fake_runtime.sh
    run_macos_app.sh
docs/
  existing design docs from this pack
```

If the actual starter template requires different names, keep the same ownership boundaries and update the docs.

## Runtime integration requirements

Use the DeepSeek-TUI Runtime API shape described in `docs/03_RUNTIME_ADAPTER.md`:

- `GET /health`
- `GET /v1/runtime/info`
- `GET /v1/threads`
- `POST /v1/threads`
- `GET /v1/threads/{id}`
- `POST /v1/threads/{id}/turns`
- `GET /v1/threads/{id}/events?since_seq=N`
- `POST /v1/approvals/{approval_id}`
- `POST /v1/threads/{id}/turns/{turn_id}/interrupt`
- `POST /v1/threads/{id}/turns/{turn_id}/steer`
- `GET /v1/usage`

Production mode must proxy these through Swift. Development mode may allow direct Web UI access to a fake runtime server.

## Iteration policy

Work in checkpoints:

1. Create the project skeleton and scripts.
2. Implement fake runtime data flow.
3. Implement WebView bridge contract.
4. Implement sidecar process manager.
5. Implement real runtime HTTP/SSE adapter.
6. Implement UI screens and cards.
7. Add tests and smoke checks.
8. Polish errors, docs, and packaging notes.

After each checkpoint:

- Run the narrowest relevant test.
- Record progress in `docs/PROGRESS.md` with:
  - what changed,
  - what was verified,
  - next checkpoint,
  - blockers.
- Continue automatically unless a blocker requires user input.

## Validation commands

Create these scripts if they do not exist:

```bash
bash scripts/dev/bootstrap.sh
bash scripts/dev/check.sh
bash scripts/dev/run_fake_runtime.sh
bash scripts/dev/run_macos_app.sh
```

`check.sh` should run all available checks, such as:

```bash
cd web && yarn install --immutable || yarn install
cd web && yarn lint && yarn typecheck && yarn test
cd macos && bash Scripts/build_debug.sh
cd macos && bash Scripts/test_unit.sh
```

If a command cannot run because Xcode, Node, Yarn, or a DeepSeek-TUI binary is missing, write the exact prerequisite and do not mark the goal complete until fake-runtime checks still pass.

## Stop conditions

Stop only when one of these is true:

- All acceptance criteria pass with evidence.
- A required external prerequisite is missing and cannot be installed by Codex in this environment.
- A design contradiction is found; report the contradiction, attempted paths, evidence, and the smallest user decision needed.
- The budget or permission policy prevents further work; summarize progress and next actions.

Do not stop merely because one turn produced code. Keep checking, testing, and iterating until the evidence supports completion.
