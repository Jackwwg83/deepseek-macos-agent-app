# 页面、菜单与快捷键规格

## 1. App 全局信息架构

```text
DeepSeek Agent
├─ First Run Setup
├─ Project Command Center
├─ Active Thread
├─ Review Changes
├─ Automations
├─ Skills
├─ Settings & Usage
└─ Runtime Diagnostics
```

左侧 Sidebar 永远保留：

```text
New thread
Automations
Skills
Review changes
Recent threads
Projects
Account / Settings
```

右侧 Inspector 按当前页面变化：

- Project：runtime + quick actions + top changed files
- Thread：review summary + runtime + changed files
- Review：review queue + actions + commit
- Settings：account/status + cost summary + help

## 2. First Run Setup

### 页面目标

让用户在 3 分钟内完成配置或进入 Demo Mode。

### 布局

```text
Left intro panel
  - App icon
  - Welcome text
  - Benefits
  - Local-first note

Main setup panel
  - Connect to DeepSeek
  - API key input
  - Model selection
  - Workspace folder
  - Demo Mode toggle
  - Status row
  - Complete Setup button
```

### 控件

| 控件 | 行为 |
|---|---|
| API key field | 输入/粘贴 key，保存到 Keychain |
| Model dropdown | 选择 deepseek-v4-flash/pro |
| Workspace Browse | 打开 folder picker |
| Demo Mode toggle | 开启后 API key 非必填 |
| Complete Setup | 保存配置并进入 Project Command Center |
| Need help | 打开帮助链接或本地帮助 modal |

### 禁止

- 不要弹系统登录钥匙串密码框。
- 不要要求用户输入 macOS 登录密码。
- 不要把 API key 暴露成明文，除非用户点击临时 reveal。

## 3. Project Command Center

### 页面目标

项目首页。用户能快速开始任务、查看最近任务、检查 runtime 状态。

### 中间内容

```text
Project title
Overview metrics
Active tasks
Suggested prompts
Recent agent runs
Repository activity
```

### 右侧 Inspector

```text
Runtime status
Quick actions
Top changed files
Last commit
```

### 操作

| 操作 | 行为 |
|---|---|
| New thread | 创建并进入 Active Thread |
| Suggested prompt click | 创建 thread 并填充 prompt，或直接发送，取决于设置 |
| Run tests | 创建一个测试 thread 或触发 runtime test task |
| View diffs | 进入 Review Changes |
| Open in IDE | 调用系统 open 或配置的 IDE |
| Project settings | 打开项目设置 modal/page |

### 空状态

```text
No project selected.
Choose a folder to start using DeepSeek Agent.
```

```text
No agent runs yet.
Start a new thread or choose a suggested prompt.
```

## 4. Active Thread

### 页面目标

用户监督一个 Agent turn 的执行，并持续对话。

### 布局

```text
Header
  - Active thread label
  - Thread title
  - Mode badge
  - More menu

Timeline
  - User message
  - Agent response
  - Plan card
  - Tool call card
  - Approval card
  - File changes card
  - Terminal/test card

Composer
  - prompt input
  - model selector
  - attach button
  - send/stop button
```

### 右侧 Inspector

```text
Review summary
Changed files
Quick actions
Runtime status
Usage for current turn
```

### 空状态

```text
Ask DeepSeek to inspect, explain, or change this project.
```

示例 prompts：

- Explain this repository structure
- Find risky shell scripts
- Add tests for the selected module
- Refactor this component and show me the diff

## 5. Review Changes

### 页面目标

集中处理 Agent 产生的文件变更。

### 中间内容

```text
Review header
Selected file diff
Files changed summary
Change metadata
Test evidence
Agent explanation
Comment composer
```

### 右侧 Inspector

```text
Review queue
Selected file summary
Review actions
Commit section
```

### 空状态

没有变更时：

```text
No generated changes yet.
Ask DeepSeek to modify code, then review the proposed files here.
```

