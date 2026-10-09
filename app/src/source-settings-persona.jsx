import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createManualTextSave } from './manual-text-save.mjs';
import { SourceSettingsButton } from './source-settings-button.jsx';
import { SourceSegments } from './source-segments.jsx';
import { PersonaSparkGlyph } from './source-spark.jsx';
import { assistantNameError, normalizePersona, personaGreetingError, PERSONA_DEFAULT, ASSISTANT_NAME_MAX, GREETING_MAX } from '../electron/prefs/persona.mjs';
import { getAssistantName, t } from '../electron/i18n/index.mjs';
import './source-profile-setting.css';
import './persona-settings.css';

// C2 persona rows on the Preferences page, directly after Profile. Renderer copy
// only: the assistant name, the home greeting template and the assistant icon.
// Every save sends the whole persona object (read-modify-write over config).

export const PERSONA_ICON_OPTIONS = Object.freeze([
  { value: 'spark', label: t('Spark') },
  { value: 'star', label: t('Star') },
  { value: 'lightning', label: t('Lightning') },
  { value: 'chat', label: t('Chat') },
  { value: 'custom', label: t('Custom image') },
]);
const SAVE_ERROR = t('Couldn’t save the setting. Try again.');
// Image-pick and image-validation messages are shown as they are (main may send them translated).
const IMAGE_ERRORS = new Set(['The image is too large. Choose one under 256 KB.', 'Choose a PNG, JPEG, WebP or SVG image.', 'Choose an image for the custom icon.'].map(text => t(text)));

export function isDefaultPersona(persona) {
  const value = normalizePersona(persona);
  return Object.keys(PERSONA_DEFAULT).every(key => value[key] === PERSONA_DEFAULT[key]);
}

// The saved persona strings are trimmed (normalizePersona), so the field compares its draft trimmed: "Bob " saved as
// "Bob" settles on the saved value instead of keeping Save / Discard up for an edit that can never be stored.
export const personaDraftDirty = (draft, value) => draft.trim() !== value;
/** The draft once the saved value changes: an untouched field, or an edit the save stored, follows the saved value. */
export function settledPersonaDraft(current, value, edited) {
  if (!edited || current.trim() === value) return { draft: value, edited: false };
  return { draft: current, edited: true };
}

/** Manual-save text field (SourceProfileSetting pattern) for one persona string. */
export function PersonaTextField({ label, value, placeholder, maxLength, validate, onSave, help }) {
  const [draft, setDraft] = useState(value), [status, setStatus] = useState({ saving: false, error: '' });
  const latest = useRef({ value, onSave }), edited = useRef(false), owner = useRef(null), input = useRef(null), composing = useRef(false);
  const errorId = useId(), helpId = useId(); latest.current = { value, onSave };
  useLayoutEffect(() => {
    const controller = createManualTextSave({ save: text => latest.current.onSave(text), validate: text => { const error = validate(text); if (error) throw new Error(error); }, onState: setStatus });
    owner.current = controller; return () => { controller.dispose(); owner.current = null; };
  }, []);
  useEffect(() => { setDraft(current => { const next = settledPersonaDraft(current, value, edited.current); edited.current = next.edited; return next.draft; }); }, [value]);
  const dirty = personaDraftDirty(draft, value);
  return <form className="ss-profile-setting persona-field" onSubmit={event => { event.preventDefault(); event.stopPropagation(); if (!composing.current && dirty) void owner.current?.submit(draft); }}>
    <input ref={input} data-cds="TextInput" className="cds-input cds-reset" aria-label={label} value={draft} maxLength={maxLength} placeholder={placeholder}
      aria-invalid={status.error ? true : undefined} data-invalid={status.error ? '' : undefined}
      aria-describedby={[status.error ? errorId : '', help ? helpId : ''].filter(Boolean).join(' ') || undefined}
      onChange={event => { edited.current = status.saving || event.currentTarget.value !== latest.current.value; setDraft(event.currentTarget.value); owner.current?.edit(); }}
      onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
      onKeyDown={event => { if ((composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) && (event.key === 'Enter' || event.key === 'Escape')) { event.preventDefault(); event.stopPropagation(); } }} />
    {help && <span id={helpId} className="persona-help">{help}</span>}
    {status.error && <span id={errorId} className="ss-error" role="alert">{status.error}</span>}
    {dirty && <div className="ss-profile-actions" data-size="sm">
      <SourceSettingsButton type="submit" variant="primary" size="sm" busy={status.saving}>{t('Save')}</SourceSettingsButton>
      <SourceSettingsButton variant="ghost" size="sm" disabled={status.saving} onClick={() => { owner.current?.edit(); edited.current = false; setDraft(latest.current.value); input.current?.focus(); }}>{t('Discard')}</SourceSettingsButton>
    </div>}
  </form>;
}

