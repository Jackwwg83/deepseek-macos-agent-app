# DeepSeek Agent macOS App PRD

## 1. 产品一句话

**DeepSeek Agent 是一个 macOS 本地 AI 工程任务中心：用户在 Mac 上选择项目、创建任务、监督 DeepSeek-TUI runtime 执行、审批敏感操作、Review 代码变更，并最终应用或提交结果。**

## 2. 产品定位

### 不是

- 不是 API Key 连接器。
- 不是 DeepSeek-TUI 的终端输出套壳。
- 不是完整 IDE。
- 不是多模型 marketplace。
- 不是 Codex App / OpenBridge 的复制项目。

### 是

- DeepSeek-only 的 macOS Agent App。
- DeepSeek-TUI 的 GUI 产品壳。
- 本地项目级 task / thread / review 工作台。
- 支持 Demo Mode 的可测试 MVP。
- 面向开发者的低心智负担操作层。

## 3. 目标用户

### Primary persona：个人开发者 / indie hacker

- 使用 macOS 开发。
- 有本地代码项目。
- 想用 DeepSeek 帮忙解释、修改、测试、review 代码。
- 不想一直在终端里操作。
- 希望清楚知道 Agent 做了什么、改了什么、花了多少钱。

### Secondary persona：小团队技术负责人

- 关心安全和可控性。
- 希望每次代码修改都能 review 后再应用。
- 希望有 usage/cost/approval 可见性。

## 4. 用户核心需求

| 用户需求 | 产品响应 |
|---|---|
| 我想快速开始一个 Agent 任务 | New thread + prompt composer |
| 我想知道 Agent 正在做什么 | Active thread timeline + runtime status |
| 我不想它乱改代码 | Approval flow + Review Queue + Apply/Reject |
| 我想看它改了哪些文件 | Changed files + diff viewer |
| 我想确认测试是否通过 | Terminal/Test evidence card |
| 我想控制成本 | Usage & Cost dashboard |
| 我不想被奇怪系统弹窗吓到 | App 内 API key 设置 + 非侵入式 Keychain |
| 我没 API key 也想先看产品 | Demo Mode + fake runtime |

## 5. MVP 范围

### P0：必须完成

1. First Run Setup
2. DeepSeek-only account/API key 设置
3. Demo Mode
4. Sidecar runtime status
5. Project selection
6. New thread
7. Active thread timeline
8. Prompt composer
9. Runtime event rendering
10. Approval cards
11. Review changes 页面
12. File change list
13. Diff placeholder / simple diff rendering
14. Apply selected / Reject selected 按钮状态逻辑
15. Settings & Usage
16. Empty states
17. Error states
18. All visible controls active or disabled
19. Fake runtime test harness
20. No system Keychain password prompt

### P1：下一阶段

1. Real DeepSeek-TUI sidecar integration hardening
2. More complete diff viewer
3. Terminal output streaming
4. Test rerun action
5. Git branch / commit integration
6. Skills manager
7. Automations page skeleton
8. Cost chart and cache hit/miss visualization
9. Project settings
10. Open in IDE

### P2：以后再做

1. Worktree sandbox
2. VM/container sandbox
3. MCP marketplace
4. Multi-window live co-presence
5. Multi-provider support
6. Team collaboration
7. Cloud sync
8. PR creation / GitHub integration

## 6. 明确不做

- 不支持 OpenAI、Anthropic、Gemini 等非 DeepSeek provider。
- 不做完整 IDE 编辑器。
- 不做在线协作。
- 不做云端 task runner。
- 不重写 DeepSeek-TUI runtime。
- 不抓取终端像素。
- 不把登录钥匙串密码框作为正常流程。
- 不在真实 App 内容区绘制 mockup 风格的 macOS 红黄绿按钮。

## 7. 成功标准

MVP 可以被用户下载、打开，并完成以下流程：

1. 进入 First Run Setup。
2. 选择 Demo Mode 或输入 DeepSeek API key。
3. 选择 workspace。
4. 创建一个 New thread。
5. 输入 prompt。
6. fake runtime 或真实 sidecar 产生 agent response。
7. 页面展示 changed files / terminal evidence / review summary。
8. 用户进入 Review changes。
9. 用户看到文件列表、diff 或空状态。
10. 用户执行 Apply selected 或 Reject selected。
11. 没有可执行内容时按钮必须 disabled。
12. Settings 页面能查看模型、runtime、usage 和 API key 状态。
13. App 关闭重开后设置仍保留。

## 8. 产品原则

1. **先可信，再强大**：每个敏感动作都要解释。
2. **先本地，再云端**：代码和凭证默认留在本机。
3. **先 review，再应用**：Agent 的修改不能让用户失控。
4. **先清楚，再自动**：YOLO/auto-apply 不作为默认路径。
5. **先可测试，再炫酷**：Demo Mode 和 fake runtime 是必须品。
6. **少即是多**：第一版功能不要泛化，不要变成全模型平台。

## 9. North Star Workflow

```text
Open App
  -> Setup DeepSeek / Demo Mode
  -> Select Project
  -> Project Command Center
  -> New Thread
  -> Ask DeepSeek
  -> Agent runs using DeepSeek-TUI runtime
  -> Approval required? user decides
  -> Changes produced
  -> Review Queue
  -> Apply / Reject / Request tests
  -> Commit or continue asking
```
