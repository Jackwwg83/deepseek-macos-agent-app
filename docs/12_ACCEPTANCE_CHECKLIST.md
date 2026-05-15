# 12 — Acceptance Checklist

Codex should not mark the goal complete until this checklist is satisfied or each unsatisfied item has a precise blocker.

## Repository and scripts

- [ ] `macos/` app project exists.
- [ ] `web/` embedded UI project exists.
- [ ] `scripts/dev/bootstrap.sh` exists.
- [ ] `scripts/dev/check.sh` exists.
- [ ] `scripts/dev/run_fake_runtime.sh` exists.
- [ ] `scripts/dev/run_macos_app.sh` exists.
- [ ] `docs/PROGRESS.md` exists and is updated.

## Native app

- [ ] App builds in unsigned debug mode.
- [ ] App opens a main window.
- [ ] App loads embedded chat UI.
- [ ] App has settings or onboarding for DeepSeek API key and sidecar path.
- [ ] App has sidecar status display.
- [ ] App stores API key in Keychain or clearly uses fake/dev mode.

## Web UI

- [ ] Thread list renders.
- [ ] Active thread timeline renders.
- [ ] Composer sends a prompt.
- [ ] Assistant message streams.
- [ ] Tool card renders.
- [ ] Approval card/modal renders.
- [ ] Usage/cost footer renders.
- [ ] Disconnected/error state renders.

## Runtime

- [ ] Fake runtime mode works without external credentials.
- [ ] Sidecar manager can discover binary from `DEEPSEEK_TUI_BIN`.
- [ ] Sidecar manager starts runtime on loopback.
- [ ] Sidecar manager uses random token.
- [ ] Runtime adapter calls `/health` and `/v1/runtime/info`.
- [ ] Runtime adapter can create/list/get threads.
- [ ] Runtime adapter can start a turn.
- [ ] Runtime adapter can subscribe to events with `since_seq`.
- [ ] Runtime adapter can send approval decision.
- [ ] Runtime adapter can interrupt a turn.
- [ ] Runtime adapter can query usage.

## Security

- [ ] DeepSeek API key is not committed.
- [ ] Runtime token is not committed.
- [ ] API key is not passed through command-line arguments.
- [ ] WebView production code does not store runtime bearer token.
- [ ] Logs redact secrets.
- [ ] Sidecar binds to `127.0.0.1`.

## Tests and checks

- [ ] Web lint passes or blocker documented.
- [ ] Web typecheck passes or blocker documented.
- [ ] Web tests pass or blocker documented.
- [ ] Swift build passes or blocker documented.
- [ ] Swift tests pass or blocker documented.
- [ ] Fake runtime smoke test passes.
- [ ] Real runtime smoke test is documented.

## Documentation

- [ ] README explains setup.
- [ ] Settings/onboarding explains DeepSeek API key.
- [ ] Sidecar binary discovery is documented.
- [ ] Known limitations are documented.
- [ ] License notice plan is documented.
