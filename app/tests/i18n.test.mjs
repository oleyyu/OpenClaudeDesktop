import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { t, tn, setLocale, getLocale, dictionary, LOCALES, LOCALE_CODES, localePreference, DEFAULT_LOCALE } from '../electron/i18n/index.mjs';
import { settingsPatch } from '../electron/preferences.mjs';

// The argument names of an ICU message: {name}, or {name, plural|select|number, …} whose branch bodies are messages
// again. Branch selectors and their bodies (one {Ready}, task {this task}) are not arguments, so a translation does
// not have to keep English words inside a branch to pass.
function icuArguments(text, names = new Set()) {
  const s = String(text);
  for (let i = 0; i < s.length; i++) {
    // ICU quoting: an apostrophe starts a quoted literal only before a brace ('{…}'); elsewhere it is just a character.
    if (s[i] === "'" && (s[i + 1] === "{" || s[i + 1] === "}")) { const end = s.indexOf("'", i + 1); if (end > i) { i = end; continue; } }
    if (s[i] !== "{") continue;
    const head = /^\{\s*(\w+)\s*([,}])/.exec(s.slice(i));
    if (!head) continue;
    names.add(head[1]);
    if (head[2] === "}") { i += head[0].length - 1; continue; }
    // A typed argument: skip to its type, then read each {branch} body as a message until the closing brace.
    let j = i + head[0].length, depth = 1, start = -1;
    for (; j < s.length && depth > 0; j++) {
      if (s[j] === "{") { if (depth === 1) start = j + 1; depth++; }
      else if (s[j] === "}") { depth--; if (depth === 1 && start >= 0) { icuArguments(s.slice(start, j), names); start = -1; } }
    }
    i = j - 1;
  }
  return names;
}
const placeholders = text => [...icuArguments(text)].sort();

test('t returns English in en-US and the zh-CN entry otherwise, with placeholders filled after lookup', (context) => {
  context.after(() => setLocale(DEFAULT_LOCALE));
  assert.equal(getLocale(), 'en-US');
  assert.equal(t('Settings'), 'Settings');
  assert.equal(t('Unknown {thing}', { thing: 'x' }), 'Unknown x');
  setLocale('zh-CN');
  assert.equal(t('Settings'), '设置');
  assert.equal(t('Language'), '语言');
  assert.equal(t('No such string'), 'No such string', 'a missing entry falls back to English');
  assert.equal(t('Left {a} alone', {}), 'Left {a} alone');
  assert.equal(tn(1, '{count} widget', '{count} widgets'), '1 widget');
  assert.equal(setLocale('xx-YY'), 'en-US', 'unknown locales read as the default');
});

test('locale preference: en-US and zh-CN only', () => {
  assert.deepEqual(LOCALE_CODES, ['en-US', 'zh-CN']);
  assert.ok(LOCALES.every(entry => entry.name && entry.localName));
  assert.equal(localePreference('zh-CN'), 'zh-CN');
  assert.equal(localePreference(undefined), 'en-US');
  assert.equal(settingsPatch({}, { locale: 'zh-CN' }).locale, 'zh-CN');
  assert.throws(() => settingsPatch({}, { locale: 'fr-FR' }), /Invalid locale/);
});

test('zh-CN dictionaries: string values, same placeholders as the English key, no empty entries', async () => {
  const dir = new URL('../electron/i18n/zh-CN/', import.meta.url);
  const problems = [];
  for (const file of readdirSync(dir).filter(name => name.endsWith('.mjs') && name !== 'index.mjs')) {
    const table = (await import(new URL(file, dir))).default;
    for (const [key, value] of Object.entries(table)) {
      if (typeof value !== 'string' || !value.trim()) problems.push(`${file}: ${key} → empty or not a string`);
      else if (placeholders(key).join() !== placeholders(value).join()) problems.push(`${file}: ${key} → placeholders differ: ${value}`);
    }
  }
  assert.deepEqual(problems, []);
  assert.ok(Object.keys(dictionary('zh-CN')).length > 0);
});
