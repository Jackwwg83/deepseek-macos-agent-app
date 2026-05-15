import Foundation
import XCTest
@testable import DeepSeekAgentApp

final class DeepSeekTuiRuntimeClientTests: XCTestCase {
    override func tearDown() {
        MockURLProtocol.handler = nil
        super.tearDown()
    }

    func testHealthCallsRuntimeEndpointWithBearerToken() async throws {
        let client = makeClient { request in
            XCTAssertEqual(request.url?.path, "/health")
            XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer token-123")
            return jsonResponse(
                path: request.url!.path,
                body: #"{"status":"ok","mode":"real","message":"ready"}"#
            )
        }

        let health = try await client.health()

        XCTAssertEqual(health.status, "ok")
        XCTAssertEqual(health.mode, "real")
    }

    func testRuntimeInfoCallsRuntimeInfoEndpoint() async throws {
        let client = makeClient { request in
            XCTAssertEqual(request.url?.path, "/v1/runtime/info")
            return jsonResponse(
                path: request.url!.path,
                body: #"{"bind_host":"127.0.0.1","port":18789,"auth_required":true,"version":"0.8.37"}"#
            )
        }

        let info = try await client.runtimeInfo()

        XCTAssertEqual(info.runtimeVersion, "0.8.37")
        XCTAssertTrue(info.authRequired)
        XCTAssertEqual(info.mode, "real")
        XCTAssertTrue(info.capabilities.contains("turns"))
    }

    func testListThreadsMapsRuntimeAPIThreadShape() async throws {
        let client = makeClient { request in
            XCTAssertEqual(request.url?.path, "/v1/threads")
            XCTAssertEqual(request.url?.query, "limit=20&include_archived=false")
            return jsonResponse(
                path: request.url!.path,
                body: #"[{"schema_version":2,"id":"thr_123","created_at":"2026-05-15T00:00:00Z","updated_at":"2026-05-15T00:01:00Z","model":"deepseek-v4-flash","workspace":"/tmp/project","mode":"agent","allow_shell":false,"trust_mode":false,"auto_approve":false,"archived":false,"title":"Runtime Thread","coherence_state":"healthy"}]"#
            )
        }

        let threads = try await client.listThreads(limit: 20, includeArchived: false)

        XCTAssertEqual(threads, [
            RuntimeThread(id: "thr_123", title: "Runtime Thread", projectPath: "/tmp/project", updatedAt: "2026-05-15T00:01:00Z", archived: false)
        ])
    }

    func testGetThreadMapsTurnsItemsAndLatestSeq() async throws {
        let client = makeClient { request in
            XCTAssertEqual(request.url?.path, "/v1/threads/thr_123")
            return jsonResponse(
                path: request.url!.path,
                body: #"{"thread":{"schema_version":2,"id":"thr_123","created_at":"2026-05-15T00:00:00Z","updated_at":"2026-05-15T00:01:00Z","model":"deepseek-v4-flash","workspace":"/tmp/project","mode":"agent","allow_shell":false,"trust_mode":false,"auto_approve":false,"archived":false,"coherence_state":"healthy"},"turns":[{"schema_version":2,"id":"turn_123","thread_id":"thr_123","status":"completed","input_summary":"Explain the project","created_at":"2026-05-15T00:00:10Z","item_ids":["item_user","item_agent"],"steer_count":0}],"items":[{"schema_version":2,"id":"item_user","turn_id":"turn_123","kind":"user_message","status":"completed","summary":"Explain the project","detail":"Explain the project","artifact_refs":[]},{"schema_version":2,"id":"item_agent","turn_id":"turn_123","kind":"agent_message","status":"completed","summary":"Done","detail":"REAL_RUNTIME_SMOKE_OK","artifact_refs":[]}],"latest_seq":42}"#
            )
        }

        let detail = try await client.getThread("thr_123")

        XCTAssertEqual(detail.thread.title, "Explain the project")
        XCTAssertEqual(detail.lastSeq, 42)
        XCTAssertEqual(detail.items.map(\.kind), ["user", "assistant"])
        XCTAssertEqual(detail.items.last?.content, "REAL_RUNTIME_SMOKE_OK")
    }

