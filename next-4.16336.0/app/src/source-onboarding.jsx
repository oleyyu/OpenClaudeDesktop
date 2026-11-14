// First-run setup, laid out like the original desktop sign-in (ion-dist c632c9594 Ad welcome / jd sign-in,
// c19c934c8 Rt shell, c029a409d vr card; work/onboarding-reference/NOTES.md): a welcome screen, then a card
// that connects a model. Quick setup fills an official endpoint (prefs/provider-presets.mjs); everything stays
// editable, and Advanced setup exposes the protocol, provider id and extra model ids. DeepSeek is saved as the
// core's own connection, any other vendor as a custom provider (model-settings.cjs connection-save /
// provider-save); "Test and continue" first sends one 1-token request the way the core will.
import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SourceSpark } from "./source-spark.jsx";
import { Icon } from "./icons";
import { SourceSettingsButton } from "./source-settings-button.jsx";
import { SourceSelect } from "./source-select.jsx";
import { cleanErrorReason } from "./action-error-model.mjs";
import { useExtensionImport } from "./source-extension-import.jsx";
import { allCores, registerCores } from "../electron/core-registry.mjs";
import { SourceBrandLogo } from "./source-brand-logo.jsx";
import { PRESETS, presetById, presetDisplayName, presetRoute } from "../electron/prefs/provider-presets.mjs";
import { modelDisplayName } from "../electron/prefs/model-families.mjs";
import { OFFICIAL_BASE_URL, PROVIDER_PROTOCOLS } from "../electron/prefs/model-settings.mjs";
import { t } from "../electron/i18n/index.mjs";
import "./source-onboarding.css";

const PROTOCOL_LABELS = { "anthropic-messages": "Anthropic Messages", "openai-completions": "OpenAI Chat Completions", "openai-responses": "OpenAI Responses" };

function formFor(preset, variant = preset.variants[0]) {
  return {
    preset: preset.id, variant: variant.id, baseURL: variant.baseURL, api: preset.api,
    model: preset.models[0] || "", route: presetRoute(preset, variant) || "", displayName: presetDisplayName(preset, variant), extraModels: "", contextWindow: "",
  };
}

