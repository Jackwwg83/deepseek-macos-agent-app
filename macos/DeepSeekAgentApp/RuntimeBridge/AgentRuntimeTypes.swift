import Foundation

struct RuntimeHealth: Codable, Equatable {
    var status: String
    var mode: String
    var message: String?
}

struct RuntimeInfo: Codable, Equatable {
    var appVersion: String
    var runtimeVersion: String
    var authRequired: Bool
    var mode: String
    var capabilities: [String]
}

struct RuntimeThread: Codable, Equatable {
    var id: String
    var title: String
    var projectPath: String
    var updatedAt: String
    var archived: Bool?
}

struct TimelineItem: Codable, Equatable {
    var id: String
    var kind: String
    var title: String
    var content: String
    var status: String
    var approval: ApprovalRequest?
}

struct ThreadDetail: Codable, Equatable {
    var thread: RuntimeThread
    var items: [TimelineItem]
    var lastSeq: Int
}

struct ListThreadsQuery: Codable, Equatable {
    var limit: Int?
    var includeArchived: Bool?
}

struct CreateThreadRequest: Codable, Equatable {
    var title: String?
    var projectPath: String
}

struct StartTurnRequest: Codable, Equatable {
    var input: String
}

struct StartTurnResponse: Codable, Equatable {
    var turnId: String
    var accepted: Bool
}

struct RuntimeTurn: Codable, Equatable {
    var id: String
    var threadId: String
    var status: String
}

struct ApprovalRequest: Codable, Equatable {
    var approvalId: String
    var title: String
    var toolName: String
    var actionType: String
    var cwd: String
    var command: String?
    var path: String?
    var expectedSideEffect: String
    var decision: String?
}

struct ApprovalResponse: Codable, Equatable {
    var approvalId: String
    var decision: String
    var accepted: Bool
}

struct UsageQuery: Codable, Equatable {
    var groupBy: String?
}

struct UsageAggregation: Codable, Equatable {
    var currency: String
    var totalCost: Double
    var inputTokens: Int
    var outputTokens: Int
    var completedTurns: Int
}

struct RuntimeEvent: Codable, Equatable {
    var seq: Int
    var event: String
    var threadId: String
    var turnId: String?
    var payload: JSONValue
    var createdAt: String
}

enum RuntimeClientError: LocalizedError, Equatable {
    case invalidResponse
    case httpStatus(Int, String)
    case decode(String)
    case unsupported(String)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Runtime returned an invalid response."
        case .httpStatus(let status, let body):
            return "Runtime request failed with HTTP \(status): \(body)"
        case .decode(let message):
            return "Runtime response could not be decoded: \(message)"
        case .unsupported(let message):
            return message
        }
    }
}

func isoNow() -> String {
    ISO8601DateFormatter().string(from: Date())
}

