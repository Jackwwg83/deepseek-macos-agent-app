# 用户旅程与使用流程

## 1. 总体用户旅程

```text
发现产品
  -> 打开 App
  -> 完成首次设置
  -> 选择项目
  -> 创建线程/任务
  -> 观察 Agent 执行
  -> 审批敏感操作
  -> Review 变更
  -> 应用/拒绝/继续迭代
  -> 查看成本与设置
```

## 2. Journey A：首次启动

### 用户目标

用户第一次打开 App，希望快速知道：这是什么、是否安全、如何连接 DeepSeek、是否可以先试用。

### 页面

`First Run Setup`

### 步骤

1. App 启动。
2. 如果没有配置，则显示 First Run Setup。
3. 用户看到三条说明：
   - Built for developers
   - Private by default
   - Fast with DeepSeek models
4. 用户选择：
   - 输入 DeepSeek API key；或
   - Enable Demo Mode。
5. 用户选择默认模型：`deepseek-v4-flash` 或 `deepseek-v4-pro`。
6. 用户选择 workspace folder。
7. App 做 runtime/sidecar 检查。
8. 点击 `Complete Setup`。
9. 进入 Project Command Center。

### 关键规则

- API key 输入必须是 App 内文本框，不允许触发系统登录钥匙串密码弹窗。
- 没有 API key 时，`Complete Setup` 仍可在 Demo Mode 下完成。
- Sidecar 未安装或不可用时，必须给出清楚解释和按钮：`Use Demo Mode`、`Choose Sidecar Binary`、`Retry`。

### 成功状态

```text
Setup complete
Mode: demo 或 real
Workspace selected
Default model selected
Runtime status visible
```

## 3. Journey B：打开项目首页

### 用户目标

用户选择项目后，希望了解这个项目最近有哪些任务、线程、变更、runtime 是否可用。

### 页面

`Project Command Center`

### 步骤

1. 左侧选择项目。
2. 中间显示项目总览：active tasks、agent runs、tests、last sync。
3. 显示 suggested prompts。
4. 右侧显示 runtime 状态、quick actions、top changed files。
5. 用户可以点击：
   - New thread
   - Run tests
   - View diffs
   - Open in IDE
   - Project settings

### 空状态

如果没有历史任务：

```text
No agent runs yet.
Start with a suggested prompt or create a new thread.
```

## 4. Journey C：创建新 Thread

### 用户目标

用户想让 Agent 完成一个具体任务。

### 页面

`Active Thread`

### 步骤

1. 点击 `New thread`。
2. App 创建新 thread。
3. 中间标题显示 `New chat`。
4. Composer 聚焦。
5. 用户输入任务，例如：
   - “帮我检查这个项目的登录流程”
   - “实现搜索过滤功能，并跑测试”
   - “解释这个仓库的架构”
6. 点击 Send 或按快捷键。
7. App 发起 runtime turn。

### 规则

- `New thread` 必须永远可点击。
- 如果 runtime 不可用：
  - Demo Mode 下用 fake runtime；
  - Real Mode 下显示 `Runtime unavailable`，并提供 `Retry` / `Switch to Demo Mode`。
- Prompt 为空时 Send disabled。

## 5. Journey D：Agent 执行中

### 用户目标

用户希望知道 Agent 正在做什么，并能在危险操作前做决定。

### 页面

`Active Thread`

### 事件显示顺序

```text
User message
Agent planning / response
Tool call card
Approval card if needed
Terminal card
File changes card
Test evidence card
Review summary
```

### 用户动作

- `Stop`：中断 turn。
- `Approve`：允许一次工具调用。
- `Deny`：拒绝工具调用。
- `Ask follow-up`：追加输入。
- `View details`：展开工具输出。

### 规则

- Streaming 不应该导致输入框卡顿。
- 工具执行状态必须明确：queued / running / waiting approval / completed / failed。
- Approval 必须说明：工具名、命令或文件、风险、作用范围。

## 6. Journey E：审批敏感操作

### 用户目标

用户要决定是否允许 Agent 执行 shell、写文件、访问网络或调用 MCP 工具。

### 页面元素

`Approval Card`

### 必须展示

- 操作类型：shell / file write / network / MCP / apply patch
- 目标：命令、文件路径、URL、工具名
- 当前工作目录
- 预估风险：low / medium / high
- 按钮：Allow once / Deny / Stop task

### 禁止

- 不允许只显示 “Approve?”。
- 不允许默认选择允许。
- 不允许隐藏命令内容。

## 7. Journey F：Review 变更

### 用户目标

用户想知道 Agent 改了什么，并决定是否应用。

### 页面

`Review Changes`

### 步骤

1. 用户点击 `Review changes` 或 `Open diff`。
2. 页面显示 changed files queue。
3. 用户选择文件。
4. 中间显示 diff。
5. 右侧显示 review queue 和 actions。
6. 用户选择：
   - Apply selected
   - Reject selected
   - Request more tests
   - Open in editor
   - Commit selected

### 空状态

没有变更时：

```text
No generated changes yet.
Start an agent turn or ask DeepSeek to modify code.
```

### 规则

- 没有文件时 `Apply selected`、`Reject selected`、`Commit` disabled。
- Commit 0 files 不允许是蓝色主按钮。
- Selected file 为空时显示空状态，不显示假 diff。

## 8. Journey G：Settings & Usage

### 用户目标

用户想配置 API key、默认模型、偏好、查看成本和 runtime。

### 页面

`Settings & Usage`

### 必须可操作

- API key 保存 / 更新 / 删除
- 默认模型切换
- Reasoning effort 切换
- Auto-apply safe edits 开关
- Confirm destructive actions 开关
- App Appearance light/dark/system
- Runtime diagnostics
- Usage overview

### 规则

- API key 必须隐藏。
- 点击 Manage account 不应该什么都不做；未实现时 disabled 或显示 “Coming soon”。
- Runtime 不可用时右侧状态必须显示原因。

## 9. Journey H：Demo Mode

### 用户目标

用户没有 API key，也想试试 App。

### 体验

Demo Mode 必须能完整跑通：

```text
New thread
  -> send prompt
  -> fake agent response
  -> fake changed files
  -> fake review queue
  -> fake apply/reject
  -> fake settings usage
```

### 规则

- Demo Mode 的内容必须清楚标记为 Demo。
- 不允许偷偷发真实 API 请求。
- Demo Mode 不需要 DeepSeek API key。

## 10. Journey I：Runtime 故障

### 常见故障

- sidecar missing
- sidecar version incompatible
- port occupied
- auth token mismatch
- DeepSeek API key missing
- DeepSeek API unreachable
- runtime crashed

### 用户体验

右侧 Runtime 状态卡展示：

```text
Runtime unavailable
Reason: sidecar process exited
Actions: Restart runtime / Switch to Demo / View logs
```

不要只显示 “failed”。
