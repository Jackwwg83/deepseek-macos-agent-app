# 01 — 信息架构与页面关系

## 1. 顶层信息架构

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

## 2. 左侧导航结构

左侧导航是全局层，始终保留一致结构：

```text
DeepSeek Agent ▾

+ New thread                         ⌘N

Automations
Skills

Recent threads
  Polish app for launch prep         12m
  Add drag and drop to gallery        1d
  Create new app                      1d
  Localize iOS app                    4d
  …

Projects                              +
  recipe-app
    app
    components
    hooks
    utils
  photobooth
  wanderlust
  agent-tools-samples
  game-experiment

DS DeepSeek ▾                         ⚙
```

### 2.1 导航原则

- Recent threads 和 Projects 同屏，帮助用户围绕“任务”和“项目”双入口工作。
- `New thread` 是最高频动作，始终在左侧顶部。
- Settings 放底部 gear，不进入主工作流。
- 不显示 DeepSeek URL、API Key 输入框等低频配置。

## 3. 页面关系

```text
First Run Setup
  └─ Complete Setup → Project Command Center

Project Command Center
  ├─ New thread → Active Thread
  ├─ Active task click → Active Thread
  ├─ View diffs → Review Changes
  ├─ Project settings → Settings & Usage
  └─ Open in IDE → external editor

Active Thread
  ├─ Review button → Review Changes
  ├─ Changed file click → Review Changes selected file
  ├─ Request tests → Active Thread new turn
  ├─ Apply changes → Review Changes / apply confirmation
  └─ Settings/runtime click → Settings & Usage

Review Changes
  ├─ Apply selected → thread status updated
  ├─ Reject selected → rollback selected patch
  ├─ Request more tests → Active Thread new turn
  ├─ Commit → optional git commit flow
  └─ Back to thread → Active Thread

Settings & Usage
  ├─ Rotate key → Keychain update flow
  ├─ Check runtime updates → runtime diagnostics
  ├─ Run diagnostics → Runtime Diagnostics
  └─ View detailed usage → Usage drilldown
```

## 4. 页面优先级

| 优先级 | 页面 | 原因 |
|---|---|---|
| P0 | First Run Setup | 用户必须先配置 DeepSeek/runtime |
| P0 | Project Command Center | 默认首页，用户理解项目状态 |
| P0 | Active Thread | 核心 agent 工作流 |
| P0 | Review Changes | 代码变更审查和应用 |
| P0 | Settings & Usage | DeepSeek-only 配置和成本 |
| P1 | Automations | 后续增强，可先做占位 |
| P1 | Skills | 后续增强，可先做占位 |
| P1 | Runtime Diagnostics | 可先做基础日志/重启 |

## 5. 状态模型

### 5.1 Thread 状态

| 状态 | UI 表示 | 用户动作 |
|---|---|---|
| Draft | 轻灰 | 编辑、开始 |
| Running | 蓝/绿色 dot | Stop、Steer、Open |
| Needs approval | 橙色 badge | Approve、Deny、Stop |
| Review ready | 紫色/蓝色 badge | Open Review、Apply、Request tests |
| Completed | 绿色 | Archive、Continue、Fork |
| Failed | 红色 | View logs、Retry |

### 5.2 Runtime 状态

| 状态 | UI 表示 | 用户动作 |
|---|---|---|
| Starting | spinner | 等待、View logs |
| Healthy | green dot | Run diagnostics |
| Reconnecting | amber dot | Retry、View logs |
| Offline | red dot | Restart runtime |
| Version mismatch | purple warning | Update sidecar |

### 5.3 Review 状态

| 状态 | UI 表示 | 用户动作 |
|---|---|---|
| Needs review | blue hollow circle | open file |
| Reviewed | green check | apply/reject |
| Applied | green solid check | commit/archive |
| Rejected | gray strikethrough | undo reject |
| Needs more tests | amber | request tests |

