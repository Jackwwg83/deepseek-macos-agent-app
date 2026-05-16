# 用户操作逻辑与状态机

## 1. 全局模式

App 有两个全局运行模式：

| 模式 | 说明 | 进入条件 | 退出条件 |
|---|---|---|---|
| Demo Mode | 使用 fake runtime，不需要 API key | 用户主动开启或 real runtime 不可用 | 用户配置 API key 并启动 real runtime |
| Real Mode | 使用 DeepSeek-TUI sidecar runtime | API key 可用，sidecar 可用 | 用户切到 Demo 或 runtime 失败 |

### 顶部/右侧状态展示

```text
Mode: demo / real
Runtime: available / unavailable / starting / crashed
API key: configured / required / invalid
Model: deepseek-v4-flash / deepseek-v4-pro
```

## 2. App 启动状态机

```text
App Launch
  -> Load local config
  -> Check Keychain state
  -> Check sidecar binary
  -> If no setup: First Run Setup
  -> If setup + demo: Project Command Center in Demo Mode
  -> If setup + real: Start sidecar
      -> sidecar healthy: Project Command Center
      -> sidecar failed: Runtime Error with fallback to Demo
```

### 关键规则

- 读取 Keychain 失败不得弹系统密码框。
- 读取 Keychain 失败时显示 App 内状态：`API key required`。
- Sidecar 启动失败不能阻塞整个 UI。
- Demo Mode 永远可用。

## 3. Thread 状态机

```text
empty
  -> created
  -> user_message_added
  -> running
  -> waiting_approval
  -> running
  -> completed
  -> review_available
```

异常路径：

```text
running -> interrupted
running -> failed
waiting_approval -> denied -> completed_with_denial
```

### Thread 列表展示规则

| 状态 | 左侧图标/标识 | 可点击 |
|---|---|---|
| completed | normal | yes |
| running | spinner/subtle pulse | yes |
| waiting approval | amber dot | yes |
| failed | red dot | yes |
| demo | demo badge | yes |

## 4. Composer 操作逻辑

### Send 按钮 enabled 条件

```text
prompt.trim().length > 0
AND current thread is not currently running
AND mode is demo OR runtime is available
```

### Disabled reason

- Empty prompt → `Enter a message to send.`
- Runtime unavailable → `Runtime is unavailable. Switch to Demo Mode or restart runtime.`
- Turn running → `Wait for the current turn to finish or stop it.`

### 快捷键

- `Cmd + Enter`：send
- `Esc`：关闭当前 popover/modal
- `Cmd + N`：New thread
- `Cmd + ,`：Settings

## 5. Approval 操作逻辑

### Approval Card 状态

```text
pending -> allowed
pending -> denied
pending -> expired
pending -> canceled_by_stop
```

### 按钮

| 按钮 | 条件 | 行为 |
|---|---|---|
| Allow once | approval pending | respond allow |
| Deny | approval pending | respond deny |
| Stop task | turn running or waiting approval | interrupt turn |
| Details | always | 展开命令/文件/风险 |

### 展示内容

必须展示：

```text
Tool name
Action type
Command/path/url
Working directory
Risk level
Why approval is required
```

## 6. Review 操作逻辑

### File Review 状态

```text
unreviewed -> selected -> accepted
unreviewed -> selected -> rejected
accepted/rejected -> can be undone before final apply
```

### Review 页面按钮状态

| 控件 | Enabled 条件 | Disabled 展示 |
|---|---|---|
| Open in editor | selected file exists | No file selected |
| Apply selected | selected file exists AND file not accepted | Select a file first |
| Reject selected | selected file exists AND file not rejected | Select a file first |
| Request more tests | thread exists AND runtime/demo available | Runtime unavailable |
| Commit files | accepted files count > 0 AND commit message not empty | No files to commit |
| Split/Unified | diff exists | No diff available |

### 空状态规则

没有 changed files 时：

- 中间不显示假代码 diff。
- 显示空状态卡：`No generated diff yet.`
- 右侧 review queue 显示 `0 of 0 files reviewed`。
- 所有 review action disabled，按钮旁/tooltip 说明原因。

## 7. Settings 操作逻辑

### API Key

| 操作 | 行为 |
|---|---|
| Save key | 写入 Keychain，更新状态为 configured |
| Rotate key | 显示输入框，让用户输入新 key |
| Delete key | 删除 Keychain item，状态改为 required |
| Reveal key | 默认不支持；只允许重新输入 |

### Model Defaults

只允许 DeepSeek 模型：

```text
deepseek-v4-flash
deepseek-v4-pro
```

不允许出现 Codex/OpenAI model 字符串。

### Workspace Preferences

| 选项 | 默认 | 说明 |
|---|---|---|
| Auto-apply safe edits | off | 第一版建议默认 off，避免误操作 |
| Confirm destructive actions | on | 删除/覆盖必须确认 |
| Code suggestions | on | 仅 UI 设置，第一版可标记 coming soon |
| Default terminal shell | zsh | 可选 zsh/bash/fish |

## 8. Project 操作逻辑

### Project list

用户可以：

- Add project
- Select project
- Remove from list
- Reveal in Finder
- Open in IDE

### Add project

1. 用户点击 `+`。
2. 打开 macOS folder picker。
3. 用户选择文件夹。
4. App 检查是否存在 `.git`。
5. 如果不是 git repo，也允许添加，但显示 `No Git repository detected`。
6. 加入 project list。

## 9. Runtime 操作逻辑

### Runtime states

| 状态 | UI 文案 | 可执行动作 |
|---|---|---|
| starting | Starting runtime | cancel / use demo |
| healthy | Runtime healthy | diagnostics / restart |
| unavailable | Runtime unavailable | retry / use demo / view logs |
| incompatible | Runtime incompatible | update sidecar / use demo |
| crashed | Runtime crashed | restart / view logs |

### Runtime status 必须在右侧面板可见

不要把 runtime 状态藏在设置页深处。

## 10. Button rule：所有按钮必须有真实行为

Codex 实现时遵守：

```text
Every visible button MUST be one of:
- wired: has a click handler and changes state
- disabled: visibly disabled and has reason
- hidden: not shown because action is not available
```

禁止：

```text
Button visible + clickable-looking + no handler
Button visible + primary style + no valid action
Button opens nothing without feedback
```

## 11. Page loading rule

页面不应显示 “Loading thread” 后长期无变化。

Loading 超过 1 秒：显示 skeleton。  
Loading 超过 5 秒：显示 retry。  
Loading 失败：显示 error card。

## 12. Performance operation rule

- Streaming event 更新最多 10–20 FPS。
- Composer input 必须独立于大 timeline 状态，输入不能被 streaming 卡住。
- 没有 diff 时不加载 diff viewer。
- 大列表使用虚拟滚动或分页。
- 切换页面不得重启 runtime。
