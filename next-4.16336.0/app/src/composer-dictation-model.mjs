// Composer dictation, pure part (no React, no IPC): the languages the Dictation menu offers, which recognizer locale a
// pick means, the saved preferences, the copy of the official mic-guidance popover (shared-8 dL / uL / QI) for each
// refusal the main process reports (electron/dictation.cjs), and the button's label (c47a58ae1 mS `U`).
//
// Host differences from 4.16336.0: the official Language submenu (shared-8 TI) lists the languages claude.ai's
// speech_to_text service takes and "Auto" lets the service detect it; this build recognizes on the Mac
// (SFSpeechRecognizer), which needs one language up front, so "Auto" means the app's own UI language (zh-CN → Mandarin)
// rather than detection, and the list is the on-device languages. Refusals the official service never has (no speech
// recognition permission, no on-device model, a development build without the usage string) get their own copy.
import { t } from "../electron/i18n/index.mjs";

export const DICTATION_PREFS_KEY = "openclaude.dictation";
// mS: a press held this long is push-to-talk (released → stop); shorter is a tap (toggle).
export const HOLD_TO_RECORD_MS = 500;
// mS ke: an error state clears after this.
export const ERROR_RESET_MS = 1500;
export const POLL_MS = 120;

// Native names, as the official list and macOS show them.
export const DICTATION_LANGUAGES = Object.freeze([
  { value: "zh-CN", label: "中文（普通话）" },
  { value: "zh-TW", label: "中文（台灣）" },
  { value: "zh-HK", label: "粵語（香港）" },
  { value: "en-US", label: "English (United States)" },
  { value: "en-GB", label: "English (United Kingdom)" },
  { value: "ja-JP", label: "日本語" },
  { value: "ko-KR", label: "한국어" },
  { value: "fr-FR", label: "Français" },
  { value: "de-DE", label: "Deutsch" },
  { value: "es-ES", label: "Español" },
]);

/** The recognizer locale for a pick: the pick itself, else (Auto) the app's UI language's closest entry. */
export function dictationLocale(pick, appLocale = "en-US") {
  if (typeof pick === "string" && DICTATION_LANGUAGES.some((entry) => entry.value === pick)) return pick;
  const app = typeof appLocale === "string" ? appLocale : "";
  if (/^zh(-Hans|-CN|$)/i.test(app)) return "zh-CN";
  if (/^zh-(Hant|TW)/i.test(app)) return "zh-TW";
  if (/^zh-HK/i.test(app)) return "zh-HK";
  const exact = DICTATION_LANGUAGES.find((entry) => entry.value.toLowerCase() === app.toLowerCase());
  if (exact) return exact.value;
  const language = app.split(/[-_]/)[0].toLowerCase();
  return DICTATION_LANGUAGES.find((entry) => entry.value.split("-")[0] === language)?.value ?? "en-US";
}

/** Languages written without spaces between words: a dictated run joins the text before it with no space. */
export const unspacedLocale = (locale) => /^(zh|ja|ko|yue|th)\b/i.test(String(locale ?? ""));

/** Saved preferences: { language: locale | null (Auto), deviceUid: string | null (system default), holdToRecord }. */
export function readDictationPrefs(storage) {
  let raw = null;
  try { raw = JSON.parse(storage?.getItem?.(DICTATION_PREFS_KEY) ?? "null"); } catch {}
  const language = typeof raw?.language === "string" && DICTATION_LANGUAGES.some((entry) => entry.value === raw.language) ? raw.language : null;
  const deviceUid = typeof raw?.deviceUid === "string" && raw.deviceUid ? raw.deviceUid : null;
  return { language, deviceUid, holdToRecord: raw?.holdToRecord !== false };
}
export function writeDictationPrefs(storage, prefs) {
  try { storage?.setItem?.(DICTATION_PREFS_KEY, JSON.stringify({ language: prefs.language ?? null, deviceUid: prefs.deviceUid ?? null, holdToRecord: prefs.holdToRecord !== false })); } catch {}
}

/** The Language submenu's hint: the picked language's label, or Auto. */
export const languageHint = (pick) => DICTATION_LANGUAGES.find((entry) => entry.value === pick)?.label ?? t("Auto");

// Refusals that a click cannot fix (the build or the Mac lacks something): the button is disabled with this reason
// (official `dictationDisabledReason`). Everything else is tried on click and explained in the guidance popover.
const DISABLING = new Set(["no_microphone_usage_description", "no_speech_usage_description", "native_unavailable", "unsupported_platform", "no_recognizer"]);
export const disablesDictation = (reason) => DISABLING.has(reason);

export function disabledReasonText(reason) {
  switch (reason) {
    case "no_microphone_usage_description":
    case "no_speech_usage_description": return t("Dictation isn’t available in this build of the app");
    case "unsupported_platform": return t("Dictation needs macOS");
    case "no_recognizer": return t("Speech recognition isn’t available on this Mac");
    default: return t("Dictation isn’t available");
  }
}

/**
 * The mic-guidance popover for a refusal: { title, body, settings: 'microphone' | 'speech' | null } (dL: the Open System
 * Settings button only where System Settings fixes it). Unknown codes read as "couldn't start".
 */
export function guidanceFor(reason, { languageLabel } = {}) {
  switch (reason) {
    case "microphone_denied":
      return { title: t("Microphone access is blocked"), body: t("To use dictation, open System Settings, go to Privacy and Security, select Microphone, and turn on OpenClaude Desktop."), settings: "microphone" };
    case "speech_recognition_denied":
      return { title: t("Speech recognition is blocked"), body: t("To use dictation, open System Settings, go to Privacy and Security, select Speech Recognition, and turn on OpenClaude Desktop."), settings: "speech" };
    case "dictation_disabled":
      return { title: t("Turn on Dictation in System Settings"), body: t("macOS recognizes speech on this Mac only while its own Dictation is on. Open System Settings, go to Keyboard, and turn on Dictation."), settings: "dictation" };
    case "no_input_device":
    case "no_microphone":
      return { title: t("No microphone found"), body: t("Connect a microphone, then try again."), settings: null };
    case "microphone_busy":
    case "engine_failed":
    case "no_input_format":
      return { title: t("Your microphone isn’t available"), body: t("Another app or a system setting may be blocking it. Close other apps that use the microphone, then try again in a few seconds."), settings: null };
    case "no_on_device_recognition":
      return { title: t("{language} isn’t available for dictation", { language: languageLabel ?? t("This language") }),
        body: t("This Mac has no on-device speech model for it. Add the language in System Settings › Keyboard › Dictation, or pick another language."), settings: null };
    default:
      return { title: t("Dictation couldn’t start"), body: t("It failed several times in a row. Wait a moment, then try again."), settings: null };
  }
}

/** mS `U`: the button's accessible label and tooltip. */
export function dictationButtonLabel({ status, holdToRecord }) {
  if (status === "finishing") return t("Finishing dictation…");
  if (status === "recording" || status === "connecting") return t("Stop dictation");
  if (holdToRecord) return t("Press and hold to record");
  return t("Dictate");
}

/** The microphone group's rows: named devices only (mS Pe drops an unnamed 'default'), the system default first checked. */
export function microphoneRows(devices, pickedUid) {
  const rows = (Array.isArray(devices) ? devices : []).filter((device) => typeof device?.uid === "string" && device.uid && (device.name || device.uid !== "default"));
  const checked = rows.some((row) => row.uid === pickedUid) ? pickedUid : rows[0]?.uid ?? null;
  return rows.map((row) => ({ uid: row.uid, label: row.name || row.uid, checked: row.uid === checked }));
}
