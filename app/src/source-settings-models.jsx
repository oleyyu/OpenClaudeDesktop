// Settings › Models (C5), keyed on the running core's capabilities, never on its id.
// providerSettings (the DeepSeek bridge): Quick setup and the API connection (DeepSeek's
// official API or a third-party relay, with its key) up top; under Advanced, per-model
// request defaults (max output tokens, temperature, default reasoning effort), the editable
// CNY price table the Usage page's estimated cost uses and custom providers. Model values
// live in preferences (modelSettings); main's model-settings.cjs sends them to the DeepSeek
// bridge with each thread/turn request and account/usage/read, and keeps the connection and
// its keys. codexProvider (Codex): its endpoint, OpenAI or a custom OpenAI Responses endpoint
// such as a GPT relay (ops codex-provider-*, prefs/codex-provider.mjs). Any other core lists
// its models (default, efforts, Fast) with a default-effort select (applied in the renderer).
// Which values reach a core follows main's model-settings.cjs decorate():
//   Max output tokens / Temperature: cores that read codeDesktop.customization.modelParams on thread/turn
//     requests (coreTakesModelParams: the modelParams capability, else customization);
//   Pricing: providerSettings cores (the DeepSeek bridge) and bridges reporting capabilities.priceOverrides,
//     which get codeDesktop.prices on account/usage/read. perTokenBilling alone doesn't bring the table: OpenCode and MiMo price
//     usage themselves (models.dev), so prices set here would never be read.
// A core with neither connection capability gets a one-line notice instead of connection controls.
import React, { useEffect, useId, useRef, useState } from 'react';
import { SourceSelect } from './source-select.jsx';
import { SourceSegments } from './source-segments.jsx';
import { SourceDisclosure } from './source-disclosure.jsx';
import { SourceDialog, SourceDialogFooter } from './source-dialog.jsx';
import { SourceSettingsButton } from './source-settings-button.jsx';
import { SourceSwitch } from './source-switch.jsx';
import { SourceSettingsCheckbox } from './source-settings-checkbox.jsx';
import { SettingsGroup, settingRow } from './source-settings-kit.jsx';
import { effortName, filterModels, isHighestEffort, MODEL_SEARCH_THRESHOLD } from './model-menu-model.mjs';
import { DEEPSEEK_KEYS_URL } from './account-settings-model.mjs';
import { t, tn } from '../electron/i18n/index.mjs';
import {
  normalize, parseNumberInput, setModelParam, modelParamsFor, effectivePrices, setPrice, addPrice, removePrice, resetPrices, priceEdited,
  PRICE_TIERS, PRICE_FIELDS, MAX_TOKENS_MIN, MAX_TOKENS_MAX, PROVIDER_PROTOCOLS, validateProvider,
  relayBaseURLError, OFFICIAL_BASE_URL, coreTakesModelParams, parseTokenCount, CONTEXT_WINDOW_MIN, CONTEXT_WINDOW_MAX,
} from '../electron/prefs/model-settings.mjs';
import { CODEX_LOCAL_SERVERS, codexBaseURLError, codexLocalEndpoint, parseCodexModels } from '../electron/prefs/codex-provider.mjs';
import { fastTierForModel, speedTiersForModel } from '../electron/preferences.mjs';
import { coreCapabilities, coreName } from '../electron/core-registry.mjs';
import { modelDisplayName, modelFamily } from '../electron/prefs/model-families.mjs';
import { ModelNameField, ModelOptionsEntry, defaultModelName } from './source-settings-model-names.jsx';
import { customModelName } from '../electron/prefs/model-names.mjs';
import { modelAcceptsImages } from './composer-attachments-model.mjs';
import { bootModelsCoreId } from './model-names-model.mjs';
import './models-settings.css';

const TIER_LABELS = { offPeak: t('Off-peak'), peak: t('Peak') };
const FIELD_LABELS = { cacheHit: t('Cache hit'), cacheMiss: t('Cache miss'), output: t('Output') };
const DEFAULT_PRICING_URL = 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing';
// Above Settings (layer 500), like the other Settings page dialogs.
const SETTINGS_LAYER = Object.freeze({ base: 520, z: 520 });
// Settings › Models: up to this many listed models open their option rows at first.
const MODEL_ENTRIES_OPEN = 4;
const PROTOCOL_LABELS = { 'openai-completions': 'OpenAI Chat Completions', 'openai-responses': 'OpenAI Responses', 'anthropic-messages': 'Anthropic Messages' };

// Which listed models accept images: one toggle chip per id. The cores attach images only for a model marked here.
const splitIds = text => [...new Set(String(text ?? '').split(/[\s,]+/).map(id => id.trim()).filter(Boolean))];
export function ImageModelChips({ ids, selected, disabled, onChange }) {
  const labelId = useId();
  if (!ids.length) return null;
  const on = new Set(selected);
  return <div className="msx-image-models">
    <span id={labelId} className="msx-image-models-label">{t('Accept images')}</span>
    <div className="msx-image-chips" role="group" aria-labelledby={labelId}>
      {ids.map(id => <button key={id} type="button" className="msx-image-chip" aria-pressed={on.has(id)} disabled={disabled}
        onClick={() => onChange(on.has(id) ? selected.filter(item => item !== id) : [...selected, id])}>
        <span className="msx-image-chip-mark" aria-hidden="true">{on.has(id) ? '✓' : '+'}</span>{id}</button>)}
    </div>
    <span className="msx-help">{t('Turn on the models that can read images. The composer attaches images only for those.')}</span>
  </div>;
}

// Each model's optional context window (custom providers and relay models: prefs contextWindowsFor). A value stays
// the text typed (131072, 128K, 1M) until Save validates it.
export function ContextWindowFields({ ids, values, disabled, onChange }) {
  const labelId = useId();
  if (!ids.length) return null;
  return <div className="msx-context-windows">
    <span id={labelId} className="msx-image-models-label">{t('Context window')}</span>
    <div className="msx-context-list" role="group" aria-labelledby={labelId}>
      {ids.map(id => <label key={id} className="msx-context-row"><span className="msx-context-id" title={id}>{modelDisplayName(id) !== id ? <>{modelDisplayName(id)} <span className="msx-context-raw">{id}</span></> : id}</span>
        <input data-cds="TextInput" className="cds-input cds-reset msx-context-input" aria-label={t('Context window for {id}', { id })} value={values?.[id] ?? ''} maxLength={16}
          placeholder={t('Default (262K)')} disabled={disabled} spellCheck={false} autoCapitalize="off" autoComplete="off" onChange={event => onChange({ ...values, [id]: event.target.value })}/></label>)}
    </div>
    <span className="msx-help">{t('Optional. How many tokens each model can read, such as 131072, 128K or 1M. Empty: the core assumes 262,144 tokens and compacts later than a smaller model needs.')}</span>
  </div>;
}

// The provider row's model list: names with the context windows the user set ("GLM 5.3 200K, GLM 5.3 Flash").
const shortTokens = (count) => count >= 1000000 && count % 1000000 === 0 ? `${count / 1000000}M` : count >= 1000 ? `${Math.round(count / 1000)}K` : String(count);
function providerModelSummary(provider) {
  const names = provider.models.slice(0, 4).map(id => provider.contextWindows?.[id] ? `${modelDisplayName(id)} ${shortTokens(provider.contextWindows[id])}` : modelDisplayName(id));
  return provider.models.length > 4 ? `${names.join(', ')} ${t('and {count} more', { count: provider.models.length - 4 })}` : names.join(', ');
}

