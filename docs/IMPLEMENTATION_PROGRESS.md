# Implementation Progress

## 2026-05-16 — GPT Pro UI Stabilization

### Architecture diagnosis

The current MVP is a native macOS AppKit shell hosting a WKWebView/React command center:

- AppKit owns the real `NSWindow`, menu commands, sidecar lifecycle, Keychain access, runtime settings, and packaged app launch.
- WKWebView/React owns onboarding, project command center, active thread timeline, review state, settings surface, and optional demo interaction UI.
- `deepseek-tui` remains bundled as the local sidecar runtime for tester packages.

This matches the stabilization-pack Stage 1 path: stabilize the existing hybrid UI first, then move more shell controls native in later alphas.

### Implemented stabilization items

- Removed fake in-content macOS traffic lights; the live app uses real native window chrome.
- Reworked the WebView UI into First Run Setup, Project Command Center, Active Thread, Review Changes, and Settings & Usage screens.
- Added intentional empty states for new chat and no-change review.
- Made visible controls either active or disabled with a reason/title.
- Added accessible labels to setup fields, model selectors, demo toggle, settings toggles, and accent controls.
- Changed Keychain access to use a stable service/account and silent non-interactive reads.
- Stopped reading Keychain during app launch unless an environment key is explicitly supplied for scripted real-runtime startup.
- Added in-app API key setup, rotate-key, delete-key, model persistence, diagnostics, and optional Demo Mode.
- Fixed the WK bridge request path so reply-style and callback-style native handlers do not double-post.
- Disabled direct WebView event push by default after native testing showed it could freeze WebKit during reply handling; the UI now refreshes runtime state through thread-detail polling while the runtime still records the event stream.
- Kept direct event push available only for explicit debugging with `DEEPSEEK_AGENT_ENABLE_WEBVIEW_EVENT_PUSH=1`.

### Current validation status

- First Run Setup defaults to real URL/key/model setup; Demo Mode is opt-in for offline diagnostics.
- Demo Mode works with no API key when explicitly enabled.
- Real packaged app launch reaches the project command center with the configured endpoint, key, and model.
- Real runtime model-turn smoke completes against the configured DeepSeek-compatible endpoint.
- Packaged app launches locally and renders the v2 UI.
- Packaged app interaction probe completes setup, creates a fresh thread, sends a prompt, sees the approval card, clicks Allow, and observes the final approval-granted assistant text.
- Full local check suite passes.
