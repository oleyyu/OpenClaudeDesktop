// Text fixture for the computer-use M3 live tests (tests/computer-use-type-live.test.mjs): one window, five controls,
// each named through its accessibility label so the tests find them in the AX summary.
//
//   notes     NSTextView, AX-writable                         → the AX rung
//   locked    NSTextView whose AXValue / AXSelectedText are not settable → text_not_writable / no_focused_text
//   field     editable NSTextField (first responder at launch)
//   label     non-editable NSTextField (a label)
//   password  NSSecureTextField
//
// CU_FIXTURE_FOCUS=password|locked|notes picks the first responder at launch (default field).
// CU_FIXTURE_BACKGROUND=1 launches without activating (the app stays in the background, the user's app stays in front);
// CU_FIXTURE_ALL_SPACES=1 lets the window join every Space, a full-screen one included (app_key live test).
// CU_FIXTURE_NOTES_LINES=N fills `notes` with N numbered lines, so its scroll view can scroll (app_scroll live test).
// CU_FIXTURE_MINIMIZE=1 minimizes the window right after it is shown; CU_FIXTURE_SPACE=<ManagedSpaceID> moves it to
// that Space (its own window, through SkyLight) — app_bring_to_current_space live test.
// SIGUSR1 writes {notes, locked, field, label, password, focus, notesScroll} as JSON to $CU_FIXTURE_DUMP — the controls' contents as
// the app holds them, independent of AX. Built by tests/computer-use-live-helpers.mjs (swiftc, ad-hoc .app bundle).
// SIGUSR2 runs the one command in $CU_FIXTURE_COMMAND on its own window (window highlight live test): `frame x y w h`
// (global top-left points, y down, as kCGWindowBounds), `minimize`, `restore` (deminiaturize, not activating), `space
// <ManagedSpaceID>`.
import AppKit

final class LockedTextView: NSTextView {
    override func isAccessibilitySelectorAllowed(_ selector: Selector) -> Bool {
        if selector == NSSelectorFromString("setAccessibilityValue:")
            || selector == NSSelectorFromString("setAccessibilitySelectedText:") { return false }
        return super.isAccessibilitySelectorAllowed(selector)
    }
    override func setAccessibilityValue(_ value: Any?) {}
    override func setAccessibilitySelectedText(_ text: String?) {}
}

func scrolled(_ view: NSTextView, _ frame: NSRect, _ label: String) -> NSScrollView {
    let scroll = NSScrollView(frame: frame)
    view.frame = NSRect(origin: .zero, size: frame.size)
    view.isRichText = false
    view.isAutomaticQuoteSubstitutionEnabled = false
    view.isAutomaticDashSubstitutionEnabled = false
    view.isAutomaticTextReplacementEnabled = false
    view.isAutomaticSpellingCorrectionEnabled = false
    view.setAccessibilityLabel(label)
    scroll.documentView = view
    scroll.hasVerticalScroller = true
    return scroll
}

final class Delegate: NSObject, NSApplicationDelegate {
    let window = NSWindow(contentRect: NSRect(x: 200, y: 200, width: 520, height: 420), styleMask: [.titled, .closable],
                          backing: .buffered, defer: false)
    let notes = NSTextView(), locked = LockedTextView()
    let field = NSTextField(frame: NSRect(x: 20, y: 120, width: 480, height: 24))
    let label = NSTextField(labelWithString: "label text")
    let password = NSSecureTextField(frame: NSRect(x: 20, y: 40, width: 480, height: 24))
    let slider = NSSlider(value: 0.3, minValue: 0, maxValue: 1, target: nil, action: nil)
    var signal: DispatchSourceSignal?
    var mouseMonitor: Any?
    var mouseEvents: [[String: Any]] = []

