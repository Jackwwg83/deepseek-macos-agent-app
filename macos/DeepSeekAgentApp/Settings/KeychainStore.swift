import Foundation
import LocalAuthentication
import Security

final class KeychainStore {
    static let service = "app.deepseek.agent"
    static let account = "deepseek_api_key"
    static let label = "DeepSeek API Key"

    func saveAPIKey(_ apiKey: String) throws {
        let data = Data(apiKey.utf8)
        let query = Self.makeBaseQuery()
        let update: [String: Any] = [kSecValueData as String: data]
        let status = SecItemUpdate(query as CFDictionary, update as CFDictionary)
        if status == errSecItemNotFound {
            var add = query
            add[kSecValueData as String] = data
            add[kSecAttrLabel as String] = Self.label
            add[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
            add[kSecAttrSynchronizable as String] = kCFBooleanFalse
            let addStatus = SecItemAdd(add as CFDictionary, nil)
            guard addStatus == errSecSuccess else {
                throw RuntimeClientError.unsupported("Could not save DeepSeek API key to Keychain.")
            }
        } else if status != errSecSuccess {
            throw RuntimeClientError.unsupported("Could not update DeepSeek API key in Keychain.")
        }
    }

    func readAPIKey(allowsUserInteraction: Bool = false) throws -> String? {
        let query = Self.makeReadQuery(allowsUserInteraction: allowsUserInteraction)
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecItemNotFound {
            return nil
        }
        if status == errSecInteractionNotAllowed || status == errSecAuthFailed {
            return nil
        }
        guard status == errSecSuccess, let data = item as? Data else {
            throw RuntimeClientError.unsupported("Could not read DeepSeek API key from Keychain.")
        }
        return String(data: data, encoding: .utf8)
    }

    func deleteAPIKey() throws {
        let status = SecItemDelete(Self.makeBaseQuery() as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw RuntimeClientError.unsupported("Could not delete DeepSeek API key from Keychain.")
        }
    }

    static func makeReadQuery(allowsUserInteraction: Bool) -> [String: Any] {
        var query = makeBaseQuery()
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        if !allowsUserInteraction {
            let context = LAContext()
            context.interactionNotAllowed = true
            query[kSecUseAuthenticationContext as String] = context
        }
        return query
    }

    private static func makeBaseQuery() -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecAttrSynchronizable as String: kCFBooleanFalse as Any
        ]
    }
}
