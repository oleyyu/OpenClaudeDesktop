// The clipboard for computer use, as the official 2.42304.0 build handles it (docs/computer-use-official-spec-20261021.md
// §1.5): the text read_clipboard / write_clipboard read and write, the clipboard guard (official ot(): while a
// click-tier app — a terminal or an IDE — is in front, the clipboard is put aside and emptied so its Paste can't be used
// to inject text, and put back once a different app is in front or the turn ends), and the paste path of the
// screen-wide type (official DPr(): save the text that was there, write the new text and read it back, press ⌘V, wait
// 100 ms, and always put the old text back).
//
// `clipboard` is {readText(), writeText(text)} (main.cjs: Electron's clipboard, as the official rPr). Only text is
// saved and put back, as in the official build: an image or rich text on the clipboard comes back as its plain text.
// Nothing here logs what the clipboard holds.

// Official vlr sub-gates that concern the clipboard (both default on).
const CLIPBOARD_SUB_GATES = Object.freeze({ clipboardPasteMultiline: true, clipboardGuard: true });
// Official DPr(): how long the app gets to read the clipboard after ⌘V before the old text goes back.
const PASTE_SETTLE_MS = 100;
// Official EPr on macOS: ["command", "v"].
const PASTE_CHORD = Object.freeze({ modifiers: ["cmd"], keys: ["v"] });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** @param {{clipboard?: {readText: Function, writeText: Function} | null, log?: object, wait?: (ms: number) => Promise<void>}} [options] */
function createClipboard({ clipboard = null, log = console, wait = sleep } = {}) {
  const stashes = new Map();   // sessionId → the text put aside by the guard
  const available = () => !!clipboard && typeof clipboard.readText === "function" && typeof clipboard.writeText === "function";
  const readText = async () => { const value = await clipboard.readText(); return typeof value === "string" ? value : String(value ?? ""); };
  const writeText = async (text) => { await clipboard.writeText(text); };
  const api = {
    available,
    readText,
    writeText,
    /**
     * Official ot(): with a click-tier app in front, put the clipboard aside once (the first time) and empty it; with
     * any other app in front, put back what was put aside. Failures are swallowed, as in the official build.
     */
    async guard(sessionId, clickTierInFront) {
      if (!available()) return;
      if (!clickTierInFront) {
        if (!stashes.has(sessionId)) return;
        try { await writeText(stashes.get(sessionId)); stashes.delete(sessionId); } catch {}
        return;
      }
      if (!stashes.has(sessionId)) {
        try { stashes.set(sessionId, await readText()); } catch { stashes.set(sessionId, ""); }
      }
      try { await writeText(""); } catch {}
    },
    /** The turn ended (official CB6cNSrW onResult): whatever the guard still holds goes back. */
    async restoreStash(sessionId) { await api.guard(sessionId, false); },
    hasStash: (sessionId) => stashes.has(sessionId),
    /**
     * Official DPr(): paste `text` with `press` (the ⌘V keystroke; returns the native result). The old text is read
     * first (a failed read only means it can't be put back), the new text must read back exactly, and the old text is
     * always written back afterwards. Returns the press's result, or a refusal when the clipboard itself failed
     * (nothing was pressed then).
     */
    async paste(text, press) {
      let old;
      try { old = await readText(); } catch { log.debug?.("[computer-use] Clipboard read before paste failed; proceeding without restore"); }
      try {
        try { await writeText(text); } catch {
          return { outcome: "unsupported", reasonCode: "clipboard_write_failed", delivered: false, message: "The clipboard couldn't be written." };
        }
        let back;
        try { back = await readText(); } catch { back = undefined; }
        if (back !== text) return { outcome: "unsupported", reasonCode: "clipboard_round_trip_failed", delivered: false, message: "Clipboard write did not round-trip." };
        const pressed = await press();
        if (pressed?.delivered === true || pressed?.outcome === "ok") await wait(PASTE_SETTLE_MS);
        return pressed;
      } finally {
        if (typeof old === "string") {
          try { await writeText(old); } catch { log.debug?.("[computer-use] Clipboard restore after paste failed"); }
        }
      }
    },
  };
  return api;
}

module.exports = { createClipboard, CLIPBOARD_SUB_GATES, PASTE_SETTLE_MS, PASTE_CHORD };