function ConnectCard({ desktopCall, onDone, onBack, onOpenExternal }) {
  const [form, setForm] = useState(() => formFor(PRESETS[0]));
  const [apiKey, setApiKey] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [fetched, setFetched] = useState(null), [fetching, setFetching] = useState(false);
  const [busy, setBusy] = useState(""), [error, setError] = useState("");
  const keyRef = useRef(null), ids = { base: useId(), key: useId(), model: useId(), note: useId() };
  const preset = presetById(form.preset), variant = preset.variants.find(entry => entry.id === form.variant) ?? preset.variants[0];
  const suggestions = useMemo(() => [...new Set([...(fetched ?? []), ...preset.models])].slice(0, 40), [fetched, preset]);
  const set = (patch) => { setForm(current => ({ ...current, ...patch })); setError(""); };
  const choosePreset = (next) => { setForm(formFor(next)); setFetched(null); setError(""); keyRef.current?.focus(); };
  const chooseVariant = (id) => {
    const next = preset.variants.find(entry => entry.id === id);
    if (next) set({ variant: id, baseURL: next.baseURL, route: presetRoute(preset, next) || form.route, displayName: presetDisplayName(preset, next) });
  };
  const call = (op, extra = {}) => Promise.resolve(desktopCall("model-settings", { op, api: form.api, baseURL: form.baseURL, apiKey, ...extra }));

  const fetchModels = async () => {
    setFetching(true); setError("");
    try { const result = await call("provider-models"); setFetched(result.models); if (!form.model && result.models[0]) set({ model: result.models[0] }); }
    catch (failure) { setError(cleanErrorReason(failure?.message || String(failure))); }
    finally { setFetching(false); }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    const model = form.model.trim();
    if (!form.baseURL.trim()) { setError(t("Enter the API base URL.")); return; }
    if (!apiKey.trim()) { setError(t("Enter the API key.")); keyRef.current?.focus(); return; }
    if (!model) { setError(t("Choose a model.")); return; }
    setError("");
    // The stage that failed, for the message (state is stale inside this handler).
    let stage = "test";
    try {
      setBusy("test");
      await call("provider-test", { model });
      stage = "save";
      setBusy("save");
      if (preset.builtIn) {
        const official = form.baseURL.trim().replace(/\/+$/, "") === OFFICIAL_BASE_URL;
        await desktopCall("model-settings", official
          ? { op: "connection-save", connection: { mode: "official" }, officialKey: apiKey.trim() }
          : { op: "connection-save", connection: { mode: "relay", relayBaseURL: form.baseURL.trim() }, relayKey: apiKey.trim() });
      } else {
        const models = [...new Set([model, ...form.extraModels.split(/[\s,]+/), ...preset.models].map(id => id.trim()).filter(Boolean))];
        await desktopCall("model-settings", { op: "provider-save", apiKey: apiKey.trim(),
          provider: { route: form.route.trim() || presetRoute(preset, variant) || "custom", displayName: form.displayName.trim(), api: form.api, baseURL: form.baseURL.trim(), models,
            ...(form.contextWindow.trim() ? { contextWindows: { [model]: form.contextWindow.trim() } } : {}) } });
      }
      stage = "restart";
      setBusy("restart");
      await onDone({ model, route: preset.builtIn ? "deepseek" : form.route.trim() });
    } catch (failure) {
      const message = cleanErrorReason(failure?.message || String(failure));
      setError(stage === "test" ? t("Connection test failed: {message}", { message }) : message);
      setBusy("");
    }
  };

  const busyLabel = { test: t("Testing connection…"), save: t("Saving…"), restart: t("Starting the core…") }[busy];
  return (
    <form className="sob-card sob-connect" onSubmit={submit} noValidate aria-describedby={ids.note}>
      <div className="sob-section">
        <span className="sob-label">{t("Quick setup")}</span>
        <div className="sob-presets" role="radiogroup" aria-label={t("Quick setup")}>
          {PRESETS.map(entry => (
            <button key={entry.id} type="button" role="radio" aria-checked={entry.id === form.preset} className="sob-preset" data-preset={entry.id}
              onClick={() => choosePreset(entry)} disabled={!!busy}>
              <SourceBrandLogo brand={entry.brand} size={28} />
              <span className="sob-preset-copy">
                <span className="sob-preset-name">{entry.id === "custom" ? t("Custom") : entry.name}</span>
                <span className="sob-preset-vendor">{entry.id === "custom" ? t("Any endpoint") : entry.vendor ? t(entry.vendor) : t("Official API")}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="sob-connect-pane">
      {preset.variants.length > 1 && <div className="sob-field">
        <span className="sob-label">{t("Region or plan")}</span>
        <SourceSelect label={t("Region or plan")} value={form.variant} disabled={!!busy}
          items={preset.variants.map(entry => ({ value: entry.id, label: t(entry.label) }))} onChange={chooseVariant} />
      </div>}
      <label className="sob-field"><span className="sob-label" id={ids.base}>{t("API base URL")}</span>
        <input data-cds="TextInput" className="cds-input cds-reset" aria-labelledby={ids.base} value={form.baseURL} spellCheck={false} autoCapitalize="off" autoComplete="off"
          placeholder="https://api.example.com/anthropic" disabled={!!busy} onChange={event => set({ baseURL: event.target.value })} />
      </label>
      <div className="sob-field">
        <span className="sob-label-row"><label className="sob-label" htmlFor={ids.key}>{t("API key")}</label>
          {variant.keyUrl && <button type="button" className="sob-link" onClick={() => onOpenExternal(variant.keyUrl)}>{t("Get a key")} ↗</button>}</span>
        <input id={ids.key} ref={keyRef} type="password" data-cds="TextInput" className="cds-input cds-reset" value={apiKey} spellCheck={false} autoComplete="off"
          placeholder="sk-…" disabled={!!busy} onChange={event => { setApiKey(event.target.value); setError(""); }} />
      </div>
      <div className="sob-field">
        <span className="sob-label-row"><label className="sob-label" htmlFor={ids.model}>{t("Model")}</label>
          <button type="button" className="sob-link" disabled={fetching || !!busy || !apiKey.trim()} onClick={fetchModels}>{fetching ? t("Fetching…") : t("Fetch models")}</button></span>
        <input id={ids.model} data-cds="TextInput" className="cds-input cds-reset" value={form.model} spellCheck={false} autoCapitalize="off" autoComplete="off"
          placeholder={t("Model id")} disabled={!!busy} onChange={event => set({ model: event.target.value })} />
        {suggestions.length > 0 && <div className="sob-chips" role="listbox" aria-label={t("Suggested models")}>
          {suggestions.map(id => <button key={id} type="button" role="option" aria-selected={id === form.model} className="sob-chip" disabled={!!busy} onClick={() => set({ model: id })}>{id}</button>)}
        </div>}
      </div>
      <button type="button" className="sob-disclosure" aria-expanded={advanced} onClick={() => setAdvanced(value => !value)}>
        <span aria-hidden="true" className="sob-caret"><Icon name={advanced ? "CaretDown" : "CaretRight"} size={12} /></span>{t("Advanced setup")}
      </button>
      {advanced && <div className="sob-advanced">
        <div className="sob-field"><span className="sob-label">{t("Protocol")}</span>
          <SourceSelect label={t("Protocol")} value={form.api} disabled={!!busy || preset.builtIn}
            items={PROVIDER_PROTOCOLS.map(value => ({ value, label: PROTOCOL_LABELS[value] }))} onChange={value => set({ api: value })} />
        </div>
        {!preset.builtIn && <>
          {/* The model's context window, as Settings › Models › provider sets it per model: the core compacts by it. */}
          <label className="sob-field"><span className="sob-label">{t("Context window")}</span>
            <input data-cds="TextInput" className="cds-input cds-reset" value={form.contextWindow} maxLength={16} spellCheck={false} autoCapitalize="off" autoComplete="off"
              placeholder={t("Default (262K)")} disabled={!!busy} onChange={event => set({ contextWindow: event.target.value })} />
            <span className="sob-muted">{t("How many tokens {model} can read, such as 200K or 1M. Empty: the core assumes 262,144 and may compact too late for a smaller model.", { model: form.model.trim() ? modelDisplayName(form.model.trim()) : t("the model") })}</span>
          </label>
          <label className="sob-field"><span className="sob-label">{t("Provider id")}</span>
            <input data-cds="TextInput" className="cds-input cds-reset" value={form.route} maxLength={32} spellCheck={false} autoCapitalize="off" disabled={!!busy}
              onChange={event => set({ route: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} />
          </label>
          <label className="sob-field"><span className="sob-label">{t("Display name")}</span>
            <input data-cds="TextInput" className="cds-input cds-reset" value={form.displayName} maxLength={60} disabled={!!busy} onChange={event => set({ displayName: event.target.value })} />
          </label>
          <label className="sob-field"><span className="sob-label">{t("More model ids")}</span>
            <input data-cds="TextInput" className="cds-input cds-reset" value={form.extraModels} spellCheck={false} autoCapitalize="off" placeholder={t("Comma separated")} disabled={!!busy}
              onChange={event => set({ extraModels: event.target.value })} />
          </label>
        </>}
        <p className="sob-muted">{t("Model parameters, prices and more providers are in Settings › Models.")}</p>
      </div>}
      {preset.note && <p className="sob-muted">{t(preset.note)}</p>}
      {error && <p className="sob-error" role="alert">{error}</p>}
      <div className="sob-actions">
        <SourceSettingsButton type="submit" variant="primary" size="lg" className="sob-wide" busy={!!busy}>{busy ? busyLabel : t("Test and continue")}</SourceSettingsButton>
        <SourceSettingsButton variant="ghost" disabled={!!busy} onClick={onBack}>{t("Back")}</SourceSettingsButton>
      </div>
      <p id={ids.note} className="sob-legal">{t("Your key is stored encrypted on this Mac and only sent to the endpoint above. Testing sends one tiny request to it.")}</p>
      </div>
    </form>
  );
}

const megabytes = (bytes) => `${Math.max(1, Math.round(bytes / 1048576))} MB`;

// "Choose your agent": a grid of cards, one per core (core-registry.mjs, Settings › Cores) with its vendor's logo, a
// plain one-line description and what choosing it involves; cores still being adapted show as "Coming soon". An
// Extension Pack adds another card (the small import link, or a pack dropped anywhere on the step). DeepSeek Harness
// continues to Connect a model; any other core is downloaded if needed (size and source shown) and started.
function AgentCard({ desktopCall, onChooseDeepSeek, onCoreChosen, onBack, initial = null }) {
  const [state, setState] = useState(null), [chosen, setChosen] = useState(initial || "deepseek");
  const [busy, setBusy] = useState(""), [error, setError] = useState("");
  const call = useCallback((op, extra = {}) => Promise.resolve(desktopCall("cores", { op, ...extra })), [desktopCall]);
  const refresh = useCallback(() => call("list").then(setState, (failure) => setError(cleanErrorReason(failure?.message || String(failure)))), [call]);
  useEffect(() => { void refresh(); }, [refresh]);
  const downloading = !!state?.cores?.some((core) => core.download);
  useEffect(() => {
    if (!downloading) return undefined;
    const timer = setInterval(() => { void refresh(); }, 400);
    return () => clearInterval(timer);
  }, [downloading, refresh]);
  const importer = useExtensionImport({ desktopCall, layer: { base: 520, z: 520 }, onInstalled: (id, cores) => { registerCores(cores); setChosen(id); void refresh(); } });
  const cores = state?.cores ?? [];
  const soon = allCores().filter((entry) => entry.available === false && !cores.some((core) => core.id === entry.id));
  const core = cores.find((entry) => entry.id === chosen) ?? cores[0];
  const needsDownload = core && core.kind !== "builtin" && !core.installed && core.release;
  const proceed = async () => {
    if (!core || busy) return;
    setError("");
    if (core.id === "deepseek") { onChooseDeepSeek(); return; }
    try {
      if (needsDownload) { setBusy("download"); const pending = call("install", { id: core.id }); setTimeout(() => { void refresh(); }, 50); await pending; }
      setBusy("start");
      await onCoreChosen(core.id);
    } catch (failure) {
      setError(cleanErrorReason(failure?.message || String(failure)));
      setBusy("");
      void refresh();
    }
  };
  const status = (entry) => entry.download ? (entry.download.phase === "download" && entry.download.total ? t("Downloading… {done} of {total}", { done: megabytes(entry.download.received || 0), total: megabytes(entry.download.total) }) : t("Installing…"))
    : entry.kind === "builtin" ? t("Ready to use") : entry.installed ? t("Installed") : entry.release ? t("{size} download", { size: megabytes(entry.release.size || 0) }) : t("Not installed");
  const label = busy === "download" ? t("Downloading…") : busy === "start" ? t("Starting…")
    : needsDownload ? t("Download {name} and continue", { name: core.name }) : t("Continue with {name}", { name: core?.name ?? "" });
  return (
    <div className="sob-agents" {...importer.dropProps} data-dragging={importer.dragging || undefined}>
      <p className="sob-subtitle">{t("Pick the AI that writes code with you. You can switch any time in Settings.")}</p>
      <div className="sob-agent-list" role="radiogroup" aria-label={t("Agent")}>
        {state === null && <span className="sob-muted sob-agent-loading">{t("Loading…")}</span>}
        {cores.map((entry) => {
          const selected = entry.id === core?.id;
          return (
            <button key={entry.id} type="button" role="radio" aria-checked={selected} className="sob-agent" data-core={entry.id} disabled={!!busy}
              onClick={() => { setChosen(entry.id); setError(""); }}>
              <SourceBrandLogo brand={entry.brand} size={36} />
              <span className="sob-agent-copy">
                <span className="sob-agent-head"><span className="sob-agent-name">{entry.name}</span>
                  {entry.id === "deepseek" && <span className="sob-badge" data-tone="accent">{t("Recommended")}</span>}</span>
                <span className="sob-agent-tagline">{entry.tagline ? t(entry.tagline) : t(entry.models)}</span>
              </span>
              <span className="sob-agent-side">
                <span className="sob-agent-status" data-core-status={entry.id}>{status(entry)}</span>
                <span className="sob-radio" aria-hidden="true" />
              </span>
            </button>
          );
        })}
      </div>
      {soon.length > 0 && <div className="sob-soon" aria-label={t("Coming soon")}>
        <span className="sob-soon-label">{t("Coming soon")}</span>
        {soon.map((entry) => <span key={entry.id} className="sob-soon-chip" data-core-soon={entry.id} title={entry.tagline ? t(entry.tagline) : entry.name}>
          <SourceBrandLogo brand={entry.brand} size={18} />{entry.name}</span>)}
      </div>}
      {needsDownload && core.release?.url && <p className="sob-muted sob-center">{t("{name} {version} is downloaded from {host} and checked against its release checksum.", { name: core.name, version: core.release.version, host: new URL(core.release.url).host })}</p>}
      {(error || importer.error) && <p className="sob-error sob-center" role="alert">{error || importer.error}</p>}
      <div className="sob-actions sob-agent-actions">
        <SourceSettingsButton variant="primary" size="lg" className="sob-wide" busy={!!busy} disabled={!core} onClick={proceed}>{label}</SourceSettingsButton>
        <SourceSettingsButton variant="ghost" disabled={!!busy} onClick={onBack}>{t("Back")}</SourceSettingsButton>
      </div>
      <p className="sob-legal">{importer.dragging ? t("Drop to import") : <>{t("Have an extension pack for another agent?")} <button type="button" className="sob-link" onClick={importer.pick}>{t("Import extension pack…")}</button></>}</p>
      {importer.dialog}
    </div>
  );
}

// "Sign in to <core>": the chosen core's own sign-in (core descriptor `login`), laid out like the original sign-in
// card: browser sign-ins as primary buttons, a device code, then "or" and an API key. The step ends when the core
// reports an account (boot.account.account); "Skip for now" leaves it to Settings › Account.
function SignInCard({ signIn, onSkip, onBack }) {
  const { core, auth, account, connected, onLogin, onAccountAction, onOpenExternal } = signIn;
  const login = core?.login ?? {};
  const keys = login.apiKey ?? [];
  const [template, setTemplate] = useState(keys[0]?.template ?? null), [apiKey, setApiKey] = useState("");
  const [working, setWorking] = useState(""), [error, setError] = useState("");
  const phase = auth?.phase || "idle", pending = auth?.login, waiting = phase === "waiting";
  const busy = !!working || (phase !== "idle" && !waiting);
  const run = async (key, fn) => {
    setWorking(key); setError("");
    try { await fn(); } catch (failure) { setError(cleanErrorReason(failure?.message || String(failure))); }
    finally { setWorking(""); }
  };
  const chosenKey = keys.find((entry) => entry.template === template) ?? keys[0];
  const shownError = error || (auth?.error ? cleanErrorReason(auth.error) : "");
  return (
    <div className="sob-card sob-signin">
      <div className="sob-signin-head">
        <SourceBrandLogo brand={core?.brand} size={52} />
        <p className="sob-signin-lead">{t("OpenClaude Desktop runs {name} with your own account. Your sign-in stays on this Mac.", { name: core?.name ?? "" })}</p>
      </div>
      {account ? <p className="sob-signin-done" role="status">{t("Signed in. Finishing setup…")}</p> : waiting ? (
        <div className="sob-signin-wait" role="status">
          {pending?.userCode ? <>
            <span className="sob-label">{t("Enter this code on the sign-in page")}</span>
            <code className="sob-signin-code">{pending.userCode}</code>
          </> : <span className="sob-signin-wait-text"><span className="source-shimmer">{t("Finish signing in in your browser…")}</span></span>}
          <div className="sob-signin-row">
            <SourceSettingsButton size="lg" className="sob-wide" disabled={!pending?.url} onClick={() => onAccountAction({ operation: "open" })}>{t("Open browser again")}</SourceSettingsButton>
            <SourceSettingsButton variant="ghost" onClick={() => onAccountAction({ operation: "cancel" })}>{t("Cancel")}</SourceSettingsButton>
          </div>
        </div>
      ) : (
        <div className="sob-signin-options">
          {(login.browser ?? []).map((option, index) => (
            <SourceSettingsButton key={`b${index}`} variant={index === 0 ? "primary" : "secondary"} size="lg" className="sob-wide" busy={working === `b${index}`} disabled={!connected || busy}
              data-signin={option.provider || option.type || "browser"}
              onClick={() => run(`b${index}`, () => onLogin(option.type || "chatgpt", option.provider ? { codeDesktop: { provider: option.provider } } : {}))}>{t(option.label)}</SourceSettingsButton>
          ))}
          {(login.deviceCode ?? []).map((option, index) => (
            <SourceSettingsButton key={`d${index}`} size="lg" className="sob-wide" busy={working === `d${index}`} disabled={!connected || busy} data-signin="device-code"
              onClick={() => run(`d${index}`, () => onLogin(option.type || "chatgptDeviceCode"))}>{t(option.label)}</SourceSettingsButton>
          ))}
          {keys.length > 0 && <>
            {((login.browser ?? []).length > 0 || (login.deviceCode ?? []).length > 0) && <div className="sob-or" aria-hidden="true"><span>{t("or")}</span></div>}
            {keys.length > 1 && <SourceSelect label={t("Key type")} value={chosenKey.template} items={keys.map((entry) => ({ value: entry.template, label: t(entry.label) }))} onChange={setTemplate} />}
            <div className="sob-field">
              <span className="sob-label-row"><span className="sob-label">{t(chosenKey.label)}</span>
                {chosenKey.keyUrl && <button type="button" className="sob-link" onClick={() => onOpenExternal(chosenKey.keyUrl)}>{t("Get a key")} ↗</button>}</span>
              <input type="password" data-cds="TextInput" className="cds-input cds-reset sob-signin-key" aria-label={t("API key")} placeholder={chosenKey.keyPlaceholder || t(chosenKey.label)} value={apiKey} autoComplete="off" spellCheck={false}
                onChange={(event) => { setApiKey(event.target.value); setError(""); }}
                onKeyDown={(event) => { if (event.key === "Enter" && apiKey.trim() && connected && !busy) run("key", () => onLogin("apiKey", { apiKey, ...(chosenKey.template ? { codeDesktop: { template: chosenKey.template } } : {}) })); }} />
            </div>
            <SourceSettingsButton size="lg" className="sob-wide" busy={working === "key"} disabled={!connected || busy || !apiKey.trim()} data-signin="api-key"
              onClick={() => run("key", () => onLogin("apiKey", { apiKey, ...(chosenKey.template ? { codeDesktop: { template: chosenKey.template } } : {}) }))}>{t("Continue with API key")}</SourceSettingsButton>
          </>}
        </div>
      )}
      {shownError && <p className="sob-error sob-center" role="alert">{shownError}</p>}
      {/* Codex through a relay or another Responses endpoint (no ChatGPT account, no OpenAI key): Settings › Models. */}
      {!account && !waiting && signIn.onCustomEndpoint && <button type="button" className="sob-text-button sob-signin-skip" data-signin="custom-endpoint" onClick={signIn.onCustomEndpoint}>{t("Use a custom endpoint (relay)…")}</button>}
      <div className="sob-actions sob-signin-actions">
        {/* Back to Choose your agent (the chosen core preselected), so a wrong pick isn't a dead end. */}
        {onBack && <SourceSettingsButton variant="ghost" disabled={!!working || waiting} onClick={onBack}>{t("Back")}</SourceSettingsButton>}
        <button type="button" className="sob-text-button sob-signin-skip" onClick={onSkip}>{t("Skip for now")}</button>
      </div>
    </div>
  );
}

/**
 * @param {{ desktopCall: Function, onDone: (choice: {model: string, route: string}) => Promise<void>, onSkip: () => void,
 *   onCoreChosen: (id: string) => Promise<void>, onOpenExternal: (url: string) => void, startAt?: 'welcome' | 'agent' | 'connect' | 'signin', signIn?: object }} props
 */
export function SourceOnboarding({ desktopCall, onDone, onSkip, onCoreChosen, onOpenExternal, signIn = null, startAt = "welcome" }) {
  const [step, setStep] = useState(startAt);
  const start = useRef(null), shell = useRef(null), heading = useRef(null), layer = useRef(null);
  // Escape does what the step's own Back / Skip does: one step back, or out when this is where the takeover began
  // (Settings › Models › Quick setup… opens at 'connect'). The first-run welcome has no way back, so Escape stays put.
  const back = step === "agent" ? (startAt === "agent" ? onSkip : () => setStep("welcome"))
    : step === "connect" ? (startAt === "connect" ? onSkip : () => setStep("agent"))
    : step === "signin" ? () => setStep("agent") : null;
  const live = useRef({ back, step });
  live.current = { back, step };
  // The shell is one scroller for every step: a new step opens at its top (its heading and the provider grid in
  // view, not the previous step's scroll offset), with focus on its heading so a screen reader announces it.
  useLayoutEffect(() => {
    if (shell.current) shell.current.scrollTop = 0;
    if (step === "welcome") start.current?.focus();
    else heading.current?.focus({ preventScroll: true });
  }, [step]);
  // A modal takeover: the app behind it is inert while it shows (Tab and screen readers stay inside), focus that
  // lands outside comes back to the step's heading (Settings › Models › Quick setup… closes the Settings dialog in the
  // same click, and its focus restore or its hold on #root would otherwise leave focus on the Account menu or <body>),
  // and Escape goes Back. Popups the takeover opens (SourceSelect) are portals created later, so they stay usable.
  useEffect(() => {
    const node = layer.current;
    if (!node) return undefined;
    const doc = node.ownerDocument;
    const inerted = [];
    for (let child = node; child?.parentElement && child !== doc.body; child = child.parentElement) {
      for (const sibling of child.parentElement.children) {
        if (sibling === child || sibling.inert || ["SCRIPT", "STYLE", "LINK"].includes(sibling.tagName)) continue;
        sibling.inert = true;
        inerted.push(sibling);
      }
    }
    const outsidePopup = (target) => !target?.closest?.('[data-cds-portal], [role="listbox"], [role="menu"]');
    const focusStep = () => {
      if (node.closest("[inert]")) return;
      (live.current.step === "welcome" ? start : heading).current?.focus({ preventScroll: true });
    };
    const settle = () => { const active = doc.activeElement; if (!active || active === doc.body || (!node.contains(active) && outsidePopup(active))) focusStep(); };
    const focusIn = (event) => { if (!node.contains(event.target) && outsidePopup(event.target)) focusStep(); };
    // An ancestor's inert (a closing dialog's hold on #root) lifting: focus the step once the takeover can take it.
    const observer = new MutationObserver(settle);
    for (let ancestor = node.parentElement; ancestor && ancestor !== doc.documentElement; ancestor = ancestor.parentElement)
      observer.observe(ancestor, { attributes: true, attributeFilter: ["inert"] });
    const escape = (event) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing || node.closest("[inert]")) return;
      const target = event.target;
      if (target && target !== doc.body && !node.contains(target)) return;
      if (target?.closest?.('[role="listbox"], [role="menu"]')) return;
      const go = live.current.back;
      if (!go) return;
      event.preventDefault();
      go();
    };
    doc.addEventListener("focusin", focusIn);
    doc.addEventListener("keydown", escape);
    settle();
    return () => {
      observer.disconnect();
      doc.removeEventListener("focusin", focusIn);
      doc.removeEventListener("keydown", escape);
      for (const sibling of inerted) sibling.inert = false;
    };
  }, []);
  return (
    // The layer carries the z-index, like the other local modals: popups (SourceSelect) stack above a
    // dialog's parent.
    <div ref={layer} className="sob-layer"><div ref={shell} className="sob-shell" data-step={step} role="dialog" aria-modal="true" aria-label={t("Set up OpenClaude Desktop")}>
      <div className="sob-drag" aria-hidden="true" />
      {step === "welcome" ? <>
        <SourceSpark size={64} className="sob-spark" />
        <h1 className="sob-title">OpenClaude <em>Desktop</em></h1>
        <p className="sob-tagline">{t("The open-source Claude Desktop.")}</p>
        <div className="sob-bottom">
          <SourceSettingsButton ref={start} variant="primary" size="lg" className="sob-wide" onClick={() => setStep("agent")}>{t("Get started")}</SourceSettingsButton>
          <button type="button" className="sob-text-button" onClick={onSkip}>{t("Set up later")}</button>
        </div>
      </> : step === "signin" && signIn ? <>
        <h1 ref={heading} tabIndex={-1} className="sob-heading">{t("Sign in to {name}", { name: signIn.core?.name ?? "" })}</h1>
        <SignInCard signIn={signIn} onSkip={onSkip} onBack={() => setStep("agent")} />
      </> : step === "agent" ? <>
        <h1 ref={heading} tabIndex={-1} className="sob-heading">{t("Choose your agent")}</h1>
        <AgentCard desktopCall={desktopCall} onChooseDeepSeek={() => setStep("connect")} onBack={() => (startAt === "agent" ? onSkip() : setStep("welcome"))}
          initial={signIn?.core?.id ?? null}
          // Back from Sign in: choosing the same core again returns to its sign-in instead of restarting it.
          onCoreChosen={(id) => (signIn?.core?.id && id === signIn.core.id ? setStep("signin") : onCoreChosen(id))} />
      </> : <>
        <h1 ref={heading} tabIndex={-1} className="sob-heading">{t("Connect a model")}</h1>
        <ConnectCard desktopCall={desktopCall} onDone={onDone} onOpenExternal={onOpenExternal} onBack={() => (startAt === "connect" ? onSkip() : setStep("agent"))} />
      </>}
    </div></div>
  );
}
