import XCTest
@testable import DeepSeekAgentApp

final class SidecarManagerTests: XCTestCase {
    func testCommandDoesNotExposeAPIKeyInArguments() {
        let manager = SidecarManager(environment: ["PATH": "/usr/bin"])
        let command = manager.makeCommand(
            binaryURL: URL(fileURLWithPath: "/bin/echo"),
            port: 49200,
            token: "runtime-token",
            deepSeekAPIKey: "sk-secret",
            runtimeSettings: RuntimeSettings(baseURL: "https://example.com/v1", model: "deepseek-v4-flash", sidecarPath: "")
        )

        XCTAssertFalse(command.arguments.joined(separator: " ").contains("sk-secret"))
        XCTAssertEqual(command.environment["DEEPSEEK_API_KEY"], "sk-secret")
        XCTAssertEqual(command.environment["DEEPSEEK_BASE_URL"], "https://example.com/v1")
        XCTAssertEqual(command.environment["DEEPSEEK_MODEL"], "deepseek-v4-flash")
        XCTAssertTrue(command.arguments.contains("--auth-token"))
        XCTAssertTrue(command.arguments.contains("runtime-token"))
        XCTAssertTrue(command.arguments.contains("127.0.0.1"))
    }

    func testGeneratesBearerToken() throws {
        let token = try SidecarManager.generateBearerToken()

        XCTAssertGreaterThanOrEqual(token.count, 32)
        XCTAssertFalse(token.contains("="))
    }

    func testBinaryDiscoveryRespectsEnvironment() {
        let manager = SidecarManager(environment: ["DEEPSEEK_TUI_BIN": "/bin/echo"])

        XCTAssertEqual(manager.discoverBinary()?.path, "/bin/echo")
    }

    func testAvailablePortIsLoopbackBindable() throws {
        let port = try SidecarManager.availableLoopbackPort()

        XCTAssertGreaterThan(port, 0)
    }
}
