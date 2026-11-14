import Foundation
import AppKit
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers
@preconcurrency import ScreenCaptureKit

/// docs/06: `var iH = {pxPerToken: 28, maxTargetPx: 1568, maxTargetTokens: 1568}`; JPEG quality 0.75, hard-coded.
/// Mirrored in app/electron/computer-use/budget.cjs (tests compare the two through captures).
public enum TokenBudget {
    public static let pxPerToken = 28
    public static let maxTargetPx = 1568
    public static let maxTargetTokens = 1568
    public static let jpegQuality = 0.75

    public static func tokens(_ w: Int, _ h: Int) -> Int {
        ((w + pxPerToken - 1) / pxPerToken) * ((h + pxPerToken - 1) / pxPerToken)
    }

    static func fits(_ w: Int, _ h: Int) -> Bool {
        w <= maxTargetPx && h <= maxTargetPx && tokens(w, h) <= maxTargetTokens
    }

    /// aH(w, h): as is when it fits; portrait → swap and recurse; else the largest long edge (binary search) whose
    /// aspect-kept size fits.
    public static func fit(width: Int, height: Int) -> (Int, Int) {
        let w = max(1, width), h = max(1, height)
        if fits(w, h) { return (w, h) }
        if h > w { let (b, a) = fit(width: h, height: w); return (a, b) }
        let short = { (long: Int) in max(1, Int((Double(long) * Double(h) / Double(w)).rounded())) }
        var lo = 1, hi = w
        while lo < hi {
            let mid = (lo + hi + 1) / 2
            if fits(mid, short(mid)) { lo = mid } else { hi = mid - 1 }
        }
        return (lo, short(lo))
    }

    /// oH([w, h], scale): the returned image only; coordinates stay in the full-resolution frame.
    public static func scaled(_ size: (Int, Int), _ scale: Double) -> (Int, Int) {
        (max(1, Int((Double(size.0) * scale).rounded())), max(1, Int((Double(size.1) * scale).rounded())))
    }
}

public enum Capture {
    static func ensureAccess() throws {
        // Preflight only: requesting would raise the system prompt from inside a tool call.
        guard CGPreflightScreenCaptureAccess() else {
            throw CUError("screen_capture_denied", "Screen Recording permission is not granted.")
        }
    }

