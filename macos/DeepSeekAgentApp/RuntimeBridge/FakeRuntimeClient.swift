import Foundation

final class FakeRuntimeClient: AgentRuntimeClient, @unchecked Sendable {
    private struct ThreadRecord {
        var thread: RuntimeThread
        var items: [TimelineItem]
        var events: [RuntimeEvent]
    }

    private let queue = DispatchQueue(label: "app.deepseek.demo-runtime")
    private var threads: [ThreadRecord]
    private var seq = 0
    private var completedTurns = 0
    private var continuations: [String: [UUID: AsyncThrowingStream<RuntimeEvent, Error>.Continuation]] = [:]

    init(projectPath: String = "~/Projects") {
        let thread = RuntimeThread(
            id: "thread-welcome",
            title: "Explore DeepSeek Agent",
            projectPath: projectPath,
            updatedAt: isoNow(),
            archived: false
        )
        self.threads = [
            ThreadRecord(
                thread: thread,
                items: [
                    TimelineItem(
                        id: "welcome",
                        kind: "assistant",
                        title: "DeepSeek Agent",
                        content: "Demo runtime connected.",
                        status: "completed",
                        approval: nil
                    )
                ],
                events: []
            )
        ]
    }

    func health() async throws -> RuntimeHealth {
        RuntimeHealth(status: "ok", mode: "fake", message: "Demo runtime connected")
    }

    func runtimeInfo() async throws -> RuntimeInfo {
        RuntimeInfo(
            appVersion: "0.1.0",
            runtimeVersion: "demo-runtime",
            authRequired: false,
            mode: "fake",
            capabilities: ["threads", "turns", "events", "approvals", "usage"]
        )
    }

    func listThreads(limit: Int?, includeArchived: Bool) async throws -> [RuntimeThread] {
        try await queue.syncAsync {
            Array(self.threads
                .map(\.thread)
                .filter { includeArchived || !($0.archived ?? false) }
                .prefix(limit ?? self.threads.count))
        }
    }

    func createThread(_ request: CreateThreadRequest) async throws -> RuntimeThread {
        try await queue.syncAsync {
            let thread = RuntimeThread(
                id: "thread-\(self.threads.count + 1)",
                title: request.title?.isEmpty == false ? request.title! : "New chat",
                projectPath: request.projectPath,
                updatedAt: isoNow(),
                archived: false
            )
            self.threads.insert(ThreadRecord(thread: thread, items: [], events: []), at: 0)
            _ = self.emitLocked(threadId: thread.id, event: "thread.started", payload: .object([
                "thread": .object([
                    "id": .string(thread.id),
                    "title": .string(thread.title),
                    "projectPath": .string(thread.projectPath),
                    "updatedAt": .string(thread.updatedAt),
                    "archived": .bool(false)
                ])
            ]))
            return thread
        }
    }

    func getThread(_ id: String) async throws -> ThreadDetail {
        try await queue.syncAsync {
            guard let record = self.threads.first(where: { $0.thread.id == id }) else {
                throw RuntimeClientError.unsupported("Unknown fake thread \(id).")
            }
            return ThreadDetail(thread: record.thread, items: record.items, lastSeq: record.events.last?.seq ?? 0)
        }
    }