### 操作规则

- `Apply selected`：仅选中文件且有 diff 时 enabled。
- `Reject selected`：仅选中文件且有 diff 时 enabled。
- `Commit files`：accepted files > 0 且 commit message 非空时 enabled。
- `Open in editor`：项目路径存在且文件存在时 enabled。

## 6. Settings & Usage

### 页面目标

管理 DeepSeek 账号/API key、默认模型、安全偏好、成本和 runtime。

### 中间内容

```text
DeepSeek Account
API Key & Storage
Model Defaults
Workspace Preferences
App Appearance
Usage & Cost
```

### 右侧 Inspector

```text
Account & Status
Runtime
Connection
Cost Summary
Help & Resources
```

### 操作

| 操作 | 行为 |
|---|---|
| Manage account | 打开账户设置或显示 Coming soon |
| Rotate key | 清空输入，等待新 key |
| Delete key | 删除 key，并切到 API key required 状态 |
| Model dropdown | 保存默认模型 |
| Diagnostics | 检查 runtime/sidecar/API reachability |
| View detailed usage | 展开 usage detail 或打开 usage tab |

## 7. Automations 页面

MVP 可做 skeleton。

### 空状态

```text
Automations are not configured yet.
Create scheduled tasks later to let DeepSeek watch and maintain projects.
```

### P0 行为

- 页面可打开。
- 不报错。
- New automation disabled with label `Coming soon`。

## 8. Skills 页面

MVP 可做 skeleton。

### 空状态

```text
No skills installed yet.
Skills will help DeepSeek follow project-specific workflows.
```

### P0 行为

- 页面可打开。
- 显示 skills 概念说明。
- Import skill 可 disabled。

## 9. macOS 菜单

### App menu

```text
DeepSeek Agent
  About DeepSeek Agent
  Settings…                 Cmd+,
  Check for Updates…
  Services
  Hide DeepSeek Agent        Cmd+H
  Hide Others                Opt+Cmd+H
  Quit DeepSeek Agent        Cmd+Q
```

### File menu

```text
File
  New Thread                 Cmd+N
  Open Project…              Cmd+O
  Close Thread               Cmd+W
  Reveal Project in Finder
```

### Edit menu

```text
Edit
  Undo                       Cmd+Z
  Redo                       Shift+Cmd+Z
  Cut / Copy / Paste
  Find in Thread             Cmd+F
```

### View menu

```text
View
  Project Command Center     Cmd+1
  Active Thread              Cmd+2
  Review Changes             Cmd+3
  Settings & Usage           Cmd+,
  Toggle Inspector           Opt+Cmd+I
  Toggle Sidebar             Opt+Cmd+S
```

### Agent menu

```text
Agent
  Send Message               Cmd+Enter
  Stop Current Turn          Esc or Cmd+.
  Request Tests
  Review Changes
  Switch to Demo Mode
  Restart Runtime
```

### Help menu

```text
Help
  DeepSeek Agent Help
  Runtime Logs
  Report Issue
```

## 10. 快捷键

| 快捷键 | 行为 |
|---|---|
| Cmd+N | New thread |
| Cmd+O | Open project |
| Cmd+, | Settings |
| Cmd+1 | Project Command Center |
| Cmd+2 | Active Thread |
| Cmd+3 | Review Changes |
| Cmd+Enter | Send prompt |
| Cmd+. | Stop current turn |
| Opt+Cmd+I | Toggle inspector |
| Opt+Cmd+S | Toggle sidebar |
| Esc | Dismiss modal/popover |

## 11. 视觉约束

- App 使用真实 macOS window chrome。
- 内容区不要绘制 fake traffic lights。
- 蓝紫渐变只在营销截图/窗口外背景使用。
- App 内背景以 white / off-white / translucent sidebar 为主。
- 主操作按钮使用蓝色；危险操作使用红色；成功状态绿色。
