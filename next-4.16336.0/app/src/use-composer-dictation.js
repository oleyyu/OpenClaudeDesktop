// Composer dictation, React side: the state the Dictate button (source-composer-dictation.jsx) renders and the actions
// it takes, over the main process's desktop:call "dictation" (electron/dictation.cjs → on-device SFSpeechRecognizer).
// It plays the part of the official dictation store (shared-2 `_`: status idle | connecting | recording | finishing |
// error, holdToRecordEnabled, the picked microphone) and of cc43287c9's lv hook + yee (the live transcript written into
// the editor with the user's mid-recording edits kept: the editor's beginDictation run, source-composer-editor.jsx).
//
// While a session runs the hook polls the state every POLL_MS; the transcript is the session's whole text so far, and
// the editor run replaces itself with it. A refusal opens the mic-guidance popover with the main process's reason.
import { useCallback, useEffect, useRef, useState } from "react";
import { getLocale } from "../electron/i18n/index.mjs";
import { DICTATION_LANGUAGES, ERROR_RESET_MS, POLL_MS, dictationLocale, disablesDictation, readDictationPrefs, unspacedLocale, writeDictationPrefs } from "./composer-dictation-model.mjs";

const storage = () => { try { return window.localStorage; } catch { return null; } };
const desktopCall = (params) => window.desktop?.call?.("dictation", params) ?? Promise.reject(Object.assign(new Error("No desktop bridge"), { code: "native_unavailable" }));
const errorCode = (error) => error?.code || /\b(microphone_denied|speech_recognition_denied|no_on_device_recognition|no_input_device|microphone_busy|already_active|engine_failed|no_input_format|no_speech_usage_description|no_microphone_usage_description)\b/.exec(String(error?.message ?? ""))?.[1] || "start_failed";

/**
 * @param {object} options
 * @param {{current: (HTMLElement & {beginDictation?: Function}) | null}} options.editorRef the composer's editor element
 * @param {boolean} [options.enabled] false hides the button (another surface, a disabled composer)
 * @param {(params: object) => Promise<any>} [options.call] desktop:call "dictation" (tests swap it)
 */
export function useComposerDictation({ editorRef, enabled = true, call = desktopCall }) {
  const [prefs, setPrefs] = useState(() => readDictationPrefs(storage()));
  const [availability, setAvailability] = useState(null);
  const [status, setStatus] = useState("idle");
  const [guidance, setGuidance] = useState(null); // { reason } while the mic-guidance popover is open
  const run = useRef(null); // the editor's dictation run
  const session = useRef(null);
  const poll = useRef(null);
  const statusRef = useRef("idle");
  const mounted = useRef(true);
  const locale = dictationLocale(prefs.language, getLocale());

  const setBoth = useCallback((next) => { statusRef.current = next; if (mounted.current) setStatus(next); }, []);
  const refresh = useCallback(() => {
    if (!enabled) return;
    call({ op: "availability", locale }).then((next) => { if (mounted.current) setAvailability(next ?? null); }, () => {});
  }, [call, enabled, locale]);

  useEffect(() => { refresh(); }, [refresh]);
  // Permissions and devices change outside the app (System Settings, a USB microphone): look again on focus.
  useEffect(() => {
    if (!enabled) return undefined;
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [enabled, refresh]);

  const finish = useCallback((next, reason = null) => {
    clearInterval(poll.current); poll.current = null;
    run.current?.end(); run.current = null;
    session.current = null;
    setBoth(next);
    if (reason && mounted.current) setGuidance({ reason });
  }, [setBoth]);

  const tick = useCallback(async () => {
    let state;
    try { state = await call({ op: "state" }); } catch { finish("error"); return; }
    if (!state || (session.current !== null && state.session !== session.current)) return;
    if (typeof state.text === "string" && state.text) {
      if (!run.current) run.current = editorRef.current?.beginDictation?.({ unspaced: unspacedLocale(locale) }) ?? null;
      run.current?.update(state.text);
    }
    if (state.state === "recording" && statusRef.current === "connecting") setBoth("recording");
    if (state.state === "idle") finish("idle");
    else if (state.state === "error") finish("error", state.error === "recognition_failed" ? "start_failed" : state.error ?? null);
  }, [call, editorRef, finish, locale, setBoth]);

  const start = useCallback(async () => {
    if (statusRef.current !== "idle" && statusRef.current !== "error") return;
    setGuidance(null);
    setBoth("connecting");
    let started;
    try { started = await call({ op: "start", locale, ...(prefs.deviceUid ? { uid: prefs.deviceUid } : {}) }); }
    catch (error) {
      const code = errorCode(error);
      setBoth("idle");
      if (code !== "already_active" && mounted.current) setGuidance({ reason: code });
      refresh();
      return;
    }
    if (!mounted.current) { call({ op: "cancel" }).catch(() => {}); return; }
    session.current = started?.session ?? null;
    // The run is anchored where the caret is now, not where it is when the first words arrive.
    run.current?.end();
    run.current = editorRef.current?.beginDictation?.({ unspaced: unspacedLocale(locale) }) ?? null;
    // The stop that came while connecting (a released push-to-talk) is honoured now.
    if (statusRef.current === "stopping") { setBoth("finishing"); call({ op: "stop" }).catch(() => {}); }
    else setBoth("recording");
    clearInterval(poll.current);
    poll.current = setInterval(tick, POLL_MS);
  }, [call, editorRef, locale, prefs.deviceUid, refresh, setBoth, tick]);

  const stop = useCallback(() => {
    const current = statusRef.current;
    if (current === "connecting") { statusRef.current = "stopping"; return; }
    if (current !== "recording") return;
    setBoth("finishing");
    call({ op: "stop" }).catch(() => finish("idle"));
  }, [call, finish, setBoth]);

  // mS: an error state clears after ERROR_RESET_MS.
  useEffect(() => {
    if (status !== "error") return undefined;
    const timer = setTimeout(() => setBoth("idle"), ERROR_RESET_MS);
    return () => clearTimeout(timer);
  }, [setBoth, status]);

  // The composer goes away (session switch, window close): drop the session at once.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearInterval(poll.current); poll.current = null;
      run.current?.end(); run.current = null;
      if (statusRef.current !== "idle" && statusRef.current !== "error") call({ op: "cancel" }).catch(() => {});
    };
  }, [call]);

  const updatePrefs = useCallback((patch) => {
    setPrefs((current) => { const next = { ...current, ...patch }; writeDictationPrefs(storage(), next); return next; });
  }, []);

  const shown = enabled && availability !== null;
  return {
    shown,
    status: status === "stopping" ? "connecting" : status,
    disabledReason: shown && !availability.available && disablesDictation(availability.reason) ? availability.reason : null,
    devices: availability?.devices ?? [],
    deviceUid: prefs.deviceUid,
    language: prefs.language,
    languages: DICTATION_LANGUAGES,
    locale,
    holdToRecord: prefs.holdToRecord,
    guidance,
    start, stop,
    closeGuidance: () => setGuidance(null),
    openSettings: (pane) => { setGuidance(null); call({ op: "open-settings", pane }).catch(() => {}); },
    selectDevice: (uid) => updatePrefs({ deviceUid: uid }),
    selectLanguage: (language) => updatePrefs({ language: language ?? null }),
    setHoldToRecord: (holdToRecord) => updatePrefs({ holdToRecord }),
  };
}
