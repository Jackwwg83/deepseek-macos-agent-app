import XCTest
@testable import DeepSeekAgentApp

final class DeepSeekEndpointPolicyTests: XCTestCase {
    func testAllowsHTTPSAndRemoteHTTPBaseURLs() throws {
        try DeepSeekEndpointPolicy.validate(settings: RuntimeSettings(
            baseURL: "https://api.deepseek.com/beta",
            model: "deepseek-v4-flash",
            sidecarPath: ""
        ))

        try DeepSeekEndpointPolicy.validate(settings: RuntimeSettings(
            baseURL: "http://self-hosted.example:8000/v1",
            model: "deepseek-v4-flash",
            sidecarPath: ""
        ))
    }

    func testWarnsOnlyForRemoteHTTP() {
        XCTAssertNil(DeepSeekEndpointPolicy.transportWarning(for: RuntimeSettings(
            baseURL: "https://api.deepseek.com/beta",
            model: "deepseek-v4-flash",
            sidecarPath: ""
        )))
        XCTAssertNil(DeepSeekEndpointPolicy.transportWarning(for: RuntimeSettings(
            baseURL: "http://127.0.0.1:8000/v1",
            model: "deepseek-v4-flash",
            sidecarPath: ""
        )))
        XCTAssertEqual(DeepSeekEndpointPolicy.transportWarning(for: RuntimeSettings(
            baseURL: "http://self-hosted.example:8000/v1",
            model: "deepseek-v4-flash",
            sidecarPath: ""
        )), "Warning: HTTP endpoint is not encrypted.")
    }

    func testRejectsUnsupportedSchemes() {
        XCTAssertThrowsError(try DeepSeekEndpointPolicy.validate(settings: RuntimeSettings(
            baseURL: "ftp://self-hosted.example/v1",
            model: "deepseek-v4-flash",
            sidecarPath: ""
        )))
    }
}
