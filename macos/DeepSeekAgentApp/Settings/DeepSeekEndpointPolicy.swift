import Foundation

enum DeepSeekEndpointPolicy {
    static func validate(settings: RuntimeSettings) throws {
        let trimmedBaseURL = settings.baseURL.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedBaseURL.isEmpty,
              let url = URL(string: trimmedBaseURL),
              let scheme = url.scheme?.lowercased(),
              let host = url.host,
              !host.isEmpty else {
            throw RuntimeClientError.unsupported("Enter a valid DeepSeek URL, for example https://api.deepseek.com/beta or your /v1 endpoint.")
        }

        guard scheme == "https" || scheme == "http" else {
            throw RuntimeClientError.unsupported("DeepSeek URL must start with http:// or https://.")
        }

        guard !settings.model.isEmpty else {
            throw RuntimeClientError.unsupported("Choose or enter a DeepSeek model.")
        }
    }

    static func transportWarning(for settings: RuntimeSettings) -> String? {
        guard let url = URL(string: settings.baseURL.trimmingCharacters(in: .whitespacesAndNewlines)),
              url.scheme?.lowercased() == "http",
              !isLocalHost(url.host?.lowercased()) else {
            return nil
        }
        return "Warning: HTTP endpoint is not encrypted."
    }

    private static func isLocalHost(_ host: String?) -> Bool {
        guard let host else { return false }
        return host == "localhost" || host == "127.0.0.1" || host == "::1"
    }
}
