import Foundation

final class DeepSeekTuiRuntimeClient: AgentRuntimeClient {
    private let baseURL: URL
    private let authToken: String
    private let session: URLSession
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    init(baseURL: URL, authToken: String, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.authToken = authToken
        self.session = session
    }

    func health() async throws -> RuntimeHealth {
        let response: RuntimeAPIHealthResponse = try await request(path: "/health", method: "GET", body: Optional<Data>.none)
        return RuntimeHealth(status: response.status, mode: "real", message: response.service)
    }

    func waitUntilReady(maxAttempts: Int = 20, delayNanoseconds: UInt64 = 250_000_000) async throws {
        let attempts = max(1, maxAttempts)
        var lastError: Error?
        for attempt in 1...attempts {
            do {
                _ = try await health()
                return
            } catch {
                lastError = error
                if attempt < attempts {
                    try? await Task.sleep(nanoseconds: delayNanoseconds)
                }
            }
        }

        let detail = lastError?.localizedDescription ?? "Runtime did not become ready."
        throw RuntimeClientError.unsupported("Could not connect to local DeepSeek runtime. \(detail)")
    }

    func runtimeInfo() async throws -> RuntimeInfo {
        let response: RuntimeAPIInfoResponse = try await request(path: "/v1/runtime/info", method: "GET", body: Optional<Data>.none)
        return RuntimeInfo(
            appVersion: "0.1.0-alpha",
            runtimeVersion: response.version,
            authRequired: response.authRequired,
            mode: "real",
            capabilities: ["threads", "turns", "events", "usage", "approvals"]
        )
    }

    func listThreads(limit: Int?, includeArchived: Bool) async throws -> [RuntimeThread] {
        var components = URLComponents(string: "/v1/threads")!
        components.queryItems = [
            limit.map { URLQueryItem(name: "limit", value: "\($0)") },
            URLQueryItem(name: "include_archived", value: includeArchived ? "true" : "false")
        ].compactMap { $0 }
        let threads: [RuntimeAPIThread] = try await request(path: components.string ?? "/v1/threads", method: "GET", body: Optional<Data>.none)
        return threads.map { Self.mapThread($0) }
    }

    func createThread(_ request: CreateThreadRequest) async throws -> RuntimeThread {
        let body = try encoder.encode(RuntimeAPICreateThreadRequest(workspace: request.projectPath))
        let thread: RuntimeAPIThread = try await self.request(path: "/v1/threads", method: "POST", body: body)
        guard let title = request.title?.trimmingCharacters(in: .whitespacesAndNewlines), !title.isEmpty else {
            return Self.mapThread(thread)
        }
        let patched: RuntimeAPIThread = try await self.request(
            path: "/v1/threads/\(thread.id)",
            method: "PATCH",
            body: encoder.encode(RuntimeAPIUpdateThreadRequest(title: title))
        )
        return Self.mapThread(patched)
    }

    func getThread(_ id: String) async throws -> ThreadDetail {
        let detail: RuntimeAPIThreadDetail = try await request(path: "/v1/threads/\(id)", method: "GET", body: Optional<Data>.none)
        return ThreadDetail(
            thread: Self.mapThread(detail.thread, turns: detail.turns),
            items: detail.items.map(Self.mapTimelineItem),
            lastSeq: Int(detail.latestSeq)
        )
    }

    func startTurn(threadId: String, request: StartTurnRequest) async throws -> StartTurnResponse {
        let response: RuntimeAPIStartTurnResponse = try await self.request(
            path: "/v1/threads/\(threadId)/turns",
            method: "POST",
            body: encoder.encode(RuntimeAPIStartTurnRequest(prompt: request.input))
        )
        return StartTurnResponse(turnId: response.turn.id, accepted: true)
    }

    func interruptTurn(threadId: String, turnId: String) async throws -> RuntimeTurn {
        let turn: RuntimeAPITurn = try await request(path: "/v1/threads/\(threadId)/turns/\(turnId)/interrupt", method: "POST", body: Data("{}".utf8))
        return Self.mapTurn(turn)
    }

