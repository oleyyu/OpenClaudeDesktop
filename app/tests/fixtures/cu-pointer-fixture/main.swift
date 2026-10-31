// A Cocoa window for the live screen-wide pointer test (tests/computer-use-display-pointer-live.test.mjs): four areas
// that record what the real cursor did to them — hover (a tracking area: entered / exited), a context menu (menu(for:)
// with one item), a canvas (mouse down / dragged / up with click counts and modifier flags) and a wheel area. Nothing is
// read from the user: the app records only events that reach its own window.
//   CU_POINTER_FIXTURE_DUMP=<file>  SIGUSR1 writes the state and each area's frame (global points, top-left origin) there.
import AppKit

let dumpPath = ProcessInfo.processInfo.environment["CU_POINTER_FIXTURE_DUMP"] ?? "/dev/null"

final class Recorder {
    var hoverEnters = 0, hoverExits = 0, hovering = false
    var menuShown = 0, menuChosen: String?
    var clicks: [[String: Any]] = []
    var drags: [[String: Any]] = []
    var scrollX = 0.0, scrollY = 0.0, scrollEvents = 0
    var current: [String: Any]?
}
let recorder = Recorder()

func pointJSON(_ p: NSPoint, in view: NSView) -> [String: Double] {
    let local = view.convert(p, from: nil)
    return ["x": Double(local.x), "y": Double(view.bounds.height - local.y)]
}
func mods(_ flags: NSEvent.ModifierFlags) -> [String] {
    var out: [String] = []
    if flags.contains(.shift) { out.append("shift") }
    if flags.contains(.control) { out.append("ctrl") }
    if flags.contains(.option) { out.append("alt") }
    if flags.contains(.command) { out.append("cmd") }
    return out
}

class Area: NSView {
    let name: String, color: NSColor
    init(_ name: String, _ color: NSColor) { self.name = name; self.color = color; super.init(frame: .zero) }
    required init?(coder: NSCoder) { fatalError() }
    override func draw(_ dirtyRect: NSRect) { color.setFill(); bounds.fill() }
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }
}

final class HoverArea: Area {
    override func updateTrackingAreas() {
        super.updateTrackingAreas()
        trackingAreas.forEach(removeTrackingArea)
        addTrackingArea(NSTrackingArea(rect: bounds, options: [.mouseEnteredAndExited, .activeAlways, .inVisibleRect], owner: self))
    }
    override func mouseEntered(with event: NSEvent) { recorder.hoverEnters += 1; recorder.hovering = true }
    override func mouseExited(with event: NSEvent) { recorder.hoverExits += 1; recorder.hovering = false }
}

final class MenuArea: Area {
    override func menu(for event: NSEvent) -> NSMenu? {
        recorder.menuShown += 1
        let menu = NSMenu()
        let item = NSMenuItem(title: "Fixture Action", action: #selector(choose(_:)), keyEquivalent: "")
        item.target = self
        menu.addItem(item)
        menu.addItem(withTitle: "Other Action", action: nil, keyEquivalent: "")
        return menu
    }
    @objc func choose(_ sender: NSMenuItem) { recorder.menuChosen = sender.title }
}

final class CanvasArea: Area {
    override func mouseDown(with event: NSEvent) {
        recorder.clicks.append(["clickCount": event.clickCount, "modifiers": mods(event.modifierFlags), "at": pointJSON(event.locationInWindow, in: self)])
        recorder.current = ["from": pointJSON(event.locationInWindow, in: self), "dragEvents": 0]
    }
    override func mouseDragged(with event: NSEvent) {
        recorder.current?["dragEvents"] = (recorder.current?["dragEvents"] as? Int ?? 0) + 1
        recorder.current?["last"] = pointJSON(event.locationInWindow, in: self)
    }
    override func mouseUp(with event: NSEvent) {
        guard var drag = recorder.current else { return }
        drag["to"] = pointJSON(event.locationInWindow, in: self)
        if (drag["dragEvents"] as? Int ?? 0) > 0 { recorder.drags.append(drag) }
        recorder.current = nil
    }
    override func rightMouseDown(with event: NSEvent) { recorder.clicks.append(["button": "right", "clickCount": event.clickCount, "modifiers": mods(event.modifierFlags)]) }
}

final class WheelArea: Area {
    override func scrollWheel(with event: NSEvent) {
        recorder.scrollEvents += 1
        recorder.scrollX += Double(event.scrollingDeltaX)
        recorder.scrollY += Double(event.scrollingDeltaY)
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.regular)
let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 640, height: 420), styleMask: [.titled, .closable], backing: .buffered, defer: false)
window.title = "CU Pointer Fixture"
window.isReleasedWhenClosed = false
let root = NSView(frame: NSRect(x: 0, y: 0, width: 640, height: 420))
let areas: [Area] = [HoverArea("hover", .systemTeal), MenuArea("menu", .systemOrange), CanvasArea("canvas", .systemGreen), WheelArea("wheel", .systemPurple)]
let frames = [NSRect(x: 10, y: 215, width: 305, height: 195), NSRect(x: 325, y: 215, width: 305, height: 195),
              NSRect(x: 10, y: 10, width: 305, height: 195), NSRect(x: 325, y: 10, width: 305, height: 195)]
for (area, frame) in zip(areas, frames) { area.frame = frame; root.addSubview(area) }
window.contentView = root
window.center()
window.makeKeyAndOrderFront(nil)
app.activate(ignoringOtherApps: true)

func globalFrame(_ view: NSView) -> [String: Double] {
    let inWindow = view.convert(view.bounds, to: nil)
    let screen = window.convertToScreen(inWindow)
    let mainHeight = NSScreen.screens.first?.frame.height ?? 0
    return ["x": Double(screen.minX), "y": Double(mainHeight - screen.maxY), "width": Double(screen.width), "height": Double(screen.height)]
}

signal(SIGUSR1, SIG_IGN)
let source = DispatchSource.makeSignalSource(signal: SIGUSR1, queue: .main)
source.setEventHandler {
    var areasOut: [String: Any] = [:]
    for area in areas { areasOut[area.name] = globalFrame(area) }
    let out: [String: Any] = [
        "hoverEnters": recorder.hoverEnters, "hoverExits": recorder.hoverExits, "hovering": recorder.hovering,
        "menuShown": recorder.menuShown, "menuChosen": recorder.menuChosen ?? NSNull(),
        "clicks": recorder.clicks, "drags": recorder.drags,
        "scrollX": recorder.scrollX, "scrollY": recorder.scrollY, "scrollEvents": recorder.scrollEvents,
        "areas": areasOut, "frontmost": NSApp.isActive, "windowNumber": window.windowNumber,
    ]
    if let data = try? JSONSerialization.data(withJSONObject: out) { try? data.write(to: URL(fileURLWithPath: dumpPath)) }
}
source.resume()
app.run()
