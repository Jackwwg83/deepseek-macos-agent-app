# 07 — Codex 实现计划

## 1. Codex 工作目标

Codex 不应该只“画出 UI”，而是要持续迭代到一个可以本地启动和测试的 macOS App MVP。

目标：

```text
Build a macOS-only DeepSeek Agent App UI that uses DeepSeek-TUI as runtime sidecar, implements demo mode with fake runtime, and matches the v2 Codex-inspired visual system.
```

## 2. 推荐实现技术栈

### 2.1 macOS Shell

- SwiftUI/AppKit。
- WKWebView 嵌入 React UI。
- Keychain 保存 API key。
- Native sidecar process manager。

### 2.2 Web UI

- React + TypeScript。
- CSS variables from `tokens/design-tokens.css`。
- Component-first structure。
- Fake runtime story/demo mode。

### 2.3 可选替代

如果当前项目已经是 Tauri/React，也可以用 Tauri 继续实现。但本包按 macOS-only 设计，视觉和交互不依赖 Tauri。

## 3. 目录建议

```text
DeepSeekAgentApp/
├─ macos/
│  ├─ DeepSeekAgentApp.xcodeproj
│  ├─ Sources/
│  │  ├─ AppShell/
│  │  ├─ Runtime/
│  │  ├─ Keychain/
│  │  ├─ WebBridge/
│  │  └─ Sidecar/
│  └─ Resources/
├─ web/
│  ├─ src/
│  │  ├─ app/
│  │  ├─ components/
│  │  ├─ runtime/
│  │  ├─ screens/
│  │  ├─ styles/
│  │  └─ fixtures/
│  └─ package.json
├─ design/
│  └─ deepseek_agent_app_uiux_product_pack_v2/
├─ AGENTS.md
└─ README.md
```

## 4. 实现阶段

### Phase 0 — 读取设计并建立基线

Codex 要做：

- 阅读 `README.md`、`PRODUCT_UI_UX_SPEC_V2.md`、`docs/03_VISUAL_SYSTEM.md`。
- 识别当前项目技术栈。
- 写一份 `docs/implementation-progress.md`。
- 不要先重构 runtime。

验收：

- 能说明当前 app 如何启动。
- 能指出 demo/fake runtime 放在哪里。

### Phase 1 — Design tokens + Shell Layout

实现：

- 蓝紫渐变 wallpaper。
- macOS window shell。
- 左侧 translucent sidebar。
- 中央 surface。
- 右侧 inspector。
- 基本响应式布局。

验收：

- 主窗口与 `mockups/01_active_thread_review.png` 视觉方向一致。
- 不再有常驻 API URL/API key 表单。

### Phase 2 — Fake Runtime + Screens

实现：

- FakeRuntimeAdapter。
- First Run Setup。
- Project Command Center。
- Active Thread。
- Review Changes。
- Settings & Usage。

验收：

- 无 DeepSeek API key 也能完整浏览和交互。
- New thread 可创建 fake thread。
- Review 可 apply/reject selected fake files。

### Phase 3 — Runtime Adapter

实现：

- DeepSeekTuiRuntimeAdapter。
- sidecar health check。
- list/create/start thread。
- subscribe events。
- approval response。
- usage read。

验收：

- real mode 可连接 `deepseek-tui serve --http`。
- 断线不崩溃。
- 事件能映射到 UI cards。

### Phase 4 — Review workflow polish

实现：

- file list。
- split/unified diff toggle。
- selected file risk/impact。
- test evidence。
- request tests。
- apply/reject 状态。

验收：

- Review screen 可独立测试。
- 文件状态会更新 progress。

### Phase 5 — Settings/Usage polish

实现：

- API key Keychain flow。
- model defaults。
- runtime diagnostics。
- usage/cost chart。
- cache hit ratio。

验收：

- 设置可保存。
- Demo usage chart 正常。
- Runtime status 可切换 offline/healthy demo 状态。

## 5. Codex 每轮迭代规则

每次迭代必须：

1. 改动最小闭环功能。
2. 保留 fake runtime。
3. 跑构建和测试。
4. 更新 `docs/implementation-progress.md`。
5. 若遇到 blocker，写清楚原因和证据。

## 6. 禁止实现路线

Codex 不要做：

- 不要把 OpenBridge 代码直接复制进项目。
- 不要替换 DeepSeek-TUI runtime。
- 不要在 React 里保存 API key。
- 不要抓取终端输出。
- 不要第一阶段做 VM sandbox。
- 不要把 Settings 表单放回主界面。
- 不要使用黄色主按钮和黑色重 sidebar。

## 7. 截图验收建议

建议 Codex 完成后生成/保存以下截图：

```text
screenshots/01-first-run-setup.png
screenshots/02-project-command-center.png
screenshots/03-active-thread.png
screenshots/04-review-changes.png
screenshots/05-settings-usage.png
```

与本包 mockups 进行人工对比。

