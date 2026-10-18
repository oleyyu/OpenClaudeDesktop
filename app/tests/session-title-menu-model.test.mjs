import test from 'node:test';
import assert from 'node:assert/strict';
import { setLocale, DEFAULT_LOCALE } from '../electron/i18n/index.mjs';
import { sessionMenuTriggerLabel, viewOptionsLabel, titleOverflows, titleTooltipContent, renameSubmission, renameSubmittable, RENAME_START_DELAY_MS }
  from '../src/session-title-menu-model.mjs';

// c593f7513 wm (readable 7520-7540): Be = title.trim(); Ve = Be ? "More options for {label}" : "More options";
// He = "View options".
test('header menu trigger labels follow wm', (context) => {
  context.after(() => setLocale(DEFAULT_LOCALE));
  assert.equal(sessionMenuTriggerLabel('  Fix login  '), 'More options for Fix login');
  assert.equal(sessionMenuTriggerLabel('   '), 'More options');
  assert.equal(sessionMenuTriggerLabel(undefined), 'More options');
  assert.equal(viewOptionsLabel(), 'View options');
  assert.equal(viewOptionsLabel(true), 'View options (a dev server or command is running)');
  setLocale('zh-CN');
  assert.equal(sessionMenuTriggerLabel('修复'), '“修复”的更多选项');
  assert.equal(sessionMenuTriggerLabel(''), '更多选项');
  assert.equal(viewOptionsLabel(), '视图选项');
  assert.equal(viewOptionsLabel(true), '视图选项（有开发服务器或命令正在运行）');
});

// c593f7513 vm (7270-7300): _ = scrollWidth > clientWidth ? title : undefined; v = _() ?? "Rename".
test('the title tooltip is the full title only while it is truncated', () => {
  assert.equal(titleTooltipContent({ scrollWidth: 300, clientWidth: 120 }, 'A long session title'), 'A long session title');
  assert.equal(titleTooltipContent({ scrollWidth: 120, clientWidth: 120 }, 'Short'), 'Rename');
  assert.equal(titleTooltipContent(null, 'Unmounted'), 'Rename');
  assert.equal(titleOverflows({ scrollWidth: 121, clientWidth: 120 }), true);
  assert.equal(titleOverflows({ scrollWidth: 120.4, clientWidth: 120 }), true, 'no subpixel allowance, as vm');
});

// shared-16 Jd (5027-5120): b() trims, closes, and calls onRename only when the name changed; a blank name does nothing.
test('Rename session dialog submission follows Jd', () => {
  assert.deepEqual(renameSubmission('  New name  ', 'Old name'), { close: true, name: 'New name' });
  assert.deepEqual(renameSubmission('Old name', 'Old name'), { close: true }, 'unchanged: closes without a rename');
  assert.deepEqual(renameSubmission('  Old name ', 'Old name'), { close: true }, 'only whitespace added: no rename');
  assert.deepEqual(renameSubmission('   ', 'Old name'), { close: false });
  assert.deepEqual(renameSubmission('', ''), { close: false });
  assert.deepEqual(renameSubmission('Named', ''), { close: true, name: 'Named' });
  assert.equal(renameSubmittable(' x '), true);
  assert.equal(renameSubmittable(' \t'), false);
  assert.equal(renameSubmittable(undefined), false);
  // shared-21 IV: onRenameStart runs through the xV = 100ms deferral after the menu closes.
  assert.equal(RENAME_START_DELAY_MS, 100);
});

// R2-topbar TT-02 (2.42304.0 cc43287c9 _W): the caret tooltip `Ge` words "More options for {label}" around `Ue`, the
// trimmed title cut at gW = 80 graphemes to 79 + "…" (trailing space trimmed first); `He`, the aria-label, keeps the
// full title.
test('the caret tooltip cuts the title at 80 graphemes; the label keeps it whole', async (context) => {
  context.after(() => setLocale(DEFAULT_LOCALE));
  const { sessionMenuTriggerTooltip } = await import('../src/session-title-menu-model.mjs');
  const title = 'x'.repeat(120);
  const tooltip = sessionMenuTriggerTooltip(`  ${title}  `);
  assert.ok(tooltip.endsWith('…'));
  const cut = tooltip.slice('More options for '.length);
  assert.equal([...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(cut)].length, 80, '79 graphemes + …');
  assert.equal(cut, `${'x'.repeat(79)}…`);
  assert.equal(sessionMenuTriggerLabel(title), `More options for ${title}`);
  // 80 graphemes fit untouched; a cut that lands on a space trims it before the ellipsis.
  assert.equal(sessionMenuTriggerTooltip('y'.repeat(80)), `More options for ${'y'.repeat(80)}`);
  assert.equal(sessionMenuTriggerTooltip(`${'z'.repeat(78)} ${'w'.repeat(10)}`), `More options for ${'z'.repeat(78)}…`);
  // Graphemes, not UTF-16 units: 81 flags are cut to 79 flags.
  const flag = '🇯🇵';
  assert.equal(sessionMenuTriggerTooltip(flag.repeat(81)), `More options for ${flag.repeat(79)}…`);
  assert.equal(sessionMenuTriggerTooltip(flag.repeat(80)), `More options for ${flag.repeat(80)}`);
  assert.equal(sessionMenuTriggerTooltip('   '), 'More options');
  assert.equal(sessionMenuTriggerTooltip(undefined), 'More options');
  setLocale('zh-CN');
  assert.equal(sessionMenuTriggerTooltip('修'.repeat(90)), `“${'修'.repeat(79)}…”的更多选项`);
});
