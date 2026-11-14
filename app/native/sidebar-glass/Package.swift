// swift-tools-version: 5.9
// Sidebar glass, native side: the glass the main process puts under the sidebar (electron/window-vibrancy.cjs I / L / V / B).
// Written to the interface and behaviour of the official 4.16336.0 add-on's ClaudeSwift/SidebarGlass module
// (reference/snapshots/claude-4.16336.0-20261104/asar/node_modules/@ant/claude-swift/build/Release/swift_addon.node,
// reverse-engineered in analysis/claude-4.16336.0-migrate-20261104/surfaces-prod-3/glass-native/sidebar-glass-re.json);
// no official code or binary is copied or loaded.
//
//   SidebarGlass       the AppKit side: SidebarGlassHolder, UnderSiblingsLayer, show / hide / setTint / clearTint,
//                      exported as @_cdecl("sg_show") … for the glue (SidebarGlass.swift ↔ official SidebarGlass.swift)
//   SidebarGlassNAPI   C N-API glue (own minimal header, no node-addon-api): the module's `sidebarGlass` namespace
//                      (napi.c ↔ official NAPIBindings+SidebarGlass.swift)
//
// The dynamic library is copied to build/sidebar_glass.node by build.mjs. Node symbols resolve at load time from the
// host (Electron), hence `-undefined dynamic_lookup`.
import PackageDescription

let package = Package(
    name: "sidebar-glass",
    platforms: [.macOS(.v14)],
    products: [
        .library(name: "sidebar_glass", type: .dynamic, targets: ["SidebarGlassNAPI", "SidebarGlass"]),
    ],
    targets: [
        .target(
            name: "SidebarGlass",
            path: "Sources/SidebarGlass",
            linkerSettings: [
                .linkedFramework("AppKit"),
                .linkedFramework("QuartzCore"),
            ]
        ),
        .target(
            name: "SidebarGlassNAPI",
            dependencies: ["SidebarGlass"],
            path: "Sources/SidebarGlassNAPI",
            linkerSettings: [.unsafeFlags(["-Xlinker", "-undefined", "-Xlinker", "dynamic_lookup"])]
        ),
    ]
)
