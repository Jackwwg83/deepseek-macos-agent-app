# Codex 实现指南：避免走偏

## 1. 本轮目标

把当前“好看的静态 UI”变成一个 **可操作、可测试、可解释的 macOS DeepSeek Agent MVP**。

Codex 不要继续只做视觉优化。必须实现完整用户操作逻辑和测试闭环。

## 2. 实现优先级

### Step 1：梳理现有工程

Codex 需要先输出并记录：

```text
当前技术栈：SwiftUI? AppKit? WKWebView? React?
是否有 fake runtime？
是否有 sidecar manager？
是否使用 Keychain？
哪些按钮没有 handler？
哪些页面是静态 mock？
```

### Step 2：修正 App Shell

必须做到：

- 使用真实 macOS window chrome。
- 不在内容区绘制 fake traffic lights。
- 去掉生产 App 内部大面积蓝紫背景。
- Sidebar/main/inspector 填满窗口。
- 保留 Codex-inspired 的 light/glass/white-card 风格，但不要像网页背景。

### Step 3：修 Keychain

必须做到：

- API key 只在 App 内输入。
- 保存到 Keychain。
- 启动时读取失败不弹系统登录钥匙串密码框。
- API key 缺失时显示 App 内状态。

### Step 4：实现 Demo Mode

必须做到：

- 无 API key 可进入 Demo Mode。
- Demo Mode 可创建 thread、发送 prompt、产生 fake events、进入 review。
- Demo Mode 的 fake changed files 可 apply/reject。

### Step 5：实现 Screen Routing

页面必须可切换：

- Project Command Center
- Active Thread
- Review Changes
- Settings & Usage
- Automations skeleton
- Skills skeleton

### Step 6：实现 Control Behavior Matrix

每个可见控件必须：

```text
wired OR disabled with reason OR hidden
```

不要留下“看起来能点但没反应”的按钮。

### Step 7：实现 QA tests

至少覆盖：

- App launch smoke test
- Demo Mode journey
- New thread and send prompt
- Review changes empty state
- Review fake changed files
- Settings model change
- API key save/delete mock or unit test
- Disabled button states

## 3. 不允许 Codex 做的事

- 不要新增非 DeepSeek provider。
- 不要把 OpenAI/Codex model 名称写进 UI。
- 不要重写 DeepSeek-TUI runtime。
- 不要抓终端输出。
- 不要把蓝紫渐变当真实 App 内部大背景。
- 不要绘制假的 macOS 红黄绿按钮。
- 不要让 `Commit 0 files` 是 primary blue 按钮。
- 不要让按钮没有 handler。
- 不要把 `Coming soon` 的功能做成可点击主路径。

## 4. 建议实现结构

```text
App shell
  SwiftUI/AppKit native if possible
  ├─ Window / Menu / Sidebar
  ├─ Settings
  ├─ Keychain
  ├─ Sidecar manager
  └─ Runtime status

Content renderer
  SwiftUI or WKWebView/React
  ├─ Active thread timeline
  ├─ Review diff viewer
  └─ Terminal/test output

Runtime adapter
  ├─ FakeRuntimeAdapter
  └─ DeepSeekTuiRuntimeAdapter
```

## 5. Fake runtime 事件示例

```json
{"type":"thread.started","threadId":"demo-thread-1"}
{"type":"message.user","text":"Polish this app UI"}
{"type":"message.agent.delta","text":"I will inspect the project and propose changes."}
{"type":"tool.started","tool":"read_files"}
{"type":"tool.completed","summary":"Read 8 files"}
{"type":"file.changed","path":"app/components/PromptDialog.tsx","additions":122,"deletions":8}
{"type":"terminal.completed","command":"pnpm test","status":"passed","durationMs":28400}
{"type":"turn.completed","costUsd":0.0}
```

## 6. 必须写入 progress log

Codex 每轮完成后更新：

```text
PROGRESS.md
  - What changed
  - What was tested
  - What still fails
  - Screenshots if possible
  - Next action
```

## 7. 验收方式

Codex 不能只说“完成”。它必须提供：

- build/test 命令输出
- 哪些按钮已 wired
- 哪些按钮 disabled 以及原因
- Demo Mode 完整操作路径
- Keychain 弹窗问题是否消失
- 性能问题是否改善

## 8. 推荐 Codex /goal 文案

```text
/goal Implement codex/CODEX_PRODUCT_GOAL.md. Keep iterating until the product journey works end-to-end in Demo Mode, the app has no fake macOS chrome or blue background bleed, no Keychain password prompt appears, all visible controls are either wired or explicitly disabled, and all acceptance checks in docs/07_ACCEPTANCE_CHECKLIST.md pass.
```
