// A plugin's Settings tab (menus:N2), after 3.6556.2 c24c8737b-Czj7X1dz:
//   ol  — `en = Be ? $t : void 0` ($t = shared-130 RE's data), then `if (en) t.push({ id: "settings", href: se("settings"),
//         label: i(yc, { options: en }) })` after Agents; the panel is `rn === "settings" && en && i(bc, { pluginId: Qt,
//         options: en, connectorPageStyle: H }, Qt)`.
//   yc  — the tab label: "Settings" and, while a required field is empty (vc), a warning xs Badge "Needs setup".
//   bc  — the form: intro, the warning Banner, one field per schema entry (a boolean is a checkbox row, 2–5 choices a
//         radio group, other choices a select, else a text field), and a secondary Save at the end.
//   shared-130 RE / BE — the query (`[IE, e]`, LE: `U?.getPluginOptions?.(e, PT)`, PT = {mode:"ccd"}) and the save
//         mutation, which reads the options back after a save that went through (`isReadBack`).
// The CDS parts come from view-tabs (facade, R6: nothing in the chat / composer / menu graphs imports this file) and the
// Field parts are the same shared-frame slice (c24c8737b imports `Mi as x, ji as k, ki as A, Ai as h`). The radio group
// is the generated shared-frame dV (`yt as N` → CdsRadioGroup) and a select the generated yP (`Si as w` →
// CdsComboboxField), both through the view-tabs facade (V3-w12-settings-radio); a text field is the generated shared-frame eM
// (`Oi as C` → CdsTextInputField) and a boolean the generated c09817156 h (`t as Sn` → CdsCheckboxRow) (W12
// frame-settings-cont). No host copy of a CDS part is left here.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CdsBadge, CdsBanner, CdsButton, CdsCheckboxRow, CdsComboboxField, CdsField, CdsFieldDescription, CdsFieldError, CdsFieldLabel, CdsRadioGroup, CdsTextInputField } from './generated/view-tabs/index.js';
import { sanitizeMultilineText, sanitizeText } from './generated/r4e-plugin/text-sanitize.mjs';
import { useSourceToasts } from './source-toast.jsx';
import { t } from '../electron/i18n/index.mjs';

export const PLUGIN_OPTIONS_CONTEXT = Object.freeze({ mode: 'ccd' }); // shared-130 PT
const RADIO_MAX = 5; // _c
const CONNECTOR_PAGE_INSET = 'px-md md:px-xl'; // shared-19 Um (exported as Rc, c24c8737b fn)
const own = (object, key) => object && typeof object === 'object' && Object.hasOwn(object, key) ? object[key] : undefined; // aa

// shared-52 sJ (H): a title shown only when it has something visible; rJ (ue) keeps a description's lines.
const visibleText = value => { const text = typeof value === 'string' ? sanitizeText(value).trim() : ''; return /^[\s\p{Cf}\p{Zs}]*$/u.test(text) ? '' : text; };
const descriptionText = value => typeof value === 'string' ? sanitizeMultilineText(value) : undefined;

// vc: a required field without a default is still empty.
export function pluginOptionsNeedSetup(options) {
  return !!options && options.unconfigured.some(key => { const entry = own(options.schema, key); return entry?.required === true && entry.default !== true; });
}

// ol's guard on RE's data: the shape the tab needs, else no tab.
export function pluginOptionsShape(value) {
  if (!value || typeof value !== 'object') return null;
  const record = key => value[key] && typeof value[key] === 'object' && !Array.isArray(value[key]) ? value[key] : null;
  const list = key => Array.isArray(value[key]) ? value[key].filter(item => typeof item === 'string') : null;
  const schema = record('schema'), inputs = record('inputs'), choices = record('choices'), configured = list('configured'), unconfigured = list('unconfigured');
  if (!schema || !inputs || !choices || !configured || !unconfigured || Object.keys(schema).length === 0) return null;
  return { schema, inputs, choices, configured, unconfigured };
}

