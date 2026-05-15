import Foundation

protocol AgentRuntimeClient {
    func health() async throws -> RuntimeHealth
    func runtimeInfo() async throws -> RuntimeInfo
    func listThreads(limit: Int?, includeArchived: Bool) async throws -> [RuntimeThread]
    func createThread(_ request: CreateThreadRequest) async throws -> RuntimeThread
    func getThread(_ id: String) async throws -> ThreadDetail
    func startTurn(threadId: String, request: StartTurnRequest) async throws -> StartTurnResponse
    func interruptTurn(threadId: String, turnId: String) async throws -> RuntimeTurn
    func steerTurn(threadId: String, turnId: String, message: String) async throws -> RuntimeTurn
    func respondApproval(approvalId: String, decision: String) async throws -> ApprovalResponse
    func usage(query: UsageQuery) async throws -> UsageAggregation
    func subscribeEvents(threadId: String, sinceSeq: Int?) -> AsyncThrowingStream<RuntimeEvent, Error>
}

