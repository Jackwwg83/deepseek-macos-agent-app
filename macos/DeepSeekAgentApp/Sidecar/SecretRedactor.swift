import Foundation

enum SecretRedactor {
    static func redact(environment: [String: String]) -> [String: String] {
        environment.mapValues { _ in "<redacted>" }
    }

    static func redact(_ text: String) -> String {
        var result = text
        let patterns = [
            #"(?i)(authorization:\s*bearer\s+)[A-Za-z0-9._\-]+"#,
            #"(?i)(deepseek_api_key=)[^\s]+"#,
            #"(?i)(auth-token\s+)[A-Za-z0-9._\-]+"#
        ]
        for pattern in patterns {
            result = result.replacingOccurrences(of: pattern, with: "$1<redacted>", options: .regularExpression)
        }
        return result
    }
}

