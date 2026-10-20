import Foundation
import CoreGraphics

/// A refusal or failure with a reason code the main process passes through unchanged (docs/04 reason codes).
public struct CUError: Error, CustomStringConvertible {
    public let code: String
    public let message: String
    public init(_ code: String, _ message: String = "") {
        self.code = code
        self.message = message.isEmpty ? code : message
    }
    public var description: String { "\(code): \(message)" }

    public static func invalidParams(_ detail: String) -> CUError { CUError("invalid_params", detail) }
}

/// Parameter access over a decoded JSON object (numbers arrive as NSNumber).
public struct Params {
    public let raw: [String: Any]
    public init(_ raw: [String: Any]) { self.raw = raw }

    public func string(_ key: String) -> String? { raw[key] as? String }

    public func double(_ key: String) -> Double? {
        // JSON true/false are CFBoolean; `is Bool` would also match the numbers 0 and 1 (NSNumber bridging).
        guard let n = raw[key] as? NSNumber, CFGetTypeID(n) != CFBooleanGetTypeID() else { return nil }
        let value = n.doubleValue
        return value.isFinite ? value : nil
    }

    public func uint32(_ key: String) -> UInt32? {
        guard let value = double(key), value >= 0, value <= Double(UInt32.max), value == value.rounded() else { return nil }
        return UInt32(value)
    }

    public func strings(_ key: String) -> [String]? {
        guard let array = raw[key] as? [Any] else { return nil }
        let strings = array.compactMap { $0 as? String }
        return strings.count == array.count ? strings : nil
    }
}

public func rectJSON(_ rect: CGRect) -> [String: Any] {
    ["x": rect.origin.x, "y": rect.origin.y, "width": rect.width, "height": rect.height]
}

private final class ResultBox<T>: @unchecked Sendable { var result: Result<T, Error>? }

/// Runs async work from a synchronous caller that is NOT the main thread (the N-API worker thread). Never call this
/// on the main thread: ScreenCaptureKit may deliver there and it would deadlock.
public func blockingAwait<T>(_ body: @escaping @Sendable () async throws -> T) throws -> T {
    precondition(!Thread.isMainThread, "blockingAwait on the main thread")
    let box = ResultBox<T>()
    let semaphore = DispatchSemaphore(value: 0)
    Task.detached {
        do { box.result = .success(try await body()) } catch { box.result = .failure(error) }
        semaphore.signal()
    }
    semaphore.wait()
    return try box.result!.get()
}
