# Tester Alpha Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a tester-ready macOS alpha deliverable for DeepSeek Agent App.

**Architecture:** Keep the existing SwiftPM/AppKit app and React WebView UI, then package them into a standard `.app` bundle with `web/dist` and the DeepSeek-TUI sidecar binary under `Contents/Resources`. Provide a launcher script for real-runtime tester use and a verification script that launches the packaged app from the deliverable.

**Tech Stack:** SwiftPM/AppKit/WKWebView, React/Vite/TypeScript, Bash packaging scripts, `codesign`, `ditto`, DeepSeek-TUI Runtime API.

---

### Task 1: Bundle Web Resource Resolution

**Files:**
- Modify: `macos/DeepSeekAgentApp/WebView/AppWebViewFactory.swift`
- Create: `macos/Tests/DeepSeekAgentAppTests/AppWebViewFactoryTests.swift`

- [x] Write a failing XCTest that expects `AppWebViewFactory` to resolve `Contents/Resources/web/index.html` when no dev env variables are present.
- [x] Run `swift test --filter AppWebViewFactoryTests` and confirm it fails because the resolver is missing.
- [x] Add a small resolver that checks `DEEPSEEK_AGENT_WEB_URL`, then `DEEPSEEK_AGENT_WEB_DIST`, then bundled `web/index.html`, then fallback HTML.
- [x] Re-run `swift test --filter AppWebViewFactoryTests` and confirm it passes.

### Task 2: Tester Alpha Packaging Script

**Files:**
- Create: `scripts/dev/package_tester_alpha.sh`

- [x] Build `web/dist` and `macos/.build/debug/DeepSeekAgentApp`.
- [x] Require an executable DeepSeek-TUI binary from `DEEPSEEK_TUI_BIN` or `../DeepSeek-TUI/target/debug/deepseek-tui`.
- [x] Create `build/tester-alpha/DeepSeek Agent.app` with `Contents/MacOS/DeepSeekAgentApp`, `Contents/Resources/web`, `Contents/Resources/bin/deepseek-tui`, and license/notice files.
- [x] Ensure testers configure DeepSeek URL, API key, and model inside the native settings panel without requiring terminal environment variables.
- [x] Ad-hoc sign the app if `codesign` is available.
- [x] Create `build/tester-alpha/DeepSeek-Agent-alpha-macos.zip` and checksum files.

### Task 3: Deliverable Verification Script

**Files:**
- Create: `scripts/dev/verify_tester_alpha.sh`
- Modify: `scripts/dev/check.sh`

- [x] Verify `Info.plist`, executable bit, bundled web UI, bundled sidecar binary, license notice, zip, and checksums.
- [x] Run `codesign --verify --deep --strict` when a signature is present.
- [x] Launch `DeepSeek Agent.app/Contents/MacOS/DeepSeekAgentApp` in fake mode from the packaged app and require rendered fake runtime UI.
- [x] Add `package_tester_alpha.sh` and `verify_tester_alpha.sh` to the full check path.

### Task 4: Tester Instructions and Evidence

**Files:**
- Create: `docs/TESTER_ALPHA_DELIVERY.md`
- Modify: `README.md`
- Modify: `docs/06_TEST_PLAN.md`
- Modify: `docs/12_ACCEPTANCE_CHECKLIST.md`
- Modify: `docs/PROGRESS.md`

- [x] Document artifact paths, tester launch flow, API key handling, endpoint/model defaults, quarantine workaround, and known unsigned/notarization limitation.
- [x] Record verification commands and outcomes.
- [x] Confirm no provided API key or runtime bearer token is present in tracked files or package text.

### Task 5: Final Verification

**Commands:**
- `bash scripts/dev/check.sh`
- `bash scripts/dev/package_tester_alpha.sh`
- `bash scripts/dev/verify_tester_alpha.sh`
- Real-runtime sidecar model-turn smoke with the provided endpoint/key, redacting the key from output.
- Packaged real-mode launch smoke using `DeepSeek Agent.app/Contents/MacOS/DeepSeekAgentApp`.

**Completion Rule:** Stop only when every command passes and the deliverable zip exists, or report the exact blocker and command output.
