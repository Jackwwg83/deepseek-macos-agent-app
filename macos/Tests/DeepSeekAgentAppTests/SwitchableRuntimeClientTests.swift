import XCTest
@testable import DeepSeekAgentApp

final class SwitchableRuntimeClientTests: XCTestCase {
    func testForwardsCallsToCurrentClientAndCanReplaceIt() async throws {
        let client = SwitchableRuntimeClient(initial: StubRuntimeClient(status: "fake"))

        let fakeHealth = try await client.health()
        XCTAssertEqual(fakeHealth.status, "fake")

        client.replace(with: StubRuntimeClient(status: "real"))

        let realHealth = try await client.health()
        XCTAssertEqual(realHealth.status, "real")
    }
}

private struct StubRuntimeClient: AgentRuntimeClient {
    var status: String

    func health() async throws -> RuntimeHealth {
        RuntimeHealth(status: status, mode: status, message: nil)
    }

    func runtimeInfo() async throws -> RuntimeInfo {
        RuntimeInfo(appVersion: "test", runtimeVersion: "test", authRequired: false, mode: status, capabilities: [])
    }

    func listThreads(limit: Int?, includeArchived: Bool) async throws -> [RuntimeThread] { [] }
    func createThread(_ request: CreateThreadRequest) async throws -> RuntimeThread {
        RuntimeThread(id: "thread", title: "thread", projectPath: request.projectPath, updatedAt: isoNow(), archived: false)
    }
    func getThread(_ id: String) async throws -> ThreadDetail {
        ThreadDetail(thread: RuntimeThread(id: id, title: id, projectPath: "", updatedAt: isoNow(), archived: false), items: [], lastSeq: 0)
    }
    func startTurn(threadId: String, request: StartTurnRequest) async throws -> StartTurnResponse {
        StartTurnResponse(turnId: "turn", accepted: true)
    }
    func interruptTurn(threadId: String, turnId: String) async throws -> RuntimeTurn {
        RuntimeTurn(id: turnId, threadId: threadId, status: "interrupted")
    }
    func steerTurn(threadId: String, turnId: String, message: String) async throws -> RuntimeTurn {
        RuntimeTurn(id: turnId, threadId: threadId, status: "in_progress")
    }
    func respondApproval(approvalId: String, decision: String) async throws -> ApprovalResponse {
        ApprovalResponse(approvalId: approvalId, decision: decision, accepted: true)
    }
    func usage(query: UsageQuery) async throws -> UsageAggregation {
        UsageAggregation(currency: "USD", totalCost: 0, inputTokens: 0, outputTokens: 0, completedTurns: 0)
    }
    func subscribeEvents(threadId: String, sinceSeq: Int?) -> AsyncThrowingStream<RuntimeEvent, Error> {
        AsyncThrowingStream { continuation in continuation.finish() }
    }
}
