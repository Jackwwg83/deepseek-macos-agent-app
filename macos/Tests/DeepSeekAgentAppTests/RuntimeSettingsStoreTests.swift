import XCTest
@testable import DeepSeekAgentApp

final class RuntimeSettingsStoreTests: XCTestCase {
    func testLoadsDefaultModelAndEmptyURLWhenNothingIsSaved() {
        let suiteName = "RuntimeSettingsStoreTests-\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        defer { defaults.removePersistentDomain(forName: suiteName) }
        let store = RuntimeSettingsStore(defaults: defaults)

        let settings = store.load()

        XCTAssertEqual(settings.baseURL, "")
        XCTAssertEqual(settings.model, "deepseek-v4-flash")
        XCTAssertEqual(settings.sidecarPath, "")
    }

    func testSavesAndLoadsRuntimeSettings() {
        let suiteName = "RuntimeSettingsStoreTests-\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        defer { defaults.removePersistentDomain(forName: suiteName) }
        let store = RuntimeSettingsStore(defaults: defaults)

        store.save(RuntimeSettings(
            baseURL: "https://example.com/v1",
            model: "deepseek-v4-pro",
            sidecarPath: "/tmp/deepseek-tui"
        ))

        XCTAssertEqual(store.load(), RuntimeSettings(
            baseURL: "https://example.com/v1",
            model: "deepseek-v4-pro",
            sidecarPath: "/tmp/deepseek-tui"
        ))
    }

    func testEnvironmentOverridesSavedSettingsForScriptedLaunches() {
        let suiteName = "RuntimeSettingsStoreTests-\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        defer { defaults.removePersistentDomain(forName: suiteName) }
        let store = RuntimeSettingsStore(defaults: defaults)
        store.save(RuntimeSettings(baseURL: "https://saved.example/v1", model: "saved-model", sidecarPath: ""))

        let settings = store.load(environment: [
            "DEEPSEEK_BASE_URL": "https://env.example/v1",
            "DEEPSEEK_MODEL": "env-model"
        ])

        XCTAssertEqual(settings.baseURL, "https://env.example/v1")
        XCTAssertEqual(settings.model, "env-model")
    }
}
