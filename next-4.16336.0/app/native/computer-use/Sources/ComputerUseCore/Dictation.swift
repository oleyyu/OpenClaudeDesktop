import Foundation
import AVFoundation
import AudioToolbox
import Speech

/// Composer dictation (the official chin's Dictate button, c47a58ae1 mS). The original streams the microphone to
/// claude.ai's `/api/ws/speech_to_text/voice_stream`; this build has no such service, so it transcribes **on the
/// device** with SFSpeechRecognizer (`requiresOnDeviceRecognition`), as WatchRecordVoiceover does: no audio leaves the
/// computer. The language is the caller's (the composer's Dictation menu), not the system locale: a Mac set to en_TW
/// whose user speaks Mandarin wants zh-CN.
///
/// One session at a time, shared with watch-record narration (the same microphone and recognizer): each refuses to
/// start while the other runs. State for the main process to poll (`drain`): idle | recording | finishing | error, the
/// whole transcript of this session so far (`text`, committed segments plus the live partial), the input level, and a
/// session number so a stale poll is recognised. `error` is a code (dictation_disabled: the system's Dictation is off;
/// recognition_failed: the recognizer kept failing) and `errorDetail` the recognizer's own message.
///
/// `file` (tests only): an audio file is fed to the recognizer at its own pace instead of the microphone, so the real
/// on-device recognizer can be checked with `say -o` output and no one speaking.
public final class Dictation: @unchecked Sendable {
    public static let shared = Dictation()

    private let lock = NSLock()
    private var engine: AVAudioEngine?
    private var recognizer: SFSpeechRecognizer?
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var state = "idle"
    private var errorCode: String?
    private var errorDetail: String?
    private var committed: [String] = []
    private var partial = ""
    private var separator = " "
    private var level: Double = 0
    private var session = 0
    private var failures = 0
    private var feeding = false
    private let queue = OperationQueue()

    init() { queue.maxConcurrentOperationCount = 1; queue.name = "composer-dictation" }

    /// Recording or finishing (the microphone or the recognizer is still in use).
    public var isActive: Bool { lock.lock(); defer { lock.unlock() }; return state == "recording" || state == "finishing" }

    static func recognizer(for identifier: String?) -> SFSpeechRecognizer? {
        if let identifier, !identifier.isEmpty { return SFSpeechRecognizer(locale: Locale(identifier: identifier)) }
        return SFSpeechRecognizer(locale: Locale.current) ?? SFSpeechRecognizer()
    }

    static func authorizationName(_ status: SFSpeechRecognizerAuthorizationStatus) -> String {
        switch status {
        case .authorized: return "authorized"
        case .denied: return "denied"
        case .restricted: return "restricted"
        case .notDetermined: return "notDetermined"
        @unknown default: return "unknown"
        }
    }

    /// Whether dictation can run for `locale`: the usage strings are in the bundle (asking for speech recognition
    /// without NSSpeechRecognitionUsageDescription ends the process), an on-device recognizer exists for the language,
    /// speech recognition is not denied, and there is an input device. `reason` names the first thing missing.
    public static func availability(locale: String?) -> [String: Any] {
        let info = Bundle.main.infoDictionary ?? [:]
        let recognizer = recognizer(for: locale)
        let status = SFSpeechRecognizer.authorizationStatus()
        let reason: String? = info["NSMicrophoneUsageDescription"] == nil ? "no_microphone_usage_description"
            : info["NSSpeechRecognitionUsageDescription"] == nil ? "no_speech_usage_description"
            : recognizer == nil ? "no_recognizer"
            : !(recognizer?.supportsOnDeviceRecognition ?? false) ? "no_on_device_recognition"
            : (status == .denied || status == .restricted) ? "speech_recognition_denied"
            : WatchRecordVoiceover.listInputDevices().isEmpty ? "no_input_device" : nil
        return ["available": reason == nil, "reason": reason ?? NSNull(), "authorization": authorizationName(status),
                "locale": recognizer?.locale.identifier ?? (locale ?? Locale.current.identifier)]
    }

