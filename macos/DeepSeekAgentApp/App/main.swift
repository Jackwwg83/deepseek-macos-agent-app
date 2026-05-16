import AppKit

UserDefaults.standard.set(true, forKey: "ApplePersistenceIgnoreState")
UserDefaults.standard.set(false, forKey: "NSQuitAlwaysKeepsWindows")

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
withExtendedLifetime(delegate) {
    app.run()
}
