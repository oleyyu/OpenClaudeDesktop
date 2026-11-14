// "Choose your language" (shared-21 UL → c49da61a8 LanguagePickerLazyBody):
// an lg dialog with a radiogroup grid, each option the language's own name
// over its English name (lang="en"), the current one on bg-accent-muted with a
// trailing accent Check. Arrow keys / Home / End move between options. The
// search field only appears when the grid overflows (never with two locales).
// Picking another language saves the `locale` preference and reloads the
// window, since module-level copy is translated once at load. V3-w12b-settings-dialogs: 3.6556.2 shared-19 bM passes
// `header: r` with `r={showClose:!0}` and the title "Choose your language" only (no description; c49da61a8 says nothing
// about a reload), so the dialog shows no reload note.
import React, { useRef, useState } from 'react';
import { Icon } from './icons';
import { SourceDialog } from './source-dialog.jsx';
import { LOCALES, getLocale, t } from '../electron/i18n/index.mjs';
import './source-language-picker.css';

export function SourceLanguagePicker({ open, onClose, onSave }) {
  const current = getLocale();
  const [pending, setPending] = useState(''), [error, setError] = useState('');
  const body = useRef(null);
  const pick = async locale => {
    if (pending) return;
    if (locale === current) { onClose(); return; }
    setPending(locale); setError('');
    try { await onSave({ locale }); globalThis.location?.reload(); }
    catch (failure) { setError(failure?.message || String(failure)); setPending(''); }
  };
  const move = event => {
    const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown', back = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
    const edge = event.key === 'Home' || event.key === 'End';
    if (!forward && !back && !edge) return;
    const radios = [...(body.current?.querySelectorAll('[role="radio"]:not([disabled])') ?? [])];
    const at = radios.indexOf(event.currentTarget);
    if (at < 0 || !radios.length) return;
    event.preventDefault();
    if (edge) radios[event.key === 'Home' ? 0 : radios.length - 1]?.focus();
    else radios[(at + (forward ? 1 : -1) + radios.length) % radios.length]?.focus();
  };
  return <SourceDialog open={open} size="lg" title={t('Choose your language')}
    className="slp-dialog" onClose={() => { if (!pending) onClose(); }}>
    <div ref={body} className="slp-body" data-language-picker-body="">
      <div role="radiogroup" aria-label={t('Language')} className="slp-grid">
        {LOCALES.map(entry => {
          const checked = entry.locale === current;
          return <button key={entry.locale} type="button" role="radio" aria-checked={checked} tabIndex={checked ? 0 : -1} lang={entry.locale}
            disabled={!!pending} data-autofocus={checked || undefined} data-locale={entry.locale} className="slp-option" data-checked={checked || undefined}
            onClick={() => void pick(entry.locale)} onKeyDown={move}>
            <span className="slp-names">
              <span className="slp-local">{entry.localName}</span>
              {entry.name !== entry.localName && <span className="slp-name" lang="en">{entry.name}</span>}
            </span>
            {checked && <Icon name="Check" size={16} className="slp-check"/>}
          </button>;
        })}
      </div>
      {error && <p className="slp-error" role="alert">{error}</p>}
    </div>
  </SourceDialog>;
}
