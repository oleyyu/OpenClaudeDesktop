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
// SIGUSR1 writes {notes, locked, field, label, password, focus} as JSON to $CU_FIXTURE_DUMP — the controls' contents as
// the app holds them, independent of AX. Built by tests/computer-use-live-helpers.mjs (swiftc, ad-hoc .app bundle).
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
    var signal: DispatchSourceSignal?

    func applicationDidFinishLaunching(_ notification: Notification) {
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
        window.makeKeyAndOrderFront(nil)
        // CU_FIXTURE_FOCUS=password|locked|notes picks the first responder (default: field).
        let focus: [String: NSResponder] = ["password": password, "locked": locked, "notes": notes]
        window.makeFirstResponder(focus[ProcessInfo.processInfo.environment["CU_FIXTURE_FOCUS"] ?? ""] ?? field)
        NSApp.activate(ignoringOtherApps: true)

        Foundation.signal(SIGUSR1, SIG_IGN)
        let source = DispatchSource.makeSignalSource(signal: SIGUSR1, queue: .main)
        source.setEventHandler { [unowned self] in self.dump() }
        source.resume()
        signal = source
    }

    func dump() {
        guard let path = ProcessInfo.processInfo.environment["CU_FIXTURE_DUMP"] else { return }
        let responder = window.firstResponder
        let focus = responder === notes ? "notes" : responder === locked ? "locked"
            : (responder as? NSText)?.delegate === field ? "field" : (responder as? NSText)?.delegate === password ? "password" : "other"
        let state: [String: Any] = ["notes": notes.string, "locked": locked.string, "field": field.stringValue,
                                    "label": label.stringValue, "password": password.stringValue, "focus": focus]
        let data = try! JSONSerialization.data(withJSONObject: state)
        try! data.write(to: URL(fileURLWithPath: path + ".tmp"))
        rename(path + ".tmp", path)
    }
}

let app = NSApplication.shared
let delegate = Delegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