// shared-130 RE (query) + BE (mutation) over the desktop bridge. `enabled` is ol's Be (an installed plugin page).
// V3-w11-sweep-shell-b: `cwd` — the Customize folder the page lists plugins for — scopes main's plugin/installed lookup.
export function usePluginOptions(pluginId, enabled, api = globalThis.desktop, cwd = null) {
  const [state, setState] = useState({ pluginId: null, data: undefined });
  const live = enabled && !!pluginId && typeof api?.call === 'function';
  const read = useCallback(() => api.call('plugin-options', { op: 'get', pluginId, pluginContext: PLUGIN_OPTIONS_CONTEXT, ...(cwd ? { cwd } : {}) }).then(pluginOptionsShape, () => null), [api, pluginId, cwd]);
  useEffect(() => {
    if (!live) return undefined;
    let current = true;
    read().then(data => { if (current) setState({ pluginId, data }); });
    return () => { current = false; };
  }, [live, read, pluginId]);
  const save = useCallback(async values => {
    const result = (await api.call('plugin-options', { op: 'set', pluginId, values, pluginContext: PLUGIN_OPTIONS_CONTEXT, ...(cwd ? { cwd } : {}) })) ?? { success: false };
    // BE: `i.success || (i.refused && !i.refused.option) ? await LE(n).catch(VE) : null` → setQueryData.
    const back = result.success || (result.refused && !result.refused.option) ? await read() : null;
    if (back) setState({ pluginId, data: back });
    return { ...result, isReadBack: back !== null };
  }, [api, pluginId, read, cwd]);
  const data = live && state.pluginId === pluginId ? state.data ?? null : null;
  return { data, save };
}

// yc
export function PluginSettingsTabLabel({ options }) {
  return <span className="inline-flex items-center gap-xs">{t('Settings')}{pluginOptionsNeedSetup(options) && <CdsBadge variant="warning" size="xs">{t('Needs setup')}</CdsBadge>}</span>;
}

// xc
const choiceItem = value => ({ value, label: visibleText(value) || value });

