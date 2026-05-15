# 06 — UI 与 DeepSeek-TUI Runtime Adapter 映射

## 1. 架构原则

第一版以 DeepSeek-TUI 为 runtime 核心，macOS App 不实现 agent loop。

```text
SwiftUI/AppKit shell
  ├─ Keychain / settings / sidecar process
  ├─ WKWebView / React UI
  └─ RuntimeAdapter
       ├─ FakeRuntimeAdapter for demo/tests
       └─ DeepSeekTuiRuntimeAdapter over HTTP/SSE
            └─ deepseek-tui serve --http
```

## 2. App 不应该做的事

- 不直接调用 DeepSeek Chat API 完成 agent turn。
- 不自己执行 shell/file/git/MCP 工具。
- 不解析终端屏幕输出。
- 不依赖 DeepSeek-TUI 内部 Rust 源码结构。
- 不把 API key 暴露给 WebView。

## 3. Runtime Adapter Interface

建议 Swift/TypeScript 两侧都保持同一抽象：

```ts
interface RuntimeAdapter {
  getRuntimeInfo(): Promise<RuntimeInfo>;
  listThreads(): Promise<ThreadSummary[]>;
  createThread(request: CreateThreadRequest): Promise<ThreadRecord>;
  getThread(threadId: string): Promise<ThreadDetail>;
  startTurn(threadId: string, request: StartTurnRequest): Promise<TurnRecord>;
  steerTurn(threadId: string, turnId: string, message: string): Promise<void>;
  interruptTurn(threadId: string, turnId: string): Promise<void>;
  respondApproval(approvalId: string, decision: ApprovalDecision): Promise<void>;
  subscribeEvents(threadId: string, sinceSeq?: number): RuntimeEventStream;
  getUsage(range: UsageRange): Promise<UsageSummary>;
  getWorkspaceStatus(projectId: string): Promise<WorkspaceStatus>;
}
```

## 4. DeepSeek-TUI Runtime API 映射

| UI 动作 | Adapter 方法 | 预期 Runtime API |
|---|---|---|
| Runtime health | `getRuntimeInfo` | `GET /health`, `GET /v1/runtime/info` |
| Thread list | `listThreads` | `GET /v1/threads` |
| Create thread | `createThread` | `POST /v1/threads` |
| Open thread | `getThread` | `GET /v1/threads/{id}` |
| Start turn | `startTurn` | `POST /v1/threads/{id}/turns` |
| Steer | `steerTurn` | `POST /v1/threads/{id}/turns/{turn_id}/steer` |
| Interrupt | `interruptTurn` | `POST /v1/threads/{id}/turns/{turn_id}/interrupt` |
| Approval response | `respondApproval` | `POST /v1/approvals/{approval_id}` |
| Event stream | `subscribeEvents` | `GET /v1/threads/{id}/events?since_seq=` 或 SSE |
| Usage | `getUsage` | `GET /v1/usage` |
| Workspace status | `getWorkspaceStatus` | `GET /v1/workspace/status` |

## 5. RuntimeEvent → UI Card 映射

| Event kind | UI card |
|---|---|
| `thread.created` | Thread appears in sidebar |
| `turn.started` | Running badge + timeline start |
| `item.agent_message.delta` | Agent response streaming |
| `item.command.started` | Terminal card begins |
| `item.command.output_delta` | Terminal output append |
| `item.command.completed` | Terminal status update |
| `item.file_change.started` | Files changed card begins |
| `item.file_change.patch` | Diff card update |
| `approval.required` | Approval card + inspector pending |
| `approval.resolved` | Approval card resolved |
| `usage.updated` | Usage footer/right panel update |
| `turn.completed` | Thread status update |
| `turn.failed` | Error card |

实际事件名称以 DeepSeek-TUI 当前 runtime API 为准；App 内部应做 `normalizeRuntimeEvent`，避免 UI 直接耦合上游字段。

## 6. Fake Runtime

Fake Runtime 是必须的，不是临时 hack。

用途：

- 无 API key 时演示完整 UI。
- Codex 开发时快速验收。
- Snapshot tests。
- Runtime API 变更时隔离 UI 回归。

Fake Runtime 应能模拟：

- list/create thread。
- streaming agent message。
- terminal/test output。
- file changes。
- approval required/resolved。
- review queue。
- usage/cost。
- runtime offline/reconnect。

## 7. Sidecar 生命周期

### 7.1 启动

```text
App launch
  ↓
find bundled sidecar or configured path
  ↓
choose random localhost port
  ↓
generate bearer token
  ↓
spawn deepseek-tui serve --http --host 127.0.0.1 --port <port>
  ↓
wait /health
  ↓
RuntimeInfo healthy
```

### 7.2 安全

- 只绑定 `127.0.0.1`。
- 使用随机 bearer token。
- WebView 不直接持有 token；由 native bridge 代理请求。
- API key 存 Keychain，不能进入 React localStorage。
- Runtime logs 不能泄漏 API key。

### 7.3 退出

- App quit 时尝试优雅停止 sidecar。
- 若 sidecar 是用户手动指定的外部进程，不强杀，只断开连接。

## 8. Version compatibility

App 应维护支持矩阵：

```text
supportedRuntimeVersions: ">=0.8.37 <0.9.0"
```

若版本未知：

- 可进入 limited mode。
- UI 显示 warning。
- 关闭不兼容功能，如 review apply / usage cache。

## 9. Adapter 错误模型

```ts
type RuntimeError =
  | { type: 'offline'; message: string }
  | { type: 'version_mismatch'; detected: string; supported: string }
  | { type: 'auth_failed'; message: string }
  | { type: 'deepseek_api_error'; code?: string; message: string }
  | { type: 'thread_not_found'; threadId: string }
  | { type: 'event_stream_failed'; retryAfterMs?: number }
  | { type: 'unknown'; message: string };
```

UI 不应直接显示 raw JSON，除非用户打开 Diagnostics。

