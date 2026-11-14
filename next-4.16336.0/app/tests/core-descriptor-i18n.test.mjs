import { registerCodexPack } from './codex-pack.mjs';
registerCodexPack();
import test from 'node:test';
import assert from 'node:assert/strict';
import { t, setLocale, DEFAULT_LOCALE, dictionary } from '../electron/i18n/index.mjs';
import { allCores } from '../electron/core-registry.mjs';

// Settings › Cores and onboarding render t(core.models) and t(core.tagline): every built-in core's copy is translated.
test('every built-in core descriptor has zh-CN models and tagline lines', (context) => {
  context.after(() => setLocale(DEFAULT_LOCALE));
  setLocale('zh-CN');
  const cores = allCores();
  assert.ok(cores.length >= 9);
  for (const core of cores) {
    for (const field of ['models', 'tagline']) {
      if (typeof core[field] !== 'string' || !core[field]) continue;
      assert.notEqual(t(core[field]), core[field], `${core.id}.${field} has no zh-CN entry: ${core[field]}`);
    }
  }
});

// Settings › Preferences › Account and onboarding render t(option.label) for every sign-in method and key preset:
// each built-in core's login label has a zh-CN entry (brand-only labels such as "ChatGPT Pro/Plus" map to themselves explicitly).
test('every built-in core descriptor login label has a zh-CN entry', () => {
  const zh = dictionary('zh-CN');
  const missing = [];
  let seen = 0;
  for (const core of allCores()) {
    for (const [kind, options] of Object.entries(core.login || {})) {
      if (!Array.isArray(options)) continue;
      for (const option of options) {
        if (typeof option?.label !== 'string' || !option.label) continue;
        seen += 1;
        if (!Object.hasOwn(zh, option.label)) missing.push(`${core.id}.login.${kind}: ${option.label}`);
      }
    }
  }
  assert.ok(seen >= 20, `expected the built-in cores to declare sign-in labels, saw ${seen}`);
  assert.deepEqual(missing, []);
});
