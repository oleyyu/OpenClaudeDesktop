import Foundation
import CoreGraphics
import ApplicationServices

/// 原始事件注入。复刻 `dispatchRaw` 的核心：
/// 事件只投给目标 pid，不进入全局 HID 流，因此不移动真实光标、不打到前台应用。
/// 拷自 claude-cu-spec/src/cu-probe；M3 起事件构造移入 EventFactory.swift（唯一构造处），本文件只排时序、投递。
enum Dispatcher {

    // MARK: 鼠标与滚动
    // 事件对象一律由 EventFactory 构造（pid、窗口号 91/92、窗口局部坐标在那里统一注入）；这里只负责时序与投递。

    static func mouse(
        target: EventFactory.Target,
        buttonName: String = "left",
        count: Int = 1,
        modifiers: [String] = []
    ) -> DispatchCode {
        guard case .success(let source) = EventFactory.source() else { return .scgeventUnavailable }
        let button: CGMouseButton = buttonName == "right" ? .right : (buttonName == "middle" ? .center : .left)
        let downType: CGEventType = buttonName == "right" ? .rightMouseDown : (buttonName == "middle" ? .otherMouseDown : .leftMouseDown)
        let upType: CGEventType = buttonName == "right" ? .rightMouseUp : (buttonName == "middle" ? .otherMouseUp : .leftMouseUp)
        let flags = modifierFlags(modifiers)
        // 每一击一对 down/up，clickState 递增（双击 = 1、2）。
        for n in 1...max(count, 1) {
            guard let down = EventFactory.mouse(source, downType, target, button: button, clickState: n, flags: flags),
                  let up = EventFactory.mouse(source, upType, target, button: button, clickState: n, flags: flags) else {
                return .scgeventUnavailable
            }
            down.postToPid(target.pid)
            up.postToPid(target.pid)
        }
        return .ok
    }

    static func move(target: EventFactory.Target) -> DispatchCode {
        guard case .success(let source) = EventFactory.source(),
              let event = EventFactory.mouse(source, .mouseMoved, target, button: .left) else {
            return .scgeventUnavailable
        }
        event.postToPid(target.pid)
        return .ok
    }

    /// Mutable so the deferred release is reflected in the returned result on every exit path.
    final class DragResult {
        var reason: String?
        var pressed = false
        var released = false
        var moved = 0
        var json: [String: Any] {
            ["outcome": reason == nil ? "ok" : (pressed ? "ineffective" : "unsupported"),
             "reasonCode": reason as Any? ?? NSNull(), "delivered": pressed, "verified": false,
             "mouseUpSent": released, "dragSteps": moved, "eventKind": "drag"]
        }
    }

    /// About one drag event per 10 full-resolution pixels, clamped to 12–60 moves. Each non-empty segment gets
    /// at least one move so sharp corners and short detours are never cut off by uniform whole-path sampling.
    static func dragSamples(vertices: [EventFactory.Target], pixelScale: Double) -> [EventFactory.Target] {
        guard let first = vertices.first, vertices.count >= 2, pixelScale.isFinite, pixelScale > 0 else { return [] }
        let segments = zip(vertices, vertices.dropFirst()).compactMap { a, b -> (EventFactory.Target, EventFactory.Target, Double)? in
            let length = hypot(b.screenPoint.x - a.screenPoint.x, b.screenPoint.y - a.screenPoint.y)
            return length > 0 ? (a, b, length) : nil
        }
        let total = segments.reduce(0.0) { $0 + $1.2 }
        guard total > 0, total.isFinite, segments.count <= 60 else { return [] }
        let count = max(12, segments.count, Int(min(60, ceil(total * pixelScale / 10))))
        let remaining = count - segments.count
        let shares = segments.map { Double(remaining) * $0.2 / total }
        var counts = shares.map { 1 + Int(floor($0)) }
        // Largest remainders, with stable ordering for equal shares.
        let order = shares.indices.sorted {
            let a = shares[$0] - floor(shares[$0]), b = shares[$1] - floor(shares[$1])
            return a == b ? $0 < $1 : a > b
        }
        for index in order.prefix(count - counts.reduce(0, +)) { counts[index] += 1 }
        var result = [first]
        for (segmentIndex, segment) in segments.enumerated() {
            let (a, b, _) = segment
            for i in 1...counts[segmentIndex] {
                if i == counts[segmentIndex] { result.append(b); continue }
                let t = Double(i) / Double(counts[segmentIndex])
                result.append(a.moved(
                    screenPoint: CGPoint(x: a.screenPoint.x + (b.screenPoint.x - a.screenPoint.x) * t,
                                         y: a.screenPoint.y + (b.screenPoint.y - a.screenPoint.y) * t),
                    windowLocal: CGPoint(x: a.windowLocal.x + (b.windowLocal.x - a.windowLocal.x) * t,
                                         y: a.windowLocal.y + (b.windowLocal.y - a.windowLocal.y) * t)))
            }
        }
        return result
    }

