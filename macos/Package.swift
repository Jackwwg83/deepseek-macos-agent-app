// swift-tools-version: 5.10

import PackageDescription

let package = Package(
    name: "DeepSeekAgentApp",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(name: "DeepSeekAgentApp", targets: ["DeepSeekAgentApp"])
    ],
    targets: [
        .executableTarget(
            name: "DeepSeekAgentApp",
            path: "DeepSeekAgentApp"
        ),
        .testTarget(
            name: "DeepSeekAgentAppTests",
            dependencies: ["DeepSeekAgentApp"],
            path: "Tests/DeepSeekAgentAppTests"
        )
    ]
)