// Add / edit one custom provider. The key is write-only: it is sent once to the
// main process (encrypted there) and never read back.
function ProviderDialog({ initial, protocols, harness = true, coreLabel = '', onSubmit, onCancel }) {
  const editing = !!initial;
  const [form, setForm] = useState(() => ({ route: initial?.route ?? '', displayName: initial?.displayName ?? '', api: initial?.api ?? protocols[0],
    baseURL: initial?.baseURL ?? '', models: (initial?.models ?? []).join('\n'), imageModels: initial?.imageModels ?? null, contextWindows: { ...(initial?.contextWindows ?? {}) }, apiKey: '' }));
  const [error, setError] = useState(''), [saving, setSaving] = useState(false), [clearKey, setClearKey] = useState(false);
  const routeRef = useRef(null), ids = { help: useId() };
  const set = key => event => { const value = event.target.value; setForm(current => ({ ...current, [key]: value })); };
  const submit = async event => {
    event.preventDefault(); event.stopPropagation();
    if (saving) return;
    let provider;
    try { provider = validateProvider(form); } catch (failure) { setError(failure.message); return; }
    if (!editing && !form.apiKey.trim()) { setError(t('Enter the API key.')); return; }
    setSaving(true); setError('');
    try { await onSubmit({ provider, previousRoute: initial?.route, apiKey: form.apiKey.trim() ? form.apiKey : clearKey ? null : undefined }); }
    catch (failure) { setError(failure?.message || String(failure)); setSaving(false); }
  };
  return <SourceDialog open size="md" layer={SETTINGS_LAYER} title={editing ? t('Edit {name}', { name: initial.displayName || initial.route }) : t('Add provider')} className="msx-dialog"
    // The DeepSeek core serves custom endpoints through the Harness pi-ai adapter; OpenCode / MiMo through their own AI SDK providers.
    description={harness ? t('An OpenAI-compatible (or Anthropic Messages) endpoint, served by the Harness pi-ai adapter. Its models join the model menu after the core restarts.')
      : t('An OpenAI-compatible (or Anthropic Messages) endpoint. Its models join {core}’s model menu after the core restarts.', { core: coreLabel })}
    initialFocusRef={routeRef} onClose={() => { if (!saving) onCancel(); }}>
    <form className="msx-form" onSubmit={submit} noValidate>
      <label className="msx-field"><span className="msx-label">{t('Provider id')}</span>
        <input ref={routeRef} data-cds="TextInput" className="cds-input cds-reset" aria-label={t('Provider id')} value={form.route} maxLength={32} spellCheck={false} autoCapitalize="off" autoComplete="off"
          placeholder="openrouter" onChange={event => setForm(current => ({ ...current, route: event.target.value.toLowerCase().replace(/\s/g, '-') }))}/>
      </label>
      <label className="msx-field"><span className="msx-label">{t('Display name')}</span>
        <input data-cds="TextInput" className="cds-input cds-reset" aria-label={t('Provider display name')} value={form.displayName} maxLength={60} placeholder={t('Optional')} onChange={set('displayName')}/>
      </label>
      <div className="msx-field"><span className="msx-label">{t('Protocol')}</span>
        <SourceSelect label={t('Protocol')} value={form.api} onChange={value => setForm(current => ({ ...current, api: value }))}
          items={protocols.map(value => ({ value, label: PROTOCOL_LABELS[value] || value }))}/>
      </div>
      <label className="msx-field"><span className="msx-label">{t('Endpoint URL')}</span>
        <input data-cds="TextInput" className="cds-input cds-reset" aria-label={t('Endpoint URL')} value={form.baseURL} maxLength={512} spellCheck={false} autoCapitalize="off"
          placeholder="https://api.example.com/v1" onChange={set('baseURL')}/>
      </label>
      <label className="msx-field"><span className="msx-label">{t('Model ids')}</span>
        <textarea data-cds="TextArea" className="cds-input cds-reset msx-models" aria-label={t('Model ids')} aria-describedby={ids.help} rows={4} value={form.models} spellCheck={false}
          placeholder={'gpt-4.1-mini\nqwen3-coder'} onChange={set('models')}/>
        <span id={ids.help} className="msx-help">{t('One per line, as the endpoint names them.')}</span>
      </label>
      {/* Until the user marks images (null), the chips show what the model families take and nothing is saved, so a
          family's images keep applying to models added later. */}
      <ImageModelChips ids={splitIds(form.models)} selected={form.imageModels ?? splitIds(form.models).filter(id => modelFamily(id)?.image === true)} onChange={imageModels => setForm(current => ({ ...current, imageModels }))}/>
      <ContextWindowFields ids={splitIds(form.models)} values={form.contextWindows} onChange={contextWindows => setForm(current => ({ ...current, contextWindows }))}/>
      <label className="msx-field"><span className="msx-label">{t('API key')}</span>
        <input data-cds="TextInput" className="cds-input cds-reset" type="password" aria-label={t('API key')} value={form.apiKey} maxLength={4096} autoComplete="off" spellCheck={false}
          placeholder={editing && initial.hasKey ? t('Saved. Leave empty to keep it.') : 'sk-…'} onChange={set('apiKey')}/>
        <span className="msx-help">{t('Stored encrypted on this Mac and passed to the core as {env}; never written to settings files.', { env: initial?.keyEnv || t('an environment variable') })}</span>
      </label>
      {editing && initial.hasKey && <label className="msx-check"><SourceSettingsCheckbox checked={clearKey} disabled={!!form.apiKey} onChange={setClearKey}/><span>{t('Remove the saved key')}</span></label>}
      {error && <p className="msx-error" role="alert">{error}</p>}
      <SourceDialogFooter>
        <SourceSettingsButton disabled={saving} onClick={onCancel}>{t('Cancel')}</SourceSettingsButton>
        <SourceSettingsButton type="submit" variant="primary" busy={saving}>{editing ? t('Save') : t('Add provider')}</SourceSettingsButton>
      </SourceDialogFooter>
    </form>
  </SourceDialog>;
}

// A number field that commits on blur or Enter; Escape restores the saved value.
// onEdit (optional): the user changed the text or Escape put it back, e.g. to drop a validation message.
// tokens: a text field that shows and takes token counts as people write them (131072, 128K, 1M); shown exactly.
const exactTokens = count => count % 1000000 === 0 ? `${count / 1000000}M` : count % 1000 === 0 ? `${count / 1000}K` : String(count);
export function NumberField({ label, value, placeholder = t('Default'), min, max, step, disabled, invalid, onCommit, onEdit, className = '', tokens = false }) {
  const shown = value === undefined || value === null ? '' : tokens ? exactTokens(value) : String(value);
  const [draft, setDraft] = useState(shown), editing = useRef(false), input = useRef(null);
  useEffect(() => { if (!editing.current) setDraft(shown); }, [shown]);
  // Chromium reports unparseable text (e.g. "abc", "1e") in a number input as
  // value '' with validity.badInput, which would otherwise commit as a clear.
  // The DOM value is reset too: React skips it when the draft already equals ''.
  const revert = () => { setDraft(shown); if (input.current) input.current.value = shown; };
  const commit = () => {
    editing.current = false;
    if (input.current?.validity?.badInput) onCommit('NaN', revert);
    else if (draft.trim() !== shown) onCommit(draft, revert);
  };
  return <input ref={input} type={tokens ? 'text' : 'number'} data-cds="TextInput" className={`cds-input cds-reset msx-number ${className}`} aria-label={label}
    value={draft} placeholder={placeholder} min={tokens ? undefined : min} max={tokens ? undefined : max} step={tokens ? undefined : step} disabled={disabled} inputMode={tokens ? 'text' : 'decimal'}
    spellCheck={tokens ? false : undefined} autoCapitalize={tokens ? 'off' : undefined} autoComplete={tokens ? 'off' : undefined}
    aria-invalid={invalid ? true : undefined} data-invalid={invalid ? '' : undefined}
    onChange={event => { editing.current = true; setDraft(event.currentTarget.value); onEdit?.(); }}
    onBlur={commit}
    onKeyDown={event => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter') { event.preventDefault(); commit(); }
      else if (event.key === 'Escape' && (draft !== shown || event.currentTarget.validity?.badInput)) { event.preventDefault(); event.stopPropagation(); editing.current = false; revert(); onEdit?.(); }
    }}/>;
}

