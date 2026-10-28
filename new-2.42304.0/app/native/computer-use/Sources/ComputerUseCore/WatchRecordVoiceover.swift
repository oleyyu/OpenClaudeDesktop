import Foundation
import AVFoundation
import CoreAudio
import AudioToolbox
import Speech

/// Watch-record's optional voice narration (docs/computer-use-official-spec-20261021.md §2.4.3). The 2.42304.0 original
/// (@ant/claude-swift WatchRecordVoiceover) streams the microphone to Anthropic's own transcription service; this build
/// has no such service, so it transcribes **on the device** with SFSpeechRecognizer (`requiresOnDeviceRecognition`):
/// no audio leaves the computer. Where that is not possible — no on-device model for the language, speech recognition
/// not allowed, or the app bundle lacks NSSpeechRecognitionUsageDescription (asking without it would end the process) —
/// `availability()` says so and the main process records without the microphone, as the original does when the
/// microphone is unavailable (clicks and typing only).
///
/// Shape as the original's binding (main process YLa): listInputDevices → [{uid, name}], startPreview(uid?) /
/// stopPreview (the chooser's level meter), start(uid?, perTurn) / stop, and two event streams — narration {t, text}
/// (the whole transcript of this microphone session so far, `t` on the recorder's clock) and mic state {on, level,
/// error?} — which wait here for the main process to drain (`voiceoverDrain`).
public final class WatchRecordVoiceover: @unchecked Sendable {
    public static let shared = WatchRecordVoiceover()

    private let lock = NSLock()
    private var engine: AVAudioEngine?
    private var previewing = false
    private var active = false
    private var level: Double = 0
    private var lastLevelAt: TimeInterval = 0
    private var micStates: [[String: Any]] = []
    private var narrations: [[String: Any]] = []
    private var recognizer: SFSpeechRecognizer?
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var committed: [String] = []
    private var partial = ""
    private var lastEmitted = ""
    private var generation = 0
    private var failures = 0
    private let queue = OperationQueue()

    init() { queue.maxConcurrentOperationCount = 1; queue.name = "watch-record-voiceover" }

    /// Whether narration can run: the usage strings are in the bundle, an on-device recognizer exists for the current
    /// language, and speech recognition is not denied. `reason` names the first thing missing.
    public static func availability() -> [String: Any] {
        let info = Bundle.main.infoDictionary ?? [:]
        let hasSpeechUsage = info["NSSpeechRecognitionUsageDescription"] != nil
        let hasMicUsage = info["NSMicrophoneUsageDescription"] != nil
        let recognizer = SFSpeechRecognizer(locale: Locale.current) ?? SFSpeechRecognizer()
        let onDevice = recognizer?.supportsOnDeviceRecognition ?? false
        let status = SFSpeechRecognizer.authorizationStatus()
        let statusName: String
        switch status {
        case .authorized: statusName = "authorized"
        case .denied: statusName = "denied"
        case .restricted: statusName = "restricted"
        case .notDetermined: statusName = "notDetermined"
        @unknown default: statusName = "unknown"
        }
        let reason: String? = !hasMicUsage ? "no_microphone_usage_description"
            : !hasSpeechUsage ? "no_speech_usage_description"
            : recognizer == nil ? "no_recognizer"
            : !onDevice ? "no_on_device_recognition"
            : (status == .denied || status == .restricted) ? "speech_recognition_denied"
            : listInputDevices().isEmpty ? "no_input_device" : nil
        return ["available": reason == nil, "reason": reason ?? NSNull(), "authorization": statusName,
                "locale": (recognizer?.locale.identifier ?? Locale.current.identifier)]
    }

    /// The audio inputs (AVCaptureDevice uniqueID is the Core Audio device UID).
    public static func listInputDevices() -> [[String: String]] {
        AVCaptureDevice.DiscoverySession(deviceTypes: [.microphone, .external], mediaType: .audio, position: .unspecified)
            .devices.map { ["uid": $0.uniqueID, "name": $0.localizedName] }
    }

