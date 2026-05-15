import Foundation
import Security

final class KeychainStore {
    private let service = "app.deepseek.agent"
    private let account = "DEEPSEEK_API_KEY"

    func saveAPIKey(_ apiKey: String) throws {
        let data = Data(apiKey.utf8)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        let update: [String: Any] = [kSecValueData as String: data]
        let status = SecItemUpdate(query as CFDictionary, update as CFDictionary)
        if status == errSecItemNotFound {
            var add = query
            add[kSecValueData as String] = data
            let addStatus = SecItemAdd(add as CFDictionary, nil)
            guard addStatus == errSecSuccess else {
                throw RuntimeClientError.unsupported("Could not save DeepSeek API key to Keychain.")
            }
        } else if status != errSecSuccess {
            throw RuntimeClientError.unsupported("Could not update DeepSeek API key in Keychain.")
        }
    }

    func readAPIKey() throws -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecItemNotFound {
            return nil
        }
        guard status == errSecSuccess, let data = item as? Data else {
            throw RuntimeClientError.unsupported("Could not read DeepSeek API key from Keychain.")
        }
        return String(data: data, encoding: .utf8)
    }
}

