# 10 — Source Inventory

This document records the DeepSeek-TUI source details that shaped the app design.

## 2026-05-15 local implementation refresh

- Sibling repo inspected: `/Users/jackwu/projects/TUI-APP/DeepSeek-TUI`
- Local binary smoke-tested: `/Users/jackwu/projects/TUI-APP/DeepSeek-TUI/target/debug/deepseek-tui`
- Version from local binary: `deepseek-tui 0.8.37 (7c8c71eb03d8)`
- Confirmed sidecar command shape: `serve --http --host 127.0.0.1 --port <port> --auth-token <token>`
- Confirmed health endpoint under bearer auth: `GET /health` returned `{"status":"ok","service":"deepseek-runtime-api","mode":"local"}`

## Workspace

The uploaded `Cargo.toml` shows a Rust workspace with these crates:

```text
agent
app-server
cli
config
core
execpolicy
hooks
mcp
protocol
secrets
state
tools
tui
tui-core
```

The workspace version in the uploaded archive is `0.8.36`, Rust edition is `2024`, and rust-version is `1.88`.

## Runtime API

`crates/tui/src/runtime_api.rs` is the best current integration surface for a GUI. It defines local HTTP/SSE endpoints including:

```text
GET  /health
GET  /v1/runtime/info
GET  /v1/sessions
GET  /v1/workspace/status
POST /v1/stream
GET  /v1/threads
POST /v1/threads
GET  /v1/threads/summary
GET  /v1/threads/{id}
PATCH /v1/threads/{id}
POST /v1/threads/{id}/resume
POST /v1/threads/{id}/fork
POST /v1/threads/{id}/turns
POST /v1/threads/{id}/turns/{turn_id}/steer
POST /v1/threads/{id}/turns/{turn_id}/interrupt
POST /v1/threads/{id}/compact
GET  /v1/threads/{id}/events
POST /v1/approvals/{approval_id}
GET  /v1/tasks
POST /v1/tasks
GET  /v1/skills
POST /v1/skills/{name}
GET  /v1/apps/mcp/servers
GET  /v1/apps/mcp/tools
GET  /v1/automations
POST /v1/automations
GET  /v1/usage
```

## Runtime records

`crates/tui/src/runtime_threads.rs` includes durable records:

```text
ThreadRecord
TurnRecord
TurnItemRecord
RuntimeEventRecord
RuntimeStoreState
```

This is a strong fit for a GUI because events are replayable and have monotonically increasing `seq`.

## Engine

`crates/tui/src/core/engine.rs` contains the real agent engine and `EngineConfig`. It includes model, workspace, shell/trust settings, max steps, subagents, features, compaction, network policy, snapshots, LSP, runtime services, memory, goal objective, strict tool mode, workshop, and search settings.

This confirms the GUI should not reimplement runtime behavior.

## Engine event channel caveat

`EngineHandle` contains:

```text
rx_event: Arc<RwLock<mpsc::Receiver<Event>>>
```

This is a single-consumer channel wrapped in a lock, not a multi-client event bus. The GUI should therefore integrate through `RuntimeEventRecord` and Runtime API SSE, not raw engine events.

## CLI dispatcher

`crates/cli/src/lib.rs` delegates many commands to the TUI binary, including `doctor`, `models`, `sessions`, `exec`, `review`, `mcp`, `features`, and `serve`.

For the macOS app, call the runtime sidecar command directly rather than assuming the CLI crate is a stable app-server.

## Why not current `crates/app-server`

The uploaded source contains `crates/app-server`, but prior static review showed the more product-ready runtime lifecycle is in `crates/tui/src/runtime_api.rs` and `crates/tui/src/runtime_threads.rs`. For MVP, prefer `serve --http` sidecar.

## Design consequence

The app should be a sidecar GUI:

```text
Native app -> Runtime adapter -> DeepSeek-TUI Runtime API -> DeepSeek-TUI Engine
```

not:

```text
Native app -> DeepSeek API directly
Native app -> terminal output scraping
Native app -> current thin app-server crate
```