    /// The chooser's meter: the microphone runs for its level only, nothing is transcribed or kept.
    public func startPreview(uid: String?) throws {
        lock.lock(); defer { lock.unlock() }
        if active { return }
        stopEngineLocked()
        try startEngineLocked(uid: uid, recognize: false)
        previewing = true
    }

    public func stopPreview() {
        lock.lock(); defer { lock.unlock() }
        guard previewing else { return }
        stopEngineLocked()
        previewing = false
        pushMicStateLocked(on: false, level: 0)
    }

    /// Start narration (asks for speech recognition the first time; the microphone itself is asked for by the main
    /// process, as the original does through systemPreferences).
    public func start(uid: String?, perTurn: Bool) throws {
        let availability = Self.availability()
        guard availability["available"] as? Bool == true else {
            throw CUError("voiceover_unavailable", "Narration is unavailable: \(availability["reason"] as? String ?? "unknown").")
        }
        if SFSpeechRecognizer.authorizationStatus() == .notDetermined {
            let answered = DispatchSemaphore(value: 0)
            SFSpeechRecognizer.requestAuthorization { _ in answered.signal() }
            _ = answered.wait(timeout: .now() + 120)
        }
        guard SFSpeechRecognizer.authorizationStatus() == .authorized else {
            throw CUError("speech_recognition_denied", "Speech recognition is not allowed for this app.")
        }
        lock.lock(); defer { lock.unlock() }
        if active { throw CUError("already_active", "WatchRecordVoiceover.start called while already active") }
        stopEngineLocked()
        previewing = false
        committed = []; partial = ""; lastEmitted = ""; failures = 0
        generation += 1
        let recognizer = SFSpeechRecognizer(locale: Locale.current) ?? SFSpeechRecognizer()
        guard let recognizer, recognizer.supportsOnDeviceRecognition else {
            throw CUError("voiceover_unavailable", "No on-device speech recognizer.")
        }
        recognizer.queue = queue
        self.recognizer = recognizer
        try startEngineLocked(uid: uid, recognize: true)
        active = true
        startTaskLocked()
        pushMicStateLocked(on: true, level: 0)
    }

    /// Stop narration: the audio ends, the recognizer finishes what it heard (a last narration), then mic state off.
    public func stop() {
        lock.lock()
        guard active else { lock.unlock(); return }
        active = false
        request?.endAudio()
        stopEngineLocked()
        let finishing = task
        let gen = generation
        lock.unlock()
        // Give the recognizer a moment for its final result, then close the session either way.
        DispatchQueue.global().asyncAfter(deadline: .now() + (finishing == nil ? 0 : 1.5)) { [weak self] in
            guard let self else { return }
            self.lock.lock()
            if self.generation == gen {
                self.task?.cancel(); self.task = nil; self.request = nil; self.recognizer = nil
                self.pushMicStateLocked(on: false, level: 0)
            }
            self.lock.unlock()
        }
    }

    /// What happened since the last drain: narration updates and mic states, oldest first.
    public func drain() -> [String: Any] {
        lock.lock(); defer { lock.unlock() }
        let result: [String: Any] = ["narrations": narrations, "micStates": micStates, "active": active, "previewing": previewing]
        narrations = []
        micStates = []
        return result
    }

    // MARK: - engine