    /// Sequencing only. The injectable clock/poster lets tests interrupt the real state machine without locking
    /// the user's desktop. No AX IPC is allowed while held; the session gate is checked before every event.
    static func dragSequence(targets: [EventFactory.Target], buttonName: String,
                             refusal: () -> String?, now: () -> Double = { ProcessInfo.processInfo.systemUptime },
                             pause: (useconds_t) -> Void = { usleep($0) },
                             post: (CGEventType, EventFactory.Target) -> Void) -> DragResult {
        let result = DragResult()
        guard let start = targets.first, targets.count >= 2 else { result.reason = "invalid_params"; return result }
        let down: CGEventType = buttonName == "right" ? .rightMouseDown : buttonName == "middle" ? .otherMouseDown : .leftMouseDown
        let dragged: CGEventType = buttonName == "right" ? .rightMouseDragged : buttonName == "middle" ? .otherMouseDragged : .leftMouseDragged
        let up: CGEventType = buttonName == "right" ? .rightMouseUp : buttonName == "middle" ? .otherMouseUp : .leftMouseUp
        let began = now()
        var current = start
        func abort() -> Bool {
            result.reason = refusal() ?? (now() - began >= 3 ? "drag_timeout" : nil)
            return result.reason != nil
        }
        defer {
            if result.pressed {
                // Cleanup bypasses all gates: even a locked session must receive the matching mouseUp.
                post(up, current)
                result.released = true
                if result.reason == nil && !abort() { post(.mouseMoved, current) }
            }
        }
        if abort() { return result }
        post(.mouseMoved, start)                         // prepare
        pause(16_000)
        if abort() { return result }
        post(down, start)                               // press
        result.pressed = true
        for (index, target) in targets.dropFirst().enumerated() {
            pause(index < 3 ? 20_000 : 10_000)           // cross the drag threshold slowly
            if abort() { return result }
            current = target
            post(dragged, current)                      // move
            result.moved += 1
        }
        _ = abort()
        return result                                  // release + settle in defer
    }

    static func drag(targets: [EventFactory.Target], buttonName: String, refusal: () -> String?) -> DragResult {
        let failure = DragResult()
        guard case .success(let source) = EventFactory.source() else {
            failure.reason = "scgevent_unavailable"; return failure
        }
        let button: CGMouseButton = buttonName == "right" ? .right : buttonName == "middle" ? .center : .left
        let kinds: [CGEventType] = buttonName == "right" ? [.mouseMoved, .rightMouseDown, .rightMouseDragged, .rightMouseUp]
            : buttonName == "middle" ? [.mouseMoved, .otherMouseDown, .otherMouseDragged, .otherMouseUp]
            : [.mouseMoved, .leftMouseDown, .leftMouseDragged, .leftMouseUp]
        // Allocate every event, especially releases, BEFORE pressing. Cleanup cannot fail due to allocation.
        var events: [UInt32: [CGEvent]] = [:]
        for kind in kinds {
            let built = targets.compactMap { EventFactory.mouse(source, kind, $0, button: button, clickState: 1) }
            guard built.count == targets.count else { failure.reason = "scgevent_unavailable"; return failure }
            events[kind.rawValue] = built
        }
        var index = 0
        return dragSequence(targets: targets, buttonName: buttonName, refusal: refusal) { kind, target in
            if kind == kinds[2] { index += 1 }
            let event = events[kind.rawValue]![index]
            // Events were allocated before pressing, but AppKit must see actual delivery-time intervals.
            event.timestamp = DispatchTime.now().uptimeNanoseconds
            event.postToPid(target.pid)
        }
    }

    static func scroll(target: EventFactory.Target, dy: Int32, dx: Int32 = 0) -> DispatchCode {
        guard case .success(let source) = EventFactory.source(),
              let event = EventFactory.scroll(source, target, dy: dy, dx: dx) else {
            return .scgeventUnavailable
        }
        event.postToPid(target.pid)
        return .ok
    }

    // MARK: 键盘

