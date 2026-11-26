// Settings › Theme (C4): preset, accent, a custom interface font, font size, density and corner radius on top of
// light/dark. Values are applied by theme-custom-model's root-level overrides of the existing CDS custom properties;
// this page only edits preferences (customTheme). Every setting has one home: light/dark, the Interface font choice,
// code themes and code font are the official rows drawn above this page on Settings › Appearance; this page does not
// repeat them. A theme file still carries the code font and code themes (export/import).
import React, { useEffect, useId, useRef, useState } from 'react';
import { appearancePreferences } from '../electron/preferences.mjs';
import { normalizeTheme, isDefaultTheme, isFontFamily } from '../electron/prefs/theme.mjs';
import { SourceSelect } from './source-select.jsx';
import { SourceSegments } from './source-segments.jsx';
import { SourceMenu, menuTriggerProps } from './source-menu.jsx';
import { SourceSettingsButton } from './source-settings-button.jsx';
import { SettingsGroup, settingRow } from './source-settings-kit.jsx';
import { THEME_PRESETS, themePreset, presetValue, applyCustomTheme, exportThemeFile, importThemeFile, loadFontFamilies, FALLBACK_FONTS,
  FONT_SCALE_OPTIONS, RADIUS_OPTIONS, parseHex } from './theme-custom-model.mjs';
import { t } from '../electron/i18n/index.mjs';
import './theme-settings.css';

// The CDS blue the accent replaces (c6a992d55 --cds-blue-450), shown in the picker while unset.
const DEFAULT_ACCENT = '#2a78d6';

