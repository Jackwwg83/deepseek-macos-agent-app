# 03 — Runtime Adapter Contract

## Current DeepSeek-TUI source facts

The uploaded DeepSeek-TUI source contains a local Runtime HTTP/SSE API in:

```text
crates/tui/src/runtime_api.rs
```

It exposes endpoints for sessions, workspace status, streaming, threads, turns, approvals, tasks, skills, MCP tools, automations, and usage. The durable runtime records are in:

```text
crates/tui/src/runtime_threads.rs
```

Key record types found in the uploaded source:

```text
ThreadRecord
TurnRecord
TurnItemRecord
RuntimeEventRecord
RuntimeTurnStatus
TurnItemKind
TurnItemLifecycleStatus
ExternalApprovalDecision
UsageGroupBy
```

Important event strings observed in the source include:

```text
thread.started
thread.updated
thread.forked
turn.started
turn.steered
turn.interrupt_requested
turn.completed
item.started
item.delta
item.completed
item.failed
item.interrupted
approval.required
approval.decided
approval.timeout
compaction.completed
coherence.state
```

## Adapter principle

The GUI should depend on a narrow typed adapter, not raw sidecar endpoints. Put all DeepSeek-TUI API specifics behind this interface.

### Swift protocol

```swift
protocol AgentRuntimeClient {
    func health() async throws -> RuntimeHealth
    func runtimeInfo() async throws -> RuntimeInfo
    func listThreads(limit: Int?, includeArchived: Bool) async throws -> [RuntimeThread]
    func createThread(_ request: CreateThreadRequest) async throws -> RuntimeThread
    func getThread(_ id: String) async throws -> ThreadDetail
    func startTurn(threadId: String, request: StartTurnRequest) async throws -> StartTurnResponse
    func interruptTurn(threadId: String, turnId: String) async throws -> RuntimeTurn
    func steerTurn(threadId: String, turnId: String, message: String) async throws -> RuntimeTurn
    func respondApproval(approvalId: String, decision: ApprovalDecision) async throws -> ApprovalResponse
    func usage(query: UsageQuery) async throws -> UsageAggregation
    func subscribeEvents(threadId: String, sinceSeq: UInt64?) -> AsyncThrowingStream<RuntimeEvent, Error>
}
```

### TypeScript bridge interface

```ts
export interface AgentBridge {
  health(): Promise<RuntimeHealth>;
  runtimeInfo(): Promise<RuntimeInfo>;
  listThreads(query?: ListThreadsQuery): Promise<RuntimeThread[]>;
  createThread(req: CreateThreadRequest): Promise<RuntimeThread>;
  getThread(id: string): Promise<ThreadDetail>;
  startTurn(threadId: string, req: StartTurnRequest): Promise<StartTurnResponse>;
  interruptTurn(threadId: string, turnId: string): Promise<RuntimeTurn>;
  steerTurn(threadId: string, turnId: string, message: string): Promise<RuntimeTurn>;
  respondApproval(approvalId: string, decision: ApprovalDecision): Promise<ApprovalResponse>;
  getUsage(query?: UsageQuery): Promise<UsageAggregation>;
  subscribeEvents(threadId: string, sinceSeq?: number, onEvent: (event: RuntimeEvent) => void): () => void;
}
```

## Endpoint mapping

| Adapter method | Runtime API endpoint |
|---|---|
| `health` | `GET /health` |
| `runtimeInfo` | `GET /v1/runtime/info` |
| `listThreads` | `GET /v1/threads?limit=N&include_archived=BOOL` |
| `createThread` | `POST /v1/threads` |
| `getThread` | `GET /v1/threads/{id}` |
| `startTurn` | `POST /v1/threads/{id}/turns` |
| `interruptTurn` | `POST /v1/threads/{id}/turns/{turn_id}/interrupt` |
| `steerTurn` | `POST /v1/threads/{id}/turns/{turn_id}/steer` |
| `respondApproval` | `POST /v1/approvals/{approval_id}` |
| `usage` | `GET /v1/usage?group_by=day|model|provider|thread` |
| `subscribeEvents` | `GET /v1/threads/{id}/events?since_seq=N` via SSE |

## Authorization

Use bearer auth or `x-deepseek-runtime-token`, matching DeepSeek-TUI Runtime API behavior. Production should keep the token in Swift only.

Recommended headers:

```http
Authorization: Bearer <runtime_token>
Accept: application/json
```

For SSE:

```http
Authorization: Bearer <runtime_token>
Accept: text/event-stream
```

## Sidecar discovery

Search order:

1. `DEEPSEEK_TUI_BIN` environment variable.
2. User setting stored in app preferences.
3. Bundled app resource: `Contents/Resources/bin/deepseek-tui`.
4. `which deepseek-tui`.
5. `which deepseek`.

If not found, show onboarding with install instructions and fake runtime option.

## DeepSeek API key injection

The app stores `DEEPSEEK_API_KEY` in macOS Keychain. Sidecar receives it through environment variables at launch.

Do not pass the API key as a command-line argument.

## Dynamic port allocation

Use a local socket to find an available port, then start sidecar with that port. After launch, poll `/health` and `/v1/runtime/info` until ready.

If the port is occupied after launch, retry with a new port and a new token.

## Event normalization

Normalize all runtime events into UI card events:

| Runtime event | UI result |
|---|---|
| `thread.started` | Add/select thread. |
| `turn.started` | Create active turn state. |
| `item.started` | Create card placeholder. |
| `item.delta` | Append to card content. |
| `item.completed` | Mark card complete. |
| `item.failed` | Mark card failed with error. |
| `approval.required` | Show approval modal/card. |
| `approval.decided` | Close approval modal and update card. |
| `turn.completed` | Mark turn complete and refresh usage. |
| `turn.interrupt_requested` | Show stopping state. |

## Error handling

Render explicit recovery actions:

| Error | UI action |
|---|---|
| sidecar not found | Show binary path picker and install instructions. |
| no DeepSeek key | Open settings and allow fake runtime. |
| unauthorized | Restart sidecar with a fresh token. |
| SSE disconnected | Reconnect with `since_seq`. |
| event parse error | Show raw event in debug drawer and continue. |
| version unsupported | Show required/supported DeepSeek-TUI versions. |

## Contract tests

Add adapter contract tests that run against:

1. Fake runtime server.
2. Real sidecar when `DEEPSEEK_TUI_BIN` is set.

Minimum contract cases:

- health check,
- create thread,
- start fake turn,
- stream events with increasing `seq`,
- reconnect with `since_seq`,
- approval allow/deny,
- usage query.
