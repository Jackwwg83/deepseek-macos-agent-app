# 05 — macOS 菜单、命令面板与快捷键

## 1. 菜单栏结构

```text
DeepSeek Agent
├─ About DeepSeek Agent
├─ Check for Updates…
├─ Settings…                         ⌘,
├─ Runtime Diagnostics…
├─ Services
├─ Hide DeepSeek Agent                ⌘H
├─ Hide Others                        ⌥⌘H
└─ Quit DeepSeek Agent                ⌘Q

File
├─ New Thread                         ⌘N
├─ Open Workspace…                    ⌘O
├─ Add Project…
├─ Close Thread                       ⌘W
├─ Export Thread…
└─ Reveal Workspace in Finder

Edit
├─ Undo                               ⌘Z
├─ Redo                               ⇧⌘Z
├─ Cut / Copy / Paste
├─ Select All                         ⌘A
└─ Find in Thread…                    ⌘F

View
├─ Command Palette…                   ⌘K
├─ Toggle Inspector                   ⌥⌘I
├─ Toggle Sidebar                     ⌥⌘S
├─ Show Project Command Center        ⇧⌘P
├─ Show Review Queue                  ⇧⌘R
├─ Show Runtime Logs                  ⇧⌘L
└─ Appearance
   ├─ Light
   ├─ Dark
   └─ System

Thread
├─ Start / Send                       ⌘↩
├─ Stop Current Turn                  ⌘.
├─ Add Instruction                    ⇧⌘I
├─ Continue Thread                    ⇧⌘↩
├─ Fork Thread
├─ Archive Thread
└─ Delete Thread…

Agent
├─ Mode
│  ├─ Plan Only
│  ├─ Agent
│  └─ Trusted Auto
├─ Model
│  ├─ deepseek-v4-flash
│  └─ deepseek-v4-pro
├─ Request Tests                      ⇧⌘T
├─ Compact Context
└─ Clear Runtime Cache…

Review
├─ Open Review                        ⌘R
├─ Apply Selected                     ⌘A
├─ Reject Selected                    ⌘D
├─ Request More Tests                 ⇧⌘T
├─ Open Diff in Editor
├─ Commit Selected…                   ⇧⌘C
└─ Discard All Changes…

Window
├─ Minimize                           ⌘M
├─ Zoom
├─ Bring All to Front
└─ Open New Window                    ⇧⌘N

Help
├─ DeepSeek Agent Help
├─ DeepSeek API Docs
├─ Report Issue…
├─ Copy Diagnostics
└─ View Logs
```

## 2. 命令面板 Cmd+K

命令面板用于快速执行全局动作。

### 2.1 命令分类

| 分类 | 命令 |
|---|---|
| Thread | New thread、Stop turn、Continue、Fork、Archive |
| Review | Open review、Apply selected、Reject selected、Request tests |
| Project | Open workspace、Open in IDE、Run tests、View diffs |
| Runtime | Restart runtime、View logs、Run diagnostics |
| Settings | API key、Model defaults、Usage、Appearance |

### 2.2 搜索行为

- 支持 fuzzy search。
- 显示快捷键。
- 根据当前页面排序相关命令。
- 危险命令必须二次确认。

## 3. 右键菜单

### 3.1 Thread 右键

```text
Open
Continue
Fork
Rename
Archive
Delete…
Copy thread link
```

### 3.2 Project 右键

```text
Open Project Command Center
New thread in this project
Open in IDE
Reveal in Finder
Project settings
Remove from sidebar
```

### 3.3 Changed file 右键

```text
Open diff
Open in editor
Mark reviewed
Apply file
Reject file
Copy path
```

## 4. 快捷键清单

| 快捷键 | 动作 |
|---|---|
| `⌘N` | New thread |
| `⌘K` | Command palette |
| `⌘,` | Settings |
| `⌘R` | Open Review |
| `⇧⌘R` | Review Queue / refresh current review |
| `⇧⌘T` | Request tests / Run tests |
| `⌘.` | Stop current turn |
| `⌘↩` | Send / start |
| `⇧⌘↩` | Continue thread |
| `⌥⌘I` | Toggle inspector |
| `⌥⌘S` | Toggle sidebar |
| `⌘O` | Open workspace |
| `⌘F` | Find in thread |

## 5. 菜单实现原则

- 菜单项必须与 UI 中的主要动作一致。
- Disabled 状态要有 tooltip/原因。
- 高风险动作：`Delete Thread`、`Discard All Changes`、`Trusted Auto` 必须二次确认。
- Demo Mode 下真实 runtime 命令显示 disabled 或 demo warning。

