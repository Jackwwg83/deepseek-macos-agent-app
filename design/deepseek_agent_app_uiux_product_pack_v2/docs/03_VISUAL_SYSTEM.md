# 03 — 视觉系统 v2

## 1. 视觉方向

v2 采用 Codex App 风格的轻盈 macOS 视觉语言，但保留 DeepSeek-only 产品身份。

关键词：

- Light, airy, calm。
- Blue-lilac gradient。
- Translucent sidebar。
- White floating cards。
- Fine borders。
- Slate typography。
- Restrained blue accent。
- High-density developer workflow without visual heaviness。

## 2. 色彩系统

### 2.1 背景与面板

| Token | Hex | 用途 |
|---|---|---|
| `color.bg.wallpaper.from` | `#7FA8FF` | 外层蓝色渐变起点 |
| `color.bg.wallpaper.mid` | `#B7A7FF` | 外层紫色过渡 |
| `color.bg.wallpaper.to` | `#BFEAFF` | 外层浅青终点 |
| `color.window` | `#F8FAFF` | App 主窗口底色 |
| `color.sidebar` | `rgba(239,244,255,0.78)` | 左侧半透明栏 |
| `color.surface` | `#FFFFFF` | 卡片/主面板 |
| `color.surface.subtle` | `#F6F8FC` | 次级卡片/terminal 背景 |
| `color.surface.glass` | `rgba(255,255,255,0.72)` | 玻璃卡片 |

### 2.2 文本

| Token | Hex | 用途 |
|---|---|---|
| `color.text.primary` | `#101828` | 标题/正文主文字 |
| `color.text.secondary` | `#475467` | 次级正文 |
| `color.text.tertiary` | `#667085` | 描述、placeholder |
| `color.text.quiet` | `#98A2B3` | 时间、辅助信息 |

### 2.3 边框与阴影

| Token | 值 | 用途 |
|---|---|---|
| `color.border` | `rgba(16,24,40,0.10)` | 默认边框 |
| `color.border.strong` | `rgba(16,24,40,0.16)` | active card / input |
| `shadow.window` | `0 32px 80px rgba(15, 23, 42, 0.24)` | 主窗口 |
| `shadow.card` | `0 8px 24px rgba(15, 23, 42, 0.06)` | 卡片 |
| `shadow.popover` | `0 18px 44px rgba(15, 23, 42, 0.16)` | 下拉/弹窗 |

### 2.4 强调色与状态色

| Token | Hex | 用途 |
|---|---|---|
| `color.accent` | `#3366FF` | 主按钮、选中、链接 |
| `color.accent.soft` | `#E9EFFF` | 选中背景 |
| `color.deepseek` | `#4F7CFF` | DeepSeek 品牌点缀 |
| `color.success` | `#16A34A` | 成功、runtime healthy、tests passed |
| `color.warning` | `#F59E0B` | 等待审批、warning |
| `color.danger` | `#DC2626` | 删除、失败、deletions |
| `color.review` | `#6D5DFB` | Review 状态 |
| `color.addition.bg` | `#EAF8F0` | diff added line |
| `color.deletion.bg` | `#FDECEC` | diff removed line |

## 3. 字体

- Native shell：SF Pro。
- Web content：system-ui / Inter fallback。
- Code：SF Mono / Menlo / Monaco。

字号：

| 用途 | 大小 |
|---|---|
| Page title | 20–24px |
| Section title | 14–16px |
| Body | 13–14px |
| Secondary | 12–13px |
| Caption | 11–12px |
| Code | 12–13px |

## 4. Layout token

| Token | 值 |
|---|---|
| Window radius | 18–24px |
| Card radius | 12–16px |
| Button radius | 8–12px |
| Left sidebar width | 320–360px |
| Inspector width | 320–380px |
| Main content max width | 760–920px |
| Card padding | 16–24px |
| Page padding | 28–40px |

## 5. 组件风格

### 5.1 Buttons

- Primary：蓝色填充，白字，轻阴影。
- Secondary：白底 + 边框。
- Ghost：透明，hover 时浅蓝背景。
- Destructive：红色文字或红色边框，避免大面积红底。

### 5.2 Cards

卡片统一：

```css
background: rgba(255,255,255,0.86);
border: 1px solid rgba(16,24,40,0.10);
border-radius: 14px;
box-shadow: 0 8px 24px rgba(15,23,42,0.06);
```

### 5.3 Selection

选中态不使用高饱和背景，而使用：

```css
background: rgba(51,102,255,0.08);
border-color: rgba(51,102,255,0.14);
```

### 5.4 Terminal

Terminal card 不应是纯黑终端。建议浅色 code block：

- 背景：`#F6F8FC`。
- 字体：SF Mono。
- PASS 绿色。
- FAIL 红色。
- 可折叠长输出。

### 5.5 Diff

- Addition：浅绿背景。
- Deletion：浅红背景。
- 不用高饱和色块。
- 行号低对比度。
- Selected file 使用蓝色 accent。

## 6. 文案风格

### 6.1 原则

- 用产品语言，不用协议语言。
- 用风险解释，不用裸工具名。
- 用“DeepSeek Agent”称呼 agent。
- 用“local runtime”称呼 sidecar。
- Debug 信息可以在 diagnostics 中出现，不在主界面吓用户。

### 6.2 示例

错误：`SSE disconnected`  
正确：`Lost connection to local runtime. Reconnecting…`

错误：`Approve exec_shell`  
正确：`DeepSeek wants to run a shell command to verify the changes.`

错误：`POST /v1/threads failed`  
正确：`Could not start this thread. Open runtime logs or retry.`

## 7. 禁止事项

- 禁止使用大面积黑色左栏作为默认 light theme。
- 禁止使用黄色作为主按钮色。
- 禁止把 API Key / URL 表单放主界面。
- 禁止把 runtime status 重复显示多处。
- 禁止只用 Markdown 文本展示 diff/test/tool。
- 禁止视觉上像网页后台管理系统，要保留 macOS App 质感。