export function SourceThemeSettings({ config = {}, desktopCall, onSave }) {
  const prefs = appearancePreferences(config);
  const saved = normalizeTheme(config.customTheme);
  const [optimistic, setOptimistic] = useState({}), [rowErrors, setRowErrors] = useState({}), [notice, setNotice] = useState(null);
  const [liveAccent, setLiveAccent] = useState(null), [fileBusy, setFileBusy] = useState('');
  const writes = useRef(0), latestConfig = useRef(config); latestConfig.current = config;
  const theme = Object.hasOwn(optimistic, 'customTheme') ? normalizeTheme(optimistic.customTheme) : saved;
  const shown = (key, value) => Object.hasOwn(optimistic, key) ? optimistic[key] : value;
  const live = liveAccent ? { ...theme, accent: liveAccent } : theme;
  const liveKey = JSON.stringify(live);

  // Live preview: the document follows the page's optimistic/dragged values at
  // once; main.jsx re-applies the confirmed preference after each save and this
  // page restores it when it closes.
  useEffect(() => { applyCustomTheme(document, { customTheme: live }); }, [liveKey]);
  useEffect(() => () => applyCustomTheme(document, latestConfig.current), []);

  async function commit(rowId, patch) {
    setOptimistic(value => ({ ...value, ...patch })); setRowErrors(value => value[rowId] ? { ...value, [rowId]: null } : value); writes.current++;
    try { await onSave(patch); return true; }
    catch (error) {
      console.warn(`Couldn’t save the ${rowId} setting:`, error);
      setOptimistic(value => { const next = { ...value }; for (const key of Object.keys(patch)) if (Object.is(next[key], patch[key])) delete next[key]; return next; });
      setRowErrors(value => ({ ...value, [rowId]: error?.message || String(error) }));
      return false;
    } finally { if (--writes.current === 0) setOptimistic({}); }
  }
  const saveTheme = (rowId, fields) => {
    const next = { ...theme, ...fields, preset: 'custom' };
    return commit(rowId, { customTheme: isDefaultTheme(next) ? null : next });
  };

  // Accent: the picker previews while dragging and saves once it settles.
  const accentTimer = useRef(null), pendingAccent = useRef(null), latestTheme = useRef(theme), latestOnSave = useRef(onSave);
  latestTheme.current = theme; latestOnSave.current = onSave;
  // Closing Settings inside the debounce must not drop the pick: save it
  // fire-and-forget and keep it on screen (this runs after the restore above).
  useEffect(() => () => {
    clearTimeout(accentTimer.current);
    const accent = pendingAccent.current;
    if (!accentTimer.current || !accent) return;
    accentTimer.current = null; pendingAccent.current = null;
    const next = { ...latestTheme.current, accent, preset: 'custom' }, customTheme = isDefaultTheme(next) ? null : next;
    applyCustomTheme(document, { ...latestConfig.current, customTheme });
    Promise.resolve().then(() => latestOnSave.current({ customTheme }))
      .catch(error => { console.warn('Couldn’t save the themeAccent setting:', error); applyCustomTheme(document, latestConfig.current); });
  }, []);

  const presetId = presetValue(theme);
  const presetItems = [...THEME_PRESETS.map(entry => ({ value: entry.id, label: t(entry.label) })), ...(presetId === 'custom' ? [{ value: 'custom', label: t('Custom') }] : [])];
  const choosePreset = id => {
    setNotice(null);
    if (id === 'custom') return;
    const entry = themePreset(id);
    void commit('themePreset', { customTheme: !entry || entry.id === 'default' ? null : { ...entry.theme } });
  };

  async function importFile() {
    if (fileBusy) return;
    setFileBusy('import'); setNotice(null);
    try {
      const picked = await desktopCall('theme-file', { op: 'import' });
      if (!picked) return;
      const { patch, warnings, name } = importThemeFile(picked.theme);
      if (await commit('themePreset', patch)) setNotice({ kind: warnings.length ? 'warning' : 'status', text: [name ? t('Imported “{name}”.', { name }) : t('Imported theme.'), ...warnings].join(' ') });
    } catch (error) { setNotice({ kind: 'error', text: error?.message || String(error) }); }
    finally { setFileBusy(''); }
  }
  async function exportFile() {
    if (fileBusy) return;
    setFileBusy('export'); setNotice(null);
    try {
      const current = { ...config, customTheme: theme, codeFont: shown('codeFont', prefs.codeFont), codeThemeLight: shown('codeThemeLight', prefs.codeThemeLight), codeThemeDark: shown('codeThemeDark', prefs.codeThemeDark) };
      const name = themePreset(presetId)?.label ?? 'My theme';
      const result = await desktopCall('theme-file', { op: 'export', theme: exportThemeFile(current, name), name });
      if (result?.path) setNotice({ kind: 'status', text: t('Exported to {path}', { path: result.path }) });
    } catch (error) { setNotice({ kind: 'error', text: error?.message || String(error) }); }
    finally { setFileBusy(''); }
  }

  const accent = liveAccent ?? theme.accent;
  const presetRow = settingRow('themePreset', t('Theme preset'), t('Start from a built-in theme, or import one from a file.'),
    <SourceSelect label={t('Theme preset')} value={presetId} items={presetItems} align="end" onChange={choosePreset}/>,
    { below: <div className="ss-theme-custom-actions">
      <SourceSettingsButton variant="secondary" size="sm" busy={fileBusy === 'import'} onClick={importFile}>{t('Import…')}</SourceSettingsButton>
      <SourceSettingsButton variant="secondary" size="sm" busy={fileBusy === 'export'} onClick={exportFile}>{t('Export…')}</SourceSettingsButton>
      <SourceSettingsButton variant="ghost" size="sm" disabled={isDefaultTheme(theme)} onClick={() => { setNotice(null); void commit('themePreset', { customTheme: null }); }}>{t('Reset to default')}</SourceSettingsButton>
      {notice && <span className={notice.kind === 'error' ? 'ss-error' : 'ss-theme-custom-notice'} role={notice.kind === 'error' ? 'alert' : 'status'}>{notice.text}</span>}
    </div> });
  const accentRow = settingRow('themeAccent', t('Accent color'), t('Used for primary buttons, links, focus rings and selection.'),
    <AccentControl value={accent}
      onCommit={value => { clearTimeout(accentTimer.current); accentTimer.current = null; pendingAccent.current = null; setLiveAccent(null); return saveTheme('themeAccent', { accent: value }); }}/>);
  // The one free-text font override in the theme (customTheme.uiFont); the Interface font choice itself is the official
  // Appearance row at the top of this page (its concise copy says so: electron/i18n/concise.mjs).
  const uiFontRow = settingRow('themeUiFont', t('Custom interface font'), t('Any installed font, saved with this theme. Leave empty to use the Interface font chosen on the Code page.'),
    <UiFontControl value={theme.uiFont} onCommit={value => saveTheme('themeUiFont', { uiFont: value })}/>);
  // Claude keeps segmented controls to 2–3 choices; longer lists are a Select in the control slot (224px, source-select.css).
  const fontSizeRow = settingRow('themeFontScale', t('Font size'), t('Scales most interface text and controls.'),
    <SourceSelect label={t('Font size')} align="end" value={theme.fontScale}
      items={FONT_SCALE_OPTIONS.map(value => ({ value, label: `${Math.round(value * 100)}%` }))} onChange={value => saveTheme('themeFontScale', { fontScale: Number(value) })}/>);
  const densityRow = settingRow('themeDensity', t('Density'), t('Comfortable gives controls more room.'),
    <SourceSegments label={t('Density')} value={theme.density} options={[{ value: 'compact', label: t('Compact') }, { value: 'comfortable', label: t('Comfortable') }]}
      onChange={value => saveTheme('themeDensity', { density: value })}/>);
  const radiusRow = settingRow('themeRadius', t('Corner radius'), t('Roundness of buttons, menus, cards and the composer.'),
    <SourceSelect label={t('Corner radius')} align="end" value={theme.radiusScale} items={RADIUS_OPTIONS.map(option => ({ ...option, label: t(option.label) }))}
      onChange={value => saveTheme('themeRadius', { radiusScale: Number(value) })}/>);

  // Settings › Appearance draws this page under the official Appearance and Code appearance groups (SETTINGS_NAV hosts
  // preferences + theme), so light / dark (Theme), Interface font, code themes and code font are on the same page: no
  // rows or buttons link to them any more.
  return <div className="ss-theme-custom">
    <SettingsGroup title={t('Theme')} rows={[presetRow]} rowErrors={rowErrors}/>
    <SettingsGroup title={t('Colors')} rows={[accentRow]} rowErrors={rowErrors}/>
    <SettingsGroup title={t('Typography')} rows={[uiFontRow, fontSizeRow, densityRow]} rowErrors={rowErrors}/>
    <SettingsGroup title={t('Shape')} rows={[radiusRow]} rowErrors={rowErrors}/>
    <SettingsGroup title={t('Preview')}>
      <ThemePreviewCard/>
      <p className="ss-theme-custom-note">{t('Light or dark follows Theme at the top of this page.')}</p>
    </SettingsGroup>
  </div>;
}

