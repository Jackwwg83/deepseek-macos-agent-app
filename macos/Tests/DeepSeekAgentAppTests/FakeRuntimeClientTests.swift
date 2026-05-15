import XCTest
@testable import DeepSeekAgentApp

final class FakeRuntimeClientTests: XCTestCase {
    func testFakeRuntimeStreamsApprovalFlow() async throws {
        let client = FakeRuntimeClient()
        let thread = try await client.listThreads(limit: nil, includeArchived: false)[0]
        var events: [RuntimeEvent] = []
        let stream = client.subscribeEvents(threadId: thread.id, sinceSeq: 0)
        let task = Task {
            for try await event in stream {
                events.append(event)
                if event.event == "approval.required" {
                    break
                }
            }
        }

        _ = try await client.startTurn(threadId: thread.id, request: StartTurnRequest(input: "Explain this project"))
        try await Task.sleep(nanoseconds: 900_000_000)
        task.cancel()

        XCTAssertTrue(events.contains { $0.event == "approval.required" })
        XCTAssertTrue(events.enumerated().allSatisfy { index, event in index == 0 || event.seq > events[index - 1].seq })
    }
}

