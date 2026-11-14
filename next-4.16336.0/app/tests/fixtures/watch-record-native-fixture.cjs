// Watch-record's recorder for the UI test (scripts/computer-use-watch-record-ui-test.mjs), loaded by main.cjs only when
// CODE_DESKTOP_WATCH_RECORD_FIXTURE=1. It answers the recorder's and the permissions dialog's native calls without
// touching the computer: no input tap, no screen capture, no microphone. Every other call goes to the real module.
//
//   probe                Screen Recording / Accessibility as CODE_DESKTOP_WATCH_RECORD_FIXTURE_TCC says ("denied" →
//                        both missing until requested; anything else → granted)
//   requestScreenCapture / requestAccessibility   grant that permission (no system prompt)
//   watchRecordStart … watchRecordDrain           a scripted demonstration: a click in "Fixture App", "hello" typed, Enter
//   watchRecordFrame     a 320×200 JPEG: a plain frame, then the same frame with a block that changed (a crop)
//   voiceover*           narration unavailable (the chooser and pill without the microphone)
'use strict';

function wrap(real, { nativeImage }) {
  const tcc = { screenCapture: process.env.CODE_DESKTOP_WATCH_RECORD_FIXTURE_TCC !== "denied", axTrusted: process.env.CODE_DESKTOP_WATCH_RECORD_FIXTURE_TCC !== "denied" };
  let startedAt = 0, recording = false, pending = [], frames = 0;
  const nowT = () => (startedAt ? Date.now() - startedAt : 0);
  const frame = (changed) => {
    const width = 320, height = 200, bitmap = Buffer.alloc(width * height * 4, 0xff);
    if (changed) {
      for (let y = 120; y < 180; y++) for (let x = 200; x < 300; x++) { const at = (y * width + x) * 4; bitmap[at] = 0x40; bitmap[at + 1] = 0x77; bitmap[at + 2] = 0xd9; }
    }
    return nativeImage.createFromBitmap(bitmap, { width, height }).toJPEG(75).toString("base64");
  };
  const script = (t) => [
    { kind: "leftMouseDown", t: t + 10, x: 40, y: 60, modifiers: 0 },
    { kind: "leftMouseUp", t: t + 60, x: 40, y: 60, modifiers: 0 },
    ...[..."hello"].map((chars, index) => ({ kind: "key", t: t + 200 + index * 40, keyCode: 0, chars, charsIgnoringModifiers: chars, modifiers: 0 })),
    { kind: "key", t: t + 500, keyCode: 36, chars: "\r", charsIgnoringModifiers: "\r", modifiers: 0 },
  ];
  const answers = {
    probe: async () => ({ ...(await real.call("probe").catch(() => ({}))), ...tcc }),
    requestScreenCapture: () => { tcc.screenCapture = true; return { granted: true }; },
    requestAccessibility: () => { tcc.axTrusted = true; return { granted: true }; },
    watchRecordStart: () => { startedAt = Date.now(); recording = true; frames = 0; pending = script(0); return { started: true }; },
    watchRecordStop: () => { const was = recording; recording = false; return { stopped: was }; },
    watchRecordDrain: () => { const events = pending; pending = []; return { events, nowT: nowT(), dropped: 0 }; },
    watchRecordClear: () => { pending = []; startedAt = 0; return { cleared: true }; },
    watchRecordNowT: () => ({ t: nowT() }),
    watchRecordFrame: () => ({ base64: frame(frames++ > 0), width: 320, height: 200, displayId: 1, displayWidth: 320, displayHeight: 200,
      frontmost: { bundleId: "local.fixture.app", appName: "Fixture App" } }),
    voiceoverAvailability: () => ({ available: false, reason: "fixture", authorization: "notDetermined", locale: "en_US" }),
    voiceoverDevices: () => ({ devices: [] }),
    voiceoverDrain: () => ({ narrations: [], micStates: [], active: false, previewing: false }),
  };
  return {
    fixture: true,
    async call(method, params = {}) {
      if (Object.hasOwn(answers, method)) return answers[method](params);
      if (method.startsWith("voiceover")) return {};
      return real.call(method, params);
    },
  };
}

module.exports = { wrap };
