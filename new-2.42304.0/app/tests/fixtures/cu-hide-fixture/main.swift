// hideBeforeAction live fixture (tests/computer-use-hide-live.test.mjs): one plain window on the main display, titled by
// CU_HIDE_FIXTURE_TITLE, launched without taking the front. On SIGUSR1 it writes {hidden, frontmost, windowNumber} to
// CU_HIDE_FIXTURE_DUMP. Built twice with different bundle ids: one the test grants, one it doesn't.
import AppKit

let app = NSApplication.shared
app.setActivationPolicy(.regular)
let env = ProcessInfo.processInfo.environment
let dumpPath = env["CU_HIDE_FIXTURE_DUMP"] ?? "/tmp/cu-hide-fixture.json"
let title = env["CU_HIDE_FIXTURE_TITLE"] ?? "CU Hide Fixture"
let x = Double(env["CU_HIDE_FIXTURE_X"] ?? "120") ?? 120

let screen = NSScreen.main?.frame ?? NSRect(x: 0, y: 0, width: 1200, height: 800)
let window = NSWindow(contentRect: NSRect(x: screen.minX + x, y: screen.maxY - 420, width: 360, height: 240),
                      styleMask: [.titled, .closable], backing: .buffered, defer: false)
window.title = title
window.isReleasedWhenClosed = false
window.orderFrontRegardless()

signal(SIGUSR1, SIG_IGN)
let source = DispatchSource.makeSignalSource(signal: SIGUSR1, queue: .main)
source.setEventHandler {
    let state: [String: Any] = ["hidden": NSApp.isHidden, "frontmost": NSApp.isActive, "windowNumber": window.windowNumber,
                                "visible": window.isVisible, "pid": Int(getpid())]
    if let data = try? JSONSerialization.data(withJSONObject: state) { try? data.write(to: URL(fileURLWithPath: dumpPath)) }
}
source.resume()
app.run()
