# 02 — Architecture

## Architecture summary

The app is a macOS native shell that embeds a React chat surface and controls a DeepSeek-TUI sidecar.

```text
┌──────────────────────────────────────────────────────┐
│ macOS App                                            │
│  SwiftUI/AppKit shell                                │
│  ├─ Project picker                                   │
│  ├─ Settings / Keychain                              │
│  ├─ Sidecar process manager                          │
│  ├─ Runtime bridge                                   │
│  └─ WKWebView                                        │
│       └─ React chat UI                               │
└──────────────────────┬───────────────────────────────┘
                       │ local HTTP/SSE, Swift-owned token
┌──────────────────────▼───────────────────────────────┐
│ DeepSeek-TUI sidecar                                  │
│  deepseek-tui serve --http                            │
│  ├─ RuntimeThreadManager                              │
│  ├─ Thread / Turn / Item / RuntimeEventRecord         │
│  ├─ Engine                                            │
│  ├─ Tools / approvals / sessions / usage              │
│  └─ DeepSeek API                                      │
└──────────────────────────────────────────────────────┘
```

## Why SwiftUI/AppKit + WKWebView

OpenBridge uses a native macOS shell with embedded React surfaces: the native layer owns app state, settings, sessions, provider credentials, and WebKit bridge; the web layer renders chat and previews. This mirrors what we need, except our runtime is DeepSeek-TUI instead of KWWK.

Because this product is macOS-only, SwiftUI/AppKit is a better first target than Tauri. Tauri remains a possible future path only if cross-platform becomes important.

## Ownership boundaries

| Component | Owns | Must not own |
|---|---|---|
| Swift app shell | Windowing, project picker, settings, Keychain, sidecar process, native bridge, app lifecycle | Agent loop, prompt assembly, tool execution |
| React WebView | Chat rendering, cards, UI state, optimistic input state | DeepSeek API key, sidecar token in production, direct filesystem mutation |
| Runtime bridge | Typed command/event API between web and native | Business logic that belongs in UI or runtime |
| Sidecar manager | Locate/start/stop/restart DeepSeek-TUI; health checks; logs | Model/tool semantics |
| DeepSeek-TUI sidecar | Threads, turns, items, events, engine, tools, approvals, usage | macOS UI product state |

## Runtime sidecar command

Preferred command shape:

```bash
DEEPSEEK_API_KEY=... /path/to/deepseek-tui serve --http   --host 127.0.0.1   --port <dynamic_port>   --auth-token <random_high_entropy_token>   --cors-origin http://localhost:3000
```

The exact CLI flags should be verified against the local DeepSeek-TUI version. If the dispatcher binary is `deepseek` instead of `deepseek-tui`, support both.

## Native bridge model

Production:

```text
React -> WKScriptMessageHandler -> Swift RuntimeBridge -> URLSession/SSE -> sidecar
```

Development:

```text
React dev server -> direct fake runtime or Swift bridge, depending on mode
```

Production bridge advantages:

- Runtime bearer token stays in Swift.
- CORS is simplified.
- Native layer can redact logs.
- Native layer can restart sidecar and replay events.
- Native layer can enforce app-level safety prompts before dangerous actions.

## Thread/session model

Use DeepSeek-TUI runtime records as canonical runtime state:

```text
ThreadRecord  -> project conversation/session
TurnRecord    -> one user prompt and agent response loop
TurnItemRecord -> message/tool/file/command/status card
RuntimeEventRecord(seq, event, payload) -> replayable UI updates
```

The GUI should not invent a separate canonical thread model. It may normalize data into UI view models, but the runtime IDs must remain traceable.

## Event flow

```text
User sends prompt
  -> React calls bridge.startTurn(threadId, input)
  -> Swift POST /v1/threads/{id}/turns
  -> sidecar starts Engine turn
  -> Swift subscribes/reuses SSE /v1/threads/{id}/events?since_seq=N
  -> RuntimeEventRecord arrives
  -> Swift forwards sanitized event to React
  -> React updates cards
```

## Reconnect and replay

Each active thread should track `lastSeq`. On reconnect:

```text
GET /v1/threads/{id}/events?since_seq=<lastSeq>
```

The UI must de-duplicate by `seq`.

## Fake runtime mode

Fake runtime is mandatory for Codex-driven development and CI because it allows testing without DeepSeek credentials or a sidecar binary.

Fake runtime should implement the same bridge interface and simulate:

- thread list,
- thread create,
- start turn,
- streaming message delta,
- tool call card,
- approval required,
- approval resolved,
- usage update,
- turn completed.

## Future app-server option

Do not implement JSON-RPC app-server in the MVP. Codex app-server is useful as a reference for future bidirectional protocol design, but the DeepSeek-TUI Runtime API already exposes enough thread/turn/event functionality for a first app.

Future migration path:

```text
HTTP/SSE adapter -> typed bridge -> optional WebSocket/JSON-RPC adapter
```
