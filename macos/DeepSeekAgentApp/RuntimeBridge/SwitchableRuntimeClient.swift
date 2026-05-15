import Foundation

final class SwitchableRuntimeClient: AgentRuntimeClient {
    private let lock = NSLock()
    private var target: AgentRuntimeClient

    init(initial: AgentRuntimeClient) {
        self.target = initial
    }

    func replace(with client: AgentRuntimeClient) {
        lock.lock()
        target = client
        lock.unlock()
    }

    private func current() -> AgentRuntimeClient {
        lock.lock()
        defer { lock.unlock() }
        return target
    }

    func health() async throws -> RuntimeHealth {
        try await current().health()
    }

    func runtimeInfo() async throws -> RuntimeInfo {
        try await current().runtimeInfo()
    }

    func listThreads(limit: Int?, includeArchived: Bool) async throws -> [RuntimeThread] {
        try await current().listThreads(limit: limit, includeArchived: includeArchived)
    }

    func createThread(_ request: CreateThreadRequest) async throws -> RuntimeThread {
        try await current().createThread(request)
    }

    func getThread(_ id: String) async throws -> ThreadDetail {
        try await current().getThread(id)
    }

    func startTurn(threadId: String, request: StartTurnRequest) async throws -> StartTurnResponse {
        try await current().startTurn(threadId: threadId, request: request)
    }

    func interruptTurn(threadId: String, turnId: String) async throws -> RuntimeTurn {
        try await current().interruptTurn(threadId: threadId, turnId: turnId)
    }

    func steerTurn(threadId: String, turnId: String, message: String) async throws -> RuntimeTurn {
        try await current().steerTurn(threadId: threadId, turnId: turnId, message: message)
    }

    func respondApproval(approvalId: String, decision: String) async throws -> ApprovalResponse {
        try await current().respondApproval(approvalId: approvalId, decision: decision)
    }

    func usage(query: UsageQuery) async throws -> UsageAggregation {
        try await current().usage(query: query)
    }

    func subscribeEvents(threadId: String, sinceSeq: Int?) -> AsyncThrowingStream<RuntimeEvent, Error> {
        current().subscribeEvents(threadId: threadId, sinceSeq: sinceSeq)
    }
}