    func testStartTurnPostsPromptAndMapsResponse() async throws {
        let client = makeClient { request in
            XCTAssertEqual(request.url?.path, "/v1/threads/thr_123/turns")
            let body = try XCTUnwrap(requestBodyData(request))
            let json = try JSONSerialization.jsonObject(with: body) as? [String: Any]
            XCTAssertEqual(json?["prompt"] as? String, "hello")
            XCTAssertNil(json?["input"])
            return jsonResponse(
                path: request.url!.path,
                body: #"{"thread":{"schema_version":2,"id":"thr_123","created_at":"2026-05-15T00:00:00Z","updated_at":"2026-05-15T00:01:00Z","model":"deepseek-v4-flash","workspace":"/tmp/project","mode":"agent","allow_shell":false,"trust_mode":false,"auto_approve":false,"archived":false,"coherence_state":"healthy"},"turn":{"schema_version":2,"id":"turn_123","thread_id":"thr_123","status":"in_progress","input_summary":"hello","created_at":"2026-05-15T00:00:10Z","item_ids":[],"steer_count":0}}"#
            )
        }

        let response = try await client.startTurn(threadId: "thr_123", request: StartTurnRequest(input: "hello"))

        XCTAssertEqual(response.turnId, "turn_123")
        XCTAssertTrue(response.accepted)
    }

    func testUsageMapsRuntimeTotals() async throws {
        let client = makeClient { request in
            XCTAssertEqual(request.url?.path, "/v1/usage")
            return jsonResponse(
                path: request.url!.path,
                body: #"{"since":null,"until":null,"group_by":"day","totals":{"input_tokens":10,"output_tokens":20,"cached_tokens":0,"reasoning_tokens":0,"cost_usd":0.0123,"turns":2},"buckets":[]}"#
            )
        }

        let usage = try await client.usage(query: UsageQuery(groupBy: nil))

        XCTAssertEqual(usage.currency, "USD")
        XCTAssertEqual(usage.inputTokens, 10)
        XCTAssertEqual(usage.outputTokens, 20)
        XCTAssertEqual(usage.completedTurns, 2)
        XCTAssertEqual(usage.totalCost, 0.0123)
    }

    func testHttpErrorsMapToUserFacingRuntimeError() async {
        let client = makeClient { request in
            let response = HTTPURLResponse(url: request.url!, statusCode: 401, httpVersion: nil, headerFields: nil)!
            return (response, Data("unauthorized".utf8))
        }

        do {
            _ = try await client.health()
            XCTFail("Expected request to fail")
        } catch let error as RuntimeClientError {
            XCTAssertEqual(error, .httpStatus(401, "unauthorized"))
        } catch {
            XCTFail("Unexpected error \(error)")
        }
    }

    private func makeClient(handler: @escaping (URLRequest) throws -> (HTTPURLResponse, Data)) -> DeepSeekTuiRuntimeClient {
        MockURLProtocol.handler = handler
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [MockURLProtocol.self]
        let session = URLSession(configuration: configuration)
        return DeepSeekTuiRuntimeClient(baseURL: URL(string: "http://runtime.test")!, authToken: "token-123", session: session)
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

private func jsonResponse(path: String, body: String) -> (HTTPURLResponse, Data) {
    let response = HTTPURLResponse(
        url: URL(string: "http://runtime.test\(path)")!,
        statusCode: 200,
        httpVersion: nil,
        headerFields: ["Content-Type": "application/json"]
    )!
    return (response, Data(body.utf8))
}

private func requestBodyData(_ request: URLRequest) -> Data? {
    if let body = request.httpBody {
        return body
    }
    guard let stream = request.httpBodyStream else {
        return nil
    }
    stream.open()
    defer { stream.close() }
    var data = Data()
    var buffer = [UInt8](repeating: 0, count: 4096)
    while stream.hasBytesAvailable {
        let count = stream.read(&buffer, maxLength: buffer.count)
        if count <= 0 {
            break
        }
        data.append(buffer, count: count)
    }
    return data
}
