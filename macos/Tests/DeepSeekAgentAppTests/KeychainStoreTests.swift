import XCTest
import LocalAuthentication
@testable import DeepSeekAgentApp

final class KeychainStoreTests: XCTestCase {
    func testUsesStableMVPServiceAndAccountNames() {
        XCTAssertEqual(KeychainStore.service, "app.deepseek.agent")
        XCTAssertEqual(KeychainStore.account, "deepseek_api_key")
        XCTAssertEqual(KeychainStore.label, "DeepSeek API Key")
    }

    func testSilentReadQueryDisablesAuthenticationUI() throws {
        let query = KeychainStore.makeReadQuery(allowsUserInteraction: false)

        XCTAssertEqual(query[kSecClass as String] as? String, kSecClassGenericPassword as String)
        XCTAssertEqual(query[kSecAttrService as String] as? String, "app.deepseek.agent")
        XCTAssertEqual(query[kSecAttrAccount as String] as? String, "deepseek_api_key")
        let context = try XCTUnwrap(query[kSecUseAuthenticationContext as String] as? LAContext)
        XCTAssertTrue(context.interactionNotAllowed)
    }
}
