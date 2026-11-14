import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { settingsPatch } from '../electron/preferences.mjs';
import { createImmediateTextSave } from './immediate-text-save.mjs';
import { t } from '../electron/i18n/index.mjs';
import './source-code-font-setting.css';

// c71860c77 _i → shared-frame Bh: w-56, no Save button, change-driven value.
export function SourceCodeFontSetting({ value, placeholder, onSave }) {
  const [draft, setDraft] = useState(value);
  const [status, setStatus] = useState({ saving: false, error: '' });
  const controller = useRef(null), composing = useRef(false), latest = useRef(null), previous = useRef(value);
  const errorId = useId(); latest.current = { onSave, value };
  useLayoutEffect(() => {
    const owner = createImmediateTextSave({
      // Same pure rules as the real main process. Rejected text remains editable
      // but does not supersede an earlier valid preference acknowledgement.
      validate: text => { settingsPatch({}, { codeFont: text }); },
      save: text => latest.current.onSave(text), onState: setStatus,
    });
    controller.current = owner;
    return () => { owner.dispose(); controller.current = null; };
  }, []);
  useEffect(() => {
    const old = previous.current; previous.current = value;
    setDraft(current => current === old ? value : current);
  }, [value]);
  const commit = text => { setDraft(text); void controller.current?.submit(text, latest.current.value); };
  return <div className="ss-code-font-setting">
    <input data-cds="TextInput" className="cds-input cds-reset" aria-label={t('Code font family')}
      value={draft} placeholder={placeholder} maxLength={120} spellCheck={false}
      aria-busy={status.saving || undefined} aria-invalid={status.error ? true : undefined}
      data-invalid={status.error ? '' : undefined} aria-describedby={status.error ? errorId : undefined}
      onChange={event => {
        if (composing.current || event.nativeEvent.isComposing) {
          setDraft(event.currentTarget.value); controller.current?.invalidate();
        } else commit(event.currentTarget.value);
      }}
      onCompositionStart={() => { composing.current = true; controller.current?.invalidate(); }}
      onCompositionEnd={event => { composing.current = false; commit(event.currentTarget.value); }}
      onBlur={event => { if (composing.current) { composing.current = false; commit(event.currentTarget.value); } }}
      onKeyDown={event => {
        if (composing.current || event.nativeEvent.isComposing) {
          if (event.key === 'Escape' || event.key === 'Enter') event.stopPropagation();
          return;
        }
        if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); commit(event.currentTarget.value); }
      }}/>
    {status.error && <span id={errorId} className="ss-error" role="alert">{status.error}</span>}
  </div>;
}
