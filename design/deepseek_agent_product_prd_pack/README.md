# DeepSeek Agent macOS App — PRD / User Journey / Interaction Design Pack

版本：v1.0-product-prd  
目标：给 Codex `/goal` 使用，避免实现继续停留在静态 UI 或偏离产品目标。

本包定义的是一个 **DeepSeek-only、macOS-only、以 DeepSeek-TUI 为 runtime sidecar 的 Agent App MVP**。它不是 Codex App 的复制品，也不是 OpenBridge 的 fork；它借鉴 Codex App 的三栏 command center 体验和 OpenBridge 的 macOS App 包装思路，但运行时核心仍然是 DeepSeek-TUI。

## 读文档顺序

1. `PRD.md`：产品目标、范围、用户、MVP 定义。
2. `docs/01_USER_JOURNEYS.md`：用户旅程和主要使用流程。
3. `docs/02_OPERATION_LOGIC.md`：具体操作逻辑、状态机、按钮行为。
4. `docs/03_FEATURE_CATALOG.md`：功能清单，按 P0/P1/P2 分级。
5. `docs/04_SCREEN_AND_MENU_SPEC.md`：所有主界面、菜单、快捷键、空状态。
6. `docs/05_STATE_PERMISSION_AND_ERROR_MODEL.md`：权限、Keychain、runtime、错误状态。
7. `docs/06_CODEX_IMPLEMENTATION_GUIDE.md`：给 Codex 的实现顺序和禁止事项。
8. `docs/07_ACCEPTANCE_CHECKLIST.md`：验收清单。
9. `codex/CODEX_PRODUCT_GOAL.md`：可直接交给 Codex `/goal` 的目标文档。
10. `codex/AGENTS_PRODUCT.md`：建议合并到项目 `AGENTS.md` 的长期指令。

## 核心结论

- 第一版不是“连接 API 调试台”，而是“本地 AI 工程任务中心”。
- 用户主路径是：**设置 DeepSeek → 选择项目 → 创建任务 → 监督 Agent → 审批工具 → Review diff → 应用或提交变更**。
- 默认必须有 Demo Mode；没有 API key 也要能完整体验 UI 和 fake runtime。
- 所有可见按钮必须能点击或明确禁用并解释原因。
- 不允许弹系统登录钥匙串密码框。
- 不允许画假的 macOS 红黄绿窗口按钮。
- 不允许把蓝紫渐变当作 App 内部主背景；渐变只用于营销图或窗口外背景。
- 不允许引入非 DeepSeek provider 或 Codex/OpenAI 命名。

## Mockups

- `mockups/01_active_thread_main.png`
- `mockups/02_first_run_setup.png`
- `mockups/03_project_command_center.png`
- `mockups/04_review_changes.png`
- `mockups/05_settings_usage.png`