    private func startEngineLocked(uid: String?, recognize: Bool) throws {
        let engine = AVAudioEngine()
        let input = engine.inputNode
        if let uid, !uid.isEmpty, let device = Self.deviceId(forUID: uid), let unit = input.audioUnit {
            var id = device
            AudioUnitSetProperty(unit, kAudioOutputUnitProperty_CurrentDevice, kAudioUnitScope_Global, 0, &id, UInt32(MemoryLayout<AudioDeviceID>.size))
        }
        let format = input.outputFormat(forBus: 0)
        guard format.sampleRate > 0, format.channelCount > 0 else { throw CUError("no_input_format", "WatchRecordVoiceover.startPreview: no usable input format") }
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
            guard let self else { return }
            let rms = Self.rms(buffer)
            self.lock.lock()
            if recognize { self.request?.append(buffer) }
            let now = ProcessInfo.processInfo.systemUptime
            let db = 20 * log10(max(rms, 1e-7))
            self.level = max(0, min(1, (db + 50) / 50))
            if now - self.lastLevelAt >= 0.05 {
                self.lastLevelAt = now
                self.pushMicStateLocked(on: true, level: self.level)
            }
            self.lock.unlock()
        }
        engine.prepare()
        do { try engine.start() } catch {
            input.removeTap(onBus: 0)
            throw CUError("engine_failed", "WatchRecordVoiceover.startRecording failed: \(error.localizedDescription)")
        }
        self.engine = engine
    }

    private func stopEngineLocked() {
        guard let engine else { return }
        engine.inputNode.removeTap(onBus: 0)
        engine.stop()
        self.engine = nil
    }

    private func startTaskLocked() {
        guard let recognizer else { return }
        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        request.requiresOnDeviceRecognition = true
        if #available(macOS 13, *) { request.addsPunctuation = true }
        self.request = request
        let gen = generation
        task = recognizer.recognitionTask(with: request) { [weak self] result, error in
            guard let self else { return }
            self.lock.lock(); defer { self.lock.unlock() }
            guard self.generation == gen else { return }
            if let result {
                self.partial = result.bestTranscription.formattedString
                self.emitNarrationLocked()
                if result.isFinal {
                    if !self.partial.isEmpty { self.committed.append(self.partial) }
                    self.partial = ""
                    // A final result mid-recording (a long pause): keep listening with a new task.
                    if self.active { self.startTaskLocked() }
                }
            } else if error != nil {
                if !self.partial.isEmpty { self.committed.append(self.partial); self.partial = "" }
                if self.active {
                    self.failures += 1
                    if self.failures <= 3 { self.startTaskLocked() } else {
                        // STT failed mid-recording: the main process turns narration off (the pill's error state).
                        self.active = false
                        self.request?.endAudio()
                        self.stopEngineLocked()
                        self.pushMicStateLocked(on: false, level: 0, error: true)
                    }
                }
            }
        }
    }

    private func emitNarrationLocked() {
        let text = (committed + (partial.isEmpty ? [] : [partial])).joined(separator: " ")
        guard text != lastEmitted else { return }
        lastEmitted = text
        narrations.append(["t": WatchRecorder.shared.nowT(), "text": text])
    }

    private func pushMicStateLocked(on: Bool, level: Double, error: Bool = false) {
        var state: [String: Any] = ["on": on, "level": level]
        if error { state["error"] = true }
        // Only the latest level matters between drains; on/off and errors are all kept.
        if let last = micStates.last, last["error"] == nil, !error, (last["on"] as? Bool) == on { micStates[micStates.count - 1] = state }
        else { micStates.append(state) }
    }

    static func rms(_ buffer: AVAudioPCMBuffer) -> Double {
        guard let data = buffer.floatChannelData, buffer.frameLength > 0 else { return 0 }
        let samples = data[0]
        var sum: Float = 0
        for index in 0..<Int(buffer.frameLength) { sum += samples[index] * samples[index] }
        return Double(sqrt(sum / Float(buffer.frameLength)))
    }

    static func deviceId(forUID uid: String) -> AudioDeviceID? {
        var address = AudioObjectPropertyAddress(mSelector: kAudioHardwarePropertyTranslateUIDToDevice,
                                                 mScope: kAudioObjectPropertyScopeGlobal, mElement: kAudioObjectPropertyElementMain)
        var cfUID = uid as CFString
        var device = AudioDeviceID(0)
        var size = UInt32(MemoryLayout<AudioDeviceID>.size)
        let status = withUnsafeMutablePointer(to: &cfUID) { pointer in
            AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &address, UInt32(MemoryLayout<CFString>.size), pointer, &size, &device)
        }
        return status == noErr && device != 0 ? device : nil
    }
}
