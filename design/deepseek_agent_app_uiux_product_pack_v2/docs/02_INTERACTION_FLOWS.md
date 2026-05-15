# 02 — 产品交互流程

## 1. 首次启动流程

### 1.1 Happy path

```text
用户打开 App
  ↓
App 检查 sidecar binary 是否存在
  ↓
App 启动 deepseek-tui serve --http / fake runtime
  ↓
显示 First Run Setup
  ↓
用户输入 DeepSeek API Key
  ↓
保存到 macOS Keychain
  ↓
验证 DeepSeek connection
  ↓
选择默认模型：deepseek-v4-flash / deepseek-v4-pro
  ↓
选择 workspace folder
  ↓
Complete Setup
  ↓
进入 Project Command Center
```

### 1.2 没有 API key

```text
First Run Setup
  ↓
用户点击 Enable Demo Mode
  ↓
App 跳过真实 DeepSeek 验证
  ↓
进入 demo Project Command Center
  ↓
所有 thread/event/diff 使用 fake runtime
```

Demo Mode 必须明确显示 `DEMO` badge，避免用户误以为已连接真实 DeepSeek。

### 1.3 Sidecar 不可用

```text
Preflight fail
  ↓
显示 Sidecar not found / incompatible
  ↓
提供：Install sidecar / Choose binary / Continue in demo mode
```

## 2. 新建 Thread 流程

```text
用户点击 + New thread 或 ⌘N
  ↓
Composer sheet 打开
  ↓
选择项目：默认当前 project
  ↓
输入任务目标
  ↓
选择 mode：Plan / Agent
  ↓
选择模型：v4-flash / v4-pro
  ↓
Start
  ↓
创建 thread
  ↓
Active Thread 页面流式显示事件
```

### 2.1 New Thread Sheet 字段

- Project。
- Task prompt。
- Mode：Plan / Agent。
- Model：deepseek-v4-flash / deepseek-v4-pro。
- Optional：Attach files。
- Optional：Start with review required。

### 2.2 快捷键

- `⌘N`：New thread。
- `⌘↩`：Start thread。
- `Esc`：关闭 sheet。

## 3. Active Thread 流程

### 3.1 Agent 正在运行

Timeline 显示：

1. User message。
2. Agent planning / summary。
3. Tool cards：read/search/shell/apply_patch。
4. Streaming terminal output。
5. Usage/cost footer 更新。

可用动作：

- Stop。
- Steer / Add instruction。
- Open logs。
- Collapse tool output。

### 3.2 Agent 请求审批

```text
Runtime emits approval.required
  ↓
Timeline 插入 Approval Card
  ↓
Right Inspector 显示 pending approval
  ↓
用户选择 Allow once / Deny / Stop / Comment
  ↓
App 调用 Runtime Adapter respondApproval
  ↓
Timeline 更新 approval.resolved
```

Approval Card 必须包含：

- 工具名。
- 命令/文件/网络目标。
- 影响范围。
- 风险说明。
- 为什么 agent 需要这个动作。

### 3.3 Agent 完成并产生变更

```text
Turn completed
  ↓
Thread status = Review ready
  ↓
右侧显示 changed files + tests passed/failed
  ↓
用户点击 Review
  ↓
进入 Review Changes
```

## 4. Review Changes 流程

### 4.1 Review 单文件

```text
打开 Review Changes
  ↓
默认选中第一个 Needs review 文件
  ↓
查看 diff + impact + risk + test evidence
  ↓
选择 Reviewed / Reject / Ask DeepSeek
```

### 4.2 Apply selected

```text
用户勾选文件
  ↓
点击 Apply selected
  ↓
确认 summary
  ↓
Runtime/apply patch 或保留已修改工作区
  ↓
状态改为 Applied
```

### 4.3 Request more tests

```text
用户点击 Request more tests
  ↓
生成新 turn：Run tests for selected changes and explain failures
  ↓
返回 Active Thread
  ↓
测试结果更新 review evidence
```

### 4.4 Commit

第一版可以不实际 git commit，但 UI 需要设计：

```text
输入 commit message
  ↓
选择 branch
  ↓
Commit N files
  ↓
执行 git commit / 或打开确认流程
```

如果未接入 git，按钮应为 disabled，并提示：`Git commit support will be available after project git integration is enabled.`

## 5. Settings & Usage 流程

### 5.1 修改模型默认值

```text
Settings & Usage
  ↓
Model Defaults
  ↓
选择 deepseek-v4-flash / deepseek-v4-pro
  ↓
保存为新线程默认值
  ↓
不影响已运行 thread，除非用户显式切换
```

### 5.2 Rotate API Key

```text
Rotate key
  ↓
输入新 key
  ↓
验证 DeepSeek connection
  ↓
保存到 Keychain
  ↓
Runtime reload config
```

### 5.3 Runtime diagnostics

```text
Run diagnostics
  ↓
检查 sidecar process、port、auth token、version、runtime /health
  ↓
显示结果
  ↓
可 View logs / Restart runtime / Copy report
```

## 6. Empty states

| 场景 | 文案 | CTA |
|---|---|---|
| 没有项目 | `Choose a folder to start working with DeepSeek Agent.` | Choose workspace |
| 没有 thread | `Start your first agent thread.` | New thread |
| 没有 review | `No changes waiting for review.` | Open project |
| 没有 API key | `Connect DeepSeek to run real agent tasks.` | Add API key / Demo mode |
| runtime offline | `Local runtime is offline.` | Restart / View logs |

## 7. Error states

### 7.1 DeepSeek API 错误

显示方式：

- Timeline Error Card。
- Right Runtime status amber/red。
- 提供 retry。

文案：

```text
DeepSeek could not complete this turn.
Reason: rate limit / invalid key / network timeout.
```

### 7.2 SSE 断开

```text
Lost connection to local runtime. Reconnecting…
```

UI 应继续保留已有 thread 内容，不清空页面。

### 7.3 Runtime version mismatch

```text
This sidecar version is not fully compatible with the app.
App supports 0.8.37–0.8.x. Detected 0.8.21.
```

动作：Update sidecar / Continue with limited support / Demo mode。