    /// Start a session: asks for speech recognition the first time (the microphone is asked for by the main process
    /// through systemPreferences, before this call). Returns the new session number.
    public func start(uid: String?, locale: String?, file: String?) throws -> [String: Any] {
        let availability = Self.availability(locale: locale)
        if availability["available"] as? Bool != true {
            // A test file needs no input device.
            let reason = availability["reason"] as? String
            if !(file != nil && reason == "no_input_device") {
                throw CUError(reason ?? "dictation_unavailable", "Dictation is unavailable: \(reason ?? "unknown").")
            }
        }
        if SFSpeechRecognizer.authorizationStatus() == .notDetermined {
            let answered = DispatchSemaphore(value: 0)
            SFSpeechRecognizer.requestAuthorization { _ in answered.signal() }
            _ = answered.wait(timeout: .now() + 120)
        }
        guard SFSpeechRecognizer.authorizationStatus() == .authorized else {
            throw CUError("speech_recognition_denied", "Speech recognition is not allowed for this app.")
        }
        if WatchRecordVoiceover.shared.isActive { throw CUError("microphone_busy", "Screen-recording narration is using the microphone.") }
        guard let recognizer = Self.recognizer(for: locale), recognizer.supportsOnDeviceRecognition else {
            throw CUError("no_on_device_recognition", "No on-device speech recognizer for \(locale ?? "this language").")
        }
        lock.lock(); defer { lock.unlock() }
        if state == "recording" || state == "finishing" { throw CUError("already_active", "Dictation is already running.") }
        session += 1
        committed = []; partial = ""; level = 0; failures = 0; errorCode = nil; errorDetail = nil
        let language = recognizer.locale.language.languageCode?.identifier ?? ""
        separator = ["zh", "ja", "ko", "yue", "th"].contains(language) ? "" : " "
        recognizer.queue = queue
        self.recognizer = recognizer
        state = "recording"
        startTaskLocked()
        do {
            if let file { try feedFileLocked(path: file) } else { try startEngineLocked(uid: uid) }
        } catch {
            task?.cancel(); task = nil; request = nil; self.recognizer = nil
            state = "idle"
            throw error
        }
        return ["session": session, "locale": recognizer.locale.identifier]
    }

    /// Stop listening: the audio ends, the recognizer finishes what it heard (finishing), then idle with the final text.
    public func stop() {
        lock.lock()
        guard state == "recording" else { lock.unlock(); return }
        state = "finishing"
        request?.endAudio()
        stopEngineLocked()
        let gen = session
        lock.unlock()
        // The final result normally lands well within this; close the session either way.
        DispatchQueue.global().asyncAfter(deadline: .now() + 2.5) { [weak self] in
            guard let self else { return }
            self.lock.lock(); defer { self.lock.unlock() }
            if self.session == gen && self.state == "finishing" { self.finishLocked() }
        }
    }

    /// Drop the session at once (the composer went away): no final result is waited for.
    public func cancel() {
        lock.lock(); defer { lock.unlock() }
        guard state == "recording" || state == "finishing" else { return }
        request?.endAudio()
        stopEngineLocked()
        finishLocked()
    }

    /// The session as it stands; nothing is consumed (the text is the whole transcript so far).
    public func drain() -> [String: Any] {
        lock.lock(); defer { lock.unlock() }
        var result: [String: Any] = ["state": state, "session": session, "text": textLocked(), "level": level]
        if let errorCode { result["error"] = errorCode }
        if let errorDetail { result["errorDetail"] = errorDetail }
        return result
    }

    // MARK: - recognition

    private func textLocked() -> String {
        (committed + (partial.isEmpty ? [] : [partial])).joined(separator: separator)
    }

    private func finishLocked() {
        if !partial.isEmpty { committed.append(partial); partial = "" }
        task?.cancel(); task = nil; request = nil; recognizer = nil
        feeding = false
        level = 0
        if state != "error" { state = "idle" }
    }

