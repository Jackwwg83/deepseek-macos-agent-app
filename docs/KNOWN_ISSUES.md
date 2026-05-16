# Known Issues

## Not notarized

The tester alpha is ad-hoc signed and not notarized. Gatekeeper may block first launch after download. Testers should right-click `DeepSeek Agent.app` and choose `Open`.

## Direct WebView event push disabled by default

Direct native-to-WebView event push is disabled by default because it froze WebKit during reply-handler interaction testing. The runtime still records events, and the UI refreshes through `getThread` polling. Direct push can be tested explicitly with `DEEPSEEK_AGENT_ENABLE_WEBVIEW_EVENT_PUSH=1`, but it is not part of the tester alpha default path.
