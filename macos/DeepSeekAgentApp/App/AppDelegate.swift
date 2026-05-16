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
        installMainMenu(target: controller)
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

        guard let apiKey = try? RuntimeSecretResolver.resolveAPIKey(environment: environment, keychainAPIKey: { nil }),
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

    private func installMainMenu(target: ShellWindowController) {
        let mainMenu = NSMenu()

        let appMenu = NSMenu(title: "DeepSeek Agent")
        appMenu.addItem(NSMenuItem(title: "About DeepSeek Agent", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: ""))
        appMenu.addItem(.separator())
        appMenu.addItem(NSMenuItem(title: "Quit DeepSeek Agent", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"))
        addSubmenu(appMenu, to: mainMenu, title: "DeepSeek Agent")

        let fileMenu = NSMenu(title: "File")
        fileMenu.addItem(targetedItem("New Thread", action: #selector(ShellWindowController.newThreadMenu(_:)), keyEquivalent: "n", target: target))
        addSubmenu(fileMenu, to: mainMenu, title: "File")

        let editMenu = NSMenu(title: "Edit")
        editMenu.addItem(NSMenuItem(title: "Undo", action: Selector(("undo:")), keyEquivalent: "z"))
        editMenu.addItem(NSMenuItem(title: "Redo", action: Selector(("redo:")), keyEquivalent: "Z"))
        editMenu.addItem(.separator())
        editMenu.addItem(NSMenuItem(title: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x"))
        editMenu.addItem(NSMenuItem(title: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c"))
        editMenu.addItem(NSMenuItem(title: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v"))
        editMenu.addItem(NSMenuItem(title: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a"))
        addSubmenu(editMenu, to: mainMenu, title: "Edit")

        let viewMenu = NSMenu(title: "View")
        viewMenu.addItem(targetedItem("Command Palette", action: #selector(ShellWindowController.commandPaletteMenu(_:)), keyEquivalent: "k", target: target))
        viewMenu.addItem(targetedItem("Settings...", action: #selector(ShellWindowController.settingsMenu(_:)), keyEquivalent: ",", target: target))
        addSubmenu(viewMenu, to: mainMenu, title: "View")

        let threadMenu = NSMenu(title: "Thread")
        threadMenu.addItem(targetedItem("Stop Current Turn", action: #selector(ShellWindowController.stopCurrentTurnMenu(_:)), keyEquivalent: ".", target: target))
        addSubmenu(threadMenu, to: mainMenu, title: "Thread")

        let agentMenu = NSMenu(title: "Agent")
        agentMenu.addItem(targetedItem("Use Demo Runtime", action: #selector(ShellWindowController.demoRuntimeMenu(_:)), keyEquivalent: "", target: target))
        agentMenu.addItem(targetedItem("Open Command Palette", action: #selector(ShellWindowController.commandPaletteMenu(_:)), keyEquivalent: "", target: target))
        addSubmenu(agentMenu, to: mainMenu, title: "Agent")

        let reviewMenu = NSMenu(title: "Review")
        reviewMenu.addItem(targetedItem("Review Changes", action: #selector(ShellWindowController.reviewMenu(_:)), keyEquivalent: "r", target: target))
        addSubmenu(reviewMenu, to: mainMenu, title: "Review")

        let windowMenu = NSMenu(title: "Window")
        windowMenu.addItem(NSMenuItem(title: "Minimize", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m"))
        windowMenu.addItem(NSMenuItem(title: "Zoom", action: #selector(NSWindow.performZoom(_:)), keyEquivalent: ""))
        addSubmenu(windowMenu, to: mainMenu, title: "Window")

        let helpMenu = NSMenu(title: "Help")
        helpMenu.addItem(targetedItem("DeepSeek Agent Help", action: #selector(ShellWindowController.commandPaletteMenu(_:)), keyEquivalent: "", target: target))
        addSubmenu(helpMenu, to: mainMenu, title: "Help")

        NSApp.mainMenu = mainMenu
    }

    private func addSubmenu(_ submenu: NSMenu, to mainMenu: NSMenu, title: String) {
        let item = NSMenuItem(title: title, action: nil, keyEquivalent: "")
        item.submenu = submenu
        mainMenu.addItem(item)
    }

    private func targetedItem(_ title: String, action: Selector, keyEquivalent: String, target: AnyObject) -> NSMenuItem {
        let item = NSMenuItem(title: title, action: action, keyEquivalent: keyEquivalent)
        item.target = target
        return item
    }
}