// bc
export function PluginSettingsPanel({ pluginId, options, connectorPageStyle = false, save }) {
  const toasts = useSourceToasts();
  const [edits, setEdits] = useState({});
  const [pending, setPending] = useState(false), [answer, setAnswer] = useState(null);
  const refused = answer?.refused, long = answer?.tooLong;
  const change = (key, value) => { setEdits(current => ({ ...current, [key]: value })); if (refused?.option === key || long?.option === key) setAnswer(null); };
  // T: the edits that name a declared option, plus each unconfigured choice field's shown value (so Save is offered).
  const values = useMemo(() => Object.fromEntries([
    ...Object.keys(options.choices).filter(key => options.unconfigured.includes(key)).map(key => [key, own(options.inputs, key) ?? '']),
    ...Object.entries(edits).filter(([key]) => own(options.schema, key)),
  ]), [edits, options]);
  const empty = Object.keys(values).length === 0;
  const failed = error => { toasts?.add(t('Couldn’t save changes. Try again.'), { variant: 'danger' }); if (error) console.warn(`[plugin-options] save failed: ${error?.message || error}`); };
  async function submit(event) {
    event.preventDefault();
    if (empty || pending) return;
    setPending(true); setAnswer(null);
    try {
      const result = await save(values);
      setAnswer(result);
      if (!result.success) {
        if (result.tooMuch) toasts?.add(t('Too many changes to save at once. Save a few settings at a time.'), { variant: 'danger' });
        else if (!result.refused?.option && !result.tooLong && result.unconfirmed !== 'declined') failed();
        return;
      }
      if (result.isReadBack) setEdits(current => Object.fromEntries(Object.entries(current).filter(([key, value]) => own(values, key) !== value)));
      if (result.saved?.length) toasts?.add(t('Settings saved. New sessions will use them.'));
    } catch (error) { failed(error); } finally { setPending(false); }
  }
  const fields = Object.entries(options.schema).map(([key, entry]) => {
    const value = own(edits, key) ?? own(options.inputs, key) ?? '';
    const label = visibleText(entry.title) || visibleText(key);
    const hint = entry.description ? descriptionText(entry.description) : undefined;
    const notAccepted = refused?.option === key ? refused.message || t('This value wasn’t accepted. Check it and try again.') : undefined;
    const error = long?.option === key ? t('Use {max} characters or fewer.', { max: new Intl.NumberFormat().format(long.max) }) : notAccepted;
    // `i(Sn,{label:o,description:l,error:d,checked:…,onCheckedChange:…},t)`, Sn = c09817156 h (view-tabs CdsCheckboxRow).
    if (entry.type === 'boolean') return <CdsCheckboxRow key={key} label={label} description={hint} error={error} checked={value === 'true'} onCheckedChange={checked => change(key, String(checked))} />;
    const hidden = entry.sensitive === true && options.configured.includes(key);
    const required = entry.required === true && entry.default !== true && !hidden;
    const shownLabel = required ? t('{label} (required)', { label }) : label;
    const items = own(options.choices, key)?.map(choiceItem);
    const keptHint = hidden ? <>{hint}{' '}{t('A value is saved and isn’t shown. Leave this blank to keep it.')}</> : hint;
    // bc: `x {invalid}` + `k` label + `N {options, value, onChange}` (dV) + `A` hint + `h {match}` error; else `w {label,
    // hint, error, items, value, onChange}` (yP). The radio group's labelling comes from the Field (Base UI), as in bc.
    if (items && items.length >= 2 && items.length <= RADIO_MAX) return <CdsField key={key} invalid={error !== undefined}>
      <CdsFieldLabel>{shownLabel}</CdsFieldLabel>
      <CdsRadioGroup options={items} value={value} onChange={next => change(key, next)} />
      {hint && <CdsFieldDescription>{hint}</CdsFieldDescription>}
      {error && <CdsFieldError match>{error}</CdsFieldError>}
    </CdsField>;
    if (items) return <CdsComboboxField key={key} label={shownLabel} hint={hint} error={error} items={items} value={value} onChange={next => change(key, next ?? '')} />;
    // `i(C,{label:_,hint:b,error:d,type:…,inputMode:…,autoComplete:"off","data-1p-ignore":!0,required:m,value:a,onChange:…},t)`,
    // C = shared-frame `Oi` = eM (view-tabs CdsTextInputField: Qj around uC).
    return <CdsTextInputField key={key} label={shownLabel} hint={keptHint} error={error} type={entry.sensitive === true ? 'password' : 'text'}
      inputMode={entry.type === 'number' ? 'decimal' : undefined} autoComplete="off" data-1p-ignore required={required} value={value}
      onChange={event => change(key, event.target.value)} />;
  });
  // cd359c6df b: data-cds="Form" (base gap-md), ⌘/Ctrl+Enter submits when the key comes from a node in the form
  // (`h(e.target)`, h = shared-frame qf: `typeof e?.nodeType=="number"`; V3-w11-sweep-shell-b).
  return <div className={connectorPageStyle === true ? CONNECTOR_PAGE_INSET : 'px-6'} data-plugin-settings={pluginId}>
    <form data-cds="Form" data-disabled={pending ? '' : undefined} noValidate className="flex flex-col gap-md max-w-lg" onSubmit={submit}
      onKeyDown={event => { if (!event.defaultPrevented && event.key === 'Enter' && (event.metaKey || event.ctrlKey) && typeof event.target?.nodeType === 'number' && event.currentTarget.contains(event.target) && !event.nativeEvent?.isComposing) { event.preventDefault(); if (!pending) event.currentTarget.requestSubmit(); } }}>
      <p className="text-body text-secondary">{t('These values are saved on this computer and used only by new sessions that run on it, not by SSH, WSL, or cloud sessions.')}</p>
      {pluginOptionsNeedSetup(options) && <CdsBanner variant="warning">{t('Parts of this plugin won’t work until you fill in the required fields.')}</CdsBanner>}
      {fields}
      <CdsButton type="submit" variant="secondary" className="self-end" busy={pending} disabled={empty}>{t('Save')}</CdsButton>
    </form>
  </div>;
}

// ol: the tab entry pushed after Agents while RE has data.
export function pluginSettingsTab(options) {
  return options ? { id: 'settings', label: 'Settings', description: '', items: [], options } : null;
}