// API connection: official DeepSeek API or a third-party relay. Keys are
// write-only (sent once to main, encrypted there); the page only learns whether
// one is saved. Changes reach the core when it restarts.
// Saved {id: tokens} as the fields' text, and a comparable key of the fields for the listed ids.
const windowsText = windows => Object.fromEntries(Object.entries(windows && typeof windows === 'object' ? windows : {}).map(([id, value]) => [id, String(value)]));
const windowsKey = (windows, ids) => ids.map(id => `${id}=${String(windows?.[id] ?? '').trim()}`).join('\n');
const CONNECTION_OPTIONS = [{ value: 'official', label: t('DeepSeek official') }, { value: 'relay', label: t('Third-party relay') }];
function ConnectionGroup({ deepseek, desktopCall, onReconnect }) {
  const [view, setView] = useState(null);
  const [draft, setDraft] = useState({ mode: 'official', relayBaseURL: '', relayModels: '', relayImageModels: [], relayContextWindows: {}, officialKey: '', relayKey: '' });
  const [busy, setBusy] = useState(''), [error, setError] = useState(''), [pending, setPending] = useState(false);
  const adopt = result => {
    setView(result);
    setDraft({ mode: result.mode, relayBaseURL: result.relayBaseURL || '', relayModels: (result.relayModels || []).join('\n'), relayImageModels: result.relayImageModels || [],
      relayContextWindows: windowsText(result.relayContextWindows), officialKey: '', relayKey: '' });
  };
  useEffect(() => {
    if (!deepseek || typeof desktopCall !== 'function') return undefined;
    let live = true;
    Promise.resolve().then(() => desktopCall('model-settings', { op: 'connection-read' })).then(result => {
      if (live && result && typeof result.mode === 'string') adopt(result);
    }).catch(failure => { if (live) console.warn('Couldn’t read the API connection:', failure); });
    return () => { live = false; };
  }, [deepseek]);
  const disabled = !deepseek || !view?.available || !!busy;
  const relay = draft.mode === 'relay';
  const urlError = relay && draft.relayBaseURL.trim() ? relayBaseURLError(draft.relayBaseURL) : null;
  const modelIds = text => text.split(/[\s,]+/).map(id => id.trim()).filter(Boolean).join('\n');
  const relayIds = splitIds(draft.relayModels), relayImages = relayIds.filter(id => draft.relayImageModels.includes(id));
  const dirty = !!view && (draft.mode !== view.mode || (relay && draft.relayBaseURL.trim().replace(/\/+$/, '') !== (view.relayBaseURL || ''))
    || (relay && modelIds(draft.relayModels) !== (view.relayModels || []).join('\n'))
    || (relay && relayImages.join('\n') !== (view.relayImageModels || []).join('\n'))
    || (relay && windowsKey(draft.relayContextWindows, relayIds) !== windowsKey(windowsText(view.relayContextWindows), relayIds))
    || !!draft.officialKey.trim() || !!draft.relayKey.trim());
  const canSave = dirty && !disabled && (!relay || (!relayBaseURLError(draft.relayBaseURL) && (view.relayKey || draft.relayKey.trim())));
  const set = key => event => { const value = event.target.value; setError(''); setDraft(current => ({ ...current, [key]: value })); };
  const save = async (payload, key) => {
    setBusy(key); setError('');
    try { adopt(await desktopCall('model-settings', { op: 'connection-save', ...payload })); setPending(true); }
    catch (failure) { setError(failure?.message || String(failure)); }
    finally { setBusy(''); }
  };
  const submit = event => {
    event.preventDefault(); event.stopPropagation();
    if (!canSave) return;
    void save({ connection: { mode: draft.mode, relayBaseURL: draft.relayBaseURL, relayModels: draft.relayModels, relayImageModels: relayImages,
      relayContextWindows: Object.fromEntries(relayIds.filter(id => String(draft.relayContextWindows[id] ?? '').trim()).map(id => [id, draft.relayContextWindows[id]])) }, officialKey: draft.officialKey.trim() || undefined, relayKey: draft.relayKey.trim() || undefined }, 'save');
  };
  // Fill the model list from the relay's /v1/models (typed or saved key).
  const fetchModels = async () => {
    setBusy('models'); setError('');
    try {
      const result = await desktopCall('model-settings', { op: 'connection-models', relayBaseURL: draft.relayBaseURL, relayKey: draft.relayKey.trim() || undefined });
      if (!result?.models?.length) setError(t('The relay didn’t list any models.'));
      else setDraft(current => ({ ...current, relayModels: result.models.join('\n'), relayContextWindows: { ...windowsText(result.contextWindows), ...current.relayContextWindows } }));
    } catch (failure) { setError(failure?.message || String(failure)); }
    finally { setBusy(''); }
  };
  const keyInput = (field, saved, label) => <input data-cds="TextInput" className="cds-input cds-reset msx-wide" type="password" aria-label={label}
    value={draft[field]} maxLength={4096} autoComplete="off" spellCheck={false} disabled={disabled}
    placeholder={saved ? `•••••••• ${t('Saved')}` : 'sk-…'} onChange={set(field)}/>;
  const officialKeyHelp = view?.officialKey ? t('Saved encrypted on this Mac. Type a new key to replace it.')
    : view?.inheritedKey ? t('Optional. Without one, the DEEPSEEK_API_KEY the app was launched with is used.')
      : t('Optional. Without one, the key saved in DeepSeek Harness (~/.dsh) is used.');
  const rows = [
    settingRow('connection-mode', t('Provider'), relay ? t('Requests go through a relay that serves DeepSeek’s models.') : t('Requests go straight to {host}.', { host: OFFICIAL_BASE_URL.replace(/^https:\/\//, '') }),
      <SourceSegments label={t('API provider')} value={draft.mode} options={CONNECTION_OPTIONS} disabled={disabled}
        onChange={mode => { setError(''); setDraft(current => ({ ...current, mode })); }}/>),
    ...(relay ? [
      settingRow('connection-relay-url', t('Base URL'), t('An Anthropic Messages-compatible endpoint; /v1/messages is added.'),
        <input data-cds="TextInput" className="cds-input cds-reset msx-wide" aria-label={t('Relay base URL')} value={draft.relayBaseURL} maxLength={512}
          spellCheck={false} autoCapitalize="off" autoComplete="off" disabled={disabled} placeholder="https://relay.example.com/anthropic"
          aria-invalid={urlError ? true : undefined} data-invalid={urlError ? '' : undefined} onChange={set('relayBaseURL')}/>,
        urlError ? { below: <span className="ss-row-error">{urlError}</span> } : {}),
      settingRow('connection-relay-key', t('API key'), view?.relayKey ? t('Saved encrypted on this Mac. Type a new key to replace it.') : t('The key your relay issued.'),
        keyInput('relayKey', view?.relayKey, t('Relay API key'))),
      settingRow('connection-relay-models', t('Models'), t('The model ids your relay serves, one per line. They replace DeepSeek’s in the model menu; leave empty if the relay uses deepseek-flash and deepseek-v4-pro.'),
        <SourceSettingsButton size="sm" disabled={disabled || !!relayBaseURLError(draft.relayBaseURL) || !(view?.relayKey || draft.relayKey.trim())} busy={busy === 'models'} onClick={() => void fetchModels()}>{t('Fetch from relay')}</SourceSettingsButton>,
        { below: <textarea data-cds="TextArea" className="cds-input cds-reset msx-relay-models" aria-label={t('Relay model ids')} rows={4} value={draft.relayModels}
          spellCheck={false} autoCapitalize="off" disabled={disabled} placeholder={'deepseek-v4.1-flash\ndeepseek-v4-pro'} onChange={set('relayModels')}/> }),
      ...(relayIds.length ? [settingRow('connection-relay-images', t('Image input'), t('Turn on the models that can read images. The composer attaches images only for those.'), null,
        { below: <ImageModelChips ids={relayIds} selected={relayImages} disabled={disabled} onChange={relayImageModels => { setError(''); setDraft(current => ({ ...current, relayImageModels })); }}/> })] : []),
      ...(relayIds.length ? [settingRow('connection-relay-context', t('Context windows'), t('So the core compacts in time, tell it how much each model can read.'), null,
        { below: <ContextWindowFields ids={relayIds} values={draft.relayContextWindows} disabled={disabled} onChange={relayContextWindows => { setError(''); setDraft(current => ({ ...current, relayContextWindows })); }}/> })] : []),
      // Web search always goes to DeepSeek's official API (dsh-web-search-deepseek): model-settings.cjs gives it the
      // official key only, never the relay key, so without one searches fail instead of leaking the relay key.
      settingRow('connection-relay-search', t('Web search key'), view?.officialKey
        ? t('Web search uses DeepSeek’s official API with your saved official key. The relay key is never sent to DeepSeek.')
        : t('Web search uses DeepSeek’s official API and needs an official DeepSeek key. Without one, web searches fail; the relay key is never sent to DeepSeek.'),
        keyInput('officialKey', view?.officialKey, t('DeepSeek API key'))),
    ] : [
      settingRow('connection-official-key', t('API key'), <>{officialKeyHelp}{' '}
        <button type="button" className="msx-link" onClick={() => void Promise.resolve(desktopCall?.('external', { url: DEEPSEEK_KEYS_URL })).catch(() => {})}>{t('Get a key')}</button></>,
        keyInput('officialKey', view?.officialKey, t('DeepSeek API key'))),
    ]),
  ];
  return <form className="msx-connection" onSubmit={submit} noValidate>
    <SettingsGroup title={t('API connection')} rows={rows}>
      <div className="msx-connection-footer">
        <span className="msx-connection-status" role="status">
          {error ? <span className="ss-row-error">{error}</span>
            : pending ? t('Saved. Restart the core to apply.')
              : view && !view.available ? t('Needs Settings › Harness, which isn’t available.') : ''}
        </span>
        {!relay && view?.officialKey && <SourceSettingsButton size="sm" variant="ghost" disabled={disabled} busy={busy === 'remove'}
          onClick={() => void save({ officialKey: null }, 'remove')}>{t('Remove key')}</SourceSettingsButton>}
        {pending && onReconnect && !dirty ? <SourceSettingsButton size="sm" variant="primary"
          onClick={() => { setPending(false); void Promise.resolve(onReconnect()).catch(() => {}); }}>{t('Restart core')}</SourceSettingsButton>
          : <SourceSettingsButton type="submit" size="sm" variant="primary" disabled={!canSave} busy={busy === 'save'}>{t('Save')}</SourceSettingsButton>}
      </div>
    </SettingsGroup>
  </form>;
}

// Codex endpoint (codexProvider): OpenAI, signed in on Settings › Account, or a custom OpenAI
// Responses-compatible endpoint (a GPT relay). The key is write-only like the others; Codex reads
// it all when it next starts, so a save turns into Restart core.
const codexDraft = view => ({ mode: view?.mode === 'custom' ? 'custom' : 'openai', baseURL: view?.baseURL || '', models: (view?.models || []).join('\n'), webSearch: view?.webSearch === true, apiKey: '' });
// Codex's thinking summaries (model_reasoning_summary) and answer length (model_verbosity), saved in its own config
// as the CLI keeps them (main.cjs codex-model-style); '' leaves the key unset (Codex picks per model).
const SUMMARY_ITEMS = () => [{ value: '', label: t('Automatic') }, { value: 'concise', label: t('Concise') }, { value: 'detailed', label: t('Detailed') }, { value: 'none', label: t('Off') }];
const VERBOSITY_ITEMS = () => [{ value: '', label: t('Model default') }, { value: 'low', label: t('Short') }, { value: 'medium', label: t('Medium') }, { value: 'high', label: t('Long') }];
export function CodexResponseGroup({ core, desktopCall, connected = true }) {
  const [style, setStyle] = useState(null), [error, setError] = useState(''), [saving, setSaving] = useState('');
  useEffect(() => {
    if (!connected || typeof desktopCall !== 'function') { setStyle(null); return undefined; }
    let live = true;
    Promise.resolve(desktopCall('codex-model-style', { op: 'read' })).then((value) => { if (live) setStyle(value ?? null); }, (failure) => { if (live) { setStyle(null); setError(failure?.message || String(failure)); } });
    return () => { live = false; };
  }, [connected]);
  if (!style) return null;
  const write = async (key, value) => {
    setSaving(key); setError('');
    try { setStyle(await desktopCall('codex-model-style', { op: 'write', key, value: value || null })); }
    catch (failure) { setError(failure?.message || String(failure)); }
    finally { setSaving(''); }
  };
  return <SettingsGroup title={t('Responses')} rows={[
    settingRow('codex-reasoning-summary', t('Thinking summaries'), t('How much of {core}’s reasoning the thinking block shows. Some models don’t summarize their reasoning.', { core }),
      <SourceSelect label={t('Thinking summaries')} align="end" className="sselect-width-160" value={style.summary ?? ''} disabled={saving === 'summary'} items={SUMMARY_ITEMS()} onChange={(value) => void write('summary', value)}/>),
    settingRow('codex-verbosity', t('Response length'), t('How long {core}’s final answers are. Only models that support it follow this.', { core }),
      <SourceSelect label={t('Response length')} align="end" className="sselect-width-160" value={style.verbosity ?? ''} disabled={saving === 'verbosity'} items={VERBOSITY_ITEMS()} onChange={(value) => void write('verbosity', value)}/>),
  ]}>
    {error && <p className="msx-error" role="alert">{error}</p>}
  </SettingsGroup>;
}

// Codex's sub-agents (its agents.* settings, written to its own config.toml as the CLI keeps them: main.cjs
// codex-subagents): multi-agent tools on or off, the spawned agents' default model and effort, how many run at once per
// session and how deep they may nest. '' / an empty field clears a key (Codex's default).
const SUBAGENT_EFFORTS = () => [{ value: '', label: t('Same as the session') }, { value: 'low', label: t('Low') }, { value: 'medium', label: t('Medium') }, { value: 'high', label: t('High') }, { value: 'xhigh', label: t('Extra high') }];
export function CodexSubagentsGroup({ core, desktopCall, connected = true, models = [] }) {
  const [state, setState] = useState(null), [error, setError] = useState(''), [saving, setSaving] = useState('');
  useEffect(() => {
    if (!connected || typeof desktopCall !== 'function') { setState(null); return undefined; }
    let live = true;
    Promise.resolve(desktopCall('codex-subagents', { op: 'read' })).then((value) => { if (live) setState(value ?? null); }, (failure) => { if (live) { setState(null); setError(failure?.message || String(failure)); } });
    return () => { live = false; };
  }, [connected]);
  if (!state) return error ? <p className="msx-error" role="alert">{error}</p> : null;
  const write = async (key, value) => {
    setSaving(key); setError('');
    try { setState(await desktopCall('codex-subagents', { op: 'write', key, value })); }
    catch (failure) { setError(failure?.message || String(failure)); }
    finally { setSaving(''); }
  };
  const integer = (key, min, max) => (text, revert) => {
    const trimmed = String(text ?? '').trim();
    if (!trimmed) { void write(key, null); return; }
    const value = Number(trimmed);
    if (!Number.isInteger(value) || value < min || value > max) { setError(t('Enter a whole number from {min} to {max}.', { min, max })); revert(); return; }
    void write(key, value);
  };
  const shownModels = models.filter((model) => model.hidden !== true);
  const modelItems = [{ value: '', label: t('Same as the session') }, ...shownModels.map((model) => ({ value: model.model, label: model.displayName || model.model })),
    ...(state.model && !shownModels.some((model) => model.model === state.model) ? [{ value: state.model, label: state.model }] : [])];
  const enabled = state.enabled !== false;
  return <SettingsGroup title={t('Sub-agents')} rows={[
    settingRow('codex-subagents-enabled', t('Sub-agents'), t('Let {core} hand parts of a task to sub-agents that work in parallel. Each one uses tokens like a session of its own.', { core }),
      <SourceSwitch label={t('Sub-agents')} checked={enabled} disabled={saving === 'enabled'} onChange={(value) => void write('enabled', value ? null : false)}/>),
    settingRow('codex-subagents-model', t('Sub-agent model'), t('The model a sub-agent uses when {core} doesn’t pick one for it. A smaller model costs less.', { core }),
      <SourceSelect label={t('Sub-agent model')} align="end" value={state.model ?? ''} disabled={!enabled || saving === 'model'} items={modelItems} onChange={(value) => void write('model', value || null)}/>),
    settingRow('codex-subagents-effort', t('Sub-agent effort'), t('The reasoning effort a sub-agent uses when {core} doesn’t pick one for it.', { core }),
      <SourceSelect label={t('Sub-agent effort')} align="end" value={state.effort ?? ''} disabled={!enabled || saving === 'effort'} items={SUBAGENT_EFFORTS()} onChange={(value) => void write('effort', value || null)}/>),
    settingRow('codex-subagents-concurrency', t('Sub-agents at once'), t('How many sub-agents one session can have open at the same time. Empty uses {core}’s default.', { core }),
      <NumberField label={t('Sub-agents at once')} value={state.concurrency} min={1} max={64} step={1} disabled={!enabled || saving === 'concurrency'} onCommit={integer('concurrency', 1, 64)}/>),
    settingRow('codex-subagents-depth', t('Nesting depth'), t('How many levels deep sub-agents may start sub-agents of their own. Empty uses {core}’s default.', { core }),
      <NumberField label={t('Nesting depth')} value={state.depth} min={1} max={10} step={1} disabled={!enabled || saving === 'depth'} onCommit={integer('depth', 1, 10)}/>),
  ]}>
    <p className="msx-note">{t('Saved in {core}’s own config, shared with the {core} CLI. New sub-agents use the change.', { core })}</p>
    {error && <p className="msx-error" role="alert">{error}</p>}
  </SettingsGroup>;
}

// First-run setup's 'Use a custom endpoint (relay)…' (source-onboarding.jsx SignInCard): the next Connection group
// mounted opens on Custom endpoint with the Base URL field focused (an unsaved choice until Save).
let customEndpointIntent = false;
export function requestCodexCustomEndpoint() { customEndpointIntent = true; }
export function CodexConnectionGroup({ core, desktopCall, onReconnect, initialView = null }) {
  const [view, setView] = useState(initialView), [draft, setDraft] = useState(() => codexDraft(initialView));
  const [wantsCustom] = useState(() => { const wanted = customEndpointIntent; customEndpointIntent = false; return wanted; });
  const baseURLInput = useRef(null), customApplied = useRef(false);
  const [busy, setBusy] = useState(''), [error, setError] = useState(''), [pending, setPending] = useState(false), [tested, setTested] = useState(null);
  const adopt = result => { setView(result); setDraft(codexDraft(result)); };
  useEffect(() => {
    if (initialView || typeof desktopCall !== 'function') return undefined;
    let live = true;
    Promise.resolve().then(() => desktopCall('model-settings', { op: 'codex-provider-read' })).then(result => {
      if (live && result && typeof result.mode === 'string') adopt(result);
    }).catch(failure => { if (live) console.warn('Couldn’t read the Codex endpoint:', failure); });
    return () => { live = false; };
  }, []);
  useEffect(() => {
    if (!wantsCustom || customApplied.current || !view) return;
    customApplied.current = true;
    if (view.mode !== 'custom') setDraft(current => ({ ...current, mode: 'custom' }));
  }, [wantsCustom, view]);
  const disabled = !view?.available || !!busy;
  const custom = draft.mode === 'custom';
  useEffect(() => {
    if (wantsCustom && custom && customApplied.current) requestAnimationFrame(() => baseURLInput.current?.focus({ preventScroll: false }));
  }, [wantsCustom, custom]);
  const baseURL = draft.baseURL.trim().replace(/\/+$/, ''), urlError = custom && baseURL ? codexBaseURLError(baseURL) : null;
  let modelIds = [], modelError = null;
  try { modelIds = parseCodexModels(draft.models); } catch (failure) { modelError = failure.message; }
  // A local model server on this Mac (LM Studio, Ollama) takes no key.
  const local = custom && !!baseURL && !urlError && codexLocalEndpoint(baseURL);
  const typedKey = draft.apiKey.trim(), keyReady = !!view?.hasKey || !!typedKey || local;
  // Which local model servers are running (codex-provider-local), asked when Custom endpoint is chosen.
  const [localServers, setLocalServers] = useState(null);
  useEffect(() => {
    if (!custom || typeof desktopCall !== 'function') return undefined;
    let live = true;
    Promise.resolve().then(() => desktopCall('model-settings', { op: 'codex-provider-local' })).then(result => { if (live) setLocalServers(Array.isArray(result?.servers) ? result.servers : []); }, () => { if (live) setLocalServers([]); });
    return () => { live = false; };
  }, [custom]);
  const useLocal = server => edit({ baseURL: server.baseURL, ...(server.models?.length ? { models: server.models.join('\n') } : {}) });
  const dirty = !!view && (draft.mode !== view.mode || !!typedKey || (custom && (baseURL !== (view.baseURL || '')
    || modelIds.join('\n') !== (view.models || []).join('\n') || draft.webSearch !== (view.webSearch === true))));
  const canSave = dirty && !disabled && (!custom || (!!baseURL && !urlError && !modelError && modelIds.length > 0 && keyReady));
  const canProbe = !disabled && !!baseURL && !urlError && keyReady;
  const edit = patch => { setError(''); setTested(null); setDraft(current => ({ ...current, ...patch })); };
  const set = key => event => edit({ [key]: event.target.value });
  const call = async (key, payload, done) => {
    setBusy(key); setError(''); setTested(null);
    try { done(await desktopCall('model-settings', payload)); }
    catch (failure) { if (key === 'test') setTested({ ok: false, message: failure?.message || String(failure) }); else setError(failure?.message || String(failure)); }
    finally { setBusy(''); }
  };
  const save = (key, provider, apiKey) => call(key, { op: 'codex-provider-save', provider, apiKey }, result => { adopt(result); setPending(true); });
  const submit = event => {
    event.preventDefault(); event.stopPropagation();
    if (canSave) void save('save', custom ? { mode: 'custom', baseURL, models: modelIds, webSearch: draft.webSearch } : { mode: 'openai' }, typedKey || undefined);
  };
  // Fill the model ids from the endpoint's /models (typed or saved key).
  const fetchModels = () => call('models', { op: 'codex-provider-models', baseURL, apiKey: typedKey || undefined }, result => {
    if (!result?.models?.length) setError(t('The endpoint didn’t list any models.'));
    else setDraft(current => ({ ...current, models: result.models.join('\n') }));
  });
  const test = () => call('test', { op: 'codex-provider-test', baseURL, apiKey: typedKey || undefined, model: modelIds[0] }, result => setTested({ ok: true, ms: Math.round(Number(result?.ms) || 0) }));
  // A provider set in the user's own config.toml (model_provider): that is where requests go while this page says OpenAI.
  const fromConfig = !custom && view?.configProvider ? view.configProvider : null;
  const rows = [
    settingRow('codex-provider', t('Provider'), custom ? t('Requests go to an OpenAI Responses-compatible endpoint you choose, such as a GPT relay.')
      : fromConfig ? (fromConfig.host ? t('Requests go to {name} ({host}), set in your Codex config.toml. Choose Custom endpoint to use one set here instead.', { name: fromConfig.name, host: fromConfig.host })
        : t('Requests go to {name}, set in your Codex config.toml. Choose Custom endpoint to use one set here instead.', { name: fromConfig.name }))
      : t('Requests go to OpenAI with the ChatGPT account or OpenAI API key you sign in with on Settings › General › Account.'),
      <SourceSegments label={t('{core} provider', { core })} value={draft.mode} disabled={disabled}
        options={[{ value: 'openai', label: fromConfig ? t('config.toml') : 'OpenAI' }, { value: 'custom', label: t('Custom endpoint') }]} onChange={mode => edit({ mode })}/>),
    ...(custom ? [
      // Codex's own --oss choices (tui oss_selection.rs): a model server running on this Mac, filled in with its models.
      settingRow('codex-local', t('Local model'), localServers === null ? t('Checking for LM Studio and Ollama on this Mac…')
        : localServers.some(server => server.running) ? t('Use a model server running on this Mac. No API key is needed.')
          : t('Start LM Studio (port 1234) or Ollama (port 11434) on this Mac to use a local model, then check again.'),
        <span className="msx-local">{CODEX_LOCAL_SERVERS.map(server => { const found = localServers?.find(entry => entry.id === server.id);
          return <SourceSettingsButton key={server.id} size="sm" variant={found?.running && baseURL === server.baseURL ? 'primary' : 'secondary'} disabled={disabled || !found?.running}
            title={found?.running ? t('{name} is running', { name: server.name }) : t('{name} isn’t running', { name: server.name })} onClick={() => useLocal(found ?? server)}>
            <span className="msx-local-dot" data-running={found?.running ? '' : undefined} aria-hidden="true"/>{server.name}</SourceSettingsButton>; })}
          <SourceSettingsButton size="sm" variant="ghost" disabled={disabled} onClick={() => { setLocalServers(null); void Promise.resolve(desktopCall('model-settings', { op: 'codex-provider-local' })).then(result => setLocalServers(Array.isArray(result?.servers) ? result.servers : []), () => setLocalServers([])); }}>{t('Check again')}</SourceSettingsButton>
        </span>),
      settingRow('codex-base-url', t('Base URL'), t('The endpoint’s OpenAI Responses-compatible root, usually ending in /v1; /responses is added.'),
        <input ref={baseURLInput} data-cds="TextInput" className="cds-input cds-reset msx-wide" aria-label={t('Endpoint base URL')} value={draft.baseURL} maxLength={512}
          spellCheck={false} autoCapitalize="off" autoComplete="off" disabled={disabled} placeholder="https://relay.example.com/v1"
          aria-invalid={urlError ? true : undefined} data-invalid={urlError ? '' : undefined} onChange={set('baseURL')}/>,
        urlError ? { below: <span className="ss-row-error">{urlError}</span> } : {}),
      settingRow('codex-api-key', t('API key'), local && !view?.hasKey ? t('Not needed for a model server on this Mac. Leave it empty unless your server asks for one.')
        : view?.hasKey ? t('Saved encrypted on this Mac. Type a new key to replace it.') : t('The key your endpoint issued. It’s stored encrypted on this Mac and never shown again.'),
        <input data-cds="TextInput" className="cds-input cds-reset msx-wide" type="password" aria-label={t('Endpoint API key')} value={draft.apiKey} maxLength={4096}
          autoComplete="off" spellCheck={false} disabled={disabled} placeholder={view?.hasKey ? `•••••••• ${t('Saved')}` : 'sk-…'} onChange={set('apiKey')}/>),
      settingRow('codex-models', t('Models'), t('The model ids the endpoint serves, one per line. The first one is the default.'),
        <SourceSettingsButton size="sm" disabled={!canProbe} busy={busy === 'models'} onClick={() => void fetchModels()}>{t('Fetch from endpoint')}</SourceSettingsButton>,
        { below: <>
          <textarea data-cds="TextArea" className="cds-input cds-reset msx-relay-models" aria-label={t('Endpoint model ids')} rows={4} value={draft.models}
            spellCheck={false} autoCapitalize="off" disabled={disabled} placeholder={'gpt-5.5\ngpt-5.5-mini'} aria-invalid={modelError ? true : undefined} onChange={set('models')}/>
          {modelError && <span className="ss-row-error">{modelError}</span>}
        </> }),
      settingRow('codex-web-search', t('Web search'), t('Lets {core} use OpenAI’s hosted web search tool. Many relays reject it, so it’s off by default.', { core }),
        <SourceSwitch label={t('Web search')} checked={draft.webSearch} disabled={disabled} onChange={webSearch => edit({ webSearch })}/>),
      settingRow('codex-test', t('Connection test'), t('Sends one small request to /responses. A relay can pass it and still reject parts of {core}’s full requests.', { core }),
        <SourceSettingsButton size="sm" disabled={!canProbe || !(modelIds[0] || view?.models?.[0])} busy={busy === 'test'} onClick={() => void test()}>{t('Test connection')}</SourceSettingsButton>,
        tested ? { below: tested.ok ? <span className="msx-ok" role="status">{t('Connected in {ms} ms.', { ms: tested.ms.toLocaleString('en-US') })}</span>
          : <span className="ss-row-error" role="alert">{tested.message}</span> } : {}),
    ] : []),
  ];
  return <form className="msx-connection" onSubmit={submit} noValidate>
    <SettingsGroup title={t('API connection')} rows={rows}>
      {custom && <p className="msx-callout">{t('{core} speaks only the OpenAI Responses API, so a relay that serves only /chat/completions can’t run it.', { core })}{' '}
        {t('Add a relay like that as a custom provider on DeepSeek Harness instead.')}</p>}
      {/* OpenAI with nothing saved, typed or pending has nothing to save: no footer with a lone disabled Save. */}
      {(custom || dirty || pending || !!error || !!view?.baseURL || (view && !view.available)) && <div className="msx-connection-footer">
        <span className="msx-connection-status" role="status">
          {error ? <span className="ss-row-error">{error}</span>
            : pending ? t('Saved. Restart the core to apply.')
              : view && !view.available ? t('The endpoint can’t be changed in this window.') : ''}
        </span>
        {!!view?.baseURL && <SourceSettingsButton size="sm" variant="ghost" disabled={disabled} busy={busy === 'remove'}
          onClick={() => void save('remove', { mode: 'openai', baseURL: '', models: [], webSearch: false }, null)}>{t('Remove endpoint')}</SourceSettingsButton>}
        {pending && onReconnect && !dirty ? <SourceSettingsButton size="sm" variant="primary"
          onClick={() => { setPending(false); void Promise.resolve(onReconnect()).catch(() => {}); }}>{t('Restart core')}</SourceSettingsButton>
          : <SourceSettingsButton type="submit" size="sm" variant="primary" disabled={!canSave} busy={busy === 'save'}>{t('Save')}</SourceSettingsButton>}
      </div>}
    </SettingsGroup>
  </form>;
}

export function SourceModelsSettings({ config = {}, boot, engine, desktopCall, onSave, onReconnect, onQuickSetup }) {
  const core = boot?.core ?? engine, caps = coreCapabilities(core), coreLabel = coreName(core);
  // providerSettings (the DeepSeek bridge): the API connection, providers and prices; codexProvider: the Codex endpoint.
  const deepseek = caps.providerSettings === true, codexProvider = caps.codexProvider === true;
  // Custom providers: the DeepSeek core, and a bridge that reads the same providers file (capabilities.customProviders:
  // the OpenCode / MiMo bridge). Only the provider list is shared; the API connection and prices stay DeepSeek's.
  const customProviders = deepseek || caps.customProviders === true;
  // The same capability checks decorate() makes: modelParams for cores that read them (coreTakesModelParams), prices
  // for providerSettings or a bridge that reports it reads them (capabilities.priceOverrides).
  const billed = deepseek || caps.priceOverrides === true, modelParams = coreTakesModelParams(caps);
  const [optimistic, setOptimistic] = useState(undefined), [rowErrors, setRowErrors] = useState({});
  const [official, setOfficial] = useState({ loading: deepseek, prices: null, pricingUrl: null, peakWindows: null, unsupported: !deepseek });
  const [adding, setAdding] = useState(null);
  const [providers, setProviders] = useState({ available: false, protocols: [...PROVIDER_PROTOCOLS], providers: [], changed: false, error: '' });
  const [providerDialog, setProviderDialog] = useState(null), [providerBusy, setProviderBusy] = useState('');
  const writes = useRef(0);
  const saved = normalize(config.modelSettings);
  const current = optimistic === undefined ? saved : normalize(optimistic);
  const allModels = (boot?.models || []).filter(model => model && typeof model.model === 'string');
  // A long catalog (OpenCode with OpenRouter: hundreds of models) gets a search field; the rows follow it.
  const [modelQuery, setModelQuery] = useState('');
  const modelSearch = allModels.filter(model => model.hidden !== true).length > MODEL_SEARCH_THRESHOLD;
  const models = modelSearch && modelQuery.trim() ? filterModels(allModels, modelQuery) : allModels;
  const connected = boot?.connected !== false;
  // Per-model options are kept under the running core's id (prefs/model-names.mjs, prefs/model-settings.mjs).
  const coreId = bootModelsCoreId(boot, config);

  useEffect(() => {
    if (!deepseek || typeof desktopCall !== 'function') { setOfficial(value => ({ ...value, loading: false, unsupported: true })); return; }
    let live = true;
    setOfficial(value => ({ ...value, loading: true }));
    Promise.resolve().then(() => desktopCall('model-settings', { op: 'official-prices' })).then(result => {
      if (!live) return;
      if (!result || result.unsupported) setOfficial({ loading: false, prices: null, pricingUrl: null, peakWindows: null, unsupported: true });
      else setOfficial({ loading: false, prices: result.official || {}, pricingUrl: result.pricingUrl || null, peakWindows: result.peakWindows || null, unsupported: false });
    }).catch(error => {
      if (!live) return;
      console.warn('Couldn’t read the official prices:', error);
      setOfficial({ loading: false, prices: null, pricingUrl: null, peakWindows: null, unsupported: false, error: error?.message || String(error) });
    });
    return () => { live = false; };
  }, [deepseek, connected, boot?.core?.engine]);
  useEffect(() => {
    if (!customProviders || typeof desktopCall !== 'function') return undefined;
    let live = true;
    Promise.resolve().then(() => desktopCall('model-settings', { op: 'providers-read' })).then(result => {
      if (live && result && Array.isArray(result.providers)) setProviders(value => ({ ...value, ...result, error: '' }));
    }).catch(error => { if (live) console.warn('Couldn’t read the custom providers:', error); });
    return () => { live = false; };
  }, [customProviders]);
  const providerCall = async (key, payload) => {
    setProviderBusy(key);
    try {
      const result = await desktopCall('model-settings', payload);
      setProviders(value => ({ ...value, ...result, changed: true, error: '' }));
      return result;
    } finally { setProviderBusy(''); }
  };

  async function commit(rowId, compute) {
    let next;
    try { next = compute(current); }
    catch (error) { setRowErrors(value => ({ ...value, [rowId]: error?.message || String(error) })); return false; }
    setOptimistic(next ?? null); setRowErrors(value => value[rowId] ? { ...value, [rowId]: null } : value); writes.current++;
    try { await onSave({ modelSettings: next ?? null }); return true; }
    catch (error) {
      console.warn(`Couldn’t save the ${rowId} setting:`, error);
      setRowErrors(value => ({ ...value, [rowId]: error?.message || String(error) }));
      setOptimistic(undefined);
      return false;
    } finally { if (--writes.current === 0) setOptimistic(undefined); }
  }

  const notice = !deepseek && !codexProvider && <p className="ss-connection-notice msx-notice" role="status">{customProviders ? t('{core} manages its own sign-in and prices. Endpoints you add under Custom providers join its models.', { core: coreLabel }) : t('{core} manages its own connection and prices.', { core: coreLabel })}</p>;

  // ---- Per-model options (source-settings-model-names.jsx): one collapsible entry per listed model, its everyday options
  // visible on the page (never under Advanced). Values are kept per core: modelParamsFor / setModelParam with coreId.
  const paramsOf = model => modelParamsFor(current, coreId, model.model);
  const paramField = (model, field, props) => {
    const rowId = `model-${model.model}-${field}`, tokens = field === 'contextWindow';
    return <NumberField {...props} tokens={tokens} invalid={!!rowErrors[rowId]} value={paramsOf(model)[field]}
      onCommit={(text, revert) => {
        const parsed = tokens ? parseTokenCount(text) : parseNumberInput(text), value = parsed === null ? undefined : parsed;
        if (Number.isNaN(value)) { setRowErrors(errors => ({ ...errors, [rowId]: t('Enter a number.') })); revert(); return; }
        void commit(rowId, settings => setModelParam(settings, model.model, field, value, coreId)).then(ok => { if (!ok) revert(); });
      }}/>;
  };
  const contextHelp = t('How many tokens the model can read, such as 128K or 1M ({min}–{max}). The core compacts the conversation before it fills up. Empty uses the model’s default.', { min: CONTEXT_WINDOW_MIN.toLocaleString('en-US'), max: CONTEXT_WINDOW_MAX.toLocaleString('en-US') });
  // Validation and save failures show their reason below the row.
  const below = rowId => rowErrors[rowId] ? { below: <span className="ss-row-error" title={rowErrors[rowId]}>{rowErrors[rowId]}</span> } : {};
  const effortsOf = model => (model.supportedReasoningEfforts || []).map(item => item?.reasoningEffort ?? item).filter(value => typeof value === 'string');
  const effortSelect = (model, name, efforts) => {
    const builtIn = model.defaultReasoningEffort ? effortName(model.defaultReasoningEffort) : '', effortId = `model-${model.model}-effort`;
    // The settings rows' standard 220px select: 'Model default (Medium)' fits without truncating.
    return <SourceSelect label={t('{name} default reasoning effort', { name })} align="end"
      value={paramsOf(model).effort ?? ''}
      items={[{ value: '', label: builtIn ? t('Model default ({effort})', { effort: builtIn }) : t('Model default') }, ...efforts.map(value => ({ value, label: effortName(value) }))]}
      onChange={value => void commit(effortId, settings => setModelParam(settings, model.model, 'effort', value || undefined, coreId))}/>;
  };
  // Max output tokens, Temperature and Context window reach the core only where it reads them (coreTakesModelParams;
  // the DeepSeek bridge always): elsewhere the rows are left out and the list says so.
  const takesParams = deepseek || modelParams;
  const [nameErrors, setNameErrors] = useState({});
  const optionRows = (model, name) => {
    const efforts = effortsOf(model), imagesId = `model-${model.model}-images`, nameId = `model-${model.model}-name`;
    const listedImages = modelAcceptsImages(model), imagesOff = paramsOf(model).images === false;
    return [
      settingRow(nameId, t('Display name'), t('Shown in the model menu, the model button and sessions. Empty uses the default name.'),
        <ModelNameField model={model} names={config.modelNames} coreId={coreId} onSave={onSave} onError={message => setNameErrors(value => ({ ...value, [nameId]: message }))}/>,
        nameErrors[nameId] ? { below: <span className="ss-row-error" title={nameErrors[nameId]}>{nameErrors[nameId]}</span> } : {}),
      settingRow(imagesId, t('Image input'), listedImages
        ? t('Attach and paste images for this model. Off keeps images out of the message box.')
        : t('{core} lists this model as text only, so images can’t be sent to it.', { core: coreLabel }),
        <SourceSwitch label={t('{name} image input', { name })} checked={listedImages && !imagesOff} disabled={!listedImages}
          onChange={value => void commit(imagesId, settings => setModelParam(settings, model.model, 'images', value ? undefined : false, coreId))}/>, below(imagesId)),
      ...(efforts.length ? [settingRow(`model-${model.model}-effort`, t('Default reasoning effort'), t('Applied when you switch to this model.'),
        effortSelect(model, name, efforts), below(`model-${model.model}-effort`))] : []),
      ...(takesParams ? [
        settingRow(`model-${model.model}-contextWindow`, t('Context window'), contextHelp,
          paramField(model, 'contextWindow', { label: t('{name} context window', { name }) }), below(`model-${model.model}-contextWindow`)),
        settingRow(`model-${model.model}-maxTokens`, t('Max output tokens'), t('{min}–{max}. Empty uses the model’s default.', { min: MAX_TOKENS_MIN.toLocaleString('en-US'), max: MAX_TOKENS_MAX.toLocaleString('en-US') }),
          paramField(model, 'maxTokens', { label: t('{name} max output tokens', { name }), min: MAX_TOKENS_MIN, max: MAX_TOKENS_MAX, step: 1 }), below(`model-${model.model}-maxTokens`)),
        settingRow(`model-${model.model}-temperature`, t('Temperature'), t('0–2. Lower is more focused, higher more varied. Empty uses the model’s default.'),
          paramField(model, 'temperature', { label: t('{name} temperature', { name }), min: 0, max: 2, step: 0.1 }), below(`model-${model.model}-temperature`)),
      ] : []),
    ];
  };
  // A short list opens every entry; a long catalog (OpenCode through OpenRouter) opens only the models already changed.
  const listedModels = models.filter(model => model.hidden !== true), openAll = listedModels.length <= MODEL_ENTRIES_OPEN;
  const modelEntries = listedModels.map(model => {
    const defaultName = defaultModelName(model), name = customModelName(config.modelNames, coreId, model.model) || defaultName;
    const efforts = effortsOf(model), speeds = speedTiersForModel(model), fast = !!fastTierForModel(model) || speeds.length > 0;
    const meta = (efforts.length > 0 || fast) && <span className="msx-model-meta">
      {efforts.length > 0 && <span><span className="msx-model-meta-label">{t('Reasoning efforts')}</span>{' '}
        {efforts.map((value, index) => <React.Fragment key={value}>{index ? ' · ' : ''}<span data-top-tier={isHighestEffort(value, efforts) || undefined}>{effortName(value)}</span></React.Fragment>)}</span>}
      {fast && <span className="msx-badge">{speeds.length > 1 ? t('{speeds} available', { speeds: speeds.map(tier => tier.name).join(' · ') }) : t('Fast available')}</span>}
    </span>;
    const customized = openAll || Object.keys(paramsOf(model)).length > 0 || name !== defaultName;
    return <ModelOptionsEntry key={model.model} model={model} name={name} defaultName={defaultName} customized={customized} rows={optionRows(model, name)}
      badges={<>{model.isDefault && <span className="msx-badge">{t('Default')}</span>}{customModelName(config.modelNames, coreId, model.model) && <span className="msx-badge">{t('Renamed')}</span>}</>}
      description={(model.description || meta) && <span className="msx-model-desc">{model.description && <span>{model.description}</span>}{meta}</span>}/>;
  });
  const modelsEmpty = <p className="msx-empty">{modelQuery.trim() && modelSearch ? t('No matching models') : connected ? t('No models are available yet.') : t('Connect to load the model list.')}</p>;
  const modelsSearch = modelSearch && <input type="search" data-cds="TextInput" className="cds-input cds-reset msx-model-search" aria-label={t('Search models')} placeholder={t('Search models')}
    value={modelQuery} spellCheck={false} autoComplete="off" onChange={event => setModelQuery(event.target.value)}/>;
  const modelsGroup = <SettingsGroup title={deepseek ? t('Models') : t('{core} models', { core: coreLabel })}>
    {modelEntries.length ? modelEntries : modelsEmpty}
    {modelEntries.length > 0 && !takesParams && <p className="msx-note msx-models-note">{t('{core} keeps its own context window and output limits, so they aren’t set here.', { core: coreLabel })}</p>}
  </SettingsGroup>;

  // ---- Pricing
  const officialPrices = official.prices || {};
  const prices = effectivePrices(current, officialPrices);
  const priceIds = Object.keys(prices);
  const customPrices = !!current.prices;
  const pricingUrl = official.pricingUrl || DEFAULT_PRICING_URL;
  const priceTable = id => {
    const entry = prices[id], name = entry.displayName || officialPrices[id]?.displayName || id, rowId = `price-${id}`;
    const edited = customPrices && priceEdited(prices, officialPrices, id);
    return <div key={id} className="msx-price" data-setting-id={rowId} role="group" aria-label={t('{name} prices', { name })}>
      <div className="msx-price-head">
        <span className="text-body settings-row-title">{name}</span>
        {name !== id && <code className="msx-price-id">{id}</code>}
        {edited && <span className="msx-badge">{officialPrices[id] ? t('Edited') : t('Added')}</span>}
        {!officialPrices[id] && <SourceSettingsButton variant="ghost" size="sm" className="msx-price-remove" aria-label={t('Remove {name} price', { name })}
          onClick={() => void commit(rowId, settings => removePrice(settings, officialPrices, id))}>{t('Remove')}</SourceSettingsButton>}
      </div>
      <table className="msx-price-table">
        <thead><tr><th scope="col"><span className="sr-only">{t('Tier')}</span></th>{PRICE_FIELDS.map(field => <th key={field} scope="col">{FIELD_LABELS[field]}</th>)}</tr></thead>
        <tbody>{PRICE_TIERS.map(tier => <tr key={tier}><th scope="row">{TIER_LABELS[tier]}</th>{PRICE_FIELDS.map(field => <td key={field}>
          <NumberField className="msx-price-input" label={t('{name} {tier} {field} price', { name, tier: TIER_LABELS[tier].toLowerCase(), field: FIELD_LABELS[field].toLowerCase() })} placeholder="0"
            min={0} max={10000} step={0.01} invalid={!!rowErrors[rowId]} value={entry[tier][field]}
            onCommit={(text, revert) => {
              const value = parseNumberInput(text);
              if (value === undefined || Number.isNaN(value)) { setRowErrors(errors => ({ ...errors, [rowId]: t('Enter a price.') })); revert(); return; }
              void commit(rowId, settings => setPrice(settings, officialPrices, id, tier, field, value)).then(ok => { if (!ok) revert(); });
            }}/>
        </td>)}</tr>)}</tbody>
      </table>
      {rowErrors[rowId] && <div className="ss-row-below"><span className="ss-row-error" title={rowErrors[rowId]}>{rowErrors[rowId]}</span></div>}
    </div>;
  };
  const addForm = adding && <form className="msx-add" onSubmit={async event => {
    event.preventDefault(); event.stopPropagation();
    const ok = await commit('price-add', settings => addPrice(settings, officialPrices, adding.id, adding.name));
    if (ok) setAdding(null);
  }}>
    <input data-cds="TextInput" className="cds-input cds-reset msx-text" aria-label={t('Model id')} placeholder={t('Model id, e.g. deepseek-chat')} value={adding.id} maxLength={128} spellCheck={false} autoFocus
      onChange={event => { const id = event.currentTarget.value; setAdding(value => ({ ...value, id })); }}/>
    <input data-cds="TextInput" className="cds-input cds-reset msx-text" aria-label={t('Display name')} placeholder={t('Display name (optional)')} value={adding.name} maxLength={60}
      onChange={event => { const name = event.currentTarget.value; setAdding(value => ({ ...value, name })); }}/>
    <SourceSettingsButton type="submit" variant="primary" size="sm" disabled={!adding.id.trim()}>{t('Add')}</SourceSettingsButton>
    <SourceSettingsButton variant="ghost" size="sm" onClick={() => { setAdding(null); setRowErrors(value => ({ ...value, 'price-add': null })); }}>{t('Cancel')}</SourceSettingsButton>
    {rowErrors['price-add'] && <span className="ss-row-error msx-add-error" role="alert">{rowErrors['price-add']}</span>}
  </form>;
  const pricingRows = [
    settingRow('pricing-source', t('Price table'), <>
      {t('CNY per 1M tokens, used for the estimated cost on the Usage page.')}{deepseek && <> {customPrices ? t('Your prices replace the official ones.') : t('Showing DeepSeek’s official prices.')}</>}
      {official.peakWindows && <> {t('Peak: {windows}.', { windows: official.peakWindows })}</>}
    </>, deepseek ? <div className="msx-actions">
      <SourceSettingsButton variant="ghost" size="sm" icon="ArrowUpRight" iconPosition="end" onClick={() => void Promise.resolve(desktopCall?.('external', { url: pricingUrl })).catch(() => {})}>{t('Official pricing')}</SourceSettingsButton>
      <SourceSettingsButton size="sm" disabled={!customPrices} onClick={() => void commit('pricing-source', settings => resetPrices(settings))}>{t('Reset to official prices')}</SourceSettingsButton>
    </div> : null, below('pricing-source')),
  ];

  const pricingGroup = billed && <SettingsGroup title={t('Pricing')} rows={pricingRows}>
    <div className="msx-prices" aria-busy={official.loading || undefined}>
      {official.loading && !priceIds.length && <p className="msx-empty" role="status">{t('Loading prices…')}</p>}
      {!official.loading && !priceIds.length && <p className="msx-empty">{official.error ? t('Couldn’t load the official prices.') : t('No prices yet.')}</p>}
      {priceIds.map(priceTable)}
    </div>
    <div className="msx-add-row">
      {addForm || <SourceSettingsButton size="sm" icon="Add" disabled={official.loading} onClick={() => setAdding({ id: '', name: '' })}>{t('Add model price')}</SourceSettingsButton>}
    </div>
  </SettingsGroup>;

  // ---- Custom providers (the Harness llm-pi-ai adapter, DeepSeek core only)
  const providerRows = providers.providers.map(provider => settingRow(`provider-${provider.route}`, provider.displayName ? `${provider.displayName} (${provider.route})` : provider.route,
    `${PROTOCOL_LABELS[provider.api] || provider.api} · ${provider.baseURL} · ${providerModelSummary(provider)} · ${provider.hasKey ? t('key saved') : t('no key')}`,
    <div className="msx-actions">
      <SourceSettingsButton size="sm" variant="ghost" disabled={!!providerBusy} aria-label={t('Edit {name}', { name: provider.displayName || provider.route })} onClick={() => setProviderDialog({ initial: provider })}>{t('Edit')}</SourceSettingsButton>
      <SourceSettingsButton size="sm" disabled={!!providerBusy} busy={providerBusy === provider.route} aria-label={t('Remove {name}', { name: provider.displayName || provider.route })}
        onClick={() => void providerCall(provider.route, { op: 'provider-remove', route: provider.route }).catch(error => setProviders(value => ({ ...value, error: error?.message || String(error) })))}>{t('Remove')}</SourceSettingsButton>
    </div>));
  const providerGroup = customProviders && providers.available && <SettingsGroup title={t('Custom providers')} rows={providerRows}>
    {!providerRows.length && <p className="msx-empty">{deepseek ? t('Add an OpenAI-compatible endpoint to use its models next to DeepSeek’s.') : t('Add an OpenAI-compatible endpoint, such as a relay or a self-hosted server, to use its models in {core}.', { core: coreLabel })}</p>}
    {providers.error && <p className="ss-row-error msx-provider-error" role="alert">{providers.error}</p>}
    <div className="msx-add-row msx-provider-actions">
      <SourceSettingsButton size="sm" icon="Add" disabled={!!providerBusy} onClick={() => setProviderDialog({ initial: null })}>{t('Add provider')}</SourceSettingsButton>
      {providers.changed && <><span className="msx-pending" role="status">{t('Restart the core to apply.')}</span>
        {onReconnect && <SourceSettingsButton size="sm" variant="primary" onClick={() => { setProviders(value => ({ ...value, changed: false })); void Promise.resolve(onReconnect()).catch(() => {}); }}>{t('Restart core')}</SourceSettingsButton>}</>}
    </div>
  </SettingsGroup>;

  const providerDialogNode = providerDialog && <ProviderDialog initial={providerDialog.initial} protocols={providers.protocols?.length ? providers.protocols : [...PROVIDER_PROTOCOLS]} harness={deepseek} coreLabel={coreLabel}
    onCancel={() => setProviderDialog(null)}
    onSubmit={async ({ provider, previousRoute, apiKey }) => {
      await providerCall(provider.route, { op: 'provider-save', provider, previousRoute, apiKey });
      setProviderDialog(null);
    }}/>;

  // Any core but the DeepSeek bridge: its connection (Codex) or a notice, then its models (no prices: only the
  // providerSettings bridge reads them).
  if (!deepseek) return <div className="msx-page" data-models-layout={codexProvider ? 'codex' : 'core'}>
    {notice}
    {codexProvider && <CodexConnectionGroup core={coreLabel} desktopCall={desktopCall} onReconnect={onReconnect}/>}
    {modelsSearch}
    {modelsGroup}
    {modelEntries.length > 0 && <p className="msx-note msx-models-note">{t('Pick the model new sessions use in Settings › Code › Model and permissions, or in the composer. A default effort set here applies whenever you switch to that model.')}</p>}
    {codexProvider && <CodexResponseGroup core={coreLabel} desktopCall={desktopCall} connected={connected}/>}
    {codexProvider && <CodexSubagentsGroup core={coreLabel} desktopCall={desktopCall} connected={connected} models={allModels}/>}
    {!codexProvider && providerGroup}
    {!codexProvider && providerDialogNode}
  </div>;

  // Advanced (pricing and custom providers) starts open when something in it was already changed.
  const customized = !!saved.prices;
  return <div className="msx-page">
    {onQuickSetup && <SettingsGroup title={t('Quick setup')} rows={[settingRow('quick-setup', t('Connect another model'), t('Pick a vendor’s official API (DeepSeek, GLM, Kimi, Qwen, MiniMax, MiMo and more), test it and make it the default model.'),
      <SourceSettingsButton size="sm" onClick={onQuickSetup}>{t('Quick setup…')}</SourceSettingsButton>)]}/>}
    <ConnectionGroup deepseek={deepseek} desktopCall={desktopCall} onReconnect={onReconnect}/>
    {modelsSearch}
    {modelsGroup}
    <p className="msx-note">{t('Defaults for every DeepSeek session; changes apply from the next request. top_p is not supported by the DeepSeek Harness adapter.')}</p>
    <SourceDisclosure className="msx-advanced" triggerClassName="msx-advanced-trigger" defaultOpen={customized}
      label={<span className="msx-advanced-label"><span className="text-heading-semibold">{t('Advanced')}</span><span className="msx-advanced-hint">{t('Pricing and custom providers')}</span></span>}>
    <div className="msx-advanced-body">
    {pricingGroup}
    {providerGroup}
    </div>
    </SourceDisclosure>
    {providerDialogNode}
  </div>;
}
