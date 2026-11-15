// Composer dictation, main process: the desktop:call "dictation" action over computer_use.node's on-device recognizer
// (native/computer-use Dictation.swift). The official chin's Dictate button (c47a58ae1 mS) streams the microphone to
// claude.ai's speech_to_text service; this build transcribes on the Mac with SFSpeechRecognizer instead, so no audio
// leaves the computer and no account is needed.
//
// Ops (p.op):
//   availability {locale?}  → {available, reason, authorization, microphone, locale, devices[{uid, name}]}
//   start {locale?, uid?}   → {session, locale}: asks for the microphone first (systemPreferences, as watch-record does),
//                              then native start (which asks for speech recognition the first time). One session app-wide;
//                              its owner is the sender's webContents, and the session is dropped when that one goes away.
//   state                   → {state: idle|recording|finishing|error, session, text, level, error?} (the renderer polls)
//   stop / cancel           → stop listening and let the recognizer finish / drop the session at once
//   open-settings {pane}    → System Settings › Privacy & Security › Microphone | Speech Recognition, or Keyboard (Dictation)
// Errors carry `code` (the native refusal or microphone_denied) so the renderer can say what is missing.
"use strict";

const SETTINGS_PANES = Object.freeze({
  microphone: "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone",
  speech: "x-apple.systempreferences:com.apple.preference.security?Privacy_SpeechRecognition",
  // macOS serves on-device speech recognition only while the system's Dictation is on (Keyboard › Dictation).
  dictation: "x-apple.systempreferences:com.apple.Keyboard-Settings.extension",
});

function coded(code, message) {
  const error = new Error(message || code);
  error.code = code;
  return error;
}

const localeParam = (value) => (typeof value === "string" && /^[A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8}){0,3}$/.test(value) ? value : undefined);
const uidParam = (value) => (typeof value === "string" && value.length > 0 && value.length <= 512 ? value : undefined);

function createDictation({ native, systemPreferences, openExternal = async () => {}, platform = process.platform, testAudioFile = null }) {
  let owner = null; // webContents of the session's composer
  let ownerGone = null;

  const microphoneStatus = () => {
    try { return systemPreferences?.getMediaAccessStatus?.("microphone") ?? "unknown"; } catch { return "unknown"; }
  };
  const release = () => {
    if (owner && ownerGone) { try { owner.removeListener("destroyed", ownerGone); } catch {} }
    owner = null; ownerGone = null;
  };
  const claim = (sender) => {
    release();
    if (!sender || typeof sender.once !== "function") return;
    owner = sender;
    ownerGone = () => { owner = null; ownerGone = null; native.call("dictationCancel").catch(() => {}); };
    sender.once("destroyed", ownerGone);
  };

  async function availability(p) {
    if (platform !== "darwin") return { available: false, reason: "unsupported_platform", authorization: "unknown", microphone: "unknown", locale: localeParam(p.locale) ?? null, devices: [] };
    let result;
    try { result = await native.call("dictationAvailability", { locale: localeParam(p.locale) }); }
    catch (error) { return { available: false, reason: error.code || "native_unavailable", authorization: "unknown", microphone: microphoneStatus(), locale: localeParam(p.locale) ?? null, devices: [] }; }
    let devices = [];
    try { devices = (await native.call("dictationDevices"))?.devices ?? []; } catch {}
    const microphone = microphoneStatus();
    const reason = result?.reason ?? (microphone === "denied" || microphone === "restricted" ? "microphone_denied" : null);
    return { available: result?.available === true && !reason, reason, authorization: result?.authorization ?? "unknown", microphone,
      locale: result?.locale ?? localeParam(p.locale) ?? null, devices: Array.isArray(devices) ? devices.filter((d) => typeof d?.uid === "string") : [] };
  }

  async function start(p, sender) {
    if (platform !== "darwin") throw coded("unsupported_platform", "Dictation needs macOS.");
    // The microphone first: macOS asks once; a denial is final until System Settings changes it.
    let microphone = microphoneStatus();
    if (microphone === "not-determined") {
      const granted = await systemPreferences.askForMediaAccess("microphone").catch(() => false);
      microphone = granted ? "granted" : microphoneStatus();
    }
    if (microphone !== "granted" && !testAudioFile) throw coded("microphone_denied", "Microphone access is off for this app.");
    const result = await native.call("dictationStart", {
      locale: localeParam(p.locale), uid: uidParam(p.uid), ...(testAudioFile ? { file: testAudioFile } : {}),
    });
    claim(sender);
    return result;
  }

  async function call(p = {}, sender = null) {
    switch (p?.op) {
      case "availability": return availability(p);
      case "start": return start(p, sender);
      case "state": {
        const state = await native.call("dictationDrain");
        if (state?.state !== "recording" && state?.state !== "finishing") release();
        return state;
      }
      case "stop": await native.call("dictationStop"); return { stopped: true };
      case "cancel": release(); await native.call("dictationCancel"); return { cancelled: true };
      case "open-settings": {
        const url = SETTINGS_PANES[p.pane] ?? SETTINGS_PANES.microphone;
        await openExternal(url);
        return { opened: true };
      }
      default: throw new Error(`Unknown dictation op: ${String(p?.op)}`);
    }
  }

  return { call, dispose: () => { if (owner) native.call("dictationCancel").catch(() => {}); release(); } };
}

module.exports = { createDictation, SETTINGS_PANES };
