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

        let detailBeforeApproval = try await client.getThread(thread.id)
        XCTAssertTrue(detailBeforeApproval.items.contains { $0.kind == "tool" && $0.title == "exec_shell" })
        let approval = try XCTUnwrap(detailBeforeApproval.items.compactMap(\.approval).first)
        XCTAssertEqual(approval.toolName, "exec_shell")

        _ = try await client.respondApproval(approvalId: approval.approvalId, decision: "allow")
        let detailAfterApproval = try await client.getThread(thread.id)
        XCTAssertTrue(detailAfterApproval.items.contains { $0.kind == "tool" && $0.title == "Tool result" })
        XCTAssertTrue(detailAfterApproval.items.contains { $0.kind == "assistant" && $0.content.contains("Approval granted") })
    }

    func testInterruptMaterializesStoppedApprovalCard() async throws {
        let client = FakeRuntimeClient()
        let thread = try await client.listThreads(limit: nil, includeArchived: false)[0]

        let turn = try await client.startTurn(threadId: thread.id, request: StartTurnRequest(input: "Stop before tool execution"))
        try await Task.sleep(nanoseconds: 900_000_000)
        let detailBeforeInterrupt = try await client.getThread(thread.id)
        let approval = try XCTUnwrap(detailBeforeInterrupt.items.compactMap(\.approval).first)

        _ = try await client.interruptTurn(threadId: thread.id, turnId: turn.turnId)
        try await Task.sleep(nanoseconds: 100_000_000)

        let detailAfterInterrupt = try await client.getThread(thread.id)
        let stoppedApproval = try XCTUnwrap(detailAfterInterrupt.items.first { $0.approval?.approvalId == approval.approvalId })
        XCTAssertEqual(stoppedApproval.status, "failed")
        XCTAssertEqual(stoppedApproval.content, "Task stopped before approval.")
    }
}
