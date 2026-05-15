# 08 — 验收清单

## 1. 视觉验收

- [ ] 整体 light theme 使用蓝紫柔和渐变背景。
- [ ] 左侧 sidebar 是浅色半透明风格，不是黑色重栏。
- [ ] 主界面没有常驻 DeepSeek URL / API Key 表单。
- [ ] 所有主要面板使用白色卡片、轻边框、圆角、精细阴影。
- [ ] 主按钮使用克制蓝色，不使用黄色主按钮。
- [ ] Text hierarchy 清晰：标题、正文、muted、caption 区分明显。
- [ ] Diff addition/deletion 颜色柔和可读。
- [ ] macOS traffic lights/titlebar 视觉自然。

## 2. First Run Setup

- [ ] 首次启动进入 setup 页面。
- [ ] 用户能输入 API key。
- [ ] API key 不进入 WebView localStorage。
- [ ] 可选择 `deepseek-v4-flash` 和 `deepseek-v4-pro`。
- [ ] 可选择 workspace folder。
- [ ] 可启用 Demo Mode。
- [ ] sidecar/key/runtime 状态显示清楚。

## 3. Project Command Center

- [ ] 选中项目后显示项目首页。
- [ ] 显示 Overview stats。
- [ ] 显示 Active tasks。
- [ ] 显示 Suggested prompts。
- [ ] 显示 Recent agent runs。
- [ ] 显示 Repository activity。
- [ ] 右侧显示 runtime、quick actions、top changed files。

## 4. Active Thread

- [ ] New thread 可创建 thread。
- [ ] Timeline 显示 user message。
- [ ] Timeline 显示 DeepSeek Agent response。
- [ ] 显示 Files changed summary。
- [ ] 显示 Terminal/Test card。
- [ ] Composer 可继续输入。
- [ ] Right inspector 显示 review summary、changed files、quick actions、runtime。

## 5. Review Changes

- [ ] 可进入 Review screen。
- [ ] 显示文件 diff。
- [ ] Split/Unified toggle 至少有 UI 状态。
- [ ] Review queue 显示 progress。
- [ ] 文件可标记 selected/reviewed。
- [ ] Apply selected 和 Reject selected 有状态反馈。
- [ ] Request more tests 可创建新 fake turn 或显示动作。
- [ ] Commit 区域有 commit message / branch / commit button。

## 6. Settings & Usage

- [ ] DeepSeek Account card 正常。
- [ ] API Key & Storage card 正常。
- [ ] Model Defaults 只显示 DeepSeek 模型。
- [ ] Workspace Preferences 正常。
- [ ] App Appearance 正常。
- [ ] Usage & Cost 有 metrics 和 chart。
- [ ] 右侧 Account & Status / Runtime / Connection / Cost Summary 正常。

## 7. Runtime Adapter

- [ ] FakeRuntimeAdapter 可无 API key 运行。
- [ ] DeepSeekTuiRuntimeAdapter 有 health check。
- [ ] 可读取 runtime info。
- [ ] 可 list/create/start thread。
- [ ] 可 subscribe/replay events。
- [ ] 可 respond approval。
- [ ] 断线后 UI 显示 reconnect，而不是清空页面。

## 8. 安全

- [ ] API key 只存 Keychain 或 native secure store。
- [ ] WebView 不直接持有 bearer token/API key。
- [ ] Runtime 只绑定 localhost。
- [ ] Approval card 对 shell/file/network 动作解释风险。
- [ ] 高风险动作有二次确认。
- [ ] Logs 不包含 API key。

## 9. macOS 交互

- [ ] `⌘N` 新建 thread。
- [ ] `⌘K` 命令面板。
- [ ] `⌘,` 打开 Settings。
- [ ] `⌘R` 打开 Review。
- [ ] `⌘.` 停止当前 turn。
- [ ] 菜单栏包含 File/Edit/View/Thread/Agent/Review/Window/Help。

## 10. 构建和测试

- [ ] App 可本地启动。
- [ ] Web UI tests 通过。
- [ ] Swift/native tests 或 smoke tests 通过。
- [ ] Demo Mode 截图与 mockups 大体一致。
- [ ] Real sidecar smoke test 有文档说明。