    func applicationDidFinishLaunching(_ notification: Notification) {
        if ProcessInfo.processInfo.environment["CU_FIXTURE_LOG_POINTER"] == "1" {
            mouseMonitor = NSEvent.addLocalMonitorForEvents(matching: [.mouseMoved, .leftMouseDown, .leftMouseDragged, .leftMouseUp]) { [weak self] event in
                self?.mouseEvents.append(["type": event.type.rawValue, "x": event.locationInWindow.x,
                                          "y": event.locationInWindow.y, "window": event.windowNumber])
                return event
            }
        }
        window.title = "CU Text Fixture"
        let content = window.contentView!
        content.addSubview(scrolled(notes, NSRect(x: 20, y: 300, width: 480, height: 100), "notes"))
        content.addSubview(scrolled(locked, NSRect(x: 20, y: 180, width: 480, height: 100), "locked"))
        field.setAccessibilityLabel("field")
        content.addSubview(field)
        label.frame = NSRect(x: 20, y: 80, width: 480, height: 24)
        label.setAccessibilityLabel("label")
        content.addSubview(label)
        password.setAccessibilityLabel("password")
        content.addSubview(password)
        slider.frame = NSRect(x: 20, y: 8, width: 480, height: 20)
        slider.setAccessibilityLabel("drag-slider")
        content.addSubview(slider)
        let env = ProcessInfo.processInfo.environment
        if env["CU_FIXTURE_ALL_SPACES"] == "1" { window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary] }
        if let lines = env["CU_FIXTURE_NOTES_LINES"].flatMap(Int.init), lines > 0 {
            notes.string = (1...lines).map { "line \($0)" }.joined(separator: "\n")
            notes.scrollToBeginningOfDocument(nil)
        }
        window.makeKeyAndOrderFront(nil)
        // CU_FIXTURE_FOCUS=password|locked|notes picks the first responder (default: field).
        let focus: [String: NSResponder] = ["password": password, "locked": locked, "notes": notes]
        window.makeFirstResponder(focus[ProcessInfo.processInfo.environment["CU_FIXTURE_FOCUS"] ?? ""] ?? field)
        if env["CU_FIXTURE_BACKGROUND"] != "1" { NSApp.activate(ignoringOtherApps: true) }
        if let space = env["CU_FIXTURE_SPACE"].flatMap(UInt64.init) { moveOwnWindow(window, to: space) }
        if env["CU_FIXTURE_MINIMIZE"] == "1" {
            window.styleMask.insert(.miniaturizable)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [window] in window.miniaturize(nil) }
        }

        Foundation.signal(SIGUSR1, SIG_IGN)
        let source = DispatchSource.makeSignalSource(signal: SIGUSR1, queue: .main)
        source.setEventHandler { [unowned self] in self.dump() }
        source.resume()
        signal = source
        Foundation.signal(SIGUSR2, SIG_IGN)
        let commands = DispatchSource.makeSignalSource(signal: SIGUSR2, queue: .main)
        commands.setEventHandler { [unowned self] in self.command() }
        commands.resume()
        commandSignal = commands
    }

    var commandSignal: DispatchSourceSignal?

    func command() {
        guard let path = ProcessInfo.processInfo.environment["CU_FIXTURE_COMMAND"],
              let text = try? String(contentsOfFile: path, encoding: .utf8) else { return }
        let words = text.split(whereSeparator: { $0 == " " || $0 == "\n" }).map(String.init)
        switch words.first {
        case "frame" where words.count == 5:
            let n = words.dropFirst().compactMap(Double.init)
            guard n.count == 4 else { return }
            let primary = NSScreen.screens.first?.frame.height ?? 0
            window.setFrame(NSRect(x: n[0], y: primary - n[1] - n[3], width: n[2], height: n[3]), display: true)
        case "minimize":
            window.styleMask.insert(.miniaturizable)
            window.miniaturize(nil)
        case "restore":
            window.deminiaturize(nil)
        case "space" where words.count == 2:
            if let space = UInt64(words[1]) { moveOwnWindow(window, to: space) }
        default:
            return
        }
    }

    /// How far `notes` is scrolled, as the app holds it: 0 = top, 1 = bottom (clip view origin over the scrollable height).
    func notesScroll() -> Double {
        guard let clip = notes.enclosingScrollView?.contentView else { return -1 }
        let range = notes.frame.height - clip.bounds.height
        return range > 0 ? Double(clip.bounds.origin.y / range) : 0
    }

    func dump() {
        guard let path = ProcessInfo.processInfo.environment["CU_FIXTURE_DUMP"] else { return }
        let responder = window.firstResponder
        let focus = responder === notes ? "notes" : responder === locked ? "locked"
            : (responder as? NSText)?.delegate === field ? "field" : (responder as? NSText)?.delegate === password ? "password" : "other"
        let state: [String: Any] = ["notes": notes.string, "locked": locked.string, "field": field.stringValue,
                                    "label": label.stringValue, "password": password.stringValue, "focus": focus,
                                    "notesSelection": ["location": notes.selectedRange().location, "length": notes.selectedRange().length],
                                    "mouseEvents": mouseEvents, "sliderValue": slider.doubleValue, "notesScroll": notesScroll()]
        let data = try! JSONSerialization.data(withJSONObject: state)
        try! data.write(to: URL(fileURLWithPath: path + ".tmp"))
        rename(path + ".tmp", path)
    }
}

/// The fixture's own window to another Space (SLSMoveWindowsToManagedSpace works for a process's own windows).
func moveOwnWindow(_ window: NSWindow, to space: UInt64) {
    typealias MainConnection = @convention(c) () -> Int32
    typealias Move = @convention(c) (Int32, CFArray, UInt64) -> Void
    guard let handle = dlopen("/System/Library/PrivateFrameworks/SkyLight.framework/Versions/A/SkyLight", RTLD_LAZY),
          let main = dlsym(handle, "SLSMainConnectionID"), let move = dlsym(handle, "SLSMoveWindowsToManagedSpace") else { return }
    unsafeBitCast(move, to: Move.self)(unsafeBitCast(main, to: MainConnection.self)(), [NSNumber(value: window.windowNumber)] as CFArray, space)
}

let app = NSApplication.shared
let delegate = Delegate()
app.delegate = delegate
// In the background the app is an accessory (no Dock icon) so launching it does not take the front.
app.setActivationPolicy(ProcessInfo.processInfo.environment["CU_FIXTURE_BACKGROUND"] == "1" ? .accessory : .regular)
app.run()
