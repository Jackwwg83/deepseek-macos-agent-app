import Foundation
import WebKit

final class RuntimeBridgeController: NSObject, WKScriptMessageHandler, WKScriptMessageHandlerWithReply {
    private weak var webView: WKWebView?
    private let client: AgentRuntimeClient
    private let nativeActions: NativeRuntimeBridgeActions?
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    private var eventTasks: [String: Task<Void, Never>] = [:]

    init(client: AgentRuntimeClient, nativeActions: NativeRuntimeBridgeActions? = nil) {
        self.client = client
        self.nativeActions = nativeActions
    }

    func attach(to webView: WKWebView) {
        self.webView = webView
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let data = try? JSONSerialization.data(withJSONObject: message.body, options: []) else {
            resolve(id: "unknown", resultJSON: "null", error: "Native bridge received a non-JSON message.")
            return
        }

        Task {
            do {
                let envelope = try BridgeMessageDecoder.decode(data: data, decoder: decoder)
                let resultData = try await route(envelope)
                let resultJSON = String(data: resultData, encoding: .utf8) ?? "null"
                resolve(id: envelope.id, resultJSON: resultJSON, error: nil)
            } catch {
                let id = (try? decoder.decode(BridgeEnvelope.self, from: data).id) ?? "unknown"
                resolve(id: id, resultJSON: "null", error: error.localizedDescription)
            }
        }
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage,
        replyHandler: @escaping (Any?, String?) -> Void
    ) {
        guard let data = try? JSONSerialization.data(withJSONObject: message.body, options: []) else {
            replyHandler(nil, "Native bridge received a non-JSON message.")
            return
        }

        Task {
            do {
                let envelope = try BridgeMessageDecoder.decode(data: data, decoder: decoder)
                let resultData = try await route(envelope)
                let result = try JSONSerialization.jsonObject(with: resultData, options: [])
                replyHandler(result, nil)
            } catch {
                replyHandler(nil, error.localizedDescription)
            }
        }
    }

    private func route(_ envelope: BridgeEnvelope) async throws -> Data {
        switch envelope.method {
        case .getRuntimeSettings:
            return try encoder.encode(try requireNativeActions().getRuntimeSettings())
        case .saveRuntimeSettings:
            let payload = try requirePayload(envelope, as: SaveRuntimeSettingsPayload.self)
            return try encoder.encode(try requireNativeActions().saveRuntimeSettings(payload))
        case .useDemoRuntime:
            return try encoder.encode(try requireNativeActions().useDemoRuntime())
        case .health:
            return try encoder.encode(try await client.health())
        case .runtimeInfo:
            return try encoder.encode(try await client.runtimeInfo())
        case .listThreads:
            let query = try envelope.payload?.decoded(as: ListThreadsQuery.self) ?? ListThreadsQuery(limit: nil, includeArchived: nil)
            return try encoder.encode(try await client.listThreads(limit: query.limit, includeArchived: query.includeArchived ?? false))
        case .createThread:
            let request = try requirePayload(envelope, as: CreateThreadRequest.self)
            return try encoder.encode(try await client.createThread(request))
        case .getThread:
            let payload = try requirePayload(envelope, as: IdPayload.self)
            return try encoder.encode(try await client.getThread(payload.id))
        case .startTurn:
            let payload = try requirePayload(envelope, as: StartTurnPayload.self)
            return try encoder.encode(try await client.startTurn(threadId: payload.threadId, request: payload.request))
        case .interruptTurn:
            let payload = try requirePayload(envelope, as: TurnPayload.self)
            return try encoder.encode(try await client.interruptTurn(threadId: payload.threadId, turnId: payload.turnId))
        case .steerTurn:
            let payload = try requirePayload(envelope, as: SteerPayload.self)
            return try encoder.encode(try await client.steerTurn(threadId: payload.threadId, turnId: payload.turnId, message: payload.message))
        case .respondApproval:
            let payload = try requirePayload(envelope, as: ApprovalDecisionPayload.self)
            return try encoder.encode(try await client.respondApproval(approvalId: payload.approvalId, decision: payload.decision))
        case .getUsage:
            let query = try envelope.payload?.decoded(as: UsageQuery.self) ?? UsageQuery(groupBy: nil)
            return try encoder.encode(try await client.usage(query: query))
        case .subscribeEvents:
            let payload = try requirePayload(envelope, as: SubscribePayload.self)
            subscribe(threadId: payload.threadId, sinceSeq: payload.sinceSeq)
            return try encoder.encode(EmptyResponse(ok: true))
        case .unsubscribeEvents:
            let payload = try requirePayload(envelope, as: SubscribePayload.self)
            eventTasks[payload.threadId]?.cancel()
            eventTasks[payload.threadId] = nil
            return try encoder.encode(EmptyResponse(ok: true))
        }
    }

    private func requirePayload<T: Decodable>(_ envelope: BridgeEnvelope, as type: T.Type) throws -> T {
        guard let payload = envelope.payload else {
            throw BridgeMessageError.malformed("Missing payload for \(envelope.method.rawValue).")
        }
        return try payload.decoded(as: type)
    }

    private func requireNativeActions() throws -> NativeRuntimeBridgeActions {
        guard let nativeActions else {
            throw RuntimeClientError.unsupported("Native runtime settings bridge is not available.")
        }
        return nativeActions
    }

    private func subscribe(threadId: String, sinceSeq: Int?) {
        eventTasks[threadId]?.cancel()
        let stream = client.subscribeEvents(threadId: threadId, sinceSeq: sinceSeq)
        eventTasks[threadId] = Task { [weak self] in
            do {
                for try await event in stream {
                    try Task.checkCancellation()
                    self?.emit(threadId: threadId, event: event)
                }
            } catch {
                self?.resolve(id: "subscription-\(threadId)", resultJSON: "null", error: error.localizedDescription)
            }
        }
    }

    private func resolve(id: String, resultJSON: String, error: String?) {
        let script: String
        if let error {
            script = "window.deepseekAgentBridgeResolve(\(Self.jsonString(id)), \(resultJSON), \(Self.jsonString(error)));"
        } else {
            script = "window.deepseekAgentBridgeResolve(\(Self.jsonString(id)), \(resultJSON), null);"
        }
        DispatchQueue.main.async { [weak webView] in
            webView?.evaluateJavaScript(script)
        }
    }

    private func emit(threadId: String, event: RuntimeEvent) {
        guard let eventData = try? encoder.encode(event),
              let eventJSON = String(data: eventData, encoding: .utf8) else {
            return
        }
        let script = "window.deepseekAgentBridgeEvent(\(Self.jsonString(threadId)), \(eventJSON));"
        DispatchQueue.main.async { [weak webView] in
            webView?.evaluateJavaScript(script)
        }
    }

    private static func jsonString(_ value: String) -> String {
        let data = try? JSONSerialization.data(withJSONObject: value, options: [])
        return data.flatMap { String(data: $0, encoding: .utf8) } ?? "\"\""
    }
}
