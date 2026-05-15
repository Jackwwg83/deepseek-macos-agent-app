# 04 — 组件库规格

## 1. App Window

### 结构

- macOS traffic lights。
- App title + dropdown。
- 左侧 translucent sidebar。
- 中央 page surface。
- 右侧 inspector。

### 行为

- Inspector 可折叠。
- 左侧 sidebar 在窄窗口下保持 300px，中央压缩；极窄时 thread/review 页面应允许 horizontal scroll 或切换 compact mode。

## 2. Left Sidebar

### 组件

```text
AppTitle
NewThreadButton
NavItem
RecentThreadItem
ProjectTreeItem
AccountFooter
```

### RecentThreadItem 字段

- status icon。
- title。
- relative time。
- optional badge：Needs approval / Review。

### ProjectTreeItem 字段

- folder icon。
- name。
- expanded/collapsed。
- active indicator。

## 3. Thread Header

字段：

- context label：Active thread / Project / Review。
- title。
- status badge：REAL / DEMO / REVIEW / RUNNING。
- model/mode optional。
- overflow menu。

动作：

- Stop。
- Review。
- Fork。
- More。

## 4. Message / Timeline Cards

### User Message Card

- label：You。
- timestamp。
- body。
- attachments optional。

### Agent Response Card

- DS avatar。
- label：DeepSeek Agent。
- summary。
- bullet changes。
- timestamp。

### Files Changed Card

字段：

- title。
- total files。
- additions/deletions。
- file list。
- `+ N more files`。

动作：

- Open Review。
- Collapse/expand。

### Terminal/Test Card

字段：

- tabs：Terminal / Tests。
- status：All tests passed / Failed。
- duration。
- output preview。

动作：

- View full output。
- Request rerun。

## 5. Approval Card

必须字段：

```text
kind: shell | file_write | network | mcp | git | unknown
riskLevel: low | medium | high
summary
reason
target
preview
choices
```

按钮：

- Allow once。
- Deny。
- Stop thread。
- Add instruction。

高风险动作显示 warning icon 和明确原因。

## 6. Review Inspector

### Summary Tab

- summary text。
- additions/deletions。
- changed files。
- quick actions。
- runtime。

### Details Tab

- raw runtime events。
- usage/cost。
- approval history。
- logs link。

## 7. Review Queue

字段：

- progress：N of M files reviewed。
- additions/deletions。
- filter：All files / Needs review。
- file list with status。

文件状态：

- checked：reviewed。
- hollow circle：needs review。
- green check：applied。
- gray：rejected。

## 8. Diff Viewer

### Header

- file path。
- additions/deletions。
- files changed count。
- split/unified toggle。
- copy/open controls。

### Body

- line numbers。
- hunk header。
- addition/deletion/context。

### Footer / Related cards

- Files changed mini table。
- Change type / risk / impact。
- Test evidence。
- Agent explanation。

## 9. Settings Cards

### Account Card

- DS avatar。
- account email / label。
- Manage account button。

### API Key Card

- masked key。
- added date。
- rotate button。
- storage note：Keychain。

### Model Defaults Card

- model dropdown：deepseek-v4-flash / deepseek-v4-pro。
- temperature。
- reasoning effort。
- max output tokens。

### Workspace Preferences

- auto-apply safe edits。
- confirm destructive actions。
- code suggestions。
- default shell。

### Usage & Cost

- tabs：Overview / Token usage / Recent runs / Current model / Cache。
- metric cards。
- chart。

## 10. Runtime Status Card

字段：

- runtime name。
- version。
- mode：real/demo。
- API key configured。
- model。
- started time。
- duration。

动作：

- Restart runtime。
- View logs。
- Run diagnostics。

