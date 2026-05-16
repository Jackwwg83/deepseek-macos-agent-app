# 功能清单

## 1. P0 MVP 功能

### 1.1 First Run Setup

| 功能 | 描述 | 验收 |
|---|---|---|
| Welcome intro | 显示产品用途和安全说明 | 用户能理解 App 是本地 DeepSeek Agent |
| API key input | App 内输入 DeepSeek API key | 不触发系统 Keychain 密码弹窗 |
| Demo Mode | 无 API key 可试用 | Demo Mode 能跑完整主流程 |
| Model selection | deepseek-v4-flash / deepseek-v4-pro | 不出现非 DeepSeek 模型 |
| Workspace selection | 选择默认项目目录 | 使用 macOS folder picker |
| Runtime check | 检查 sidecar 状态 | 成功/失败有明确文案 |

### 1.2 Project Command Center

| 功能 | 描述 | 验收 |
|---|---|---|
| Project list | 左侧项目列表 | 可添加/选择项目 |
| Project overview | 项目首页指标 | 无数据时显示合理空状态 |
| Suggested prompts | 推荐任务 | 点击后填入 composer 或创建 thread |
| Active tasks | 当前任务列表 | Demo 有假数据，real 映射 runtime threads |
| Recent agent runs | 最近执行记录 | 可点击进入 thread |
| Quick actions | New thread / View diffs / Open in IDE | 每个按钮有行为或 disabled reason |

### 1.3 Active Thread

| 功能 | 描述 | 验收 |
|---|---|---|
| Thread title | 显示当前 thread 标题 | 新 thread 默认 New chat，发送后可自动命名 |
| Timeline | 展示 user / agent / tool / terminal / file change | Demo 和 real 都能显示 |
| Composer | 输入 prompt | Cmd+Enter 发送 |
| Model badge | 显示当前模型 | deepseek-v4-flash/pro |
| Stop turn | 中断运行 | running 时可用 |
| Empty state | 没消息时提示用户开始 | 不显示假 diff |

### 1.4 Approval Flow

| 功能 | 描述 | 验收 |
|---|---|---|
| Approval card | 展示待审批操作 | 包含命令/文件/风险 |
| Allow once | 允许一次 | 状态从 pending 到 allowed |
| Deny | 拒绝 | 状态从 pending 到 denied |
| Stop task | 中断任务 | turn interrupted |

### 1.5 Review Changes

| 功能 | 描述 | 验收 |
|---|---|---|
| Changed file list | 展示所有变更文件 | + additions / - deletions 正确展示 |
| Diff view | 展示选中文件 diff | 无 diff 时显示空状态 |
| Review queue | 文件 review 状态 | 可选择文件 |
| Apply selected | 应用选中文件 | 没选文件 disabled |
| Reject selected | 拒绝选中文件 | 没选文件 disabled |
| Request more tests | 让 Agent 跑更多测试 | runtime unavailable 时 disabled |
| Commit area | commit message 和 branch | 无文件时 commit disabled |

### 1.6 Settings & Usage

| 功能 | 描述 | 验收 |
|---|---|---|
| Account status | DeepSeek account/API key 状态 | configured/required/invalid |
| API key storage | 保存/更新/删除 key | 使用 Keychain，非侵入式 |
| Model defaults | 默认模型/参数 | 仅 DeepSeek 模型 |
| Workspace preferences | 安全偏好 | toggles 可点击并持久化 |
| Appearance | light/dark/system/accent | 至少 light 可用，dark 可标记 P1 |
| Usage overview | tokens/cost/cache | Demo 下显示 fake，real 下接 usage API |
| Runtime status | runtime 版本/健康 | 可 run diagnostics |

### 1.7 Reliability / QA

| 功能 | 描述 | 验收 |
|---|---|---|
| Fake runtime | 本地假数据运行 | 无 key 可完整演示 |
| Smoke test | 基础流程测试 | codex 必须跑 |
| Interaction test | 控件行为检查 | visible controls 全部 active/disabled |
| Performance guard | streaming 不要卡输入 | fake 1000 events 仍可输入 |

## 2. P1 功能

### 2.1 Real runtime integration hardening

- Runtime version detection
- Auth token handling
- SSE reconnect
- Event replay since seq
- Runtime logs panel
- Sidecar binary selection

### 2.2 Diff and Git

- Split/unified diff toggle
- Open in editor
- Apply patch by file
- Reject patch by file
- Commit selected
- Branch selector
- Git status summary

### 2.3 Skills

- Skills list
- Enable/disable skill
- Pin skill
- View SKILL.md
- Import local skill folder

### 2.4 Automations

- Automation list
- New automation placeholder
- Schedule display
- Enable/disable automation

### 2.5 Advanced usage

- Cache hit/miss chart
- Cost by model
- Cost by thread
- Export usage CSV

## 3. P2 功能

- Git worktree sandbox
- VM/container sandbox
- MCP tool manager
- Multi-window thread attach
- GitHub PR creation
- Team workspace
- Cloud task runner
- Multi-provider support

## 4. 功能依赖图

```text
First Run Setup
  -> Config Store
  -> Keychain Store
  -> Runtime Mode

Project Command Center
  -> Project Store
  -> Thread Store
  -> Runtime Status

Active Thread
  -> Runtime Adapter
  -> Event Renderer
  -> Composer
  -> Approval Flow

Review Changes
  -> Changed Files Store
  -> Diff Renderer
  -> Apply/Reject Actions

Settings & Usage
  -> Config Store
  -> Keychain Store
  -> Runtime Diagnostics
  -> Usage Aggregation
```

## 5. 禁止 Codex 添加的功能

第一版禁止自动添加：

- 非 DeepSeek provider 设置页。
- 登录 OpenAI/Codex/GitHub OAuth。
- 团队协作邀请。
- 云同步。
- 复杂 IDE 编辑器。
- 真实支付/订阅管理。
- 真实 VM sandbox。
- 与 DeepSeek-TUI 无关的自研 agent loop。