    static func key(pid: pid_t, keyName: String, modifiers: [String] = [], repeat times: Int = 1) -> DispatchCode {
        guard let code = keyCode(for: keyName) else { return .keyNotMapped }
        let flags = modifierFlags(modifiers)
        guard case .success(let source) = EventFactory.source() else { return .scgeventUnavailable }
        for _ in 0..<max(times, 1) {
            guard let down = EventFactory.key(source, pid: pid, code: code, down: true, flags: flags),
                  let up = EventFactory.key(source, pid: pid, code: code, down: false, flags: flags) else {
                return .scgeventUnavailable
            }
            down.postToPid(pid)
            up.postToPid(pid)
            usleep(8_000)
        }
        return .ok
    }

    /// 文本注入走 Unicode 字符串，避免键盘布局差异。
    static func text(pid: pid_t, _ text: String, chunkSize: Int = 512) -> (code: DispatchCode, delivered: Int) {
        guard case .success(let source) = EventFactory.source() else {
            return (.scgeventUnavailable, 0)
        }
        var delivered = 0
        var index = text.startIndex
        while index < text.endIndex {
            var end = text.index(index, offsetBy: chunkSize, limitedBy: text.endIndex) ?? text.endIndex
            // 不要劈开代理对。
            if end < text.endIndex {
                let scalar = text[text.index(before: end)]
                if scalar.isHighSurrogate { end = text.index(before: end) }
            }
            let chunk = String(text[index..<end])
            let utf16 = Array(chunk.utf16)
            guard let down = EventFactory.unicode(source, pid: pid, units: utf16, down: true),
                  let up = EventFactory.unicode(source, pid: pid, units: utf16, down: false) else {
                return (.scgeventUnavailable, delivered)
            }
            down.postToPid(pid)
            up.postToPid(pid)
            delivered += chunk.count
            index = end
            usleep(2_000)
        }
        return (.ok, delivered)
    }

    // MARK: 修饰键与键码

    static func modifierFlags(_ names: [String]) -> CGEventFlags {
        var flags: CGEventFlags = []
        for name in names {
            switch name {
            case "cmd", "command", "meta": flags.insert(.maskCommand)
            case "shift": flags.insert(.maskShift)
            case "option", "alt": flags.insert(.maskAlternate)
            case "ctrl", "control": flags.insert(.maskControl)
            case "fn": flags.insert(.maskSecondaryFn)
            case "caps": flags.insert(.maskAlphaShift)
            default: break
            }
        }
        return flags
    }

    /// ANSI 键码。覆盖 app-cu-helper 字符串里出现的键名集合。
    static func keyCode(for name: String) -> CGKeyCode? {
        switch name.lowercased() {
        case "return", "enter": return 36
        case "tab": return 48
        case "space": return 49
        case "delete", "backspace": return 51
        case "escape", "esc": return 53
        case "forward_delete", "forwarddelete": return 117
        case "left", "arrow_left": return 123
        case "right", "arrow_right": return 124
        case "down", "arrow_down": return 125
        case "up", "arrow_up": return 126
        case "home": return 115
        case "end": return 119
        case "page_up", "pageup": return 116
        case "page_down", "pagedown": return 121
        case "a": return 0
        case "s": return 1
        case "d": return 2
        case "f": return 3
        case "h": return 4
        case "g": return 5
        case "z": return 6
        case "x": return 7
        case "c": return 8
        case "v": return 9
        case "b": return 11
        case "q": return 12
        case "w": return 13
        case "e": return 14
        case "r": return 15
        case "y": return 16
        case "t": return 17
        case "1": return 18
        case "2": return 19
        case "3": return 20
        case "4": return 21
        case "6": return 22
        case "5": return 23
        case "=": return 24
        case "9": return 25
        case "7": return 26
        case "-": return 27
        case "8": return 28
        case "0": return 29
        case "]": return 30
        case "o": return 31
        case "u": return 32
        case "[": return 33
        case "i": return 34
        case "p": return 35
        case "l": return 37
        case "j": return 38
        case "'": return 39
        case "k": return 40
        case ";": return 41
        case "\\": return 42
        case ",": return 43
        case "/": return 44
        case "n": return 45
        case "m": return 46
        case ".": return 47
        case "`": return 50
        default: return nil
        }
    }
}

private extension Character {
    var isHighSurrogate: Bool {
        guard let value = unicodeScalars.first?.value else { return false }
        return (0xD800...0xDBFF).contains(value)
    }
}
