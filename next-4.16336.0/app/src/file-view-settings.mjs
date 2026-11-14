import { t } from '../electron/i18n/index.mjs';

// Claude 2.31226.0 cccc2cf0a: $y/ob/Qy and Files settings (files-view).
export const FILE_VIEW_KEYS = Object.freeze({ autoSave: 'epitaxy-thimble', previewTabs: 'epitaxy-files-preview-tabs', tabIndents: 'epitaxy-files-tab-indents', indentGuides: 'epitaxy-files-indent-guides', wordWrap: 'epitaxy-files-word-wrap', showWhitespace: 'epitaxy-files-show-whitespace', scrollPastEnd: 'epitaxy-files-scroll-past-end', tabSize: 'epitaxy-files-tab-size' });
export function normalizeFileViewSetting(key, value) {
  if (key === 'tabSize') return [2, 4, 8].includes(value) ? value : 4;
  return ['autoSave', 'wordWrap', 'previewTabs', 'tabIndents', 'indentGuides'].includes(key) ? value !== false : value === true;
}
export const DEFAULT_FILE_VIEW_SETTINGS = Object.freeze({ autoSave: true, previewTabs: true, tabIndents: true, indentGuides: true, wordWrap: true, showWhitespace: false, scrollPastEnd: false, tabSize: 4 });
export function createFileViewSettings({ storage, subscribeStorage = () => () => {} } = {}) {
  const read = key => { try { return normalizeFileViewSetting(key, JSON.parse(storage?.getItem(FILE_VIEW_KEYS[key]) ?? 'null')); } catch { return DEFAULT_FILE_VIEW_SETTINGS[key]; } };
  const readAll = () => Object.fromEntries(Object.keys(FILE_VIEW_KEYS).map(key => [key, read(key)]));
  let current = readAll();
  const listeners = new Set();
  const publish = next => { if (Object.keys(FILE_VIEW_KEYS).every(key => next[key] === current[key])) return; current = next; for (const listener of [...listeners]) listener(); };
  const off = subscribeStorage(event => {
    if (event.storageArea && event.storageArea !== storage) return;
    if (event.key === null || Object.values(FILE_VIEW_KEYS).includes(event.key)) publish(readAll());
  });
  return {
    getSnapshot: () => current,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    set(key, value) {
      if (!Object.hasOwn(FILE_VIEW_KEYS, key)) return;
      const next = normalizeFileViewSetting(key, value);
      try { storage?.setItem(FILE_VIEW_KEYS[key], JSON.stringify(next)); } catch { /* Keep the current window usable. */ }
      publish({ ...current, [key]: next });
    },
    dispose() { off(); listeners.clear(); },
  };
}
export function fileViewMenu(settings, set) {
  return { key: 'files-view', items: [
    ...[['wordWrap', 'Word wrap', 'word-wrap'], ['indentGuides', 'Indent guides', 'indent-guides'], ['showWhitespace', 'Show whitespace', 'show-whitespace'], ['scrollPastEnd', 'Scroll past end', 'scroll-past-end']].map(([key, label, suffix]) => ({
      value: `files-${suffix}`, label: t(label), checked: settings[key], checkedRole: 'checkbox', keepOpen: true, onSelect: () => set(key, !settings[key]),
    })),
    { value: 'files-tab-size', label: t('Tab size'), hint: String(settings.tabSize), items: [2, 4, 8].map(size => ({ value: `files-tab-size-${size}`, label: String(size), checked: settings.tabSize === size, checkedRole: 'radio', onSelect: () => set('tabSize', size) })) },
  ] };
}
// c148e7537 Ts: enough padding to bring the last line to the top of the viewport.
export function scrollPastEndPadding(height, lineHeight, paddingTop) {
  return Math.max(0, height - lineHeight - paddingTop - 0.5);
}
// Original cbd02b8f2 Fi: background decorations never replace source characters.
export function whitespaceTheme(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="9" height="20"><path stroke="${color}" fill="none" d="M1 10H8M5.5 7.5L8 10L5.5 12.5"/></svg>`;
  return { space: `radial-gradient(circle at 50% 50%, ${color} 1px, transparent 1.25px)`, tab: `url('data:image/svg+xml,${encodeURIComponent(svg)}')` };
}

// c51596d2b J/Ie: default on; turning off fixes all existing previews.
export function fileBehaviorMenu(settings, set) {
  return { key: 'files-behavior', items: [{ value: 'files-preview-tabs', label: t('Preview tabs'),
    checked: settings.previewTabs, checkedRole: 'checkbox', keepOpen: true,
    onSelect: () => set('previewTabs', !settings.previewTabs) }, {value:'files-thimble', label:t('Auto save'), checked:settings.autoSave, checkedRole:'checkbox', keepOpen:true, onSelect:()=>set('autoSave', !settings.autoSave)}, {value: 'files-tab-indents', label: t('Tab key indents'), checked: settings.tabIndents, checkedRole: 'checkbox', keepOpen: true, onSelect: () => set('tabIndents', !settings.tabIndents)}] };
}
