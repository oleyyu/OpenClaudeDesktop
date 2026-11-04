import React, { useLayoutEffect, useRef, useState } from 'react';
import { CdsButton, CdsField, CdsTextInput } from './generated/view-tabs/index.js';
import { parseEditorLocation, goToLineShortcut } from './file-editor-commands.mjs';
import { t } from '../electron/i18n/index.mjs';
import { suppressKeyRepeat } from './generated/code-editor-current/keyboard-repeat.mjs';

// 3.6556.2 cd2efac6e Qs: a compact subheader (c82eca2bd G, ownsEscape), not a modal: CdsField (Mi, invalid,
// "min-w-0 flex-1") around the CdsTextInput (vs), the aria-live "text-footnote text-muted-as-secondary tabular-nums"
// status and the base ghost iconOnly Close go to line bar (X, esc, "text-secondary"). Escape restores editor focus;
// clicking elsewhere dismisses without stealing that focus.
// c82eca2bd C (G), not flush, the "panels" gate closed: the pane subheader the find and go-to-line bars sit in, with
// data-pane-editor for ownsEscape. The module is not sliced (its G reads the fizzy-lake panels gate and c5a5ed580's
// class tables), so its class string is copied verbatim: H = `${V} bg-alpha-1`, U = the 2rem height.
export const PANE_SUBHEADER_CLASS = "epitaxy-panel-subheader flex items-center gap-[4px] shrink-0 px-md bg-alpha-1 h-[calc(2rem*var(--cds-rem-scale,1))]";
export function SourceFileGoToLine({ caret, onGo, onClose }) {
  const [query, setQuery] = useState('');
  const input = useRef(null);
  const location = parseEditorLocation(query), invalid = query.trim().length > 0 && !location;
  useLayoutEffect(() => { input.current?.focus(); }, []);
  return <div className={PANE_SUBHEADER_CLASS} data-pane-editor="" data-go-to-line=""
    onMouseDown={event => { if (event.target !== input.current) event.preventDefault(); }}
    onBlur={event => { if (event.currentTarget.ownerDocument.hasFocus() && !event.currentTarget.contains(event.relatedTarget)) onClose(false); }}
    onKeyDown={event => {
      if (event.nativeEvent.isComposing) return;
      if (goToLineShortcut(event)) { event.preventDefault(); event.stopPropagation(); input.current?.select(); }
      else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); suppressKeyRepeat('Escape', event.currentTarget.ownerDocument.defaultView); onClose(true); }
    }}>
    <CdsField invalid={invalid || undefined} className="min-w-0 flex-1"><CdsTextInput ref={input} aria-label={t('Go to line')} placeholder={t('Line, or line:column')}
      spellCheck={false} autoComplete="off" value={query}
      onChange={event => setQuery(event.target.value)} onKeyDown={event => {
        // R4i-files FI1 (files-17): cd2efac6e so `e.nativeEvent.isComposing||e.keyCode===229||e.key==="Enter"&&(…)`.
        if (event.nativeEvent.isComposing || event.keyCode === 229) return;
        if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); if (location) { suppressKeyRepeat('Enter', event.currentTarget.ownerDocument.defaultView); onGo(location.line, location.column); } }
      }} /></CdsField>
    <span aria-live="polite" className="text-footnote text-muted-as-secondary tabular-nums">{invalid ? t('Type a line number from 1 to {lines}', { lines: String(caret.lines) }) : t('Line {line} of {lines}', { line: String(caret.line), lines: String(caret.lines) })}</span>
    <CdsButton size="base" icon="X" aria-label={t('Close go to line bar')} shortcut="esc" onClick={() => onClose(true)}
      onKeyDown={event => { if (event.key === 'Enter') suppressKeyRepeat('Enter', event.currentTarget.ownerDocument.defaultView); }}
      onMouseDown={event => event.preventDefault()} variant="ghost" iconOnly className="text-secondary" />
  </div>;
}
