# 12 — Acceptance Checklist

Codex should not mark the goal complete until this checklist is satisfied or each unsatisfied item has a precise blocker.

## Repository and scripts

- [x] `macos/` app project exists.
- [x] `web/` embedded UI project exists.
- [x] `scripts/dev/bootstrap.sh` exists.
- [x] `scripts/dev/check.sh` exists.
- [x] `scripts/dev/run_fake_runtime.sh` exists.
- [x] `scripts/dev/run_macos_app.sh` exists.
- [x] `docs/PROGRESS.md` exists and is updated.

## Native app

- [x] App builds in unsigned debug mode.
- [x] App packages as a macOS `.app` bundle.
- [x] App opens a main window.
- [x] App loads embedded chat UI.
- [x] App has settings for DeepSeek URL, API key, and model.
- [x] App can start real runtime from in-app settings without terminal env vars.
- [x] App has sidecar status display.
- [x] App stores API key in Keychain or clearly uses fake/dev mode.

## Web UI

- [x] Thread list renders.
- [x] Active thread timeline renders.
- [x] Composer sends a prompt.
- [x] Assistant message streams.
- [x] Tool card renders.
- [x] Approval card/modal renders.
- [x] Usage/cost footer renders.
- [x] Disconnected/error state renders.

## Runtime

- [x] Fake runtime mode works without external credentials.
- [x] Sidecar manager can discover binary from `DEEPSEEK_TUI_BIN`.
- [x] Sidecar manager can discover bundled sidecar binary from app resources.
- [x] Sidecar manager starts runtime on loopback.
- [x] Sidecar manager uses random token.
- [x] Runtime adapter calls `/health` and `/v1/runtime/info`.
- [x] Runtime adapter can create/list/get threads.
- [x] Runtime adapter can start a turn.
- [x] Runtime adapter can subscribe to events with `since_seq`.
- [x] Runtime adapter can send approval decision.
- [x] Runtime adapter can interrupt a turn.
- [x] Runtime adapter can query usage.

## Security

- [x] DeepSeek API key is not committed.
- [x] Runtime token is not committed.
- [x] API key is not passed through command-line arguments.
- [x] API key is not written into tester package files.
- [x] WebView production code does not store runtime bearer token.
- [x] Logs redact secrets.
- [x] Sidecar binds to `127.0.0.1`.

## Tests and checks

- [x] Web lint passes or blocker documented.
- [x] Web typecheck passes or blocker documented.
- [x] Web tests pass or blocker documented.
- [x] Swift build passes or blocker documented.
- [x] Swift tests pass or blocker documented.
- [x] Fake runtime smoke test passes.
- [x] Real runtime smoke test is documented.
- [x] Real runtime model-turn smoke passes with a valid third-party HTTPS endpoint.
- [x] Tester alpha package builds.
- [x] Tester alpha package verification passes.

## Documentation

- [x] README explains setup.
- [x] Settings/onboarding explains DeepSeek API key.
- [x] Tester delivery instructions explain URL/key/model-only setup.
- [x] Sidecar binary discovery is documented.
- [x] Known limitations are documented.
- [x] License notice plan is documented.
