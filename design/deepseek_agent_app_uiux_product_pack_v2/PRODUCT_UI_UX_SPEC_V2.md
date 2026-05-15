# DeepSeek Agent macOS App — 产品与 UI/UX 设计规格 v2

## 1. 这版要解决什么问题

上一版 Codex 生成的界面主要是一个“连接调试页”：URL、API Key、模型、Runtime 状态常驻左侧，中央没有真正的工作流，右侧只是重复状态。它证明了 sidecar 可以跑，但不是一个可发布的 agent app。

v2 的目标是把产品心智从：

```text
连接 DeepSeek → 发一条消息
```

升级为：

```text
选择项目 → 启动 agent thread → 监督执行 → 审批风险动作 → Review diff/test evidence → Apply/Commit → 追踪成本与 runtime
```

因此，连接配置不再是主界面；主界面应该是 **Agent Command Center**。

---

## 2. 产品定位

### 一句话定位

**DeepSeek Agent 是一个 macOS 本地 coding-agent 工作台，以 DeepSeek-TUI 为 runtime 核心，让开发者用 DeepSeek 模型管理项目任务、审批 agent 动作、审查代码变更、追踪 token/缓存/成本。**

### 产品关键词

- macOS-native
- DeepSeek-only
- Local-first
- Human-in-control
- Review-first
- Runtime sidecar
- Codex App inspired, not copied

### 第一版非目标

第一版不做：

- 多 provider marketplace。
- 云端托管 agent。
- GitHub PR 全自动发布。
- OpenBridge VM sandbox。
- Swift/Rust FFI 嵌入 DeepSeek-TUI。
- 直接重构 DeepSeek-TUI runtime。
- 自己实现 LLM/tool loop。

---

## 3. 目标用户和核心场景

| 用户 | 核心场景 | App 必须满足的需求 |
|---|---|---|
| 个人 Mac 开发者 | 用 DeepSeek 低成本分析/修改本地项目 | 新建项目、发起线程、查看工具调用、review diff |
| 终端重度用户 | 想保留 TUI runtime 能力，但获得 GUI 审批和 diff | sidecar 稳定、runtime health、SSE reconnect、approval center |
| 预算敏感用户 | 想利用 DeepSeek V4 Flash/Pro、cache 成本优势 | usage/cost/cache dashboard、模型切换 |
| 代码 review 习惯强的用户 | 不希望 agent 直接污染项目 | changes queue、selected apply/reject、request tests |

---

## 4. 设计参考与取舍

### 4.1 参考 Codex App 的地方

- 三栏 command center：sidebar / main / inspector。
- Recent threads + Projects 同屏。
- Active thread 以“工作结果”呈现，而不是纯聊天。
- Review pane 常驻右侧，展示 changed files、test evidence、quick actions。
- 轻盈白色卡片、蓝紫渐变背景、精细 shadow、macOS chrome。
- New thread、Automations、Skills 等一级入口。

### 4.2 参考 OpenBridge 的地方

- macOS native shell + embedded web/React chat surface。
- App 层管理设置、Keychain、runtime 进程、菜单、窗口。
- Runtime 负责 agent loop，不让 UI 自己拼 prompt 或执行工具。
- Review workflow 是核心：用户看到变更证据后再 apply。

### 4.3 不照搬的地方

- 不 fork Codex/OpenBridge。
- 不复制 Codex 品牌、logo、命名。
- 不使用 OpenBridge 的 KWWK runtime。
- 不在第一版实现 VM sandbox。

---

## 5. 主窗口结构

v2 主窗口采用三栏结构：

```text
┌────────────────────────────────────────────────────────────────────┐
│ macOS titlebar / traffic lights / app title                         │
├─────────────────────┬────────────────────────────┬─────────────────┤
│ Left Navigation     │ Active Surface             │ Inspector       │
│ 320–360 px          │ flexible                   │ 320–380 px      │
│ translucent rail    │ white cards / thread       │ review/runtime  │
└─────────────────────┴────────────────────────────┴─────────────────┘
```

### 5.1 左侧导航 Left Navigation

左侧不是连接表单，而是项目和工作流入口：

- `New thread` 主按钮。
- `Automations`。
- `Skills`。
- `Recent threads`。
- `Projects` 文件夹树。
- 底部账号/设置入口。

视觉：半透明浅蓝白、轻微 blur、hover/selected 使用非常浅的蓝紫 selection，不使用黑色大栏，也不使用黄色按钮。

### 5.2 中央 Active Surface

中央区域根据当前模式切换：

| 页面 | 说明 |
|---|---|
| Project Command Center | 选中项目但未进入线程时的首页 |
| Active Thread | 正在执行或已完成的 agent thread |
| Review Changes | 对一个线程的变更进行 diff review |
| Settings & Usage | 设置、账号、runtime、成本 |
| First Run Setup | 首次启动配置 |

### 5.3 右侧 Inspector

右侧不是固定连接状态，而是与当前页面相关：

| 中央页面 | 右侧 Inspector |
|---|---|
| Active Thread | Review summary、changed files、quick actions、runtime |
| Project Command Center | Runtime、quick actions、top changed files、last commit |
| Review Changes | Review queue、selected file、apply/reject/commit |
| Settings & Usage | Account status、runtime health、connection、cost summary |
| First Run Setup | 可隐藏，设置页主面板足够 |

