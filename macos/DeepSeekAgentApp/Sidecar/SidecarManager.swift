import Darwin
import Foundation
import Security

struct SidecarCommand: Equatable {
    var executableURL: URL
    var arguments: [String]
    var environment: [String: String]

    var redactedDescription: String {
        let argv = ([executableURL.path] + arguments).joined(separator: " ")
        return SecretRedactor.redact(argv)
    }
}

struct SidecarStatusSnapshot: Equatable {
    var state: String
    var host: String
    var port: Int?
    var binaryPath: String?
    var message: String
}

struct SidecarLaunch: Equatable {
    var baseURL: URL
    var authToken: String
    var command: SidecarCommand
}

enum SidecarError: LocalizedError, Equatable {
    case binaryNotFound
    case binaryNotExecutable(String)
    case portUnavailable
    case processAlreadyRunning

    var errorDescription: String? {
        switch self {
        case .binaryNotFound:
            return "DeepSeek-TUI binary was not found. Set DEEPSEEK_TUI_BIN or choose a sidecar path in settings."
        case .binaryNotExecutable(let path):
            return "DeepSeek-TUI binary is not executable: \(path)"
        case .portUnavailable:
            return "No loopback port could be allocated for the sidecar."
        case .processAlreadyRunning:
            return "Sidecar process is already running."
        }
    }
}

final class SidecarManager {
    private let fileManager: FileManager
    private let environment: [String: String]
    private let which: (String) -> String?
    private var process: Process?
    private(set) var status = SidecarStatusSnapshot(state: "stopped", host: "127.0.0.1", port: nil, binaryPath: nil, message: "Sidecar stopped")

    init(
        fileManager: FileManager = .default,
        environment: [String: String] = ProcessInfo.processInfo.environment,
        which: @escaping (String) -> String? = SidecarManager.defaultWhich
    ) {
        self.fileManager = fileManager
        self.environment = environment
        self.which = which
    }

    func discoverBinary(userSelectedPath: String? = nil, bundle: Bundle = .main) -> URL? {
        let candidates: [String?] = [
            environment["DEEPSEEK_TUI_BIN"],
            userSelectedPath,
            bundle.resourceURL?.appendingPathComponent("bin/deepseek-tui").path,
            which("deepseek-tui"),
            which("deepseek")
        ]

        return candidates.compactMap { $0 }.compactMap { path in
            let url = URL(fileURLWithPath: path)
            return isExecutable(url) ? url : nil
        }.first
    }

    func makeCommand(
        binaryURL: URL,
        port: Int,
        token: String,
        deepSeekAPIKey: String?,
        runtimeSettings: RuntimeSettings = RuntimeSettings(baseURL: "", model: RuntimeSettings.defaultModel, sidecarPath: ""),
        corsOrigin: String? = "http://localhost:5173"
    ) -> SidecarCommand {
        var arguments = [
            "serve",
            "--http",
            "--host",
            "127.0.0.1",
            "--port",
            "\(port)",
            "--auth-token",
            token
        ]
        if let corsOrigin, !corsOrigin.isEmpty {
            arguments += ["--cors-origin", corsOrigin]
        }

        var launchEnvironment = environment
        if let deepSeekAPIKey, !deepSeekAPIKey.isEmpty {
            launchEnvironment["DEEPSEEK_API_KEY"] = deepSeekAPIKey
        }
        let normalizedSettings = runtimeSettings.normalized
        if !normalizedSettings.baseURL.isEmpty {
            launchEnvironment["DEEPSEEK_BASE_URL"] = normalizedSettings.baseURL
        }
        if !normalizedSettings.model.isEmpty {
            launchEnvironment["DEEPSEEK_MODEL"] = normalizedSettings.model
        }

        return SidecarCommand(executableURL: binaryURL, arguments: arguments, environment: launchEnvironment)
    }

    func start(binaryURL: URL, deepSeekAPIKey: String?, runtimeSettings: RuntimeSettings = RuntimeSettings(baseURL: "", model: RuntimeSettings.defaultModel, sidecarPath: "")) throws -> SidecarLaunch {
        guard process == nil else {
            throw SidecarError.processAlreadyRunning
        }
        guard isExecutable(binaryURL) else {
            throw SidecarError.binaryNotExecutable(binaryURL.path)
        }

        let port = try Self.availableLoopbackPort()
        let token = try Self.generateBearerToken()
        let command = makeCommand(binaryURL: binaryURL, port: port, token: token, deepSeekAPIKey: deepSeekAPIKey, runtimeSettings: runtimeSettings)

        let process = Process()
        process.executableURL = command.executableURL
        process.arguments = command.arguments
        process.environment = command.environment
        process.standardOutput = Pipe()
        process.standardError = Pipe()
        try process.run()

        self.process = process
        status = SidecarStatusSnapshot(state: "starting", host: "127.0.0.1", port: port, binaryPath: binaryURL.path, message: "Sidecar launched on loopback")
        return SidecarLaunch(baseURL: URL(string: "http://127.0.0.1:\(port)")!, authToken: token, command: command)
    }

    func stop() {
        process?.terminate()
        process = nil
        status = SidecarStatusSnapshot(state: "stopped", host: "127.0.0.1", port: nil, binaryPath: status.binaryPath, message: "Sidecar stopped")
    }

    func isExecutable(_ url: URL) -> Bool {
        fileManager.isExecutableFile(atPath: url.path)
    }

    static func generateBearerToken(byteCount: Int = 32) throws -> String {
        var bytes = [UInt8](repeating: 0, count: byteCount)
        let status = SecRandomCopyBytes(kSecRandomDefault, byteCount, &bytes)
        guard status == errSecSuccess else {
            throw RuntimeClientError.unsupported("Could not generate runtime bearer token.")
        }
        return Data(bytes).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    static func availableLoopbackPort() throws -> Int {
        let socketFD = socket(AF_INET, SOCK_STREAM, 0)
        guard socketFD >= 0 else {
            throw SidecarError.portUnavailable
        }
        defer { close(socketFD) }

        var value: Int32 = 1
        setsockopt(socketFD, SOL_SOCKET, SO_REUSEADDR, &value, socklen_t(MemoryLayout<Int32>.size))

        var address = sockaddr_in()
        address.sin_len = UInt8(MemoryLayout<sockaddr_in>.size)
        address.sin_family = sa_family_t(AF_INET)
        address.sin_port = in_port_t(0).bigEndian
        address.sin_addr = in_addr(s_addr: inet_addr("127.0.0.1"))

        let bindResult = withUnsafePointer(to: &address) { pointer -> Int32 in
            pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) { sockaddrPointer in
                bind(socketFD, sockaddrPointer, socklen_t(MemoryLayout<sockaddr_in>.size))
            }
        }
        guard bindResult == 0 else {
            throw SidecarError.portUnavailable
        }

        var length = socklen_t(MemoryLayout<sockaddr_in>.size)
        let nameResult = withUnsafeMutablePointer(to: &address) { pointer -> Int32 in
            pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) { sockaddrPointer in
                getsockname(socketFD, sockaddrPointer, &length)
            }
        }
        guard nameResult == 0 else {
            throw SidecarError.portUnavailable
        }

        return Int(UInt16(bigEndian: address.sin_port))
    }

    private static func defaultWhich(_ command: String) -> String? {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
        process.arguments = ["which", command]
        let pipe = Pipe()
        process.standardOutput = pipe
        process.standardError = Pipe()
        try? process.run()
        process.waitUntilExit()
        guard process.terminationStatus == 0 else {
            return nil
        }
        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        let output = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines)
        return output?.isEmpty == false ? output : nil
    }
}
