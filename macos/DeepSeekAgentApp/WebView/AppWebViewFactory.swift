import Foundation
import WebKit

enum AppWebViewContentSource: Equatable {
    case remote(URL)
    case file(indexURL: URL, readAccessURL: URL)
    case fallbackHTML(String)
}

enum AppWebViewFactory {
    static func make(
        client: AgentRuntimeClient,
        nativeActions: NativeRuntimeBridgeActions? = nil,
        environment: [String: String] = ProcessInfo.processInfo.environment
    ) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = false

        let bridge: RuntimeBridgeController?
        if environment["DEEPSEEK_AGENT_DISABLE_NATIVE_BRIDGE"] == "1" {
            bridge = nil
        } else {
            let runtimeBridge = RuntimeBridgeController(client: client, nativeActions: nativeActions)
            configuration.userContentController.addScriptMessageHandler(runtimeBridge, contentWorld: .page, name: "deepseekAgent")
            bridge = runtimeBridge
        }

        let probe: AppWebViewProbe?
        if let probePath = environment["DEEPSEEK_AGENT_WEBVIEW_PROBE_PATH"], !probePath.isEmpty {
            let configuredProbe = AppWebViewProbe(
                outputURL: URL(fileURLWithPath: probePath),
                runInteractionProbe: environment["DEEPSEEK_AGENT_WEBVIEW_INTERACTION_PROBE"] == "1"
            )
            configuration.userContentController.add(configuredProbe, contentWorld: .page, name: "deepseekAgentProbe")
            probe = configuredProbe
        } else {
            probe = nil
        }

