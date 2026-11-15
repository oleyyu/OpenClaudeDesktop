// A scripted stand-in for computer_use.node's dictation calls (electron/dictation.cjs), for the composer UI test: no
// microphone, no recognizer. The transcript grows by one phrase every `step` ms while recording; stop finishes after
// 300 ms. CODE_DESKTOP_DICTATION_FIXTURE_REASON=<code> makes availability report that reason (the disabled button);
// CODE_DESKTOP_DICTATION_FIXTURE_RUN_ERROR=<code> makes a started session fail with that code (as dictation_disabled does).
"use strict";

const PHRASES = ["今天", "今天天气不错", "今天天气不错，我们去公园", "今天天气不错，我们去公园散步吧。"];

function createFixture({ step = 250, reason = process.env.CODE_DESKTOP_DICTATION_FIXTURE_REASON || null, runError = process.env.CODE_DESKTOP_DICTATION_FIXTURE_RUN_ERROR || null } = {}) {
  let state = "idle", session = 0, startedAt = 0, frozen = null, timer = null;
  const text = () => {
    if (frozen !== null) return frozen;
    if (state !== "recording") return "";
    const index = Math.min(PHRASES.length - 1, Math.floor((Date.now() - startedAt) / step));
    return PHRASES[index];
  };
  const calls = [];
  const methods = {
    dictationAvailability: (p) => ({ available: !reason, reason, authorization: reason ? "notDetermined" : "authorized", locale: p.locale ?? "zh-CN" }),
    dictationDevices: () => ({ devices: [{ uid: "BuiltInMicrophoneDevice", name: "MacBook Pro Microphone" }, { uid: "usb-mic", name: "USB Microphone" }] }),
    dictationStart: (p) => {
      if (reason) { const error = new Error(reason); error.code = reason; throw error; }
      if (state === "recording" || state === "finishing") { const error = new Error("already"); error.code = "already_active"; throw error; }
      session += 1; state = "recording"; startedAt = Date.now(); frozen = null;
      if (runError) { state = "error"; frozen = ""; }
      return { session, locale: p.locale ?? "zh-CN" };
    },
    dictationStop: () => {
      if (state !== "recording") return { stopped: true };
      frozen = text(); state = "finishing";
      clearTimeout(timer);
      timer = setTimeout(() => { state = "idle"; }, 300);
      return { stopped: true };
    },
    dictationCancel: () => { clearTimeout(timer); if (state === "recording") frozen = text(); state = "idle"; return { cancelled: true }; },
    dictationDrain: () => ({ state, session, text: text(), level: state === "recording" ? 0.4 : 0, ...(state === "error" && runError ? { error: runError } : {}) }),
  };
  return {
    calls,
    available: () => true,
    async call(method, params = {}) {
      calls.push({ method, params });
      const handler = methods[method];
      if (!handler) { const error = new Error(`fixture: ${method}`); error.code = "not_supported_in_build"; throw error; }
      return handler(params);
    },
  };
}

module.exports = { createFixture, PHRASES };
