import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';

// Reduced motion is targeted, as in the source: no blanket `* {animation:none}`
// kill. Every local keyframe animation and every movement transition needs a
// reduce rule for the OS preference (@media (prefers-reduced-motion: reduce))
// and one for the in-app setting (html[data-reduce-motion=true], or its older
// alias html[data-local-motion=reduce]); scroll-shared-10-current.js:17688-17708
// writes the attribute, design-system.css:34894-34968 keys motion-reduce on both.
const src = path.resolve(import.meta.dirname, '../src');
const sheets = readdirSync(src).filter((name) => name.endsWith('.css')).map((name) => ({ name, root: postcss.parse(readFileSync(path.join(src, name), 'utf8'), { from: name }) }));
const MOTION = /\b(transform|translate|scale|rotate|width|height|left|right|top|bottom|inset|grid-template-rows|max-height|min-height|stroke-dashoffset|all)\b/;
const ATTR = /^(?:html)?\[data-(?:reduce-motion="?true"?|local-motion="?reduce"?)\]\s+/;
const contextOf = (node) => {
  const media = [];
  for (let parent = node.parent; parent && parent.type !== 'root'; parent = parent.parent) if (parent.type === 'atrule') media.push(parent.params);
  return media.join(' ');
};
// Subject compound of a selector: its classes and pseudo-element.
function subject(selector) {
  const last = selector.trim().split(/\s*[>+~]\s*|\s+/).filter(Boolean).at(-1) ?? '';
  return { classes: new Set([...last.matchAll(/\.([\w-]+)/g)].map((match) => match[1])), pseudo: (last.match(/::?(before|after)\b/) ?? [])[1] ?? null };
}
const normal = (selector) => selector.replace(/\s*([>+~])\s*/g, '$1').replace(/\s+/g, ' ').replace(/"/g, '').trim();
const covers = (reduce, base) => {
  if (normal(reduce) === normal(base)) return true;
  const r = subject(reduce), b = subject(base);
  return r.classes.size > 0 && [...r.classes].every((name) => b.classes.has(name)) && r.pseudo === b.pseudo;
};
function collect() {
  const moving = [], media = [], attr = [];
  for (const { name, root } of sheets) {
    root.walkDecls((decl) => {
      const rule = decl.parent;
      if (rule.type !== 'rule') return;
      const context = contextOf(decl), isReduceMedia = /prefers-reduced-motion\s*:\s*reduce/.test(context);
      const isAttr = rule.selectors.some((selector) => ATTR.test(selector.trim()));
      if (isReduceMedia) { media.push(...rule.selectors.map((selector) => ({ selector, prop: decl.prop }))); return; }
      if (isAttr) { attr.push(...rule.selectors.filter((selector) => ATTR.test(selector.trim())).map((selector) => ({ selector: selector.trim().replace(ATTR, ''), prop: decl.prop }))); return; }
      const animated = /^animation(-name)?$/.test(decl.prop) && !/^none\b/.test(decl.value.trim());
      const movingTransition = /^transition(-property)?$/.test(decl.prop) && MOTION.test(decl.value.replace(/cubic-bezier\([^)]*\)/g, ''));
      if (animated || movingTransition) moving.push({ file: name, line: decl.source.start.line, selectors: rule.selectors, kind: animated ? 'animation' : 'transition', safe: /no-preference/.test(context) });
    });
  }
  return { moving, media, attr };
}

test('the blanket reduce kills are gone: no `*` rule removes every animation or transition', () => {
  for (const { name, root } of sheets) root.walkRules((rule) => {
    const kills = rule.nodes.some((node) => node.type === 'decl' && /^(animation|transition)$/.test(node.prop) && /^none/.test(node.value) && node.important);
    if (kills) assert.ok(!rule.selectors.some((selector) => /(^|\s)\*(\s|$|::?)/.test(selector)), `${name}:${rule.source.start.line} ${rule.selector}`);
  });
});

test('every local animation and movement transition has an OS and an in-app reduce rule', () => {
  const { moving, media, attr } = collect();
  assert.ok(moving.length > 40, 'scan sees the local motion');
  const missing = [];
  for (const entry of moving) {
    const relevant = (rule) => entry.kind === 'animation' ? /^(animation|animation-name|animation-duration|display)$/.test(rule.prop) : /^(transition|transition-property|transform)$/.test(rule.prop);
    for (const selector of entry.selectors) {
      // motion-safe rules (inside no-preference) only need the in-app override.
      const hasMedia = entry.safe || media.some((rule) => relevant(rule) && covers(rule.selector, selector));
      const hasAttr = attr.some((rule) => relevant(rule) && covers(rule.selector, selector));
      if (!hasMedia || !hasAttr) missing.push(`${entry.file}:${entry.line} ${selector} (${entry.kind}${hasMedia ? '' : ', no @media reduce'}${hasAttr ? '' : ', no data-reduce-motion'})`);
    }
  }
  assert.deepEqual(missing, []);
});

