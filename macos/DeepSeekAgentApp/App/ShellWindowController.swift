import AppKit
import WebKit

final class ShellWindowController: NSWindowController {
    private let sidecarManager: SidecarManager
    private let runtimeClient: SwitchableRuntimeClient
    private let settingsStore: RuntimeSettingsStore
    private let keychainStore: KeychainStore
    private let statusLabel = NSTextField(labelWithString: "")
    private let sidecarPathField = NSTextField(string: "")
    private let baseURLField = NSTextField(string: "")
    private let modelCombo = NSComboBox()
    private let apiKeyField = NSSecureTextField(string: "")
    private weak var webView: WKWebView?

    init(
        runtimeClient: SwitchableRuntimeClient,
        sidecarManager: SidecarManager,
        settingsStore: RuntimeSettingsStore = RuntimeSettingsStore(),
        keychainStore: KeychainStore = KeychainStore()
    ) {
        self.runtimeClient = runtimeClient
        self.sidecarManager = sidecarManager
        self.settingsStore = settingsStore
        self.keychainStore = keychainStore

        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1280, height: 820),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "DeepSeek Agent"
        window.minSize = NSSize(width: 1080, height: 640)
        super.init(window: window)
        window.contentView = makeRootView()
        refreshStatus()
    }

    required init?(coder: NSCoder) {
        nil
    }

    private func makeRootView() -> NSView {
        let splitView = NSSplitView()
        splitView.isVertical = true
        splitView.dividerStyle = .thin
        splitView.translatesAutoresizingMaskIntoConstraints = false

        let sidebar = makeSidebar()
        let webView = AppWebViewFactory.make(client: runtimeClient)
        self.webView = webView
        webView.translatesAutoresizingMaskIntoConstraints = false

        splitView.addArrangedSubview(sidebar)
        splitView.addArrangedSubview(webView)
        sidebar.widthAnchor.constraint(equalToConstant: 360).isActive = true

        let root = NSView()
        root.addSubview(splitView)
        NSLayoutConstraint.activate([
            splitView.leadingAnchor.constraint(equalTo: root.leadingAnchor),
            splitView.trailingAnchor.constraint(equalTo: root.trailingAnchor),
            splitView.topAnchor.constraint(equalTo: root.topAnchor),
            splitView.bottomAnchor.constraint(equalTo: root.bottomAnchor)
        ])
        return root
    }

    private func makeSidebar() -> NSView {
        let stack = NSStackView()
        stack.orientation = .vertical
        stack.alignment = .leading
        stack.spacing = 14
        stack.edgeInsets = NSEdgeInsets(top: 18, left: 18, bottom: 18, right: 18)
        stack.translatesAutoresizingMaskIntoConstraints = false

        let title = NSTextField(labelWithString: "DeepSeek Agent")
        title.font = .systemFont(ofSize: 20, weight: .bold)

        let subtitle = NSTextField(labelWithString: "Native shell, fake runtime ready.")
        subtitle.textColor = .secondaryLabelColor

        let projectLabel = NSTextField(labelWithString: "Project")
        let projectPath = NSTextField(string: FileManager.default.currentDirectoryPath)
        projectPath.placeholderString = "Choose a local project path"
        projectPath.isEditable = true

        let settingsLabel = NSTextField(labelWithString: "Settings")
        settingsLabel.font = .systemFont(ofSize: 13, weight: .semibold)

        let runtimeSettings = settingsStore.load()
        baseURLField.placeholderString = "https://api.deepseek.com/beta or https://your-endpoint/v1"
        baseURLField.stringValue = runtimeSettings.baseURL

        modelCombo.addItems(withObjectValues: [
            "deepseek-v4-flash",
            "deepseek-v4-pro"
        ])
        modelCombo.isEditable = true
        modelCombo.stringValue = runtimeSettings.model

        apiKeyField.placeholderString = "DeepSeek API key stored in Keychain"
        let saveAndStartButton = NSButton(title: "Save & Start Runtime", target: self, action: #selector(saveAndStartRuntime))
        let fakeRuntimeButton = NSButton(title: "Use Fake Runtime", target: self, action: #selector(useFakeRuntime))

        sidecarPathField.placeholderString = "Optional sidecar override; bundled binary is used by default"
        sidecarPathField.stringValue = runtimeSettings.sidecarPath

        let fakeMode = NSButton(checkboxWithTitle: "Fake runtime mode", target: nil, action: nil)
        fakeMode.state = ProcessInfo.processInfo.environment["DEEPSEEK_AGENT_RUNTIME"] == "real" ? .off : .on
        fakeMode.isEnabled = false

        statusLabel.lineBreakMode = .byWordWrapping
        statusLabel.maximumNumberOfLines = 4

        [
            title,
            subtitle,
            separator(),
            projectLabel,
            projectPath,
            separator(),
            settingsLabel,
            NSTextField(labelWithString: "DeepSeek URL"),
            baseURLField,
            NSTextField(labelWithString: "Model"),
            modelCombo,
            NSTextField(labelWithString: "API Key"),
            apiKeyField,
            saveAndStartButton,
            fakeRuntimeButton,
            NSTextField(labelWithString: "Advanced sidecar path"),
            sidecarPathField,
            fakeMode,
            separator(),
            statusLabel
        ].forEach { view in
            view.translatesAutoresizingMaskIntoConstraints = false
            stack.addArrangedSubview(view)
            view.widthAnchor.constraint(equalTo: stack.widthAnchor).isActive = true
        }

        let container = NSView()
        container.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            stack.topAnchor.constraint(equalTo: container.topAnchor),
            stack.bottomAnchor.constraint(lessThanOrEqualTo: container.bottomAnchor)
        ])
        return container
    }

    private func refreshStatus() {
        let status = sidecarManager.status
        let binary = sidecarManager.discoverBinary()?.path ?? "not found"
        let settings = settingsStore.load()
        statusLabel.stringValue = """
        Sidecar: \(status.state)
        Endpoint: \(settings.baseURL.isEmpty ? "not configured" : settings.baseURL)
        Model: \(settings.model)
        Host: 127.0.0.1
        Binary: \(binary)
        Token: Swift-owned per launch
        """
    }

    @objc private func saveAndStartRuntime() {
        do {
            let settings = RuntimeSettings(
                baseURL: baseURLField.stringValue,
                model: modelCombo.stringValue,
                sidecarPath: sidecarPathField.stringValue
            ).normalized
            try validate(settings: settings)

            if !apiKeyField.stringValue.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                try keychainStore.saveAPIKey(apiKeyField.stringValue)
            }
            settingsStore.save(settings)
            apiKeyField.stringValue = ""
            try startRealRuntime(settings: settings)
        } catch {
            statusLabel.stringValue = error.localizedDescription
        }
    }

    @objc private func useFakeRuntime() {
        sidecarManager.stop()
        runtimeClient.replace(with: FakeRuntimeClient(projectPath: FileManager.default.currentDirectoryPath))
        webView?.reload()
        refreshStatus()
    }

    private func startRealRuntime(settings: RuntimeSettings) throws {
        guard let apiKey = try RuntimeSecretResolver.resolveAPIKey(environment: ProcessInfo.processInfo.environment, keychainAPIKey: keychainStore.readAPIKey),
              !apiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw RuntimeClientError.unsupported("Enter a DeepSeek API key, then click Save & Start Runtime.")
        }

        guard let binary = sidecarManager.discoverBinary(userSelectedPath: settings.sidecarPath.isEmpty ? nil : settings.sidecarPath) else {
            throw SidecarError.binaryNotFound
        }

        sidecarManager.stop()
        let launch = try sidecarManager.start(binaryURL: binary, deepSeekAPIKey: apiKey, runtimeSettings: settings)
        runtimeClient.replace(with: DeepSeekTuiRuntimeClient(baseURL: launch.baseURL, authToken: launch.authToken))
        webView?.reload()
        statusLabel.stringValue = """
        Sidecar: connected
        Endpoint: \(settings.baseURL)
        Model: \(settings.model)
        Host: \(launch.baseURL.host ?? "127.0.0.1"):\(launch.baseURL.port ?? 0)
        Binary: \(binary.path)
        Token: Swift-owned per launch
        """
    }

    private func validate(settings: RuntimeSettings) throws {
        guard !settings.baseURL.isEmpty, let url = URL(string: settings.baseURL), let scheme = url.scheme else {
            throw RuntimeClientError.unsupported("Enter a valid DeepSeek URL, for example https://api.deepseek.com/beta or your /v1 endpoint.")
        }
        if scheme != "https" && !isLocalHTTP(url: url, scheme: scheme) {
            throw RuntimeClientError.unsupported("DeepSeek URL must use HTTPS unless it points to localhost.")
        }
        guard !settings.model.isEmpty else {
            throw RuntimeClientError.unsupported("Choose or enter a DeepSeek model.")
        }
    }

    private func isLocalHTTP(url: URL, scheme: String) -> Bool {
        guard scheme == "http", let host = url.host?.lowercased() else {
            return false
        }
        return host == "localhost" || host == "127.0.0.1" || host == "::1"
    }

    private func separator() -> NSView {
        let view = NSBox()
        view.boxType = .separator
        return view
    }
}
