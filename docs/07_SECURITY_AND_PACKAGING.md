# 07 — Security and Packaging

## Security stance

This app controls a local coding agent that can read files, run tools, and request shell/file/network actions. Treat the sidecar as powerful local software.

## Defaults

- Bind sidecar to `127.0.0.1` only.
- Generate a fresh high-entropy bearer token per sidecar launch.
- Keep token in Swift; do not expose it to WebView JavaScript in production.
- Store DeepSeek API key in macOS Keychain.
- Launch sidecar with API key via environment variable, not command-line argument.
- Default mode should be Agent with approvals, not YOLO/trust mode.
- Fake runtime mode must be clearly labeled.

## Sensitive areas

- DeepSeek API key.
- Runtime bearer token.
- Sidecar logs.
- Approval decisions.
- Shell command previews.
- File diffs and paths.
- WebView bridge messages.
- App signing and release scripts.

## WebView bridge policy

- Validate every message from WebView.
- Reject unknown method names.
- Bound payload size.
- Redact secrets before sending logs/events to WebView.
- Use a typed schema shared between Swift and TypeScript where practical.

## Sidecar process policy

- Sidecar path must be user-approved or bundled.
- Show the resolved sidecar binary path in diagnostics.
- Verify executable bit.
- For bundled release, document checksum or signature strategy.
- Stop sidecar on app termination.
- Restart only after explicit user action or safe automatic retry.

## Approval UI policy

Every approval card should show:

- action type,
- tool name,
- path or command,
- cwd,
- expected side effect,
- allow/deny controls,
- remember flag only if runtime supports it.

Dangerous actions should require explicit confirmation.

## Keychain storage

Store:

- DeepSeek API key.
- Optional user-selected sidecar binary path can be stored in app preferences, not Keychain.
- Runtime token should be memory-only per launch.

## Logs

Redact:

- API keys,
- bearer tokens,
- `Authorization` headers,
- environment variables containing `KEY`, `TOKEN`, `SECRET`, `PASSWORD`,
- paths under sensitive user directories when not necessary.

## Licensing

DeepSeek-TUI is MIT licensed in the uploaded source. OpenBridge is also MIT licensed, but this project does not copy OpenBridge code. The tester alpha bundles a DeepSeek-TUI binary and therefore must:

- Include its license notice.
- Document exact version.
- Provide source link.
- Preserve notices for any copied/modified files.

Codex/OpenAI product names are references only. Do not use OpenAI/Codex branding in the app name or UI in a way that implies affiliation.

## Packaging stages

### Debug

- Unsigned debug app.
- User points to local sidecar binary.
- Fake runtime supported.

### Internal alpha

- Bundle sidecar binary in `Contents/Resources/bin`.
- Show sidecar version.
- Include license notices.
- Not notarized unless needed.
- Publish zip and checksum as GitHub Release assets.

### Public release

- Code sign app.
- Code sign bundled sidecar.
- Notarize app.
- Hardened runtime.
- Sparkle or equivalent updater if desired.
- Checksums and release notes.

## Threat scenarios

| Scenario | Mitigation |
|---|---|
| Malicious webpage tries to call sidecar | Sidecar bound to loopback, token required, token not in JS production state. |
| WebView message injection | Strict method schema and payload validation. |
| API key leakage through process list | Pass key via environment, not argv; redact logs. |
| Sidecar exposed on LAN | Never bind non-loopback in app-managed mode. |
| User approves risky shell command | Clear preview and explicit approval UX. |
| Upstream API changes break UI silently | Capability/version checks and contract tests. |