    func startTurn(threadId: String, request: StartTurnRequest) async throws -> StartTurnResponse {
        let turnId = "turn-\(UUID().uuidString)"
        let userItemId = "\(turnId)-user"
        let assistantItemId = "\(turnId)-assistant"
        let toolItemId = "\(turnId)-tool"
        let approvalItemId = "\(turnId)-approval"
        let approvalId = "\(turnId)-approval-id"

        queue.async {
            self.emitLocked(threadId: threadId, event: "turn.started", payload: .object(["turnId": .string(turnId)]), turnId: turnId)
            self.emitLocked(threadId: threadId, event: "item.started", payload: .object([
                "itemId": .string(userItemId),
                "kind": .string("user"),
                "title": .string("You"),
                "content": .string(request.input)
            ]), turnId: turnId)
            self.emitLocked(threadId: threadId, event: "item.completed", payload: .object(["itemId": .string(userItemId)]), turnId: turnId)

            let projectPath = self.threads.first(where: { $0.thread.id == threadId })?.thread.projectPath ?? "~/Projects"
            let steps: [(TimeInterval, () -> Void)] = [
                (0.10, { self.emitLocked(threadId: threadId, event: "item.started", payload: .object(["itemId": .string(assistantItemId), "kind": .string("assistant"), "title": .string("DeepSeek")]), turnId: turnId) }),
                (0.22, { self.emitLocked(threadId: threadId, event: "item.delta", payload: .object(["itemId": .string(assistantItemId), "delta": .string("I inspected the local project context. ")]), turnId: turnId) }),
                (0.34, { self.emitLocked(threadId: threadId, event: "item.delta", payload: .object(["itemId": .string(assistantItemId), "delta": .string("The native shell is proxying this fake runtime flow. ")]), turnId: turnId) }),
                (0.46, { self.emitLocked(threadId: threadId, event: "item.started", payload: .object(["itemId": .string(toolItemId), "kind": .string("tool"), "title": .string("Command preview"), "content": .string("bash scripts/dev/check.sh")]), turnId: turnId) }),
                (0.58, { self.emitLocked(threadId: threadId, event: "item.completed", payload: .object(["itemId": .string(toolItemId)]), turnId: turnId) }),
                (0.70, { self.emitLocked(threadId: threadId, event: "approval.required", payload: .object([
                    "itemId": .string(approvalItemId),
                    "approvalId": .string(approvalId),
                    "title": .string("Run local verification"),
                    "toolName": .string("shell"),
                    "actionType": .string("command"),
                    "cwd": .string(projectPath),
                    "command": .string("bash scripts/dev/check.sh"),
                    "expectedSideEffect": .string("Runs local build and unit checks without modifying project files.")
                ]), turnId: turnId) })
            ]

            for step in steps {
                self.queue.asyncAfter(deadline: .now() + step.0, execute: step.1)
            }
        }

        return StartTurnResponse(turnId: turnId, accepted: true)
    }

    func interruptTurn(threadId: String, turnId: String) async throws -> RuntimeTurn {
        queue.async {
            self.emitLocked(threadId: threadId, event: "turn.interrupt_requested", payload: .object(["turnId": .string(turnId)]), turnId: turnId)
        }
        return RuntimeTurn(id: turnId, threadId: threadId, status: "interrupted")
    }

    func steerTurn(threadId: String, turnId: String, message: String) async throws -> RuntimeTurn {
        queue.async {
            let itemId = "\(turnId)-steer"
            self.emitLocked(threadId: threadId, event: "item.started", payload: .object([
                "itemId": .string(itemId),
                "kind": .string("status"),
                "title": .string("Steer"),
                "content": .string(message)
            ]), turnId: turnId)
            self.emitLocked(threadId: threadId, event: "item.completed", payload: .object(["itemId": .string(itemId)]), turnId: turnId)
        }
        return RuntimeTurn(id: turnId, threadId: threadId, status: "running")
    }

    func respondApproval(approvalId: String, decision: String) async throws -> ApprovalResponse {
        try await queue.syncAsync {
            guard let record = self.threads.first(where: { thread in
                thread.events.contains { event in
                    guard case .object(let payload) = event.payload else { return false }
                    return payload["approvalId"] == .string(approvalId)
                }
            }) else {
                throw RuntimeClientError.unsupported("Unknown fake approval \(approvalId).")
            }

            let turnId = approvalId.replacingOccurrences(of: "-approval-id", with: "")
            let assistantItemId = "\(turnId)-assistant"
            self.emitLocked(threadId: record.thread.id, event: "approval.decided", payload: .object([
                "approvalId": .string(approvalId),
                "decision": .string(decision)
            ]), turnId: turnId)
            self.emitLocked(threadId: record.thread.id, event: "item.delta", payload: .object([
                "itemId": .string(assistantItemId),
                "delta": .string(decision == "allow" ? "Approval granted. The demo check completed cleanly." : "Approval denied. I stopped before running the command.")
            ]), turnId: turnId)
            self.emitLocked(threadId: record.thread.id, event: "item.completed", payload: .object(["itemId": .string(assistantItemId)]), turnId: turnId)
            self.emitLocked(threadId: record.thread.id, event: "turn.completed", payload: .object(["turnId": .string(turnId)]), turnId: turnId)
            self.completedTurns += 1
            return ApprovalResponse(approvalId: approvalId, decision: decision, accepted: true)
        }
    }

    func usage(query: UsageQuery) async throws -> UsageAggregation {
        try await queue.syncAsync {
            UsageAggregation(
                currency: "USD",
                totalCost: 0.0024 + Double(self.completedTurns) * 0.0007,
                inputTokens: 1_820 + self.completedTurns * 250,
                outputTokens: 940 + self.completedTurns * 190,
                completedTurns: self.completedTurns
            )
        }
    }

