# 验收清单

## 1. 启动与窗口

- [x] App 可以启动。
- [x] 使用真实 macOS window chrome。
- [x] 内容区没有 fake 红黄绿按钮。
- [x] 内容区没有大面积蓝紫背景泄漏。
- [x] Sidebar/main/inspector 填满窗口。
- [x] 窗口 resize 后布局不崩。

## 2. First Run / Setup

- [x] 没配置时进入 First Run Setup。
- [x] API key 输入框可输入。
- [x] Demo Mode toggle 可用。
- [x] 选择模型只出现 `deepseek-v4-flash` 和 `deepseek-v4-pro`。
- [x] Workspace Browse 可打开 folder picker 或 demo placeholder。
- [x] Complete Setup 后进入 Project Command Center。
- [x] 不弹系统登录钥匙串密码框。

## 3. Project Command Center

- [x] 左侧项目可选择。
- [x] New thread 可点击。
- [x] Suggested prompt 可点击或明确 disabled。
- [x] Quick actions 有行为或 disabled reason。
- [x] Runtime status 可见。
- [x] 无数据时显示空状态。

## 4. Active Thread

- [x] 新 thread 显示合理空状态。
- [x] Prompt 输入不卡顿。
- [x] Send 在空 prompt 时 disabled。
- [x] 输入 prompt 后 Send enabled。
- [x] Demo Mode 发送后出现 fake agent response。
- [x] Running 时 Send 转为 Stop 或 disabled。
- [x] Tool/file/terminal cards 正常显示 fake events。
- [x] Stop turn 可用或 disabled with reason。

## 5. Approval

- [x] Approval card 能展示操作类型、目标、风险。
- [x] Allow once 可改变状态。
- [x] Deny 可改变状态。
- [x] Stop task 可中断。
- [x] 没有 pending approval 时不显示 approval buttons。

## 6. Review Changes

- [x] 没有变更时不显示假 diff。
- [x] 没有变更时 review actions disabled。
- [x] 有 fake changed files 时文件列表可选择。
- [x] 选中文件后 diff 或 diff placeholder 显示。
- [x] Apply selected 改变文件 review 状态。
- [x] Reject selected 改变文件 review 状态。
- [x] Commit 0 files 不允许是 primary enabled。
- [x] Commit 有文件和 message 后 enabled。

## 7. Settings & Usage

- [x] Settings 页面可打开。
- [x] API key save/update/delete 有行为或 mock。
- [x] 不出现 Codex/OpenAI 模型名。
- [x] Model dropdown 可持久化选择。
- [x] Workspace preference toggles 可点击并保存。
- [x] Theme/accent 控件可点击或 disabled。
- [x] Usage 显示 demo 或 real 数据。
- [x] Runtime diagnostics 有行为或 disabled reason。

## 8. Automations / Skills

- [x] 页面可打开。
- [x] Skeleton/empty state 清楚。
- [x] 未实现操作标记 Coming soon，不影响主流程。

## 9. Keychain

- [x] 保存 key 不写入普通 config 文件。
- [x] 启动读取 key 不触发系统密码框。
- [x] Key 缺失时显示 API key required。
- [x] Key 删除后状态正确。

## 10. Runtime Adapter

- [x] FakeRuntimeAdapter 可完整跑通。
- [x] Real runtime unavailable 时不崩溃。
- [x] Runtime error 有明确文案和 fallback。
- [x] Sidecar status 可见。

## 11. 性能

- [x] 打字无明显卡顿。
- [x] 页面切换无明显卡顿。
- [x] fake runtime 连续推送事件时 UI 仍可交互。
- [x] 没有 diff 时不加载重型 diff viewer。
- [x] 大输出不会导致整个 App 卡死。

## 12. 视觉

- [x] 使用 v2 Codex-inspired light 风格。
- [x] 主要背景是白/浅灰/轻透明，不是厚重蓝色画布。
- [x] Card 间距统一。
- [x] Sidebar 选中态清楚。
- [x] 右侧 Inspector 不拥挤。
- [x] Disabled buttons 视觉明显。
- [x] Dangerous actions 有红色或 warning 样式。

## 13. 文案

- [x] 只使用 DeepSeek / DeepSeek Agent 命名。
- [x] 不出现 OpenAI/Codex provider 文案。
- [x] 空状态指导下一步。
- [x] 错误状态说明原因和操作。

## 14. Codex 输出要求

Codex 完成后必须在回复中列出：

```text
Build command:
Test command:
Smoke test path:
Remaining known issues:
Screenshots or screen descriptions:
```
