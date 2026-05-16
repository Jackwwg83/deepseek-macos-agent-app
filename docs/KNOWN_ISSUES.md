# Known Issues

## Not notarized

The tester alpha is ad-hoc signed and not notarized. Gatekeeper may block first launch after download. Testers should right-click `DeepSeek Agent.app` and choose `Open`.

## Direct WebView event push disabled by default

Direct native-to-WebView event push is disabled by default because it froze WebKit during reply-handler interaction testing. The runtime still records events, and the UI refreshes through `getThread` polling. Direct push can be tested explicitly with `DEEPSEEK_AGENT_ENABLE_WEBVIEW_EVENT_PUSH=1`, but it is not part of the tester alpha default path.

## Computer Use attachment in this environment

Computer Use currently returns `cgWindowNotFound` for the packaged app in this local environment. System Events reports the process as visible but with zero Accessibility windows, while CoreGraphics reports an onscreen `DeepSeek Agent` window and `screencapture -l` succeeds. Tester launch is still covered by packaged WebView probes and direct screenshots; this is a local automation attachment limitation, not a known app launch blocker.