    func subscribeEvents(threadId: String, sinceSeq: Int?) -> AsyncThrowingStream<RuntimeEvent, Error> {
        AsyncThrowingStream { continuation in
            let id = UUID()
            queue.async {
                let replay = self.threads
                    .first(where: { $0.thread.id == threadId })?
                    .events
                    .filter { $0.seq > (sinceSeq ?? 0) } ?? []
                replay.forEach { continuation.yield($0) }
                var bucket = self.continuations[threadId, default: [:]]
                bucket[id] = continuation
                self.continuations[threadId] = bucket
            }
            continuation.onTermination = { _ in
                self.queue.async {
                    self.continuations[threadId]?.removeValue(forKey: id)
                }
            }
        }
    }

    @discardableResult
    private func emitLocked(threadId: String, event: String, payload: JSONValue, turnId: String? = nil) -> RuntimeEvent {
        seq += 1
        let runtimeEvent = RuntimeEvent(seq: seq, event: event, threadId: threadId, turnId: turnId, payload: payload, createdAt: isoNow())
        guard let index = threads.firstIndex(where: { $0.thread.id == threadId }) else {
            return runtimeEvent
        }
        threads[index].events.append(runtimeEvent)
        threads[index].thread.updatedAt = runtimeEvent.createdAt
        threads[index].items = materialize(items: threads[index].items, event: runtimeEvent)
        continuations[threadId]?.values.forEach { $0.yield(runtimeEvent) }
        return runtimeEvent
    }

    private func materialize(items: [TimelineItem], event: RuntimeEvent) -> [TimelineItem] {
        guard case .object(let payload) = event.payload else {
            return items
        }

        switch event.event {
        case "item.started":
            guard case .string(let itemId) = payload["itemId"],
                  case .string(let kind) = payload["kind"],
                  case .string(let title) = payload["title"] else {
                return items
            }
            let content: String
            if case .string(let value) = payload["content"] {
                content = value
            } else {
                content = ""
            }
            return items + [TimelineItem(id: itemId, kind: kind, title: title, content: content, status: kind == "approval" ? "waiting" : "running", approval: nil)]
        case "item.delta":
            guard case .string(let itemId) = payload["itemId"],
                  case .string(let delta) = payload["delta"] else {
                return items
            }
            return items.map { item in
                item.id == itemId ? TimelineItem(id: item.id, kind: item.kind, title: item.title, content: item.content + delta, status: item.status, approval: item.approval) : item
            }
        case "item.completed":
            guard case .string(let itemId) = payload["itemId"] else {
                return items
            }
            return items.map { item in
                item.id == itemId ? TimelineItem(id: item.id, kind: item.kind, title: item.title, content: item.content, status: "completed", approval: item.approval) : item
            }
        case "approval.required":
            guard case .string(let itemId) = payload["itemId"],
                  case .string(let approvalId) = payload["approvalId"],
                  case .string(let title) = payload["title"],
                  case .string(let toolName) = payload["toolName"],
                  case .string(let actionType) = payload["actionType"],
                  case .string(let cwd) = payload["cwd"],
                  case .string(let effect) = payload["expectedSideEffect"] else {
                return items
            }
            let command: String?
            if case .string(let value) = payload["command"] {
                command = value
            } else {
                command = nil
            }
            let approval = ApprovalRequest(
                approvalId: approvalId,
                title: title,
                toolName: toolName,
                actionType: actionType,
                cwd: cwd,
                command: command,
                path: nil,
                expectedSideEffect: effect,
                decision: nil
            )
            return items + [TimelineItem(id: itemId, kind: "approval", title: title, content: effect, status: "waiting", approval: approval)]
        case "approval.decided":
            guard case .string(let approvalId) = payload["approvalId"],
                  case .string(let decision) = payload["decision"] else {
                return items
            }
            return items.map { item in
                guard var approval = item.approval, approval.approvalId == approvalId else {
                    return item
                }
                approval.decision = decision
                return TimelineItem(id: item.id, kind: item.kind, title: item.title, content: item.content, status: "completed", approval: approval)
            }
        default:
            return items
        }
    }
}

private extension DispatchQueue {
    func syncAsync<T>(_ work: @escaping () throws -> T) async throws -> T {
        try await withCheckedThrowingContinuation { continuation in
            async {
                do {
                    continuation.resume(returning: try work())
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }
}
