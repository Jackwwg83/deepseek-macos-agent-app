import XCTest
@testable import DeepSeekAgentApp

final class AppWebViewFactoryTests: XCTestCase {
    func testResolvesBundledWebIndexWhenNoDevelopmentEnvironmentIsSet() throws {
        let tempRoot = FileManager.default.temporaryDirectory
            .appendingPathComponent("DeepSeekAgentAppWebViewFactoryTests-\(UUID().uuidString)")
        let webRoot = tempRoot.appendingPathComponent("web", isDirectory: true)
        try FileManager.default.createDirectory(at: webRoot, withIntermediateDirectories: true)
        let indexURL = webRoot.appendingPathComponent("index.html")
        try "<!doctype html><html></html>".write(to: indexURL, atomically: true, encoding: .utf8)
        defer { try? FileManager.default.removeItem(at: tempRoot) }

        let source = AppWebViewFactory.resolveContentSource(
            environment: [:],
            bundleResourceURL: tempRoot
        )

        XCTAssertEqual(source, .file(indexURL: indexURL, readAccessURL: webRoot))
    }

    func testDevelopmentDistTakesPrecedenceOverBundledWebIndex() throws {
        let tempRoot = FileManager.default.temporaryDirectory
            .appendingPathComponent("DeepSeekAgentAppWebViewFactoryTests-\(UUID().uuidString)")
        let bundledWebRoot = tempRoot.appendingPathComponent("web", isDirectory: true)
        let devWebRoot = tempRoot.appendingPathComponent("dev-dist", isDirectory: true)
        try FileManager.default.createDirectory(at: bundledWebRoot, withIntermediateDirectories: true)
        try FileManager.default.createDirectory(at: devWebRoot, withIntermediateDirectories: true)
        try "<!doctype html><html>bundle</html>".write(
            to: bundledWebRoot.appendingPathComponent("index.html"),
            atomically: true,
            encoding: .utf8
        )
        let devIndexURL = devWebRoot.appendingPathComponent("index.html")
        try "<!doctype html><html>dev</html>".write(to: devIndexURL, atomically: true, encoding: .utf8)
        defer { try? FileManager.default.removeItem(at: tempRoot) }

        let source = AppWebViewFactory.resolveContentSource(
            environment: ["DEEPSEEK_AGENT_WEB_DIST": devWebRoot.path],
            bundleResourceURL: tempRoot
        )

        XCTAssertEqual(source, .file(indexURL: devIndexURL, readAccessURL: devWebRoot))
    }
}
