# UI QA Results

Date: 2026-05-16

## Visual QA

- Window capture: `/tmp/deepseek-agent-window.png`
- Alpha.7 root-layer recheck capture: `/tmp/deepseek-agent-alpha7-window.png`
- Result: PASS

Observed in the packaged app window:

- Real macOS chrome is present.
- No fake red/yellow/green traffic lights are rendered inside the WebView content.
- No blue/purple background bleed is visible inside the app window.
- First Run Setup no longer has a nested window/card shell around the main layout; the rail and setup content fill the real macOS window.
- Sidebar and inspector backgrounds use neutral gray-white surfaces rather than a blue outer frame.
- First Run Setup uses the v2 light Codex-inspired visual system.
- Sidebar/setup card and main content align cleanly.
- DeepSeek-only model names are shown.
- Alpha.7 recheck: the app content fills the real macOS window. The only pixels outside the white content area are native macOS titlebar/window corner/shadow pixels, not a WebView root shell or blue app background.

## Native interaction probe

Command: packaged app with `DEEPSEEK_AGENT_WEBVIEW_INTERACTION_PROBE=1`

Result: PASS

Probe evidence:

- `completedSetup: true`
- `freshThreadNoFiles: true`
- `sentPrompt: true`
- `sawApproval: true`
- `approved: true`
- `reviewedChanges: true`
- `interactionPassed: true`

The probe actively enabled Demo Mode, completed setup without an API key, created a new thread, confirmed the thread has no changed files, sent `Explain this project`, waited for `Run local verification`, clicked `Allow once`, observed `Approval granted`, opened `Review changes`, selected `web/src/embedded/chat/App.tsx`, clicked `Apply selected`, and confirmed `Commit 1 file` is available. This is an offline regression check only; the tester path is real URL/key/model setup.

## Real runtime probe

Command: packaged app launched with user-supplied `DEEPSEEK_BASE_URL`, `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`, and `DEEPSEEK_AGENT_RUNTIME=real`

Result: PASS

Probe evidence:

- Main screen reached `Project Command Center`.
- Runtime mode rendered as `real`.
- Runtime version rendered as `0.8.37`.
- Model rendered as `deepseek-v4-flash`.
- API key status rendered as `Configured`.
- No `BOOTING` or `Loading thread` state persisted.

A separate bundled-sidecar model-turn smoke completed against the configured DeepSeek-compatible endpoint and model.

## Button and state coverage

Automated tests cover:

- `Complete Setup` in Demo Mode.
- `New thread`.
- starter prompt buttons.
- empty-prompt disabled `Send prompt`.
- active `Send prompt` with text.
- `Review changes` no-change state.
- disabled `Open in editor`, `Apply selected`, `Reject selected`, and `Commit 0 files`.
- Settings entry.
- Settings model picker.
- Settings toggles.
- `Run diagnostics`.
- `Rotate key` sheet.
- approval `Allow once`.
- approval `Deny` and `Stop task`.
- Automations and Skills skeleton pages.
- generated review files, `Apply selected`, `Reject selected`, and commit enablement after accepted files.
- real-runtime API key status label.

## Computer Use desktop validation

Computer Use was first blocked by a WindowServer/AX session error, then recovered after a fresh packaged-app launch and was used for live desktop validation.

Result: PASS

Evidence:

- `get_app_state` attached to the packaged `DeepSeek Agent.app` WebView and returned the live accessibility tree.
- Setup: toggled Demo Mode and completed setup without an API key.
- Project Command Center: confirmed runtime status, DeepSeek-only model, and neutral full-window layout.
- Thread: created a new thread, selected `Explain this project`, sent the prompt, and reached `Run local verification`.
- Approval: clicked `Allow once`; the card changed to `Approved`, and Stop/Deny/Allow buttons disappeared after completion.
- Review: opened review, selected `web/src/embedded/chat/App.tsx`, clicked `Apply selected`, and confirmed `Commit 1 file` enabled.
- Automations: opened the skeleton page, clicked `View planned templates`, and verified unimplemented scheduler controls are disabled.
- Skills: opened the skeleton page, clicked `Browse planned skills`, and verified unimplemented import/validate controls are disabled.
- Settings: opened diagnostics, Rotate key, and Manage account flows; verified no macOS Keychain password prompt appeared.

After the alpha.7 version/root-layer patch, Computer Use returned `cgWindowNotFound` for a newly relaunched package even though the macOS window list showed an onscreen `DeepSeek Agent` window. The alpha.7 visual recheck therefore used a window-level screenshot capture plus the packaged render probe. The prior live Computer Use product journey remains valid because the patch only changed version metadata, fallback/native background colors, and user-agent text.

## Commands run

```bash
npm run lint
npm run typecheck
npm test
swift test
bash scripts/dev/check.sh
bash scripts/dev/verify_tester_alpha.sh
```

All listed commands passed.
