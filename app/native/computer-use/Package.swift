// swift-tools-version: 5.9
// Computer use, native side (docs: BIHZCoding/claude-cu-spec/docs/03–06).
//
//   ComputerUseCore     window list, ScreenCaptureKit capture, session state — no Node, no JSON-RPC
//   ComputerUseBridge   @_cdecl("cu_call") / @_cdecl("cu_free"): JSON in, strdup'd JSON out
//   ComputerUseNAPI     C N-API glue (own minimal header, no node-addon-api): one async `call(method, json)`
//
// The dynamic library product is copied to build/computer_use.node by build.mjs. Node symbols resolve at load time
// from the host (Electron), hence `-undefined dynamic_lookup`.
import PackageDescription

let package = Package(
    name: "computer-use",
    platforms: [.macOS(.v14)],
    products: [
        .library(name: "computer_use", type: .dynamic, targets: ["ComputerUseNAPI", "ComputerUseBridge"]),
    ],
    targets: [
        .testTarget(name: "ComputerUseCoreTests", dependencies: ["ComputerUseCore"]),
        .target(
            name: "ComputerUseCore",
            path: "Sources/ComputerUseCore",
            linkerSettings: [
                .linkedFramework("AppKit"),
                .linkedFramework("ApplicationServices"),
                .linkedFramework("ScreenCaptureKit"),
                .linkedFramework("CoreGraphics"),
                .linkedFramework("ImageIO"),
                .linkedFramework("UniformTypeIdentifiers"),
            ]
        ),
        .target(
            name: "ComputerUseBridge",
            dependencies: ["ComputerUseCore"],
            path: "Sources/ComputerUseBridge"
        ),
        .target(
            name: "ComputerUseNAPI",
            dependencies: ["ComputerUseBridge"],
            path: "Sources/ComputerUseNAPI",
            linkerSettings: [.unsafeFlags(["-Xlinker", "-undefined", "-Xlinker", "dynamic_lookup"])]
        ),
    ]
)
