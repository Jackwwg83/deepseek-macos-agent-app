# 08 — Upstream Compatibility Strategy

## Core principle

Stay compatible by depending on DeepSeek-TUI as a sidecar binary and a small Runtime API contract, not by forking its runtime internals.

## Why

The uploaded DeepSeek-TUI source shows that the true runtime currently lives in `crates/tui`, especially:

```text
crates/tui/src/runtime_api.rs
crates/tui/src/runtime_threads.rs
crates/tui/src/core/engine.rs
```

The current `crates/app-server` is not the right MVP integration point. The Runtime API is closer to the product needs because it already exposes threads, turns, events, approvals, skills, MCP, tasks, automations, and usage.

## Version policy

Maintain a support matrix:

```text
DeepSeek Agent App version | Supported DeepSeek-TUI versions | Notes
0.1.x                     | 0.8.36 tested                    | initial sidecar adapter
```

At app startup:

1. Call `/v1/runtime/info`.
2. Read `version` and `auth_required`.
3. Validate version against support matrix.
4. If unknown, allow user to continue with warning and run capability probes.

## Capability probes

Do not rely only on version strings. Probe:

- `/health`
- `/v1/runtime/info`
- `/v1/threads`
- `POST /v1/threads` with fake/minimal request if safe
- `/v1/usage`
- SSE support on `/v1/threads/{id}/events`

## Adapter isolation

Keep all raw endpoint names and payload quirks in one module:

```text
macos/.../Runtime/DeepSeekTuiRuntimeClient.swift
web/src/runtime/types.ts
web/src/runtime/normalizers.ts
```

If upstream changes, edit these files first.

## Contract snapshots

Store JSON fixtures:

```text
web/src/test/fixtures/runtime/
  health.json
  runtime_info.json
  thread_record.json
  turn_record.json
  events_sse.txt
  usage.json
```

Tests should validate that fixtures normalize into stable UI models.

## Recommended upstream PRs

After MVP is validated, propose small upstream PRs to DeepSeek-TUI instead of maintaining a fork:

1. Add machine-readable Runtime API schema.
2. Add `/v1/runtime/capabilities`.
3. Stabilize event names and payload docs.
4. Add explicit `approval.resolved` event if missing.
5. Add diff/workspace status endpoint suitable for GUI review.
6. Add a `--print-runtime-json` startup option that prints URL/token/version to stdout as JSON for sidecar managers.
7. Add integration tests for `serve --http` sidecar mode.

## Avoid fork pressure

Do not modify DeepSeek-TUI unless:

- the GUI cannot function through public Runtime API,
- the change is small and likely acceptable upstream,
- the change is isolated and documented.

If a local patch is unavoidable:

```text
third_party_patches/deepseek-tui/<version>/<patch>.diff
```

Document:

- why it exists,
- upstream issue/PR link,
- how to remove it.

## Binary update strategy

MVP:

- User supplies binary path.
- App shows tested version warning.

Alpha:

- Bundle a known good binary.
- Let user override with local binary.

Release:

- Ship bundled tested binary.
- Add update checker later.
- Verify checksums for downloaded sidecars if auto-download is added.
