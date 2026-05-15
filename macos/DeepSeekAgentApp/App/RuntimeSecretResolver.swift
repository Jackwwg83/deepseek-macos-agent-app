import Foundation

struct RuntimeSecretResolver {
    static func resolveAPIKey(
        environment: [String: String],
        keychainAPIKey: () throws -> String?
    ) throws -> String? {
        if let envKey = environment["DEEPSEEK_API_KEY"],
           !envKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return envKey
        }

        return try keychainAPIKey()
    }
}
