import XCTest
@testable import DeepSeekAgentApp

final class BridgeMessageTests: XCTestCase {
    func testDecodesKnownMethod() throws {
        let data = #"{"id":"1","method":"health","payload":{}}"#.data(using: .utf8)!

        let envelope = try BridgeMessageDecoder.decode(data: data)

        XCTAssertEqual(envelope.id, "1")
        XCTAssertEqual(envelope.method, .health)
    }

    func testDecodesChooseWorkspaceFolderMethod() throws {
        let data = #"{"id":"1","method":"chooseWorkspaceFolder","payload":{}}"#.data(using: .utf8)!

        let envelope = try BridgeMessageDecoder.decode(data: data)

        XCTAssertEqual(envelope.method, .chooseWorkspaceFolder)
    }

    func testRejectsUnknownMethod() {
        let data = #"{"id":"1","method":"deleteEverything","payload":{}}"#.data(using: .utf8)!

        XCTAssertThrowsError(try BridgeMessageDecoder.decode(data: data)) { error in
            XCTAssertTrue(error.localizedDescription.contains("malformed"))
        }
    }

    func testRejectsEmptyId() {
        let data = #"{"id":" ","method":"health","payload":{}}"#.data(using: .utf8)!

        XCTAssertThrowsError(try BridgeMessageDecoder.decode(data: data)) { error in
            XCTAssertEqual(error as? BridgeMessageError, .emptyId)
        }
    }

    func testRejectsOversizedPayload() {
        let data = Data(repeating: 1, count: BridgeMessageDecoder.maxPayloadBytes + 1)

        XCTAssertThrowsError(try BridgeMessageDecoder.decode(data: data)) { error in
            XCTAssertEqual(error as? BridgeMessageError, .payloadTooLarge)
        }
    }
}
