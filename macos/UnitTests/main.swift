import Foundation

@main
enum UnitTestRunner {
    static func main() async {
        var suite = TestSuite()
        await suite.run("sidecar command keeps API key out of argv") {
            let manager = SidecarManager(environment: ["PATH": "/usr/bin"])
            let command = manager.makeCommand(
                binaryURL: URL(fileURLWithPath: "/bin/echo"),
                port: 49200,
                token: "runtime-token",
                deepSeekAPIKey: "sk-secret"
            )

            try expect(!command.arguments.joined(separator: " ").contains("sk-secret"), "API key leaked into argv")
            try expect(command.environment["DEEPSEEK_API_KEY"] == "sk-secret", "API key was not passed by environment")
            try expect(command.arguments.contains("--auth-token"), "auth token flag missing")
            try expect(command.arguments.contains("runtime-token"), "runtime token missing from argv")
            try expect(command.arguments.contains("127.0.0.1"), "sidecar is not bound to loopback")
        }

        await suite.run("sidecar generates bearer token and dynamic port") {
            let token = try SidecarManager.generateBearerToken()
            try expect(token.count >= 32, "token is too short")
            try expect(!token.contains("="), "token should be URL-safe")
            let port = try SidecarManager.availableLoopbackPort()
            try expect(port > 0, "dynamic port was not allocated")
        }

        await suite.run("binary discovery respects DEEPSEEK_TUI_BIN") {
            let manager = SidecarManager(environment: ["DEEPSEEK_TUI_BIN": "/bin/echo"])
            try expect(manager.discoverBinary()?.path == "/bin/echo", "DEEPSEEK_TUI_BIN was not discovered")
        }

        await suite.run("bridge decodes known method and rejects malformed messages") {
            let known = #"{"id":"1","method":"health","payload":{}}"#.data(using: .utf8)!
            let envelope = try BridgeMessageDecoder.decode(data: known)
            try expect(envelope.method == .health, "health method did not decode")

            let unknown = #"{"id":"1","method":"deleteEverything","payload":{}}"#.data(using: .utf8)!
            try expectThrows("unknown method should fail") {
                _ = try BridgeMessageDecoder.decode(data: unknown)
            }

            let emptyId = #"{"id":" ","method":"health","payload":{}}"#.data(using: .utf8)!
            try expectThrows("empty id should fail") {
                _ = try BridgeMessageDecoder.decode(data: emptyId)
            }

            let oversized = Data(repeating: 1, count: BridgeMessageDecoder.maxPayloadBytes + 1)
            try expectThrows("oversized payload should fail") {
                _ = try BridgeMessageDecoder.decode(data: oversized)
            }
        }

        await suite.run("DeepSeek runtime client calls health and runtime info endpoints") {
            let client = makeClient { request in
                switch request.url?.path {
                case "/health":
                    try expect(request.value(forHTTPHeaderField: "Authorization") == "Bearer token-123", "missing bearer token")
                    return jsonResponse(path: "/health", body: #"{"status":"ok","mode":"real","message":"ready"}"#)
                case "/v1/runtime/info":
                    return jsonResponse(
                        path: "/v1/runtime/info",
                        body: #"{"appVersion":"0.1.0","runtimeVersion":"0.8.37","authRequired":true,"mode":"real","capabilities":["threads"]}"#
                    )
                default:
                    return httpResponse(path: request.url?.path ?? "/", status: 404, body: "not found")
                }
            }

            let health = try await client.health()
            try expect(health.status == "ok", "health endpoint did not decode")
            let info = try await client.runtimeInfo()
            try expect(info.runtimeVersion == "0.8.37", "runtime info endpoint did not decode")
        }

        await suite.run("runtime HTTP errors map to RuntimeClientError") {
            let client = makeClient { request in
                httpResponse(path: request.url?.path ?? "/health", status: 401, body: "unauthorized")
            }

            do {
                _ = try await client.health()
                throw TestFailure("expected HTTP error")
            } catch let error as RuntimeClientError {
                try expect(error == .httpStatus(401, "unauthorized"), "unexpected runtime error \(error)")
            }
        }

        await suite.run("fake runtime streams approval flow with increasing seq") {
            let client = FakeRuntimeClient()
            let thread = try await client.listThreads(limit: nil, includeArchived: false)[0]
            let stream = client.subscribeEvents(threadId: thread.id, sinceSeq: 0)
            let collector = EventCollector(stream: stream, stopAtEvent: "approval.required")

            _ = try await client.startTurn(threadId: thread.id, request: StartTurnRequest(input: "Explain this project"))
            let events = try await collector.collect(timeoutNanoseconds: 1_500_000_000)

            try expect(events.contains { $0.event == "approval.required" }, "approval.required did not stream")
            try expect(events.enumerated().allSatisfy { index, event in index == 0 || event.seq > events[index - 1].seq }, "event seq did not increase")
        }

        suite.finish()
    }
}

struct TestFailure: Error, CustomStringConvertible {
    var description: String

