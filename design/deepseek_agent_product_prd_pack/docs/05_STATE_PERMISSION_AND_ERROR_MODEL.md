# 状态、权限与错误模型

## 1. Config model

```ts
type AppMode = "demo" | "real";

type AppConfig = {
  mode: AppMode;
  workspaceRoot?: string;
  defaultModel: "deepseek-v4-flash" | "deepseek-v4-pro";
  temperature: number;
  reasoningEffort: "low" | "medium" | "high";
  maxOutputTokens: number;
  autoApplySafeEdits: boolean;
  confirmDestructiveActions: boolean;
  codeSuggestions: boolean;
  terminalShell: "zsh" | "bash" | "fish";
  appearance: "light" | "dark" | "system";
  accentColor: "blue" | "purple" | "pink" | "orange" | "green" | "teal";
  sidecarPath?: string;
  runtimeHost: "127.0.0.1";
  runtimePort?: number;
};
```

## 2. Keychain model

### Service / Account

```text
service: app.deepseek.agent
account: deepseek_api_key
```

### 行为

- 保存 API key 时写入 Keychain。
- 启动时尝试读取。
- 读取失败不得触发系统登录钥匙串密码框。
- 失败时改为 App 内状态：`API key required`。

### 禁止

- 不要请求 Touch ID / user presence。
- 不要强制访问登录钥匙串密码。
- 不要在 UI 中明文显示完整 key。
- 不要把 key 写入普通 config JSON。

## 3. Permission model

### Operation types

```text
file.read
file.write
file.delete
shell.run
network.request
mcp.tool
patch.apply
git.commit
```

### Permission decision

```ts
type PermissionDecision = "allow_once" | "deny" | "stop_task";
```

### Risk levels

| Risk | 示例 | 默认行为 |
|---|---|---|
| Low | 读文件、查看 git status | 可自动或轻提示 |
| Medium | 写入普通文件、运行测试 | 需要用户确认，除非开启 auto-apply safe edits |
| High | 删除文件、覆盖配置、执行网络命令 | 必须确认 |
| Critical | 访问密钥、sudo、rm -rf、外部上传 | 默认拒绝或强确认 |

## 4. Runtime status model

```ts
type RuntimeStatus =
  | { kind: "not_configured" }
  | { kind: "starting" }
  | { kind: "healthy"; version: string }
  | { kind: "unavailable"; reason: string }
  | { kind: "incompatible"; version: string; required: string }
  | { kind: "crashed"; reason: string; logPath?: string };
```

## 5. API key status model

```ts
type ApiKeyStatus =
  | "not_set"
  | "configured"
  | "invalid"
  | "read_failed"
  | "saving"
  | "deleting";
```

### UI mapping

| 状态 | UI |
|---|---|
| not_set | API key required，显示输入框 |
| configured | Configured，隐藏 key |
| invalid | Invalid key，显示重新输入 |
| read_failed | Could not read key，显示重新输入，不弹系统密码框 |
| saving | 保存中 |
| deleting | 删除中 |

## 6. Error messages

### Runtime unavailable

```text
Runtime unavailable
DeepSeek-TUI sidecar is not running.
Actions: Restart runtime / Switch to Demo Mode / View logs
```

### API key missing

```text
API key required
Add your DeepSeek API key in Settings or continue in Demo Mode.
Actions: Open Settings / Use Demo Mode
```

### Network/API failure

```text
DeepSeek API unreachable
The runtime could not reach the configured DeepSeek endpoint.
Actions: Run diagnostics / Retry / Use Demo Mode
```

### No changed files

```text
No generated changes yet
Ask DeepSeek to modify code, then review the proposed files here.
```

### Permission denied

```text
Operation denied
DeepSeek skipped the requested tool call because you denied approval.
```

## 7. Empty states

| 页面 | 空状态文案 | CTA |
|---|---|---|
| Project list | No projects yet | Add project |
| Recent threads | No recent threads | New thread |
| Active thread | Ask DeepSeek to inspect, explain, or change this project | Focus composer |
| Review changes | No generated changes yet | Start an agent turn |
| Automations | Automations are not configured yet | Coming soon |
| Skills | No skills installed yet | Coming soon |
| Usage | No usage yet | Run a demo task |

## 8. Disabled-state rules

Every disabled control must have one of these explanations:

- No file selected
- No changes available
- Runtime unavailable
- API key required
- Demo Mode only
- Coming soon
- Current turn is running
- Commit message required

## 9. Data persistence

### Persist locally

- App config
- Project list
- Recent threads metadata
- UI preferences
- Last selected project
- Usage cache
- Runtime logs path

### Do not persist in plain text

- DeepSeek API key
- runtime auth token if sensitive

## 10. Trust indicators

UI should repeatedly reinforce:

- Local-first
- API key stored in Keychain
- Code stays on your Mac unless approved operation sends context to DeepSeek
- Sensitive operations require approval

Do not overpromise “zero data leaves your Mac,” because model calls necessarily send prompt/context to DeepSeek.