// R2 composer-send-cell: the Send/Stop swap is the original 2.42304.0 c227f4d5e Ij with its own utility classes (Nj/Pj/Fj,
// generated composer-card-tokens.mjs). The loaded official sheet carries their reduced-motion handling: Pj's entry
// animation and Fj's opacity transition are motion-safe (no-preference media and not under [data-reduce-motion=true]),
// and Fj's visibility transition, whose transitionend unmounts the old layer, is unconditional. No local rule is left.
test('the composer submit swap keeps its visibility transition under reduced motion (official Ij classes, no local rules)', async () => {
  const css = readFileSync(path.join(src, 'source-composer.css'), 'utf8');
  assert.doesNotMatch(css, /sc-submit|@keyframes cds-fade-in/);
  const Card = await import('../src/generated/code-composer/composer-card-tokens.mjs');
  assert.equal(Card.submitLayerEnterClass, 'motion-safe:animate-[cds-fade-in_0.12s_ease-out_0.08s_backwards]');
  assert.equal(Card.submitLayerExitClass, 'pointer-events-none invisible opacity-0 [transition:visibility_0s_linear_80ms] motion-safe:[transition:opacity_80ms_ease-out,visibility_0s_linear_80ms]');
  const official = postcss.parse(readFileSync(path.resolve(src, '../public/assets/v1/c6a992d55-sXiDGMFQ.css'), 'utf8'));
  const keys = ['.motion-safe\\:animate-\\[cds-fade-in_0\\.12s_ease-out_0\\.08s_backwards\\]', '.motion-safe\\:\\[transition\\:opacity_80ms_ease-out\\,visibility_0s_linear_80ms\\]', '.\\[transition\\:visibility_0s_linear_80ms\\]'];
  const found = {};
  official.walkRules((rule) => {
    const key = keys.find((selector) => rule.selector.startsWith(selector));
    if (key) found[key] = { selector: rule.selector, context: contextOf(rule), body: rule.toString() };
  });
  const [enter, exit, visibility] = keys.map((key) => found[key]);
  assert.ok(enter && exit && visibility, Object.keys(found).join(' | '));
  for (const motion of [enter, exit]) {
    assert.match(motion.context, /prefers-reduced-motion:no-preference/);
    assert.match(motion.selector, /:not\(:where\(\[data-reduce-motion=true\],\[data-reduce-motion=true\] \*\)\)$/);
  }
  assert.match(enter.body, /animation:\.12s ease-out 80ms backwards cds-fade-in/);
  assert.doesNotMatch(visibility.context, /prefers-reduced-motion/);
  assert.match(visibility.body, /transition:visibility 0s linear 80ms/);
  let keyframes = false;
  official.walkAtRules('keyframes', (rule) => { if (rule.params === 'cds-fade-in') keyframes = true; });
  assert.ok(keyframes, 'the official sheet defines cds-fade-in');
});

// Wave integration decision (fidelity LOG "Wave integration"): the source's reduce handling for the MessageActions
// reveal is `transition-property: none; scale: none` (design-system.css:51631-51640, for the OS query and for
// [data-reduce-motion=true]); the global clamp (:1423-1438) only shortens animations. The turn footer and user-turn
// toolbars mirror it, so the hovered toolbar keeps its declared 120ms duration but no longer transitions.
test('MessageActions toolbars turn the reveal transition off under both reduce sources', () => {
  for (const [file, toolbar] of [['source-turn-footer.css', '.stf-toolbar[data-cds="MessageActions"][data-reveal]'], ['source-user-actions.css', '.sua-toolbar[data-cds="MessageActions"][data-reveal]']]) {
    const { root } = sheets.find((sheet) => sheet.name === file);
    const found = { media: false, attr: false };
    root.walkRules((rule) => {
      if (!rule.selectors.some((selector) => selector.endsWith(toolbar))) return;
      const decls = Object.fromEntries(rule.nodes.filter((node) => node.type === 'decl').map((node) => [node.prop, node.value]));
      if (decls['transition-property'] !== 'none' || decls.scale !== 'none') return;
      if (/prefers-reduced-motion\s*:\s*reduce/.test(contextOf(rule.nodes[0]))) found.media = true;
      if (rule.selectors.some((selector) => selector.startsWith('html[data-reduce-motion="true"]'))) found.attr = true;
    });
    assert.deepEqual(found, { media: true, attr: true }, file);
  }
});
