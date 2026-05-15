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
    private var runtimeStartupGeneration = 0
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
            contentRect: NSRect(x: 0, y: 0, width: 1536, height: 960),
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        window.title = "DeepSeek Agent"
        window.titleVisibility = .hidden
        window.titlebarAppearsTransparent = true
        window.isMovableByWindowBackground = true
        window.backgroundColor = .clear
        window.minSize = NSSize(width: 1180, height: 720)
        super.init(window: window)
        window.contentView = makeRootView()
        refreshStatus()
    }

    required init?(coder: NSCoder) {
        nil
    }

    private func makeRootView() -> NSView {
        let webView = AppWebViewFactory.make(client: runtimeClient, nativeActions: makeNativeBridgeActions())
        self.webView = webView
        webView.translatesAutoresizingMaskIntoConstraints = false

        let root = NSView()
        root.wantsLayer = true
        root.layer?.backgroundColor = NSColor.clear.cgColor
        root.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.leadingAnchor.constraint(equalTo: root.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: root.trailingAnchor),
            webView.topAnchor.constraint(equalTo: root.topAnchor),
            webView.bottomAnchor.constraint(equalTo: root.bottomAnchor)
        ])
        return root
    }

    private func makeNativeBridgeActions() -> NativeRuntimeBridgeActions {
        NativeRuntimeBridgeActions(
            getRuntimeSettings: { [weak self] in
                guard let self else { throw RuntimeClientError.unsupported("Window is no longer available.") }
                return try self.runtimeSettingsSnapshot()
            },
            saveRuntimeSettings: { [weak self] payload in
                guard let self else { throw RuntimeClientError.unsupported("Window is no longer available.") }
                return try self.saveRuntimeSettingsFromWeb(payload)
            },
            useDemoRuntime: { [weak self] in
                guard let self else { throw RuntimeClientError.unsupported("Window is no longer available.") }
                return try self.useDemoRuntimeFromWeb()
            }
        )
    }

    private func makeSidebar() -> NSView {
        let stack = NSStackView()
        stack.orientation = .vertical
        stack.alignment = .leading
        stack.spacing = 10
        stack.edgeInsets = NSEdgeInsets(top: 18, left: 16, bottom: 18, right: 16)
        stack.translatesAutoresizingMaskIntoConstraints = false

        let title = sidebarLabel("Connection", size: 18, weight: .bold, color: .labelColor)
        let subtitle = sidebarLabel("URL, API key, and model", size: 12, weight: .regular, color: .secondaryLabelColor)

        let runtimeSettings = settingsStore.load()
        baseURLField.placeholderString = "https://api.deepseek.com/beta or http://your-host:port/v1"
        baseURLField.stringValue = runtimeSettings.baseURL
        configureInputField(baseURLField)

        modelCombo.addItems(withObjectValues: [
            "deepseek-v4-flash",
            "deepseek-v4-pro"
        ])
        modelCombo.isEditable = true
        modelCombo.completes = true
        modelCombo.stringValue = runtimeSettings.model
        configureInputField(modelCombo)

        apiKeyField.placeholderString = "Paste API key"
        configureInputField(apiKeyField)

        let saveAndStartButton = NSButton(title: "Start DeepSeek", target: self, action: #selector(saveAndStartRuntime))
        let fakeRuntimeButton = NSButton(title: "Demo Mode", target: self, action: #selector(useFakeRuntime))
        configureActionButton(saveAndStartButton, emphasized: true)
        configureActionButton(fakeRuntimeButton, emphasized: false)

        sidecarPathField.placeholderString = "Optional sidecar binary path"
        sidecarPathField.stringValue = runtimeSettings.sidecarPath
        configureInputField(sidecarPathField)

        statusLabel.lineBreakMode = .byWordWrapping
        statusLabel.maximumNumberOfLines = 6
        statusLabel.font = .monospacedSystemFont(ofSize: 11, weight: .regular)
        statusLabel.textColor = .secondaryLabelColor

        [
            title,
            subtitle,
            separator(),
            formLabel("DeepSeek URL"),
            baseURLField,
            formLabel("Model"),
            modelCombo,
            formLabel("API Key"),
            apiKeyField,
            saveAndStartButton,
            fakeRuntimeButton,
            separator(),
            formLabel("Status"),
            statusLabel
        ].forEach { view in
            view.translatesAutoresizingMaskIntoConstraints = false
            stack.addArrangedSubview(view)
            view.widthAnchor.constraint(equalTo: stack.widthAnchor).isActive = true
        }

        let container = NSView()
        container.wantsLayer = true
        container.layer?.backgroundColor = NSColor(calibratedRed: 0.957, green: 0.949, blue: 0.925, alpha: 1).cgColor
        container.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            stack.topAnchor.constraint(equalTo: container.topAnchor),
            stack.bottomAnchor.constraint(lessThanOrEqualTo: container.bottomAnchor)
        ])
        return container
    }

    private func sidebarLabel(_ text: String, size: CGFloat, weight: NSFont.Weight, color: NSColor) -> NSTextField {
        let label = NSTextField(labelWithString: text)
        label.font = .systemFont(ofSize: size, weight: weight)
        label.textColor = color
        label.lineBreakMode = .byTruncatingTail
        return label
    }

    private func formLabel(_ text: String) -> NSTextField {
        sidebarLabel(text, size: 11, weight: .semibold, color: .secondaryLabelColor)
    }

    private func configureInputField(_ field: NSTextField) {
        field.font = .systemFont(ofSize: 12)
        field.controlSize = .regular
        field.bezelStyle = .roundedBezel
        field.drawsBackground = true
        field.backgroundColor = .textBackgroundColor
        field.heightAnchor.constraint(equalToConstant: 32).isActive = true
    }

    private func configureActionButton(_ button: NSButton, emphasized: Bool) {
        button.bezelStyle = .rounded
        button.controlSize = .regular
        button.font = .systemFont(ofSize: 12, weight: emphasized ? .semibold : .regular)
        button.heightAnchor.constraint(equalToConstant: 32).isActive = true
        if emphasized {
            button.bezelColor = NSColor(calibratedRed: 0.949, green: 0.718, blue: 0.322, alpha: 1)
        }
    }

    private func refreshStatus() {
        let status = sidecarManager.status
        let binary = sidecarManager.discoverBinary() == nil ? "not found" : "available"
        let settings = settingsStore.load()
        statusLabel.stringValue = statusText([
            "Runtime: \(status.state)",
            "URL: \(settings.baseURL.isEmpty ? "not set" : "saved")",
            "Model: \(settings.model)",
            "Sidecar: \(binary)"
        ], settings: settings)
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
        switchToFakeRuntime(reloadWebView: true)
    }

    @objc func newThreadMenu(_ sender: Any?) {
        dispatchWebCommand("newThread")
    }

    @objc func commandPaletteMenu(_ sender: Any?) {
        dispatchWebCommand("commandPalette")
    }

    @objc func settingsMenu(_ sender: Any?) {
        dispatchWebCommand("settings")
    }

    @objc func reviewMenu(_ sender: Any?) {
        dispatchWebCommand("review")
    }

    @objc func stopCurrentTurnMenu(_ sender: Any?) {
        dispatchWebCommand("stopTurn")
    }

    @objc func demoRuntimeMenu(_ sender: Any?) {
        switchToFakeRuntime(reloadWebView: false)
        dispatchWebCommand("demoRuntime")
    }

    private func dispatchWebCommand(_ command: String) {
        guard let data = try? JSONEncoder().encode(["command": command]),
              let json = String(data: data, encoding: .utf8) else {
            return
        }
        webView?.evaluateJavaScript("window.dispatchEvent(new CustomEvent('deepseek:native-command', { detail: \(json) }));")
    }

    private func switchToFakeRuntime(reloadWebView: Bool) {
        runtimeStartupGeneration += 1
        sidecarManager.stop()
        runtimeClient.replace(with: FakeRuntimeClient(projectPath: FileManager.default.currentDirectoryPath))
        if reloadWebView {
            webView?.reload()
        }
        refreshStatus()
    }

    private func runtimeSettingsSnapshot() throws -> RuntimeSettingsSnapshot {
        let settings = settingsStore.load()
        let apiKey = try RuntimeSecretResolver.resolveAPIKey(
            environment: ProcessInfo.processInfo.environment,
            keychainAPIKey: keychainStore.readAPIKey
        )
        return RuntimeSettingsSnapshot(
            baseURL: settings.baseURL,
            model: settings.model,
            sidecarPath: settings.sidecarPath,
            hasAPIKey: !(apiKey ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        )
    }

    private func saveRuntimeSettingsFromWeb(_ payload: SaveRuntimeSettingsPayload) throws -> RuntimeSettingsSnapshot {
        let current = settingsStore.load()
        let settings = RuntimeSettings(
            baseURL: payload.baseURL,
            model: payload.model,
            sidecarPath: payload.sidecarPath ?? current.sidecarPath
        ).normalized
        try validate(settings: settings)

        if let apiKey = payload.apiKey?.trimmingCharacters(in: .whitespacesAndNewlines), !apiKey.isEmpty {
            try keychainStore.saveAPIKey(apiKey)
        }
        settingsStore.save(settings)
        try startRealRuntime(settings: settings)
        return try runtimeSettingsSnapshot()
    }

    private func useDemoRuntimeFromWeb() throws -> RuntimeSettingsSnapshot {
        switchToFakeRuntime(reloadWebView: false)
        return try runtimeSettingsSnapshot()
    }

    private func startRealRuntime(settings: RuntimeSettings) throws {
        guard let apiKey = try RuntimeSecretResolver.resolveAPIKey(environment: ProcessInfo.processInfo.environment, keychainAPIKey: keychainStore.readAPIKey),
              !apiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw RuntimeClientError.unsupported("Enter a DeepSeek API key, then click Start DeepSeek.")
        }

        guard let binary = sidecarManager.discoverBinary(userSelectedPath: settings.sidecarPath.isEmpty ? nil : settings.sidecarPath) else {
            throw SidecarError.binaryNotFound
        }

        runtimeStartupGeneration += 1
        let startupGeneration = runtimeStartupGeneration
        sidecarManager.stop()
        let launch = try sidecarManager.start(binaryURL: binary, deepSeekAPIKey: apiKey, runtimeSettings: settings)
        let client = DeepSeekTuiRuntimeClient(baseURL: launch.baseURL, authToken: launch.authToken)
        statusLabel.stringValue = statusText([
            "Runtime: starting",
            "URL: saved",
            "Model: \(settings.model)",
            "Local sidecar: \(launch.baseURL.host ?? "127.0.0.1"):\(launch.baseURL.port ?? 0)"
        ], settings: settings)

        Task { [weak self] in
            do {
                try await client.waitUntilReady(maxAttempts: 40)
                await MainActor.run { [weak self] in
                    guard let self, self.runtimeStartupGeneration == startupGeneration else { return }
                    self.runtimeClient.replace(with: client)
                    self.webView?.reload()
                    self.statusLabel.stringValue = self.statusText([
                        "Runtime: connected",
                        "URL: saved",
                        "Model: \(settings.model)",
                        "Local sidecar: \(launch.baseURL.host ?? "127.0.0.1"):\(launch.baseURL.port ?? 0)"
                    ], settings: settings)
                }
            } catch {
                await MainActor.run { [weak self] in
                    guard let self, self.runtimeStartupGeneration == startupGeneration else { return }
                    self.sidecarManager.stop()
                    self.statusLabel.stringValue = self.statusText([
                        "Runtime: failed",
                        "URL: saved",
                        "Model: \(settings.model)",
                        "Error: \(error.localizedDescription)"
                    ], settings: settings)
                }
            }
        }
    }

    private func validate(settings: RuntimeSettings) throws {
        try DeepSeekEndpointPolicy.validate(settings: settings)
    }

    private func statusText(_ lines: [String], settings: RuntimeSettings) -> String {
        var statusLines = lines
        if let warning = DeepSeekEndpointPolicy.transportWarning(for: settings) {
            statusLines.append(warning)
        }
        return statusLines.joined(separator: "\n")
    }

    private func separator() -> NSView {
        let view = NSBox()
        view.boxType = .separator
        return view
    }
}
