import Foundation
import WebKit

enum AppWebViewContentSource: Equatable {
    case remote(URL)
    case file(indexURL: URL, readAccessURL: URL)
    case fallbackHTML(String)
}

enum AppWebViewFactory {
    static func make(client: AgentRuntimeClient, environment: [String: String] = ProcessInfo.processInfo.environment) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = false

        let bridge: RuntimeBridgeController?
        if environment["DEEPSEEK_AGENT_DISABLE_NATIVE_BRIDGE"] == "1" {
            bridge = nil
        } else {
            let runtimeBridge = RuntimeBridgeController(client: client)
            configuration.userContentController.addScriptMessageHandler(runtimeBridge, contentWorld: .page, name: "deepseekAgent")
            bridge = runtimeBridge
        }

        let webView = WKWebView(frame: .zero, configuration: configuration)
        if let probePath = environment["DEEPSEEK_AGENT_WEBVIEW_PROBE_PATH"], !probePath.isEmpty {
            let probe = AppWebViewProbe(outputURL: URL(fileURLWithPath: probePath))
            webView.navigationDelegate = probe
            objc_setAssociatedObject(webView, &AssociatedKeys.probe, probe, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
        }
        bridge?.attach(to: webView)
        webView.customUserAgent = "DeepSeekAgentApp/0.1.0"
        loadContent(in: webView, environment: environment)
        if let bridge {
            objc_setAssociatedObject(webView, &AssociatedKeys.bridge, bridge, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
        }
        return webView
    }

    private static func loadContent(in webView: WKWebView, environment: [String: String]) {
        switch resolveContentSource(environment: environment) {
        case .remote(let url):
            webView.load(URLRequest(url: url))
        case .file(let indexURL, let readAccessURL):
            webView.loadFileURL(indexURL, allowingReadAccessTo: readAccessURL)
        case .fallbackHTML(let html):
            webView.loadHTMLString(html, baseURL: nil)
        }
    }

    static func resolveContentSource(
        environment: [String: String],
        bundleResourceURL: URL? = Bundle.main.resourceURL,
        fileManager: FileManager = .default
    ) -> AppWebViewContentSource {
        if let urlString = environment["DEEPSEEK_AGENT_WEB_URL"], let url = URL(string: urlString) {
            return .remote(url)
        }

        if let dist = environment["DEEPSEEK_AGENT_WEB_DIST"] {
            let distURL = URL(fileURLWithPath: dist, isDirectory: true)
            let indexURL = distURL.appendingPathComponent("index.html")
            if fileManager.fileExists(atPath: indexURL.path) {
                return .file(indexURL: indexURL, readAccessURL: distURL)
            }
        }

        if let bundledWebURL = bundleResourceURL?.appendingPathComponent("web", isDirectory: true) {
            let bundledIndexURL = bundledWebURL.appendingPathComponent("index.html")
            if fileManager.fileExists(atPath: bundledIndexURL.path) {
                return .file(indexURL: bundledIndexURL, readAccessURL: bundledWebURL)
            }
        }

        return .fallbackHTML(Self.fallbackHTML)
    }

    private static let fallbackHTML = """
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #f4f1e8; color: #25352c; }
          main { display: grid; place-items: center; min-height: 100vh; padding: 32px; }
          section { max-width: 640px; background: white; border: 1px solid #dfddcf; border-radius: 8px; padding: 24px; }
          code { background: #172119; color: #f4f1e8; padding: 2px 5px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <main>
          <section>
            <h1>DeepSeek Agent Web UI is not built</h1>
            <p>Run <code>cd web && npm run build</code>, then relaunch with <code>DEEPSEEK_AGENT_WEB_DIST=/absolute/path/to/web/dist</code>.</p>
          </section>
        </main>
      </body>
    </html>
    """
}

private enum AssociatedKeys {
    static var bridge: UInt8 = 0
    static var probe: UInt8 = 0
}

private final class AppWebViewProbe: NSObject, WKNavigationDelegate {
    private let outputURL: URL

    init(outputURL: URL) {
        self.outputURL = outputURL
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        writeSnapshot(from: webView, event: "didFinish", delaySeconds: 0)
        for delay in [0.5, 1.5, 4.0, 8.0] {
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak webView, outputURL] in
                guard let webView else { return }
                Self.writeSnapshot(from: webView, to: outputURL, event: "snapshot", delaySeconds: delay)
            }
        }
    }

    private func writeSnapshot(from webView: WKWebView, event: String, delaySeconds: Double) {
        Self.writeSnapshot(from: webView, to: outputURL, event: event, delaySeconds: delaySeconds)
    }

    private static func writeSnapshot(from webView: WKWebView, to outputURL: URL, event: String, delaySeconds: Double) {
        let script = """
        JSON.stringify({
          event: "\(event)",
          delaySeconds: \(delaySeconds),
          url: location.href,
          readyState: document.readyState,
          title: document.title,
          bodyText: document.body ? document.body.innerText.slice(0, 2000) : null,
          bodyHTMLLength: document.body ? document.body.innerHTML.length : -1,
          rootHTMLLength: document.getElementById("root") ? document.getElementById("root").innerHTML.length : -1,
          containsStarterChat: document.body ? document.body.innerText.includes("New chat") : false,
          containsBooting: document.body ? document.body.innerText.includes("BOOTING") : false,
          containsLoadingThread: document.body ? document.body.innerText.includes("Loading thread") : false,
          bodyBackground: document.body ? getComputedStyle(document.body).backgroundColor : null,
          scripts: Array.from(document.scripts).map((script) => script.src || "inline"),
          stylesheets: Array.from(document.styleSheets).map((sheet) => sheet.href || "inline")
        })
        """
        webView.evaluateJavaScript(script) { result, error in
            if let error {
                Self.write(["event": "evaluateFailed", "error": error.localizedDescription], to: outputURL)
                return
            }
            Self.writeRaw(String(describing: result ?? "null"), to: outputURL)
        }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        Self.write(["event": "didFail", "error": error.localizedDescription], to: outputURL)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        Self.write(["event": "didFailProvisionalNavigation", "error": error.localizedDescription], to: outputURL)
    }

    private static func write(_ value: [String: String], to url: URL) {
        guard let data = try? JSONSerialization.data(withJSONObject: value, options: [.prettyPrinted]),
              let string = String(data: data, encoding: .utf8) else {
            return
        }
        writeRaw(string, to: url)
    }

    private static func writeRaw(_ string: String, to url: URL) {
        try? string.write(to: url, atomically: true, encoding: .utf8)
    }
}
