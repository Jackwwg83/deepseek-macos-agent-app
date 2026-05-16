# UI QA Results

Date: 2026-05-16

Result: PASS with a Computer Use attachment blocker documented below.

## Product Direction

The current GUI is aligned to the DeepSeek-TUI operating model:

- First Run Setup configures endpoint, key, model, workspace, and optional Demo Mode.
- Thread Workbench is the primary surface.
- Model work appears as user, assistant, tool, approval, and tool-result timeline items.
- Risky tool execution is controlled by `Allow once`, `Always allow in this workspace`, `Deny`, and `Stop`.
- `Always allow in this workspace` persists a scoped rule and auto-approves later matching tool requests.
- Runtime Settings owns endpoint, key rotation, model defaults, TUI mode, approval policy, diagnostics, and workspace boundary.
- The app does not expose client-owned Review, Apply, Reject, Commit, Automations, or Skills product workflows.

## Visual QA Scope

Observed requirements for the packaged macOS window:

- Real macOS chrome is present.
- No fake traffic lights are rendered inside the WebView content.
- No blue/purple background bleed is visible inside the app window.
- First Run Setup and Thread Workbench fill the real macOS window without a nested app shell.
- Sidebar, thread surface, and inspector use neutral gray-white surfaces.
- DeepSeek-only model names are shown.

Evidence:

- Window capture: `/tmp/deepseek-agent-user-smoke-window-latest.png`
- Zip-download simulation WebView probe: `/tmp/deepseek-agent-user-smoke-probe.json`
- CoreGraphics window: owner `DeepSeek Agent`, layer `0`, bounds `1536x992`.

## Native Interaction Probe

Command: packaged app with `DEEPSEEK_AGENT_WEBVIEW_INTERACTION_PROBE=1`

Probe result: PASS.

Verified behavior:

- Enable Demo Mode.
- Complete setup without an API key.
- Reach `Thread Workbench`.
- Create a new thread.
- Send the `Explain this project` starter prompt.
- See `Run local verification`.
- Click `Allow once`.
- Observe `Approval granted`.
- Observe `Tool result`.
- Repeat with `Deny`.
- Repeat with `Stop`.
- Repeat with `Always allow in this workspace`.
- Send another matching prompt and observe saved-rule auto-approval.
- Confirm old client-owned Review/Apply/Commit workflow text is absent.

Probe evidence fields:

- `completedSetup: true`
- `freshThreadNoFiles: true`
- `sentPrompt: true`
- `sawApproval: true`
- `approved: true`
- `denied: true`
- `stopped: true`
- `alwaysAllowed: true`
- `autoAllowedFuture: true`
- `sawToolResult: true`
- `noClientCommitWorkflow: true`
- `interactionPassed: true`

## Button and State Coverage

Automated tests cover:

- `Complete Setup` in Demo Mode.
- API-key requirement before real-mode setup.
- `New thread`.
- starter prompt buttons.
- disabled empty-prompt send state.
- active prompt send.
- TUI mode selector.
- approval policy selector.
- workspace boundary display.
- approval `Allow once`.
- approval `Always allow in this workspace`.
- saved-rule auto-approval after `Always allow in this workspace`.
- auto-allow rule clearing.
- approval `Deny`.
- approval `Stop`.
- Runtime Settings entry.
- settings model picker.
- diagnostics.
- API-key rotation sheet.
- DeepSeek-only model list.
- visible HTTP warning for remote `http://` self-hosted endpoints.
- absence of old Review/Apply/Commit/Automations/Skills navigation.
- absence of fake macOS traffic lights inside the WebView.

## Computer Use Desktop Validation

Computer Use validation was attempted against the packaged app using the app name, bundle id, and full app path. All attempts returned:

```text
Computer Use server error -10005: cgWindowNotFound
```

Additional evidence:

- `list_apps` showed `DeepSeek Agent` running.
- System Events saw the process as visible but reported `count of windows = 0`.
- CoreGraphics simultaneously reported an onscreen `DeepSeek Agent` window.
- Window-level screenshot capture succeeded at `/tmp/deepseek-agent-user-smoke-window-latest.png`.

Conclusion: the app launches and renders, but the Computer Use/AX attachment path is blocked in this environment. Native smoke is covered by packaged WebView interaction probe plus direct window screenshot evidence.

## Live Runtime Smoke

The bundled `deepseek-tui serve` runtime was launched against the self-hosted DeepSeek-compatible endpoint `https://iruidong.com/v1` with model `deepseek-v4-flash`. A no-tool prompt that did not contain the exact target token completed with an agent message containing `REAL_RUNTIME_SMOKE_OK`.

## Commands

```bash
npm --prefix web run lint
npm --prefix web run typecheck
npm --prefix web test
npm --prefix web run build
bash scripts/dev/check.sh
bash scripts/dev/verify_tester_alpha.sh
DEEPSEEK_AGENT_WEBVIEW_INTERACTION_PROBE=1 bash scripts/dev/verify_tester_alpha.sh
```