---

## 6. 关键页面

### 6.1 First Run Setup

目标：让用户 2–3 分钟内完成 DeepSeek-only 配置，并理解本地优先、安全边界。

步骤：

1. Connect to DeepSeek。
2. Enter DeepSeek API key，保存到 macOS Keychain。
3. Choose model：`deepseek-v4-flash` / `deepseek-v4-pro`。
4. Choose workspace folder。
5. Enable Demo Mode optional。

底部状态：

- Sidecar ready。
- Key stored securely。
- Runtime compatible。

完成按钮：`Complete Setup`。

### 6.2 Project Command Center

项目首页不是文件浏览器，而是项目状态仪表盘。

内容：

- Overview stats：active tasks、agent runs、tests passing、coverage、last sync。
- Active tasks：正在执行/排队/等待审批的 agent 工作。
- Suggested prompts：给用户的任务建议。
- Recent agent runs：最近运行记录。
- Repository activity：最近变更/提交/agent 操作。
- 右侧：runtime、quick actions、top changed files、last commit。

### 6.3 Active Thread

Active Thread 是最重要页面。它把“聊天”变成“工作时间线”。

内容顺序：

1. User request。
2. DeepSeek Agent response / plan / summary。
3. Files changed summary。
4. Terminal/test output。
5. Composer。
6. 右侧 review inspector。

卡片类型：

- User message。
- Agent response。
- Plan/checklist。
- Tool call。
- File changes。
- Terminal output。
- Approval request。
- Usage/cost。

### 6.4 Review Changes

目标：让用户像 review PR 一样 review agent 变更。

主区：

- 当前文件路径。
- Split / Unified toggle。
- Diff viewer。
- Files changed mini table。
- Selected file risk/impact。
- Test evidence。
- Agent explanation。
- Comment composer。

右侧：

- Review progress。
- File list with status。
- Selected file details。
- Actions：Open in editor、Apply selected、Reject selected、Request more tests。
- Commit message + branch + Commit button。

### 6.5 Settings & Usage

设置页采用中心设置 + 右侧状态。

中心：

- DeepSeek Account。
- API Key & Storage。
- Model Defaults。
- Workspace Preferences。
- App Appearance。
- Usage & Cost。

右侧：

- DeepSeek Plan / account status。
- Runtime version / update。
- Connection health。
- Cost summary。
- Help resources。

---

## 7. 主要用户流程

### 7.1 首次启动

```text
Open App
  → sidecar preflight
  → First Run Setup
  → enter API key
  → verify DeepSeek connection
  → choose model/workspace
  → complete setup
  → Project Command Center
```

### 7.2 新建 Agent Thread

```text
Cmd+N / New thread
  → choose project
  → enter task
  → choose mode: Plan / Agent
  → start
  → Active Thread streaming
```

### 7.3 审批动作

```text
Runtime emits approval.required
  → Active Thread shows Approval Card
  → right Inspector highlights pending approval
  → user chooses Allow once / Deny / Stop
  → app POST approval to runtime
  → timeline receives approval.resolved
```

### 7.4 Review 和 Apply

```text
Thread completed with changes
  → status becomes Review ready
  → right Inspector shows changed files
  → user opens Review Changes
  → review file by file
  → request more tests or apply selected
  → commit/apply/rollback
```

### 7.5 Runtime 异常

```text
Sidecar unavailable
  → banner: Local runtime is offline
  → right panel shows Restart runtime / View logs
  → app tries reconnect with backoff
  → user can enter Demo Mode if needed
```

---

## 8. 交互原则

1. **主界面不显示 API Key 输入框**：API key 只出现在 setup/settings。
2. **所有破坏性操作必须解释风险**：删除、覆盖、shell、网络、MCP 工具调用必须清楚说明。
3. **Agent 输出优先结构化**：diff、terminal、files、tests、usage 都是卡片，不只是 Markdown。
4. **Review 是默认完成态**：agent 修改后不是“done”，而是“ready to review”。
5. **DeepSeek 成本可见但不喧宾夺主**：usage 在 right panel / settings / footer，而不是每个消息都显示一堆 token。
6. **Demo Mode 是 UI 开发与用户体验兜底**：没有 API key 时也能体验完整 UI。

---

## 9. 视觉方向

v2 放弃上一版深黑 + 暖黄调，改成更接近 Codex App 的冷静轻盈风格：

- 背景：蓝紫柔和渐变。
- 窗口：大圆角、轻阴影。
- 侧栏：半透明淡蓝白。
- 主区：白色卡片、轻边框、细分隔线。
- 文本：深 slate + muted slate。
- 强调色：克制蓝色。
- 状态色：绿色/红色/紫色/橙色只用于语义。

---

## 10. MVP 验收

MVP 不是静态好看，而是可交互、可测试：

- App 可启动到 First Run Setup。
- Demo Mode 可进入 Project Command Center。
- 可新建 fake thread。
- Active Thread 可显示 fake streaming events。
- Review Changes 可展示 fake diff、apply/reject 状态。
- Settings & Usage 可显示 fake runtime/account/cost。
- 接真实 DeepSeek-TUI sidecar 时可 list/create/start thread。
- 断线时 UI 不崩溃，可 reconnect。

