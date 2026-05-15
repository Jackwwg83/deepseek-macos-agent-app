# DeepSeek Agent macOS App — UI/UX 与产品交互设计总包 v2

本设计包把最新一版 **Codex App 风格** 的视觉方向融合进整体产品设计，用于指导 Codex `/goal` 持续迭代实现一个可测试的 macOS Agent App。

## 核心约束

- **Runtime 核心**：DeepSeek-TUI sidecar / Runtime API。
- **模型生态**：只兼容 DeepSeek，不做多 provider 泛化。
- **平台范围**：macOS only。
- **UI 方向**：参考 Codex App 的轻盈、冷静、玻璃感、三栏 command center；参考 OpenBridge 的 macOS native shell + embedded web chat surface，但不 fork OpenBridge，不引入 KWWK。
- **第一版目标**：能启动、能 Demo Mode、能接真实 DeepSeek-TUI sidecar、能创建线程、能流式展示事件、能审批、能 review diff、能查看 usage/runtime 状态。

## 包含文件

| 路径 | 用途 |
|---|---|
| `PRODUCT_UI_UX_SPEC_V2.md` | 产品与 UI/UX 主规格文档 |
| `docs/01_INFORMATION_ARCHITECTURE.md` | 信息架构、导航、页面关系 |
| `docs/02_INTERACTION_FLOWS.md` | 用户流程、异常流程、审批/review 流程 |
| `docs/03_VISUAL_SYSTEM.md` | 新视觉系统、配色、token、组件风格 |
| `docs/04_COMPONENT_LIBRARY.md` | 组件规格：sidebar、cards、diff、review、approval 等 |
| `docs/05_MENUS_AND_SHORTCUTS.md` | macOS 菜单、命令面板、快捷键 |
| `docs/06_RUNTIME_ADAPTER_UI_MAPPING.md` | UI 与 DeepSeek-TUI Runtime API 的映射 |
| `docs/07_CODEX_IMPLEMENTATION_PLAN.md` | 给 Codex 的实现计划 |
| `docs/08_ACCEPTANCE_CHECKLIST.md` | 可测试验收清单 |
| `codex/CODEX_UI_GOAL_V2.md` | 可直接给 Codex `/goal` 的目标文档 |
| `codex/AGENTS.md` | 项目级 Codex 指令 |
| `tokens/design-tokens.json` | 设计 token JSON |
| `tokens/design-tokens.css` | CSS 变量 |
| `index.html` | 可读 HTML 版总览和效果图索引 |
| `mockups/*.png` | 最新效果图 |

## 最新效果图

1. `mockups/01_active_thread_review.png` — 主界面 / Active Thread + Review Inspector
2. `mockups/02_first_run_setup.png` — 首次启动 / DeepSeek Setup
3. `mockups/03_project_command_center.png` — 项目首页 / Project Command Center
4. `mockups/04_review_changes.png` — Review Changes / Diff Review
5. `mockups/05_settings_usage.png` — Settings & Usage / DeepSeek Account + Runtime + Cost

## 给 Codex 的推荐启动方式

把本设计包放入 app 仓库根目录，然后在 Codex 中执行：

```text
/goal Implement codex/CODEX_UI_GOAL_V2.md. Keep iterating until the macOS app launches, demo mode works without an API key, the main screens match the v2 visual system, and all acceptance checks in docs/08_ACCEPTANCE_CHECKLIST.md pass.
```

## 视觉方向一句话

**DeepSeek Agent v2 是一个 Codex App 风格的 macOS command center：左侧管理项目与线程，中间监督 agent 工作，右侧进行 review、diff、runtime 与成本管理。整体使用轻盈白色卡片、蓝紫渐变背景、半透明侧栏、精细分隔线、克制蓝色强调色和高密度但不拥挤的开发者工作流。**
