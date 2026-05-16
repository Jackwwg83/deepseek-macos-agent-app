import Foundation

enum BridgeMethod: String, Codable, CaseIterable {
    case getRuntimeSettings
    case saveRuntimeSettings
    case clearAPIKey
    case useDemoRuntime
    case health
    case runtimeInfo
    case listThreads
    case createThread
    case getThread
    case startTurn
    case interruptTurn
    case steerTurn
    case respondApproval
    case getUsage
    case subscribeEvents
    case unsubscribeEvents
}

struct BridgeEnvelope: Decodable, Equatable {
    var id: String
    var method: BridgeMethod
    var payload: JSONValue?
}

enum BridgeMessageError: LocalizedError, Equatable {
    case payloadTooLarge
    case malformed(String)
    case emptyId

    var errorDescription: String? {
        switch self {
        case .payloadTooLarge:
            return "Bridge message exceeded the maximum payload size."
        case .malformed(let message):
            return "Bridge message is malformed: \(message)"
        case .emptyId:
            return "Bridge message id is required."
        }
    }
}

enum BridgeMessageDecoder {
    static let maxPayloadBytes = 128 * 1024

    static func decode(data: Data, decoder: JSONDecoder = JSONDecoder()) throws -> BridgeEnvelope {
        guard data.count <= maxPayloadBytes else {
            throw BridgeMessageError.payloadTooLarge
        }
        do {
            let envelope = try decoder.decode(BridgeEnvelope.self, from: data)
            guard !envelope.id.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                throw BridgeMessageError.emptyId
            }
            return envelope
        } catch let error as BridgeMessageError {
            throw error
        } catch {
            throw BridgeMessageError.malformed(error.localizedDescription)
        }
    }
}

struct IdPayload: Codable {
    var id: String
}

struct StartTurnPayload: Codable {
    var threadId: String
    var request: StartTurnRequest
}

struct TurnPayload: Codable {
    var threadId: String
    var turnId: String
}

struct SteerPayload: Codable {
    var threadId: String
    var turnId: String
    var message: String
}

struct ApprovalDecisionPayload: Codable {
    var approvalId: String
    var decision: String
}

struct SubscribePayload: Codable {
    var threadId: String
    var sinceSeq: Int?
}

struct EmptyResponse: Codable, Equatable {
    var ok: Bool
}

struct RuntimeSettingsSnapshot: Codable, Equatable {
    var baseURL: String
    var model: String
    var sidecarPath: String
    var hasAPIKey: Bool
}

struct SaveRuntimeSettingsPayload: Codable, Equatable {
    var baseURL: String
    var model: String
    var apiKey: String?
    var sidecarPath: String?
    var startRuntime: Bool?
}

struct NativeRuntimeBridgeActions {
    var getRuntimeSettings: () throws -> RuntimeSettingsSnapshot
    var saveRuntimeSettings: (SaveRuntimeSettingsPayload) throws -> RuntimeSettingsSnapshot
    var clearAPIKey: () throws -> RuntimeSettingsSnapshot
    var useDemoRuntime: () throws -> RuntimeSettingsSnapshot
}
