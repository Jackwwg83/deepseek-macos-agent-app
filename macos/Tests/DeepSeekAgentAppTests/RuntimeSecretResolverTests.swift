import XCTest
@testable import DeepSeekAgentApp

final class RuntimeSecretResolverTests: XCTestCase {
    func testEnvironmentAPIKeyTakesPrecedenceOverKeychain() throws {
        let resolved = try RuntimeSecretResolver.resolveAPIKey(
            environment: ["DEEPSEEK_API_KEY": "env-key"]
        ) {
            XCTFail("Keychain should not be read when an environment key is present")
            return "keychain-key"
        }

        XCTAssertEqual(resolved, "env-key")
    }

    func testEmptyEnvironmentAPIKeyFallsBackToKeychain() throws {
        let resolved = try RuntimeSecretResolver.resolveAPIKey(
            environment: ["DEEPSEEK_API_KEY": ""]
        ) {
            "keychain-key"
        }

        XCTAssertEqual(resolved, "keychain-key")
    }
}