    func steerTurn(threadId: String, turnId: String, message: String) async throws -> RuntimeTurn {
        let turn: RuntimeAPITurn = try await request(
            path: "/v1/threads/\(threadId)/turns/\(turnId)/steer",
            method: "POST",
            body: encoder.encode(RuntimeAPISteerTurnRequest(prompt: message))
        )
        return Self.mapTurn(turn)
    }

    func respondApproval(approvalId: String, decision: String) async throws -> ApprovalResponse {
        let response: RuntimeAPIApprovalResponse = try await request(
            path: "/v1/approvals/\(approvalId)",
            method: "POST",
            body: encoder.encode(RuntimeAPIApprovalRequest(decision: decision))
        )
        return ApprovalResponse(approvalId: response.approvalId, decision: response.decision, accepted: response.ok)
    }

    func usage(query: UsageQuery) async throws -> UsageAggregation {
        var components = URLComponents(string: "/v1/usage")!
        if let groupBy = query.groupBy {
            components.queryItems = [URLQueryItem(name: "group_by", value: groupBy)]
        }
        let response: RuntimeAPIUsageAggregation = try await request(path: components.string ?? "/v1/usage", method: "GET", body: Optional<Data>.none)
        return UsageAggregation(
            currency: "USD",
            totalCost: response.totals.costUSD,
            inputTokens: Int(response.totals.inputTokens),
            outputTokens: Int(response.totals.outputTokens),
            completedTurns: Int(response.totals.turns)
        )
    }