    private func startTaskLocked() {
        guard let recognizer else { return }
        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        request.requiresOnDeviceRecognition = true
        request.taskHint = .dictation
        if #available(macOS 13, *) { request.addsPunctuation = true }
        self.request = request
        let gen = session
        task = recognizer.recognitionTask(with: request) { [weak self] result, error in
            guard let self else { return }
            self.lock.lock(); defer { self.lock.unlock() }
            guard self.session == gen, self.state == "recording" || self.state == "finishing" else { return }
            if let result {
                self.partial = result.bestTranscription.formattedString
                if result.isFinal {
                    if !self.partial.isEmpty { self.committed.append(self.partial) }
                    self.partial = ""
                    // A final result while still recording (a long pause, or the recognizer's own limit): keep
                    // listening with a new task. While finishing it is the last one.
                    if self.state == "recording" { self.startTaskLocked() } else { self.finishLocked() }
                }
            } else if let error {
                let ns = error as NSError
                self.errorDetail = "\(ns.domain) \(ns.code): \(ns.localizedDescription)"
                // "Siri and Dictation are disabled": macOS serves on-device recognition only while the system's own
                // Dictation (System Settings › Keyboard) is on. Retrying cannot help; say so at once.
                if ns.domain == "kLSRErrorDomain" && ns.code == 201 {
                    self.state = "error"
                    self.errorCode = "dictation_disabled"
                    self.request?.endAudio()
                    self.stopEngineLocked()
                    self.finishLocked()
                    return
                }
                if !self.partial.isEmpty { self.committed.append(self.partial); self.partial = "" }
                if self.state == "finishing" { self.finishLocked(); return }
                // "No speech detected" and the like end a task mid-session: start another, a few times.
                self.failures += 1
                if self.failures <= 3 { self.startTaskLocked() } else {
                    self.state = "error"
                    self.errorCode = "recognition_failed"
                    self.request?.endAudio()
                    self.stopEngineLocked()
                    self.finishLocked()
                }
            }
        }
    }

    // MARK: - audio

    private func startEngineLocked(uid: String?) throws {
        let engine = AVAudioEngine()
        let input = engine.inputNode
        if let uid, !uid.isEmpty, let device = WatchRecordVoiceover.deviceId(forUID: uid), let unit = input.audioUnit {
            var id = device
            AudioUnitSetProperty(unit, kAudioOutputUnitProperty_CurrentDevice, kAudioUnitScope_Global, 0, &id, UInt32(MemoryLayout<AudioDeviceID>.size))
        }
        let format = input.outputFormat(forBus: 0)
        guard format.sampleRate > 0, format.channelCount > 0 else { throw CUError("no_input_format", "Dictation: the microphone has no usable input format.") }
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
            guard let self else { return }
            let rms = WatchRecordVoiceover.rms(buffer)
            self.lock.lock(); defer { self.lock.unlock() }
            guard self.state == "recording" else { return }
            self.request?.append(buffer)
            self.level = max(0, min(1, (20 * log10(max(rms, 1e-7)) + 50) / 50))
        }
        engine.prepare()
        do { try engine.start() } catch {
            input.removeTap(onBus: 0)
            throw CUError("engine_failed", "Dictation: the microphone did not start: \(error.localizedDescription)")
        }
        self.engine = engine
    }

    private func stopEngineLocked() {
        feeding = false
        guard let engine else { return }
        engine.inputNode.removeTap(onBus: 0)
        engine.stop()
        self.engine = nil
    }

    /// Tests: the file's audio in 100 ms buffers at real-time pace, then the audio ends as stop() would end it.
    private func feedFileLocked(path: String) throws {
        let file: AVAudioFile
        do { file = try AVAudioFile(forReading: URL(fileURLWithPath: path)) } catch {
            throw CUError("invalid_params", "Dictation: cannot read \(path): \(error.localizedDescription)")
        }
        feeding = true
        let gen = session
        DispatchQueue.global().async { [weak self] in
            let format = file.processingFormat
            let frames = AVAudioFrameCount(max(1, format.sampleRate / 10))
            while true {
                guard let self else { return }
                guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frames) else { break }
                do { try file.read(into: buffer, frameCount: frames) } catch { break }
                if buffer.frameLength == 0 { break }
                self.lock.lock()
                let live = self.session == gen && self.feeding && self.state == "recording"
                if live { self.request?.append(buffer); self.level = max(0, min(1, (20 * log10(max(WatchRecordVoiceover.rms(buffer), 1e-7)) + 50) / 50)) }
                self.lock.unlock()
                if !live { return }
                Thread.sleep(forTimeInterval: Double(buffer.frameLength) / format.sampleRate)
            }
        }
    }
}