    static func content() async throws -> SCShareableContent {
        do { return try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: false) }
        catch { throw CUError("capture_failed", error.localizedDescription) }
    }

    static func shoot(_ filter: SCContentFilter, _ width: Int, _ height: Int, singleWindow: Bool, sourceRect: CGRect? = nil) async throws -> String {
        let config = SCStreamConfiguration()
        if let sourceRect { config.sourceRect = sourceRect }
        config.width = width
        config.height = height
        config.showsCursor = false
        config.captureResolution = .best
        if singleWindow { config.ignoreShadowsSingleWindow = true }   // the frame is the window's bounds, no shadow
        let image: CGImage
        do { image = try await SCScreenshotManager.captureImage(contentFilter: filter, configuration: config) }
        catch { throw CUError("capture_failed", error.localizedDescription) }
        guard let url = jpegDataURL(image, quality: TokenBudget.jpegQuality) else { throw CUError("capture_failed", "JPEG encoding failed.") }
        return url
    }

    /// One window of a granted app (minimized, hidden or off-Space too). Only that window enters the pixels.
    public static func window(bundleId: String, windowId: UInt32?, scale: Double, listsElements: Bool = false) async throws -> [String: Any] {
        try ensureAccess()
        let window = try WindowList.resolve(bundleId: bundleId, windowId: windowId)
        let content = try await content()
        guard let scWindow = content.windows.first(where: { $0.windowID == window.windowId }) else {
            throw CUError("window_not_capturable", "Window \(window.windowId) is not available to ScreenCaptureKit.")
        }
        guard scWindow.owningApplication?.processID == window.pid else {
            throw CUError("foreign_pid", "Window \(window.windowId) is not owned by \(bundleId).")
        }
        // Chromium wake (docs/05 §4) is M4 behind a flag. It must never activate the app: no fronting here.
        let chromium = WindowList.usesChromium(pid: window.pid)
        let filter = SCContentFilter(desktopIndependentWindow: scWindow)
        let factor = Double(filter.pointPixelScale)
        let frame = (Int((scWindow.frame.width * factor).rounded()), Int((scWindow.frame.height * factor).rounded()))
        let (w, h) = TokenBudget.scaled(TokenBudget.fit(width: frame.0, height: frame.1), scale)
        let dataUrl = try await shoot(filter, w, h, singleWindow: true)
        var result: [String: Any] = [
            "dataUrl": dataUrl, "width": w, "height": h,
            "frameWidth": frame.0, "frameHeight": frame.1, "scaleFactor": factor,
            "windowId": Int(window.windowId), "bundleId": bundleId, "pid": Int(window.pid),
            "bounds": rectJSON(scWindow.frame), "targetUsesChromium": chromium,
            "jpegQuality": TokenBudget.jpegQuality,
            "isMinimized": window.isMinimized ?? NSNull(), "isHidden": window.isHidden, "isOffSpace": window.isOffSpace ?? NSNull(),
        ]
        // AX summary in the same frame pixels as the image (docs/06: listsElements). Empty without Accessibility.
        if listsElements {
            result["elements"] = AXLadder.summary(pid: window.pid, windowId: window.windowId, bounds: scWindow.frame, scaleFactor: factor)
            result["axTrusted"] = AXIsProcessTrusted()
        }
        return result
    }

    /// The process that draws the wallpaper (window "Wallpaper", below the desktop-icon level) on macOS 14+.
    static let desktopOwner = "com.apple.WindowManager"

    /// A display showing only the granted apps and the desktop, decided in the SCContentFilter (compositor level).
    ///
    /// Inclusion, not exclusion: excluding apps cannot hide WindowServer's own "Menubar" window (layer 24, no bundle
    /// id), which draws the frontmost app's menus and every app's status items. So the filter includes the granted
    /// apps plus WindowManager, and excepts every WindowManager window above the desktop-icon level (Stage Manager
    /// strips and the like): what is not listed — the menu bar, the Dock, desktop icons, any other app — is absent.
    /// An empty allowlist is not an error: the image is the desktop alone.
    /// region: a rectangle of the display in display-local points (zoom); only it is captured (SCStreamConfiguration
    /// sourceRect), at the display's pixel density, sized to the same token budget. nil is the whole display.
    public static func screen(displayId: UInt32?, allowedBundleIds: [String], scale: Double, region: CGRect? = nil) async throws -> [String: Any] {
        try ensureAccess()
        let content = try await content()
        let display: SCDisplay
        if let displayId {
            guard let found = content.displays.first(where: { $0.displayID == displayId }) else {
                throw CUError("display_not_found", "No display \(displayId).")
            }
            display = found
        } else {
            guard let main = content.displays.first(where: { $0.displayID == CGMainDisplayID() }) ?? content.displays.first else {
                throw CUError("display_not_found", "No display.")
            }
            display = main
        }
        let allowed = Set(allowedBundleIds.filter { !$0.isEmpty })
        let granted = content.applications.filter { allowed.contains($0.bundleIdentifier) }
        let iconLevel = Int(CGWindowLevelForKey(.desktopIconWindow))
        let ownedByDesktop = { (w: SCWindow) in w.owningApplication?.bundleIdentifier == desktopOwner }
        // The wallpaper is WindowManager's lowest-layer window on this display. Its "Fullscreen Backdrop" sits two
        // layers above (opaque, it would cover the wallpaper) and Stage Manager strips sit above the icon level: both out.
        let onDisplay = { (w: SCWindow) in w.frame.intersects(display.frame) }
        let candidates = content.windows.filter { ownedByDesktop($0) && onDisplay($0) && $0.windowLayer < iconLevel }
        let wallpaperLayer = candidates.map(\.windowLayer).min()
        let desktopWindows = candidates.filter { $0.windowLayer == wallpaperLayer }
        let desktopIds = Set(desktopWindows.map(\.windowID))
        let desktopGranted = allowed.contains(desktopOwner)
        let included = granted + (desktopGranted ? [] : content.applications.filter { $0.bundleIdentifier == desktopOwner })
        let excepted = desktopGranted ? [] : content.windows.filter { ownedByDesktop($0) && !desktopIds.contains($0.windowID) }
        let filter = SCContentFilter(display: display, including: included, exceptingWindows: excepted)
        let excluded = content.applications.filter { !allowed.contains($0.bundleIdentifier) }
        let factor = Double(filter.pointPixelScale)
        var region = region
        if let given = region {
            let bounds = CGRect(x: 0, y: 0, width: Double(display.width), height: Double(display.height))
            // A region scaled from image pixels (budget.cjs) can overshoot an edge by a rounding ulp: accept that, then
            // keep the part on the display.
            guard given.width > 0, given.height > 0, bounds.insetBy(dx: -0.001, dy: -0.001).contains(given) else {
                throw CUError.invalidParams("region must lie inside the display's \(display.width)×\(display.height) points")
            }
            region = given.intersection(bounds)
        }
        let size = region?.size ?? CGSize(width: Double(display.width), height: Double(display.height))
        let frame = (Int((size.width * factor).rounded()), Int((size.height * factor).rounded()))
        let (w, h) = TokenBudget.scaled(TokenBudget.fit(width: frame.0, height: frame.1), scale)
        let dataUrl = try await shoot(filter, w, h, singleWindow: false, sourceRect: region)
        return [
            "region": region.map { rectJSON($0) } ?? NSNull(),
            "dataUrl": dataUrl, "width": w, "height": h,
            "frameWidth": frame.0, "frameHeight": frame.1, "scaleFactor": factor,
            "displayId": Int(display.displayID), "displayWidth": display.width, "displayHeight": display.height,
            "displayBounds": rectJSON(display.frame),
            "excludedBundleIds": Array(Set(excluded.map(\.bundleIdentifier).filter { !$0.isEmpty })).sorted(),
            "desktopWindowIds": desktopWindows.map { Int($0.windowID) },
            "jpegQuality": TokenBudget.jpegQuality,
        ]
    }

    static func jpegDataURL(_ image: CGImage, quality: Double) -> String? {
        let data = NSMutableData()
        guard let dest = CGImageDestinationCreateWithData(data as CFMutableData, UTType.jpeg.identifier as CFString, 1, nil) else { return nil }
        CGImageDestinationAddImage(dest, image, [kCGImageDestinationLossyCompressionQuality: quality] as CFDictionary)
        guard CGImageDestinationFinalize(dest) else { return nil }
        return "data:image/jpeg;base64," + (data as Data).base64EncodedString()
    }
}