        let webView = WKWebView(frame: .zero, configuration: configuration)
        if let probe {
            webView.navigationDelegate = probe
            objc_setAssociatedObject(webView, &AssociatedKeys.probe, probe, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
        }
        bridge?.attach(to: webView)
        webView.customUserAgent = "DeepSeekAgentApp/0.1.0-alpha.7"
        loadContent(in: webView, environment: environment)
        probe?.scheduleWork(in: webView)
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
          body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #ffffff; color: #101828; }
          main { display: grid; place-items: center; min-height: 100vh; padding: 32px; }
          section { max-width: 640px; background: white; border: 1px solid rgba(16, 24, 40, 0.12); border-radius: 8px; padding: 24px; }
          code { background: #f1f3f5; color: #101828; padding: 2px 5px; border-radius: 4px; }
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

private final class AppWebViewProbe: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
    private let outputURL: URL
    private let runInteractionProbe: Bool
    private var didScheduleWork = false

    init(outputURL: URL, runInteractionProbe: Bool = false) {
        self.outputURL = outputURL
        self.runInteractionProbe = runInteractionProbe
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        scheduleWork(in: webView)
    }

    func scheduleWork(in webView: WKWebView) {
        guard !didScheduleWork else {
            return
        }
        didScheduleWork = true
        if runInteractionProbe {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak webView, outputURL] in
                guard let webView else { return }
                Self.runInteractionProbe(in: webView, outputURL: outputURL)
            }
            return
        }
        writeSnapshot(from: webView, event: "didFinish", delaySeconds: 0)
        for delay in [0.5, 1.5, 4.0, 8.0] {
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak webView, outputURL] in
                guard let webView else { return }
                Self.writeSnapshot(from: webView, to: outputURL, event: "snapshot", delaySeconds: delay)
            }
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if let body = message.body as? String {
            Self.writeRaw(body, to: outputURL)
        } else if let data = try? JSONSerialization.data(withJSONObject: message.body, options: [.prettyPrinted]),
                  let string = String(data: data, encoding: .utf8) {
            Self.writeRaw(string, to: outputURL)
        } else {
            Self.write(["event": "interactionProbeFailed", "error": "Probe posted a non-serializable message."], to: outputURL)
        }
    }

    private static func runInteractionProbe(in webView: WKWebView, outputURL: URL) {
        let script = """
        window.__deepseekAgentProbeResult = "";
        (() => {
          const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
          const text = () => document.body ? document.body.innerText : "";
          let posted = false;
          const postProbe = (value) => {
            if (posted) return;
            posted = true;
            const json = JSON.stringify(value);
            window.__deepseekAgentProbeResult = json;
            window.webkit?.messageHandlers?.deepseekAgentProbe?.postMessage(json);
          };
          const watchdog = setTimeout(() => {
            postProbe({
              event: "interactionProbe",
              interactionPassed: false,
              error: "Probe watchdog timed out",
              bodyText: text().slice(0, 2000)
            });
          }, 20000);
          const clickButton = (match) => {
            const buttons = Array.from(document.querySelectorAll("button"));
            const button = buttons.find((candidate) => {
              const label = candidate.getAttribute("aria-label") || candidate.innerText || "";
              return typeof match === "string" ? label.includes(match) : match.test(label);
            });
            if (!button) throw new Error(`Missing button: ${match}`);
            if (button.disabled) throw new Error(`Disabled button: ${match}`);
            button.click();
          };
          const waitForEnabledButton = async (match, timeout = 5000) => {
            const started = Date.now();
            while (Date.now() - started < timeout) {
              const buttons = Array.from(document.querySelectorAll("button"));
              const button = buttons.find((candidate) => {
                const label = candidate.getAttribute("aria-label") || candidate.innerText || "";
                return typeof match === "string" ? label.includes(match) : match.test(label);
              });
              if (button && !button.disabled) return true;
              await sleep(100);
            }
            throw new Error(`Timed out waiting for enabled button: ${match}`);
          };
          const waitForText = async (needle, timeout = 5000) => {
            const started = Date.now();
            while (Date.now() - started < timeout) {
              if (text().includes(needle)) return true;
              await sleep(100);
            }
            throw new Error(`Timed out waiting for: ${needle}`);
          };

          (async () => {
            const result = {
              event: "interactionProbe",
              completedSetup: false,
              freshThreadNoFiles: false,
              sentPrompt: false,
              sawApproval: false,
              approved: false,
              reviewedChanges: false,
              bodyText: ""
            };

            await waitForText("First Run Setup", 10000);
            clickButton("Enable Demo Mode");
            await sleep(100);
            clickButton("Complete Setup");
            await waitForText("Project Command Center");
            result.completedSetup = true;

            clickButton(/New thread/);
            await waitForText("New chat");
            result.freshThreadNoFiles = !text().includes("web/src/embedded/chat/App.tsx") && text().includes("No changed files yet");

            clickButton("Explain this project");
            await sleep(100);
            clickButton("Send prompt");
            result.sentPrompt = true;
            await sleep(2000);

            await waitForText("Run local verification");
            result.sawApproval = true;
            clickButton("Allow once");
            await waitForText("Approval granted");
            result.approved = true;

            clickButton("Review changes");
            await waitForText("web/src/embedded/chat/App.tsx");
            clickButton("Select web/src/embedded/chat/App.tsx");
            await waitForEnabledButton("Apply selected");
            clickButton("Apply selected");
            await waitForText("Accepted 1 file");
            result.reviewedChanges = text().includes("Commit 1 file");

            result.bodyText = text().slice(0, 2000);
            result.interactionPassed = result.completedSetup && result.freshThreadNoFiles && result.sentPrompt && result.sawApproval && result.approved && result.reviewedChanges;
            clearTimeout(watchdog);
            postProbe(result);
          })().catch((error) => {
            clearTimeout(watchdog);
            postProbe({
              event: "interactionProbe",
              interactionPassed: false,
              error: error instanceof Error ? error.message : String(error),
              bodyText: text().slice(0, 2000)
            });
          });
        })();
        "started";
        """
        Self.write(["event": "interactionProbeStarted"], to: outputURL)
        webView.evaluateJavaScript(script) { result, error in
            if let error {
                Self.write(["event": "interactionProbeFailed", "error": error.localizedDescription], to: outputURL)
                return
            }
            _ = result
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
          containsV2Shell: document.body ? (document.body.innerText.includes("DeepSeek Agent") && (document.body.innerText.includes("First Run Setup") || document.body.innerText.includes("Project Command Center") || document.body.innerText.includes("Active thread"))) : false,
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
