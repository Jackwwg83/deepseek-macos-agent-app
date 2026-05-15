import Foundation

struct RuntimeSettings: Equatable {
    static let defaultModel = "deepseek-v4-flash"

    var baseURL: String
    var model: String
    var sidecarPath: String

    var normalized: RuntimeSettings {
        RuntimeSettings(
            baseURL: baseURL.trimmingCharacters(in: .whitespacesAndNewlines),
            model: model.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                ? Self.defaultModel
                : model.trimmingCharacters(in: .whitespacesAndNewlines),
            sidecarPath: sidecarPath.trimmingCharacters(in: .whitespacesAndNewlines)
        )
    }
}

final class RuntimeSettingsStore {
    private enum Keys {
        static let baseURL = "DeepSeekAgentApp.runtime.baseURL"
        static let model = "DeepSeekAgentApp.runtime.model"
        static let sidecarPath = "DeepSeekAgentApp.runtime.sidecarPath"
    }

    private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    func load(environment: [String: String] = ProcessInfo.processInfo.environment) -> RuntimeSettings {
        let saved = RuntimeSettings(
            baseURL: defaults.string(forKey: Keys.baseURL) ?? "",
            model: defaults.string(forKey: Keys.model) ?? RuntimeSettings.defaultModel,
            sidecarPath: defaults.string(forKey: Keys.sidecarPath) ?? ""
        ).normalized

        return RuntimeSettings(
            baseURL: firstNonEmpty(environment["DEEPSEEK_BASE_URL"], saved.baseURL),
            model: firstNonEmpty(environment["DEEPSEEK_MODEL"], saved.model),
            sidecarPath: firstNonEmpty(environment["DEEPSEEK_TUI_BIN"], saved.sidecarPath)
        ).normalized
    }

    func save(_ settings: RuntimeSettings) {
        let normalized = settings.normalized
        defaults.set(normalized.baseURL, forKey: Keys.baseURL)
        defaults.set(normalized.model, forKey: Keys.model)
        defaults.set(normalized.sidecarPath, forKey: Keys.sidecarPath)
    }

    private func firstNonEmpty(_ values: String?...) -> String {
        for value in values {
            if let trimmed = value?.trimmingCharacters(in: .whitespacesAndNewlines), !trimmed.isEmpty {
                return trimmed
            }
        }
        return ""
    }
}