    func subscribeEvents(threadId: String, sinceSeq: Int?) -> AsyncThrowingStream<RuntimeEvent, Error> {
        AsyncThrowingStream { continuation in
            Task {
                do {
                    var components = URLComponents(string: "/v1/threads/\(threadId)/events")!
                    if let sinceSeq {
                        components.queryItems = [URLQueryItem(name: "since_seq", value: "\(sinceSeq)")]
                    }
                    var request = try makeRequest(path: components.string ?? "/v1/threads/\(threadId)/events", method: "GET", body: nil)
                    request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
                    let (bytes, response) = try await session.bytes(for: request)
                    guard let httpResponse = response as? HTTPURLResponse, (200..<300).contains(httpResponse.statusCode) else {
                        throw RuntimeClientError.invalidResponse
                    }
                    for try await line in bytes.lines {
                        guard line.hasPrefix("data:") else { continue }
                        let dataLine = line.dropFirst("data:".count).trimmingCharacters(in: .whitespaces)
                        guard let data = dataLine.data(using: .utf8) else { continue }
                        let event = try decoder.decode(RuntimeAPIEvent.self, from: data)
                        continuation.yield(Self.mapEvent(event))
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
        }
    }

    private func request<T: Decodable>(path: String, method: String, body: Data?) async throws -> T {
        let request = try makeRequest(path: path, method: method, body: body)
        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw RuntimeClientError.invalidResponse
        }
        guard (200..<300).contains(httpResponse.statusCode) else {
            let body = String(data: data, encoding: .utf8) ?? ""
            throw RuntimeClientError.httpStatus(httpResponse.statusCode, body)
        }
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw RuntimeClientError.decode(error.localizedDescription)
        }
    }

    private func makeRequest(path: String, method: String, body: Data?) throws -> URLRequest {
        guard let url = URL(string: path, relativeTo: baseURL) else {
            throw RuntimeClientError.unsupported("Invalid runtime path \(path).")
        }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body {
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        return request
    }

    private static func mapThread(_ thread: RuntimeAPIThread, turns: [RuntimeAPITurn] = []) -> RuntimeThread {
        let derivedTitle = turns.last?.inputSummary.trimmingCharacters(in: .whitespacesAndNewlines)
        let title = [thread.title, derivedTitle, "New Thread"]
            .compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
            .first { !$0.isEmpty } ?? "New Thread"
        return RuntimeThread(
            id: thread.id,
            title: title,
            projectPath: thread.workspace,
            updatedAt: thread.updatedAt,
            archived: thread.archived
        )
    }

    private static func mapTurn(_ turn: RuntimeAPITurn) -> RuntimeTurn {
        RuntimeTurn(id: turn.id, threadId: turn.threadId, status: mapStatus(turn.status))
    }

    private static func mapTimelineItem(_ item: RuntimeAPITurnItem) -> TimelineItem {
        TimelineItem(
            id: item.id,
            kind: mapItemKind(item.kind),
            title: title(for: item),
            content: item.detail ?? item.summary,
            status: mapLifecycleStatus(item.status),
            approval: nil
        )
    }

    private static func mapEvent(_ event: RuntimeAPIEvent) -> RuntimeEvent {
        RuntimeEvent(
            seq: Int(event.seq),
            event: mapEventName(event),
            threadId: event.threadId,
            turnId: event.turnId,
            payload: mapEventPayload(event),
            createdAt: event.timestamp
        )
    }

    private static func mapEventName(_ event: RuntimeAPIEvent) -> String {
        switch event.event {
        case "turn.steered":
            return "item.completed"
        case "approval.timeout":
            return "approval.decided"
        case "item.interrupted":
            return "item.failed"
        default:
            return event.event
        }
    }

    private static func mapEventPayload(_ event: RuntimeAPIEvent) -> JSONValue {
        switch event.event {
        case "turn.started", "turn.completed":
            if let payload = try? event.payload.decoded(as: RuntimeAPITurnPayload.self) {
                return .object(["turnId": .string(payload.turn.id)])
            }
        case "item.started":
            if let payload = try? event.payload.decoded(as: RuntimeAPIItemPayload.self) {
                let item = payload.item
                return .object([
                    "itemId": .string(item.id),
                    "kind": .string(mapItemKind(item.kind)),
                    "title": .string(title(for: item)),
                    "content": .string(item.detail ?? item.summary)
                ])
            }
        case "item.delta":
            if let payload = try? event.payload.decoded(as: RuntimeAPIDeltaPayload.self) {
                return .object([
                    "itemId": .string(event.itemId ?? ""),
                    "delta": .string(payload.delta)
                ])
            }
        case "item.completed":
            if let payload = try? event.payload.decoded(as: RuntimeAPIItemPayload.self) {
                return .object([
                    "itemId": .string(payload.item.id),
                    "content": .string(payload.item.detail ?? payload.item.summary)
                ])
            }
        case "item.failed", "item.interrupted":
            return .object([
                "itemId": .string(event.itemId ?? ""),
                "message": .string("Runtime item did not complete.")
            ])
        case "approval.required":
            if let payload = try? event.payload.decoded(as: RuntimeAPIApprovalRequiredPayload.self) {
                let approvalId = payload.approvalId ?? payload.id ?? event.itemId ?? "approval"
                return .object([
                    "itemId": .string(event.itemId ?? "approval-\(approvalId)"),
                    "approvalId": .string(approvalId),
                    "title": .string("Approval required"),
                    "toolName": .string(payload.toolName ?? "runtime"),
                    "actionType": .string("tool"),
                    "cwd": .string(""),
                    "expectedSideEffect": .string(payload.description ?? "Runtime requested approval.")
                ])
            }
        case "approval.decided", "approval.timeout":
            if let payload = try? event.payload.decoded(as: RuntimeAPIApprovalDecidedPayload.self) {
                return .object([
                    "approvalId": .string(payload.approvalId),
                    "decision": .string(payload.decision)
                ])
            }
        default:
            break
        }
        return event.payload
    }

    private static func mapItemKind(_ kind: String) -> String {
        switch kind {
        case "user_message":
            return "user"
        case "agent_message", "agent_reasoning":
            return "assistant"
        case "tool_call", "command_execution", "file_change":
            return "tool"
        case "error":
            return "status"
        default:
            return "status"
        }
    }

    private static func title(for item: RuntimeAPITurnItem) -> String {
        switch item.kind {
        case "user_message":
            return "You"
        case "agent_message":
            return "DeepSeek"
        case "agent_reasoning":
            return "Reasoning"
        case "tool_call":
            return "Tool call"
        case "command_execution":
            return "Command"
        case "file_change":
            return "File change"
        case "error":
            return "Error"
        default:
            return item.summary.isEmpty ? "Status" : item.summary
        }
    }

    private static func mapLifecycleStatus(_ status: String) -> String {
        switch status {
        case "queued":
            return "queued"
        case "in_progress":
            return "running"
        case "completed":
            return "completed"
        case "failed", "interrupted", "canceled":
            return "failed"
        default:
            return status
        }
    }

    private static func mapStatus(_ status: String) -> String {
        switch status {
        case "in_progress":
            return "running"
        case "canceled":
            return "interrupted"
        default:
            return status
        }
    }
}

private struct RuntimeAPIHealthResponse: Decodable {
    var status: String
    var service: String?
}

private struct RuntimeAPIInfoResponse: Decodable {
    var bindHost: String
    var port: UInt16
    var authRequired: Bool
    var version: String

    enum CodingKeys: String, CodingKey {
        case bindHost = "bind_host"
        case port
        case authRequired = "auth_required"
        case version
    }
}

private struct RuntimeAPIThread: Decodable {
    var id: String
    var updatedAt: String
    var workspace: String
    var archived: Bool
    var title: String?

    enum CodingKeys: String, CodingKey {
        case id
        case updatedAt = "updated_at"
        case workspace
        case archived
        case title
    }
}

private struct RuntimeAPITurn: Decodable {
    var id: String
    var threadId: String
    var status: String
    var inputSummary: String

    enum CodingKeys: String, CodingKey {
        case id
        case threadId = "thread_id"
        case status
        case inputSummary = "input_summary"
    }
}

private struct RuntimeAPITurnItem: Decodable {
    var id: String
    var kind: String
    var status: String
    var summary: String
    var detail: String?
}

private struct RuntimeAPIThreadDetail: Decodable {
    var thread: RuntimeAPIThread
    var turns: [RuntimeAPITurn]
    var items: [RuntimeAPITurnItem]
    var latestSeq: UInt64

    enum CodingKeys: String, CodingKey {
        case thread
        case turns
        case items
        case latestSeq = "latest_seq"
    }
}

private struct RuntimeAPICreateThreadRequest: Encodable {
    var workspace: String
}

private struct RuntimeAPIUpdateThreadRequest: Encodable {
    var title: String
}

private struct RuntimeAPIStartTurnRequest: Encodable {
    var prompt: String
}

private struct RuntimeAPISteerTurnRequest: Encodable {
    var prompt: String
}

private struct RuntimeAPIStartTurnResponse: Decodable {
    var thread: RuntimeAPIThread
    var turn: RuntimeAPITurn
}

private struct RuntimeAPIApprovalRequest: Encodable {
    var decision: String
}

private struct RuntimeAPIApprovalResponse: Decodable {
    var ok: Bool
    var approvalId: String
    var decision: String

    enum CodingKeys: String, CodingKey {
        case ok
        case approvalId = "approval_id"
        case decision
    }
}

private struct RuntimeAPIUsageAggregation: Decodable {
    var totals: RuntimeAPIUsageTotals
}

private struct RuntimeAPIUsageTotals: Decodable {
    var inputTokens: UInt64
    var outputTokens: UInt64
    var costUSD: Double
    var turns: UInt64

    enum CodingKeys: String, CodingKey {
        case inputTokens = "input_tokens"
        case outputTokens = "output_tokens"
        case costUSD = "cost_usd"
        case turns
    }
}

private struct RuntimeAPIEvent: Decodable {
    var seq: UInt64
    var timestamp: String
    var threadId: String
    var turnId: String?
    var itemId: String?
    var event: String
    var payload: JSONValue

    enum CodingKeys: String, CodingKey {
        case seq
        case timestamp
        case threadId = "thread_id"
        case turnId = "turn_id"
        case itemId = "item_id"
        case event
        case payload
    }
}

private struct RuntimeAPITurnPayload: Decodable {
    var turn: RuntimeAPITurn
}

private struct RuntimeAPIItemPayload: Decodable {
    var item: RuntimeAPITurnItem
}

private struct RuntimeAPIDeltaPayload: Decodable {
    var delta: String
}

private struct RuntimeAPIApprovalRequiredPayload: Decodable {
    var id: String?
    var approvalId: String?
    var toolName: String?
    var description: String?

    enum CodingKeys: String, CodingKey {
        case id
        case approvalId = "approval_id"
        case toolName = "tool_name"
        case description
    }
}

private struct RuntimeAPIApprovalDecidedPayload: Decodable {
    var approvalId: String
    var decision: String

    enum CodingKeys: String, CodingKey {
        case approvalId = "approval_id"
        case decision
    }
}
