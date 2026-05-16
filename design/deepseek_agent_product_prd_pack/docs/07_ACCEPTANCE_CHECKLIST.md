# 验收清单

## 1. 启动与窗口

- [ ] App 可以启动。
- [ ] 使用真实 macOS window chrome。
- [ ] 内容区没有 fake 红黄绿按钮。
- [ ] 内容区没有大面积蓝紫背景泄漏。
- [ ] Sidebar/main/inspector 填满窗口。
- [ ] 窗口 resize 后布局不崩。

## 2. First Run / Setup

- [ ] 没配置时进入 First Run Setup。
- [ ] API key 输入框可输入。
- [ ] Demo Mode toggle 可用。
- [ ] 选择模型只出现 `deepseek-v4-flash` 和 `deepseek-v4-pro`。
- [ ] Workspace Browse 可打开 folder picker 或 demo placeholder。
- [ ] Complete Setup 后进入 Project Command Center。
- [ ] 不弹系统登录钥匙串密码框。

## 3. Project Command Center

- [ ] 左侧项目可选择。
- [ ] New thread 可点击。
- [ ] Suggested prompt 可点击或明确 disabled。
- [ ] Quick actions 有行为或 disabled reason。
- [ ] Runtime status 可见。
- [ ] 无数据时显示空状态。

## 4. Active Thread

- [ ] 新 thread 显示合理空状态。
- [ ] Prompt 输入不卡顿。
- [ ] Send 在空 prompt 时 disabled。
- [ ] 输入 prompt 后 Send enabled。
- [ ] Demo Mode 发送后出现 fake agent response。
- [ ] Running 时 Send 转为 Stop 或 disabled。
- [ ] Tool/file/terminal cards 正常显示 fake events。
- [ ] Stop turn 可用或 disabled with reason。

## 5. Approval

- [ ] Approval card 能展示操作类型、目标、风险。
- [ ] Allow once 可改变状态。
- [ ] Deny 可改变状态。
- [ ] Stop task 可中断。
- [ ] 没有 pending approval 时不显示 approval buttons。

## 6. Review Changes

- [ ] 没有变更时不显示假 diff。
- [ ] 没有变更时 review actions disabled。
- [ ] 有 fake changed files 时文件列表可选择。
- [ ] 选中文件后 diff 或 diff placeholder 显示。
- [ ] Apply selected 改变文件 review 状态。
- [ ] Reject selected 改变文件 review 状态。
- [ ] Commit 0 files 不允许是 primary enabled。
- [ ] Commit 有文件和 message 后 enabled。

## 7. Settings & Usage

- [ ] Settings 页面可打开。
- [ ] API key save/update/delete 有行为或 mock。
- [ ] 不出现 Codex/OpenAI 模型名。
- [ ] Model dropdown 可持久化选择。
- [ ] Workspace preference toggles 可点击并保存。
- [ ] Theme/accent 控件可点击或 disabled。
- [ ] Usage 显示 demo 或 real 数据。
- [ ] Runtime diagnostics 有行为或 disabled reason。

## 8. Automations / Skills

- [ ] 页面可打开。
- [ ] Skeleton/empty state 清楚。
- [ ] 未实现操作标记 Coming soon，不影响主流程。

## 9. Keychain

- [ ] 保存 key 不写入普通 config 文件。
- [ ] 启动读取 key 不触发系统密码框。
- [ ] Key 缺失时显示 API key required。
- [ ] Key 删除后状态正确。

## 10. Runtime Adapter

- [ ] FakeRuntimeAdapter 可完整跑通。
- [ ] Real runtime unavailable 时不崩溃。
- [ ] Runtime error 有明确文案和 fallback。
- [ ] Sidecar status 可见。

## 11. 性能

- [ ] 打字无明显卡顿。
- [ ] 页面切换无明显卡顿。
- [ ] fake runtime 连续推送事件时 UI 仍可交互。
- [ ] 没有 diff 时不加载重型 diff viewer。
- [ ] 大输出不会导致整个 App 卡死。

## 12. 视觉

- [ ] 使用 v2 Codex-inspired light 风格。
- [ ] 主要背景是白/浅灰/轻透明，不是厚重蓝色画布。
- [ ] Card 间距统一。
- [ ] Sidebar 选中态清楚。
- [ ] 右侧 Inspector 不拥挤。
- [ ] Disabled buttons 视觉明显。
- [ ] Dangerous actions 有红色或 warning 样式。

## 13. 文案

- [ ] 只使用 DeepSeek / DeepSeek Agent 命名。
- [ ] 不出现 OpenAI/Codex provider 文案。
- [ ] 空状态指导下一步。
- [ ] 错误状态说明原因和操作。

## 14. Codex 输出要求

Codex 完成后必须在回复中列出：

```text
Build command:
Test command:
Smoke test path:
Remaining known issues:
Screenshots or screen descriptions:
```