// The built-in accents (the theme presets' own), offered by the swatch button's popover; Default clears the accent.
const ACCENT_SWATCHES = Object.freeze([
  { value: '', label: 'Default', color: DEFAULT_ACCENT },
  ...THEME_PRESETS.filter(entry => entry.theme.accent).map(entry => ({ value: entry.theme.accent, label: entry.label, color: entry.theme.accent })),
]);

// A swatch button (no native <input type=color>: Claude never opens the macOS colour panel) whose popover lists the
// preset accents, next to the hex field for any other colour.
function AccentControl({ value, onCommit }) {
  const [text, setText] = useState(value), [invalid, setInvalid] = useState(false), errorId = useId(), editing = useRef(false);
  const swatch = useRef(null), [menu, setMenu] = useState(null);
  const openMenu = entry => setMenu({ entry, layerBase: Number.parseInt(getComputedStyle(swatch.current).getPropertyValue('--cds-layer-base'), 10) || 0 });
  const choose = next => { editing.current = false; setText(next); setInvalid(false); if (next !== (value || '')) void onCommit(next); };
  useEffect(() => { if (!editing.current) { setText(value); setInvalid(false); } }, [value]);
  const submit = () => {
    editing.current = false;
    const raw = text.trim();
    if (!raw) { setInvalid(false); if (value) void onCommit(''); return; }
    const hex = parseHex(raw);
    if (!hex) { setInvalid(true); return; }
    setInvalid(false); setText(hex);
    if (hex !== value) void onCommit(hex);
  };
  return <div className="ss-theme-custom-accent">
    <button ref={swatch} type="button" className="ss-theme-custom-swatch" aria-label={t('Accent color picker')} data-value={value || ''}
      {...menuTriggerProps({ open: !!menu, onOpen: entry => openMenu(entry) })} onClick={() => (menu ? setMenu(null) : openMenu(undefined))}>
      <span className="ss-theme-custom-swatch-fill" style={{ background: value || DEFAULT_ACCENT }}/>
    </button>
    {menu && <SourceMenu.Popup anchor={swatch.current} side="bottom" align="end" label={t('Accent color')} initialHighlight={menu.entry}
      layerBase={menu.layerBase} onClose={() => setMenu(null)}>
      {ACCENT_SWATCHES.map(entry => <SourceMenu.Item key={entry.label} checked={(value || '') === entry.value} checkedRole="radio"
        leading={<span className="ss-theme-custom-swatch-dot" style={{ background: entry.color }} aria-hidden="true"/>} onClick={() => choose(entry.value)}>{t(entry.label)}</SourceMenu.Item>)}
    </SourceMenu.Popup>}
    <input data-cds="TextInput" className="cds-input cds-reset ss-theme-custom-field ss-theme-custom-hex" aria-label={t('Accent color hex')} placeholder={t('Default')}
      value={text} maxLength={7} spellCheck={false} aria-invalid={invalid || undefined} data-invalid={invalid ? '' : undefined} aria-describedby={invalid ? errorId : undefined}
      onChange={event => { editing.current = true; setText(event.currentTarget.value); }} onBlur={submit}
      onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); event.stopPropagation(); submit(); } }}/>
    <SourceSettingsButton variant="ghost" size="sm" disabled={!value} onClick={() => { editing.current = false; setText(''); setInvalid(false); void onCommit(''); }}>{t('Clear')}</SourceSettingsButton>
    {invalid && <span id={errorId} className="ss-error" role="alert">{t('Enter a color like #4d6bfe.')}</span>}
  </div>;
}

