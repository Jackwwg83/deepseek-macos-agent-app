import AppKit

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var windowController: ShellWindowController?
    private var sidecarManager: SidecarManager?
    private let settingsStore = RuntimeSettingsStore()
    private let keychainStore = KeychainStore()

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)

        let manager = SidecarManager()
        let client = SwitchableRuntimeClient(initial: FakeRuntimeClient(projectPath: FileManager.default.currentDirectoryPath))
        startConfiguredRuntimeIfAvailable(sidecarManager: manager, runtimeClient: client)
        sidecarManager = manager

        let controller = ShellWindowController(
            runtimeClient: client,
            sidecarManager: manager,
            settingsStore: settingsStore,
            keychainStore: keychainStore
        )
        windowController = controller
        controller.window?.center()
        controller.window?.makeKeyAndOrderFront(nil)
        controller.showWindow(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    func applicationShouldSaveApplicationState(_ app: NSApplication) -> Bool {
        false
    }

    func applicationShouldRestoreApplicationState(_ app: NSApplication) -> Bool {
        false
    }

    func applicationWillTerminate(_ notification: Notification) {
        sidecarManager?.stop()
    }

    private func startConfiguredRuntimeIfAvailable(sidecarManager: SidecarManager, runtimeClient: SwitchableRuntimeClient) {
        let environment = ProcessInfo.processInfo.environment
        guard environment["DEEPSEEK_AGENT_RUNTIME"] != "fake" else {
            return
        }

        let settings = settingsStore.load(environment: environment)
        guard !settings.baseURL.isEmpty else {
            return
        }

        guard let apiKey = try? RuntimeSecretResolver.resolveAPIKey(environment: environment, keychainAPIKey: keychainStore.readAPIKey),
              !apiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return
        }

        guard let binary = sidecarManager.discoverBinary(userSelectedPath: settings.sidecarPath.isEmpty ? nil : settings.sidecarPath) else {
            return
        }

        guard let launch = try? sidecarManager.start(binaryURL: binary, deepSeekAPIKey: apiKey, runtimeSettings: settings) else {
            return
        }
        runtimeClient.replace(with: DeepSeekTuiRuntimeClient(baseURL: launch.baseURL, authToken: launch.authToken))
    }
}