function IconPreview({ persona }) {
  return <span className="persona-preview" data-persona-preview="">
    {persona.sparkIcon === 'spark' || (persona.sparkIcon === 'custom' && !persona.sparkImage)
      ? <img src="./assets/v1/claude-spark.svg" alt="" width="24" height="24" />
      : <PersonaSparkGlyph persona={persona} size={24} />}
  </span>;
}

/** Spark / Star / Lightning / Chat / Custom image, with a 24px preview. */
export function PersonaIconControl({ persona, onSave, desktopCall }) {
  const [optimistic, setOptimistic] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const shown = optimistic ?? persona;
  const write = async next => {
    setOptimistic(next); setError('');
    try { await onSave(next); } catch (e) { console.warn('Couldn’t save the persona icon:', e); setError(e?.message || String(e)); }
    finally { setOptimistic(null); }
  };
  const pick = async () => {
    if (busy) return null; setBusy(true); setError('');
    try {
      const result = await desktopCall('persona', { op: 'pick-image' });
      if (!result?.dataUrl) return null;
      await write({ ...persona, sparkIcon: 'custom', sparkImage: result.dataUrl });
      return result.dataUrl;
    } catch (e) { setError(e?.message || String(e)); return null; }
    finally { setBusy(false); }
  };
  const choose = value => {
    if (value === 'custom' && !persona.sparkImage) { void pick(); return; }
    void write({ ...persona, sparkIcon: value });
  };
  return <div className="persona-icon-row">
    <IconPreview persona={shown} />
    <SourceSegments label={t('Assistant icon')} value={shown.sparkIcon} options={PERSONA_ICON_OPTIONS} disabled={busy} onChange={choose} />
    <SourceSettingsButton variant="secondary" size="sm" busy={busy} onClick={() => { void pick(); }}>{t('Choose image…')}</SourceSettingsButton>
    {error && <span className="ss-row-error" role="alert" title={error}>{/^(Choose|The image)/.test(error) || IMAGE_ERRORS.has(error) ? t(error) : SAVE_ERROR}</span>}
  </div>;
}

function ResetPersonaButton({ persona, onSave }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  return <>
    <SourceSettingsButton variant="secondary" size="sm" busy={busy} disabled={isDefaultPersona(persona)}
      onClick={async () => { setBusy(true); setError(''); try { await onSave(null); } catch (e) { setError(e?.message || String(e)); } finally { setBusy(false); } }}>{t('Reset')}</SourceSettingsButton>
    {error && <span className="ss-row-error" title={error}>{SAVE_ERROR}</span>}
  </>;
}

/** The Persona group for source-settings.jsx (tab 'preferences', after Profile). */
export function personaGroup({ config = {}, onSave, desktopCall }) {
  const persona = normalizePersona(config.persona);
  const savePersona = next => onSave({ persona: next === null ? null : normalizePersona(next) });
  const saveField = key => text => onSave({ persona: { ...normalizePersona(config.persona), [key]: text.trim() } });
  const row = (id, label, description, control, below) => ({ id, label, description, control, below });
  return { tab: 'preferences', title: 'Persona', rows: [
    row('persona-name', t('Assistant name'), t('Shown in approval titles, notifications and the transcript.'), null,
      <PersonaTextField label={t('Assistant name')} value={persona.assistantName} placeholder={getAssistantName()} maxLength={ASSISTANT_NAME_MAX}
        validate={assistantNameError} onSave={saveField('assistantName')} />),
    row('persona-greeting', t('Home greeting'), t('The heading on the home page.'), null,
      <PersonaTextField label={t('Home greeting')} value={persona.greeting} placeholder={t('What’s up next, {name}?')} maxLength={GREETING_MAX}
        validate={personaGreetingError} onSave={saveField('greeting')}
        help={<>{t('Use')} <code>{'{name}'}</code> {t('for your first name. Leave empty for the default greeting.')}</>} />),
    // The picker is wider than a compact control, so it sits in the row's below slot (shared-21 Av) like the text
    // fields above it, and the description keeps the full row width.
    row('persona-icon', t('Assistant icon'), t('Replaces the spark in the sidebar, the home page and while it works.'), null,
      <PersonaIconControl persona={persona} onSave={savePersona} desktopCall={desktopCall} />),
    row('persona-reset', t('Reset persona'), t('Restore the default name, greeting and icon.'),
      <ResetPersonaButton persona={persona} onSave={savePersona} />),
  ] };
}