// Free text with suggestions: the installed families from queryLocalFonts()
// (asked for on first focus), else a built-in list. Saves on Enter or blur.
function UiFontControl({ value, onCommit }) {
  const [draft, setDraft] = useState(value), [fonts, setFonts] = useState(FALLBACK_FONTS), [invalid, setInvalid] = useState(false);
  const listId = useId(), errorId = useId(), requested = useRef(false), editing = useRef(false), composing = useRef(false);
  useEffect(() => { if (!editing.current) setDraft(value); }, [value]);
  const loadFonts = () => {
    if (requested.current) return;
    requested.current = true;
    // queryLocalFonts needs user activation; a refused or unavailable query retries on the next focus.
    void loadFontFamilies().then(list => { setFonts(list); if (list === FALLBACK_FONTS) requested.current = false; });
  };
  const submit = () => {
    editing.current = false;
    const next = draft.trim();
    if (!isFontFamily(next)) { setInvalid(true); return; }
    setInvalid(false);
    if (next !== value) void onCommit(next);
  };
  return <div className="ss-theme-custom-font">
    <input data-cds="TextInput" className="cds-input cds-reset ss-theme-custom-field" aria-label={t('Custom interface font')} list={listId}
      value={draft} placeholder={t('e.g. {font}', { font: 'Inter' })} maxLength={120} spellCheck={false}
      aria-invalid={invalid || undefined} data-invalid={invalid ? '' : undefined} aria-describedby={invalid ? errorId : undefined}
      onFocus={loadFonts} onChange={event => { editing.current = true; setDraft(event.currentTarget.value); }} onBlur={() => { if (editing.current) submit(); }}
      onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
      onKeyDown={event => {
        if (composing.current || event.nativeEvent.isComposing) return;
        if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); submit(); }
      }}/>
    <datalist id={listId}>{fonts.map(name => <option key={name} value={name}/>)}</datalist>
    {invalid && <span id={errorId} className="ss-error" role="alert">{t('Enter a font family name.')}</span>}
  </div>;
}

// Uses only CDS tokens, so it follows the applied theme in light and dark mode.
function ThemePreviewCard() {
  return <div className="ss-theme-custom-preview" aria-hidden="true" inert>
    <div className="ss-theme-custom-preview-row">
      <SourceSettingsButton variant="primary" size="sm" tabIndex={-1}>{t('Primary')}</SourceSettingsButton>
      <SourceSettingsButton variant="secondary" size="sm" tabIndex={-1}>{t('Secondary')}</SourceSettingsButton>
      <span className="ss-theme-custom-chip">{t('Accent')}</span>
      <span className="ss-theme-custom-link">{t('A link in the text')}</span>
    </div>
    <pre className="ss-theme-custom-code"><code>{'function greet(name) {\n  return `Hello, ${name}!`;\n}'}</code></pre>
    <div className="ss-theme-custom-composer">{t('Ask DeepSeek to build, fix or explain…')}</div>
  </div>;
}