    init(_ description: String) {
        self.description = description
    }
}

func expect(_ condition: @autoclosure () -> Bool, _ message: String) throws {
    if !condition() {
        throw TestFailure(message)
    }
}

func expectThrows(_ message: String, _ work: () throws -> Void) throws {
    do {
        try work()
        throw TestFailure(message)
    } catch is TestFailure {
        throw TestFailure(message)
    } catch {
        return
    }
}

struct TestSuite {
    private var failures = 0
    private var total = 0

    mutating func run(_ name: String, _ work: () async throws -> Void) async {
        total += 1
        do {
            try await work()
            print("PASS \(name)")
        } catch {
            failures += 1
            print("FAIL \(name): \(error)")
        }
    }

    func finish() -> Never {
        print("RESULT \(total - failures)/\(total) passed")
        exit(failures == 0 ? 0 : 1)
    }
}

final class EventCollector {
    private let stream: AsyncThrowingStream<RuntimeEvent, Error>
    private let stopAtEvent: String

    init(stream: AsyncThrowingStream<RuntimeEvent, Error>, stopAtEvent: String) {
        self.stream = stream
        self.stopAtEvent = stopAtEvent
    }

    func collect(timeoutNanoseconds: UInt64) async throws -> [RuntimeEvent] {
        try await withThrowingTaskGroup(of: [RuntimeEvent].self) { group in
            group.addTask {
                var events: [RuntimeEvent] = []
                for try await event in self.stream {
                    events.append(event)
                    if event.event == self.stopAtEvent {
                        return events
                    }
                }
                return events
            }
            group.addTask {
                try await Task.sleep(nanoseconds: timeoutNanoseconds)
                throw TestFailure("timed out waiting for \(self.stopAtEvent)")
            }
            let result = try await group.next() ?? []
            group.cancelAll()
            return result
        }
    }
}

private final class MockURLProtocol: URLProtocol {
    static var handler: ((URLRequest) throws -> (HTTPURLResponse, Data))?

    override class func canInit(with request: URLRequest) -> Bool {
        true
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        request
    }

    override func startLoading() {
        guard let handler = Self.handler else {
            client?.urlProtocol(self, didFailWithError: RuntimeClientError.unsupported("No mock handler registered."))
            return
        }

        do {
            let (response, data) = try handler(request)
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}
}

private func makeClient(handler: @escaping (URLRequest) throws -> (HTTPURLResponse, Data)) -> DeepSeekTuiRuntimeClient {
    MockURLProtocol.handler = handler
    let configuration = URLSessionConfiguration.ephemeral
    configuration.protocolClasses = [MockURLProtocol.self]
    let session = URLSession(configuration: configuration)
    return DeepSeekTuiRuntimeClient(baseURL: URL(string: "http://runtime.test")!, authToken: "token-123", session: session)
}

private func jsonResponse(path: String, body: String) -> (HTTPURLResponse, Data) {
    httpResponse(path: path, status: 200, body: body, headers: ["Content-Type": "application/json"])
}

private func httpResponse(path: String, status: Int, body: String, headers: [String: String]? = nil) -> (HTTPURLResponse, Data) {
    let response = HTTPURLResponse(
        url: URL(string: "http://runtime.test\(path)")!,
        statusCode: status,
        httpVersion: nil,
        headerFields: headers
    )!
    return (response, Data(body.utf8))
}

