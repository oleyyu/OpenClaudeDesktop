// Extract the 3.6556.2 originals of the approval area's card slot (c9ed5627b A, X7-16; 2.42304.0 c96d752d0 qj): where
// focus lands after a card leaves, and the window guard that follows. Shared by the main session's approvals and the
// /btw side pane's. Nothing here executes desktop runtime code (3.6556.2 migration, w2-btw-approval; research/home-start.md
// §1.3, §2.1 HS-11/HS-12, §3.3):
//   c9ed5627b A    (exported `n`) the slot hook `{card, takesFocus, hasDraft, chordActsAnywhere, row, toComposer}` →
//                  `{setSlot, watch}` (React Compiler output). Its watch `it` (shared-1 useFocusHandBack over the slot)
//                  calls `v` when a card leaves with focus inside; `v`, in a microtask and only when focus is lost: lands
//                  on the next card's root (E) with the focus ring (c6dc54e94 I) when the slot `takesFocus`, the composer
//                  has no draft and the window is attended (shared-10 Gt); otherwise hands focus to the composer
//                  (toComposer); then records the window's state in D and arms the document stray-Enter guard (shared-frame Nf).
//   c9ed5627b k    the per-window guard installed once (O): with a recorded state, plain Enter on the landed card and
//                  ⌘⇧⏎ (unless the drawn card's chord acts anywhere) are swallowed; a printable non-digit, non-space key
//                  typed on the landed card goes to the composer; pointerdown / leaving the landing clears the state.
//                  New in 3.6556.2 (HS-11): once a deliberate digit or arrow pick on the landed card was marked (rt),
//                  a deliberate Enter (nt) passes.
//   c9ed5627b nt   a deliberate key on the landed card: trusted, no repeat, no modifier, at least 400ms after landing and
//                  not right after the window gained focus (shared-10 Jt / en / qt).
//   c9ed5627b rt   the card's digit / arrow keys ask it: off the landed card always true; on it, true (and `picked` set
//                  when the card's digit shortcuts are on) only for a deliberate key (the AskUserQuestion card dt calls
//                  `!rt(e.nativeEvent, E)` before its key handler).
//   c9ed5627b E    the card root inside a slot: the first displayed [data-approval-card-root], else the first displayed
//                  descendant along the first children.
//   c6dc54e94 _    focus an element with transient focus-visible classes (m for a static card, h's ::after ring for a
//                  positioned one); classes and a temporary tabindex go when it blurs. HS-12: it names the element by the
//                  parts marked [data-question-stop-name] (cd8405c1a i, shared-5 Z), else by itself.
//   shared-10 Nx/zx the window attention tracker (installed by A on the slot's window) and "attended" (never left, or
//                  pointer use since leaving). The chunk's top-level `typeof window < "u" && Mx(window)` (HS-13) is a
//                  statement, not a declaration, so it is not carried: A installs the tracker as before.
//   shared-10 Fx   (exported `Qt`, W12 question-cont) the hook "this window is not attended" the AskUserQuestion card's
//                  primary (c30607cef i, dt's `je`) hides its shortcut with. It subscribes to the tracker's change set Dx
//                  and reads Ix over the tracker state wx, so it lives in its own module (window-attention-hook.mjs: it
//                  reads the CDS owner window through view-tabs) that links window-attention.mjs for Ix / Dx instead of
//                  cutting a second WeakMap; window-attention.mjs stays plain node (E42: approval-card-model imports it).
//
// A only runs when c9ed5627b et() = GrowthBook `__gb__1616707004` is on (the slot's `card` is undefined otherwise); the
// host's answer for that flag lives with its adapter (source-approval-card.jsx APPROVAL_LANDING_FLAG), not here.
//
// The machinery is extract-btw-pane.mjs's: every emitted binding is an original top-level declaration sliced from the
// prettier-formatted chunk, each module is the reachable same-chunk closure of its roots (Babel scope analysis), and an
// import resolves through the chunk's import declaration and the dependency's export table to a module emitted earlier
// here, a module src/generated/btw-pane already emits from the same unchanged chunk (its manifest is checked), a React
// Compiler helper the view-tabs graph publishes (E3/R3), or a verified React export of vendor-frame
// (official-3.6556.2.mjs). Features (R2: stable strings or looseFeature patterns) are checked on each listed binding
// when it is sliced, and every listed binding must be reached; every module must be closed apart from a fixed list of
// host globals.
//
// 4.16336.0 (region batch 2a, region-plan G6 / cutover.oldConsumersAtGeneration): a second source contract emits the same
// semantic exports, cut from snapshots/claude-4.16336.0-20261104, into the isolated graph src/generated/approval-landing-v4.
// cowork-approval, proposal-group and question-card (still 3.6556.2) and the host link src/generated/approval-landing by
// original identity, so that graph stays on 3.6556.2, byte for byte, until they move (productionSwitchNotBeforeBatch 8).
// Where the 4.16336.0 originals live (every root located by the chunk's export table or, for the slot's private helpers,
// as the only top-level declaration carrying its features; see target4 below):
//   c6dc54e94-Ci7MQEoh.js B (`v`) the slot hook (3.6556.2 c9ed5627b A), with ae / N / j / M / F (`g`) / I (`_`) and
//                  P (`h`, new: "this element is the landed card"). The watch z now also runs R: when the card leaves
//                  less than 10s (L) after a deliberate key, focus or keyboard-activated click inside it and focus is lost,
//                  onLeft hands focus back even if useFocusHandBack saw no keyboard decision.
//   c37aeaf53-Cm_eXF4J.js o / r / i (`r` / `t` / `n`): the focus ring (3.6556.2 c6dc54e94 _ / m / h); its `a` (`i`) is
//                  btw-pane's focusIsLost.
//   cd8405c1a-DmdA7k6H.js s (`a`): name by marked parts; 4.16336.0 keeps an existing aria-label (data-fallback-name).
//   shared-33-DtdykY0y.js dG (`at`): "data-question-stop-name" (3.6556.2 shared-5 EL).
//   shared-26-B-POtn5S.js MC / RC / IC / yC / pC (`bp` / `mp` / `gp` / `_p` / `Ep`) and PC (`wp`): the window attention
//                  tracker and its hook (3.6556.2 shared-10 Nx / zx / Lx / bx / mx, Fx). The tracker state gains the
//                  claim fields (claimedAt / claimedBy / withheld) the approval keyboard guard GC writes; the chunk's
//                  top-level `typeof window < "u" && jC(window)` is a statement and is not carried (A installs it). The
//                  chunk holds computed `import(e)` calls; every emitted declaration is checked to hold no ImportExpression.
//   shared-25-D-aF0gt9.js xd / v_ / _d (`Hp` / `ld` / `Gp`): MutationObserver of a node's window, an event's input
//                  delay, the owner window or null.
//   shared-1-D1bGaTaN.js sI (`Nd`): a mouse-typed click from the keyboard (GrowthBook "__gb__1951358650"), which R
//                  counts; its GrowthBook reader (shared-0 Uu, `Rx`) is the host adapter cds-core reads it through.
//   c96d752d0-D9VB6ArX.js Jst (`Kt`) / ect (`Wt`) over M0: the reveal guard (3.6556.2 c227f4d5e uD / ED); M0 now keeps
//                  {armed, epoch, restingArm, restart, prolong}. The 4.16336.0 inline approval host (c96d752d0 bct)
//                  reads i2 (`Ut`), a scroll-anchoring reveal gate over M0, instead; i2 is not part of this graph.
// Resolution (sharedGraph 'cds-core', as extract-btw-pane.mjs 4.16336.0): an import resolves to React (assertVendorAlias),
// a cds-core publicName (its declaration hash checked), a module of src/generated/btw-pane-v4 (its manifest, version,
// snapshot, module bytes and source hashes checked) or a module emitted earlier here. A binding cds-core holds without a
// publicName is cut again only when it is pure and its raw declaration hashes as cds-core's (module state stops
// generation, D46); one btw-pane-v4 holds without exporting it likewise only when pure and equal. React Compiler helpers
// btw-pane-v4 does not export are cut in compiler-helpers.mjs, proved by assertCompilerHelpers.
//
// D0: own generator, own output folders (src/generated/approval-landing, src/generated/approval-landing-v4), own
// scripts/verify-gen-approval-landing.mjs (checks both contracts).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import * as official from './official-3.6556.2.mjs';
import * as official4 from './official-4.16336.0.mjs';

const root = path.resolve(import.meta.dirname, '..');
const { referenceVersion, referenceSnapshot } = official;
const source = official.ionSource;
const output = path.join(root, 'src/generated/approval-landing');
const linkedDir = path.join(root, 'src/generated/btw-pane');
const viewTabsDir = path.join(root, 'src/generated/view-tabs');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const loose = official.looseFeature;

// Globals the original code reads from the host page.
const hostGlobals = new Set(['performance', 'queueMicrotask', 'globalThis', 'Set', 'WeakMap', 'WeakSet', 'Date', 'Infinity',
  // shared-25 vv reads it only behind `typeof window < "u"`.
  'window',
  // c227f4d5e uD's 400ms reveal timer and the click guard's weak document / event references (reveal-guard.mjs).
  'setTimeout', 'clearTimeout', 'WeakRef']);
// Emitted in dependency order; `exports` maps original local binding -> exported name (its keys are the roots), or
// `byExport` names the roots by the chunk's export alias. `internal: true` allows roots the chunk does not export (A's
// helpers are private to c9ed5627b); `alsoExports` adds such private roots (local -> exported name) to a byExport module.
// `features` may also list non-root bindings: they must be part of the module. A same-chunk binding a module emitted
// earlier here already holds is imported from it (one instance of the chunk's state); it must be exported there.
const modules = [
  // shared-25 sp (_f): the MutationObserver of a node's window (the focus ring keeps its classes with it); Pu (yv): an
  // event's input delay (shared-10 mx, the attention tracker's press timing). The 2.42304.0 aliases Mf / au now name
  // unrelated bindings, so the roots are found by these aliases and checked by feature.
  { target: 'owner-globals.mjs', source: 'shared-25-DOWZRSlq.js', byExport: { sp: 'mutationObserverOf', Pu: 'eventInputDelay' },
    features: { sp: ['MutationObserver ?? globalThis.MutationObserver'], Pu: ['timeStamp: r'] } },
  // shared-5 Z (EL): the attribute the question card marks its name parts with.
  { target: 'question-stop-name.mjs', source: 'shared-5-Bg6ZMqvt.js', byExport: { Z: 'questionStopNameAttribute' },
    features: { Z: ['"data-question-stop-name"'] } },
  // cd8405c1a i (exported `r`): name an element by its marked parts (or by its own text) while it holds focus, undone on blur.
  { target: 'focus-name.mjs', source: 'cd8405c1a--1nGPcIc.js', byExport: { r: 'nameByMarkedParts' },
    features: { r: [loose('return n(e, ...a(e))')], n: ['"aria-labelledby"', 'named-by-text-'], a: [loose('querySelectorAll(`[${e}]`)')] } },
  { target: 'focus-ring.mjs', source: 'c6dc54e94-E5GA6ry5.js', byExport: { I: 'focusWithRing', P: 'ringClasses', F: 'ringClassesPositioned' },
    features: { I: ['e.focus({ focusVisible: !0 })', 'e.setAttribute("tabindex", "-1")', 'attributeFilter: ["class"]'],
      P: ['"focus-visible:outline-hidden focus-visible:shadow-focus"'], F: ['focus-visible:after:shadow-focus'] } },
  { target: 'window-attention.mjs', source: 'shared-10-D6FXWZph.js',
    byExport: { Yt: 'watchWindowAttention', Gt: 'windowAttended', qt: 'justGainedFocus', Jt: 'isTrustedEvent', en: 'eventDelay' },
    features: { Yt: [loose('Mx(e)')], Mx: ['"visibilitychange"', 'hiddenFromPerf', 'pointerAtPerf'], Gt: [loose('return Bx(Ex(e))')],
      Bx: ['e.leftAtPerf === -1 / 0 || e.pointerAtPerf > e.leftAtPerf'], qt: ['gainedAtPerf <= '], Jt: [loose('return yx(e)')],
      yx: ['e.isTrusted'], en: [loose('return Te(e) ?? 0')], Ix: [loose('t = e && wx.get(e)'), loose('t !== void 0 && !Bx(t)')],
      Dx: ['new WeakMap()'] },
    // W13 G11 (D1, cowork-approval pendingDedupe): the tracker internals shared-10's approval keyboard guard (Vx / Hx,
    // sliced by cowork-approval) reads directly are exported too, so that graph links this one tracker state (wx / Tx)
    // instead of cutting a second WeakMap / WeakSet and installing the window listeners twice.
    alsoExports: { Ix: 'windowUnattended', Dx: 'attentionChangeListeners', yx: 'trustedEventTest', xx: 'focusGraceMs',
      Cx: 'modifierKeyNames', wx: 'attentionStates', Tx: 'trackedWindows', Ex: 'attentionStateOf', Ox: 'setAttentionMark',
      kx: 'focusSettledAt', Ax: 'inputCountsAsAttention', jx: 'windowHiddenAt', Mx: 'trackWindowAttention',
      Rx: 'isEmbeddedFrame', Bx: 'attentionStateAttended' } },
  { target: 'window-attention-hook.mjs', source: 'shared-10-D6FXWZph.js', byExport: { Qt: 'useWindowUnattended' },
    features: { Qt: [loose('K1($, 0, e, () => Ix(e))'), loose('let t = () => r(Ix(e))'), loose('Dx.get(e) ?? new Set()'),
      loose('Dx.set(e, n.add(t))'), loose('n.delete(t)')] } },
  { target: 'card-landing.mjs', source: 'c9ed5627b-BSPWYeYQ.js', internal: true,
    exports: { A: 'useApprovalCardLanding', E: 'approvalCardRoot', k: 'guardWindowAfterCard', D: 'afterCardState', it: 'ApprovalCardWatch',
      nt: 'deliberateCardKey', rt: 'markCardPick' },
    features: {
      A: [loose('card: i'), loose('takesFocus: a'), loose('hasDraft: o'), loose('chordActsAnywhere: c'), loose('row: l'), loose('toComposer: u'),
        loose('landing: p'), loose('!e.hasDraft()'), loose('He(t, e ? Ve : Ue)'), 'since: performance.now()', loose('drawn: () => h.current'),
        loose('setSlot: te'), loose('watch: y')],
      E: ['"[data-approval-card-root]"', '!== "contents"', 'e.firstElementChild'],
      k: ['"keydown"', loose('n.key === "Enter"'), 'chordActsAnywhere !== !0', 'toComposer?.(r.from)', '/[\\d ]/.test(',
        'stopImmediatePropagation()', '"pointerdown"', '"focusout"', loose('r.onCard && (!r.picked || !nt(n))')],
      D: ['new WeakMap()'], it: [loose('place: t'), loose('onLeft: n'), loose('(n(e), null)')],
      nt: [loose('n.at === e.target'), '!e.repeat', loose('!(e.metaKey || e.ctrlKey || e.altKey)'), '>= 400'],
      rt: [loose('(t && (n.picked = !0), !0)')] } },
  // W14-code r4 R4T-08i (review 补做): the inline approval host's reveal click guard. c96d752d0 tke imports
  // c227f4d5e `Hc as Ng` (uD) and `zc as mpe` (ED) and spreads `mpe(Ng(key, !0))` on its outer div:
  //   uD(key, nullSettled)  a key change starts a 400ms window (setTimeout) during which it returns false; a null key
  //                         counts as settled when nullSettled.
  //   ED(settled)           the outer div's capture handlers: inside the window wD swallows pointer clicks (a keyboard
  //                         click, detail 0, passes) and arms a one-shot document listener on mousedown (vD / pD); once
  //                         settled TD still swallows the click that a guarded press released within 100ms (fD / mD).
  { target: 'reveal-guard.mjs', source: 'c227f4d5e-B-FYKrwT.js', byExport: { Hc: 'useRevealSettled', zc: 'revealClickGuard' },
    features: { Hc: ['setTimeout(() => c(a), 400)', '(n && e === null) || s === a'], zc: [loose('return e ? TD : wD')],
      wD: [loose('onClickCapture: xD'), loose('onMouseDownCapture: bD'), loose('onMouseUpCapture: CD')],
      TD: [loose('onClickCapture: SD'), loose('onMouseUpCapture: CD')], fD: ['fD = 100'],
      yD: ['e.nativeEvent.detail === 0'], vD: ['t.addEventListener("click", hD, !0)', 'releasedAt: null'],
      hD: ['e.timeStamp - t <= fD'], dD: ['e.preventDefault()', 'e.stopPropagation()'] } },
];

async function readSource(name, cache, dir = source) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(dir, name));
  const code = await format(bytes.toString(), { parser: 'babel' });
  const ast = parsers.babel.parse(code, {});
  let program;
  babel.traverse(ast, { Program(p) { program = p; } });
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration' && !n.source)
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const record = { name, bytes, text: bytes.toString(), code, program, exported };
  cache.set(name, record);
  return record;
}
const within = (outer, q) => q.node.start >= outer.node.start && q.node.end <= outer.node.end;
const declarationDeps = (src, p) => Object.entries(src.program.scope.bindings)
  .filter(([, b]) => b.referencePaths.some(q => within(p, q)) || b.constantViolations.some(q => within(p, q))).map(([n]) => n);
const declarationText = (src, p) => src.code.slice(p.node.start, p.node.end);
// A feature is a literal source string or a looseFeature() pattern (R2).
function assertFeatures(label, text, features = []) {
  const missing = features.filter(f => (f instanceof RegExp ? !f.test(text) : !text.includes(f)));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => (f instanceof RegExp ? f.source : JSON.stringify(f))).join(', ')}`);
}
// vendor-frame re-exports React: every alias is checked against official-3.6556.2.mjs (R3), never carried by name.
function reactImport(file, alias, dep) {
  if (file !== official.vendorFrame || !official.reactAliases[alias]) return null;
  const { module, member } = official.assertVendorAlias(dep.text, alias);
  return { from: module, member };
}
// E3/R3: a React Compiler helper of shared-frame is imported from view-tabs under the semantic name it publishes.
async function compilerHelper(file, alias, dep, state) {
  state.viewTabs ??= JSON.parse(await fs.readFile(path.join(viewTabsDir, 'manifest.json'), 'utf8'));
  const helper = file === official.sharedFrame ? official.compilerHelpers[alias] : undefined;
  if (!helper) return null;
  if (!state.helpersChecked) { official.assertCompilerHelpers(dep.text); state.helpersChecked = true; }
  const published = state.viewTabs.referenceVersion === referenceVersion ? state.viewTabs.publicNames?.[helper.name] : undefined;
  if (published?.file !== file || published.export !== alias || published.local !== helper.local)
    throw Error(`view-tabs does not publish ${helper.name} as ${file}:${alias} (${helper.local})`);
  return { from: `../view-tabs/${file}`, member: helper.name };
}
// R6: any other shared-frame binding view-tabs publishes (shared-10 Fx's useCdsOwnerWindow), by its semantic name; only
// after the linked / generated modules, so what btw-pane already answers (its elementOf) keeps resolving there.
async function viewTabsName(file, alias, state) {
  state.viewTabs ??= JSON.parse(await fs.readFile(path.join(viewTabsDir, 'manifest.json'), 'utf8'));
  if (file !== official.sharedFrame || state.viewTabs.referenceVersion !== referenceVersion) return null;
  const entry = Object.entries(state.viewTabs.publicNames ?? {}).find(([, v]) => v.file === file && v.export === alias);
  return entry ? { from: `../view-tabs/${file}`, member: entry[0] } : null;
}
// src/generated/btw-pane's modules, usable when they were cut from the very chunk bytes read here.
async function linkedModules(cache) {
  const manifest = JSON.parse(await fs.readFile(path.join(linkedDir, 'manifest.json'), 'utf8'));
  if (manifest.referenceVersion !== referenceVersion) throw Error('btw-pane manifest is for another reference version');
  const linked = [];
  for (const m of manifest.modules) {
    const src = await readSource(m.source, cache);
    if (sha(src.bytes) !== m.sourceSha256) throw Error(`btw-pane ${m.target} was cut from other ${m.source} bytes`);
    const text = await fs.readFile(path.join(linkedDir, m.target), 'utf8');
    if (sha(text) !== m.sha256) throw Error(`btw-pane ${m.target} differs from its manifest`);
    linked.push({ target: `../btw-pane/${m.target}`, source: m.source, exports: m.exports, linked: true });
  }
  return linked;
}

export async function extractApprovalLanding({ check = false, version = referenceVersion } = {}) {
  if (version === official4.referenceVersion) return extractTarget(target4, { check });
  if (version !== referenceVersion) throw Error(`extract-approval-landing has no ${version} source contract`);
  const cache = new Map(), files = {}, state = {};
  const emitted = await linkedModules(cache);
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-approval-landing.mjs', modules: [] };
  for (const raw of modules) {
    const src = await readSource(raw.source, cache);
    // byExport: roots named by the chunk's export alias (features keyed the same way).
    const byLocal = alias => {
      const local = src.exported.get(alias);
      if (!local) throw Error(`${raw.target}: ${raw.source} no longer exports ${alias}`);
      return local;
    };
    const spec = raw.byExport ? { ...raw,
      exports: { ...Object.fromEntries(Object.entries(raw.byExport).map(([alias, name]) => [byLocal(alias), name])), ...raw.alsoExports },
      features: Object.fromEntries(Object.entries(raw.features ?? {}).map(([key, list]) => [key in raw.byExport ? byLocal(key) : key, list])) } : raw;
    const selected = new Map(), imports = new Map(), seen = new Set();
    const add = async name => {
      if (seen.has(name)) return;
      seen.add(name);
      const binding = src.program.scope.getBinding(name);
      if (!binding) throw Error(`${spec.target}: unbound ${name}`);
      const p = binding.path;
      if (p.isImportSpecifier()) {
        const file = p.parent.source.value.replace(/^\.\//, ''), alias = p.node.imported.name, via = `${file}:${alias}`;
        const dep = await readSource(file, cache);
        const hook = reactImport(file, alias, dep);
        if (hook) { imports.set(name, { from: hook.from, name: hook.member, via, kind: 'react' }); return; }
        const helper = await compilerHelper(file, alias, dep, state);
        if (helper) { imports.set(name, { from: helper.from, name: helper.member, via, kind: 'view-tabs' }); return; }
        const local = dep.exported.get(alias);
        const owner = local && emitted.find(m => m.source === file && m.exports[local]);
        const published = !owner && await viewTabsName(file, alias, state);
        if (published) { imports.set(name, { from: published.from, name: published.member, via, kind: 'view-tabs' }); return; }
        if (!owner) throw Error(`${spec.target}: unresolved import ${via}${local ? ` (${local})` : ''}`);
        imports.set(name, { from: owner.linked ? owner.target : `./${owner.target}`, name: owner.exports[local], via,
          kind: owner.linked ? 'linked' : 'generated', original: local });
        return;
      }
      // One instance: a same-chunk binding an earlier module of this generator holds is imported from it.
      const holder = !spec.exports[name] && emitted.find(m => !m.linked && m.source === spec.source && m.selectedNames.includes(name));
      if (holder) {
        if (!holder.exports[name]) throw Error(`${spec.target}: ${name} is held by ${holder.target} but not exported there`);
        imports.set(name, { from: `./${holder.target}`, name: holder.exports[name], via: `${spec.source}#${name}`, kind: 'generated', original: name });
        return;
      }
      if (!p.isFunctionDeclaration() && !p.isVariableDeclarator()) throw Error(`${spec.target}: unsupported declaration ${name}`);
      if (!spec.exports[name] && spec.features?.[name]) assertFeatures(`${spec.target}: ${name}`, declarationText(src, p), spec.features[name]);
      selected.set(name, p);
      p.traverse({ ImportExpression() { throw Error(`${spec.target}: dynamic import inside ${name}`); } });
      for (const dep of declarationDeps(src, p)) await add(dep);
    };
    for (const name of Object.keys(spec.exports)) {
      const binding = src.program.scope.getBinding(name);
      if (!binding || binding.path.isImportSpecifier()) throw Error(`${spec.target}: root ${name} is not a declaration of ${spec.source}`);
      if (!spec.internal && !(name in (raw.alsoExports ?? {})) && ![...src.exported.values()].includes(name)) throw Error(`${spec.target}: root ${name} is no longer exported by ${spec.source}`);
      assertFeatures(`${spec.target}: root ${name}`, declarationText(src, binding.path), spec.features?.[name]);
      await add(name);
    }
    const unreached = Object.keys(spec.features ?? {}).filter(name => !selected.has(name));
    if (unreached.length) throw Error(`${spec.target}: listed bindings ${unreached.join(', ')} are not part of the module`);
    const order = [...selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const blocks = order.map(([, p]) => (p.isVariableDeclarator() ? `var ${declarationText(src, p)};` : declarationText(src, p)));
    const groups = new Map();
    for (const [local, entry] of imports) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const importText = [...groups].map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const exportText = `export { ${Object.entries(spec.exports).map(([local, name]) => (local === name ? local : `${local} as ${name}`)).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${spec.source}; generated by extract-approval-landing.mjs.\n// Edit the extractor, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    let globals;
    babel.traverse(babel.babelParse(text, spec.target, true), { Program(p) { globals = Object.keys(p.scope.globals); } });
    const foreign = globals.filter(name => !hostGlobals.has(name));
    if (foreign.length) throw Error(`${spec.target}: unbound ${foreign.join(', ')}`);
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text),
      bindings: order.map(([name, p]) => ({ name, sha256: sha(declarationText(src, p)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}) })),
      exports: spec.exports,
    });
    emitted.push({ ...spec, selectedNames: [...selected.keys()] });
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`approval landing output set changed: ${present.join(',')}. Run scripts/extract-approval-landing.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`approval landing source mismatch: ${name}. Run scripts/extract-approval-landing.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} approval landing modules (${count} original ${referenceVersion} bindings).`);
  return manifest;
}
// ---------------------------------------------------------------------------------------------------------------------
// 4.16336.0: the isolated graph (region-plan G6). A spec lists its roots in `exports` (original local -> exported name);
// `aliases` names the chunk's export alias of each root (proved against the chunk's export table) or null for a private
// root, which must not be exported by the chunk; every root but a proved compiler helper must also be the only top-level
// declaration of its chunk carrying its features. `reexports` are exported here for the graphs that link this one (one
// instance of the tracker state) and must be reached from the module's roots. `features` may list any binding; listed
// non-roots must be part of the module. `host` replaces an import whose declaration in its own chunk carries the features.
const target4 = (() => {
  const official = official4, loose = official.looseFeature;
  const helpers = names => Object.fromEntries(names.map(name => Object.values(official.compilerHelpers).find(helper => helper.name === name))
    .map(helper => [helper.local, helper.name]));
  return {
    official, output: path.join(root, 'src/generated/approval-landing-v4'), label: 'approval landing 4.16336.0',
    sharedGraph: 'cds-core', linkedArea: 'btw-pane-v4',
    isolatedGraph: { legacyOutput: 'src/generated/approval-landing', productionSwitchNotBeforeBatch: 8,
      heldBy: ['cowork-approval', 'proposal-group', 'question-card', 'src/source-approval-card.jsx', 'src/source-btw-pane.jsx',
        'src/source-plan-card.jsx', 'src/source-question-card.jsx'] },
    hostGlobals: new Set(['performance', 'queueMicrotask', 'globalThis', 'Set', 'WeakMap', 'WeakSet', 'Date', 'Infinity', 'window',
      'setTimeout', 'clearTimeout', 'WeakRef', 'Symbol']),
    modules: [
      // E3: the React Compiler helpers this graph reads that btw-pane-v4 does not export (it exports J9 / J0 / J2 / K0 / K3).
      { target: 'compiler-helpers.mjs', source: official.sharedFrame, compilerHelpers: true,
        exports: helpers(['memoChanged1', 'memoChanged3', 'memoChanged5', 'memoStore1', 'memoStore2', 'memoStore5']) },
      // cds-core wave 4 publishes shared-25 xd / _d (getMutationObserverClass / ownerWindow): focus-ring and card-landing
      // link them (the root guard below); only the event input delay v_ is cut here.
      { target: 'owner-globals.mjs', source: 'shared-25-D-aF0gt9.js', exports: { v_: 'eventInputDelay' },
        aliases: { v_: 'ld' },
        features: { v_: ['timeStamp: r', loose('return r > 0 && a >= 0 && a < g_ ? a : void 0')] } },
      { target: 'question-stop-name.mjs', source: 'shared-33-DtdykY0y.js', exports: { dG: 'questionStopNameAttribute' }, aliases: { dG: 'at' },
        // rG (the question card header) also spells the attribute, as a JSX prop: the root is the declaration that is it.
        features: { dG: [loose('dG = "data-question-stop-name"')] } },
      { target: 'focus-name.mjs', source: 'cd8405c1a-DmdA7k6H.js', exports: { s: 'nameByMarkedParts' }, aliases: { s: 'a' },
        features: { s: [loose('return a(e, ...c(e))')], a: ['"aria-labelledby"', 'named-by-text-', 'e.removeAttribute("aria-label")'],
          c: [loose('querySelectorAll(`[${e}]`)')], t: ['"data-fallback-name"'] } },
      { target: 'focus-ring.mjs', source: 'c37aeaf53-Cm_eXF4J.js', exports: { o: 'focusWithRing', r: 'ringClasses', i: 'ringClassesPositioned' },
        aliases: { o: 'r', r: 't', i: 'n' },
        features: { o: ['t.focus({ focusVisible: !0 })', 't.setAttribute("tabindex", "-1")', 'attributeFilter: ["class"]'],
          r: ['"focus-visible:outline-hidden focus-visible:shadow-focus"'], i: ['focus-visible:after:shadow-focus'] } },
      { target: 'window-attention.mjs', source: 'shared-26-B-POtn5S.js',
        exports: { MC: 'watchWindowAttention', RC: 'windowAttended', IC: 'justGainedFocus', yC: 'isTrustedEvent', pC: 'eventDelay', FC: 'windowUnattended' },
        aliases: { MC: 'bp', RC: 'mp', IC: 'gp', yC: '_p', pC: 'Ep', FC: null },
        // W13 G11 (D1, cowork-approval pendingDedupe): the tracker internals the approval keyboard guard reads directly,
        // exported so a graph that links this one reads this one tracker state (CC / wC / EC) instead of a second copy.
        reexports: { EC: 'attentionChangeListeners', vC: 'trustedEventTest', bC: 'focusGraceMs', SC: 'modifierKeyNames', CC: 'attentionStates',
          wC: 'trackedWindows', TC: 'attentionStateOf', DC: 'setAttentionMark', OC: 'focusSettledAt', kC: 'inputCountsAsAttention',
          AC: 'windowHiddenAt', jC: 'trackWindowAttention', LC: 'isEmbeddedFrame', zC: 'attentionStateAttended' },
        features: { MC: [loose('jC(e);', { keep: ['jC'] })], jC: ['"visibilitychange"', 'hiddenFromPerf', 'pointerAtPerf', '"pointercancel"'],
          RC: [loose('return zC(TC(e))', { keep: ['zC', 'TC'] })], zC: ['e.leftAtPerf === -1 / 0 || e.pointerAtPerf > e.leftAtPerf'],
          IC: ['.gainedAtPerf <= '], yC: [loose('return vC(e)', { keep: ['vC'] })], vC: ['e.isTrusted'],
          pC: [loose('return Ut(e) ?? 0', { keep: ['Ut'] })], FC: [loose('let t = e && CC.get(e)'), loose('return t !== void 0 && !zC(t)')],
          TC: ['hiddenSpells: []', 'claimedHandledAt: -1 / 0', 'withheld: null'], CC: ['new WeakMap()'], wC: ['new WeakSet()'],
          bC: ['bC = 1e3'], SC: ['"CapsLock"', '"AltGraph"'], LC: ['"IFRAME"', '"WEBVIEW"'] } },
      { target: 'window-attention-hook.mjs', source: 'shared-26-B-POtn5S.js', exports: { PC: 'useWindowUnattended' }, aliases: { PC: 'wp' },
        features: { PC: [loose('K1($, 0, e, () => FC(e))', { keep: ['FC'] }), loose('let t = () => r(FC(e))', { keep: ['FC'] }),
          loose('EC.get(e) ?? new Set()', { keep: ['EC'] }), loose('EC.set(e, n.add(t))', { keep: ['EC'] }), loose('n.delete(t)')] } },
      { target: 'keyboard-click.mjs', source: 'shared-1-D1bGaTaN.js', exports: { sI: 'isKeyboardActivatedClick' }, aliases: { sI: 'Nd' },
        features: { sI: ['e.type === "click"', 'e.buttons === 1', 'e.pointerType === "mouse"', '"sourceCapabilities" in e', loose('jt(oI) === !0')],
          oI: ['"__gb__1951358650"'] },
        host: {
          // shared-0 Uu (exported `Rx`): the forced GrowthBook value, else the client's. cds-core's own copy of sI reads it
          // through the same adapter (cds-core manifest shared-1.mjs import jt), so both copies answer alike.
          jt: { from: '../../cds-core-adapter.mjs', name: 'hostGrowthBookFeature', features: [loose('let t = Wu(e); return t === void 0 ? zu(e) : t;')] },
        } },
      { target: 'card-landing.mjs', source: 'c6dc54e94-Ci7MQEoh.js',
        exports: { B: 'useApprovalCardLanding', ae: 'approvalCardRoot', N: 'guardWindowAfterCard', j: 'afterCardState', z: 'ApprovalCardWatch',
          F: 'deliberateCardKey', I: 'markCardPick', P: 'isLandedCard' },
        aliases: { B: 'v', ae: null, N: null, j: null, z: null, F: 'g', I: '_', P: 'h' },
        features: {
          B: [loose('card: o'), loose('takesFocus: s'), loose('hasDraft: c'), loose('chordActsAnywhere: u'), loose('row: d'), loose('toComposer: f'),
            loose('landing: v'), loose('!e.hasDraft()'), loose('ee(t, e ? T : te)'), 'since: performance.now()', loose('drawn: () => y.current'),
            loose('setSlot: m'), loose('watch: C')],
          ae: ['"[data-approval-card-root]"', '!== "contents"', 'e.firstElementChild'],
          N: ['"keydown"', loose('n.key === "Enter"'), 'chordActsAnywhere !== !0', 'toComposer?.(r.from)', '/[\\d ]/.test(',
            'stopImmediatePropagation()', '"pointerdown"', '"focusout"', loose('r.onCard && (!r.picked || !F(n))')],
          j: ['new WeakMap()'], M: ['new WeakSet()'],
          z: [loose('place: t'), loose('onLeft: n'), loose('(n(e), null)'), loose('f(r, i), R(t, n)')],
          R: ['"focusin"', '"pointerdown"', '"keydown"', '"click"', loose('performance.now() - r < L')], L: ['L = 1e4'],
          F: [loose('n.at === e.target'), '!e.repeat', loose('!(e.metaKey || e.ctrlKey || e.altKey)'), '>= 400'],
          I: [loose('(t && (n.picked = !0), !0)')], P: [loose('let t = j.get(l(e)); return t?.onCard === !0 && t.at === e;')] } },
      // The reveal click guard (3.6556.2 c227f4d5e uD / ED, W14-code r4 R4T-08i), now in c96d752d0: Jst(key, nullSettled)
      // is M0's `armed` (a key change starts a 400ms window; a null key counts as settled when nullSettled), and ect(settled)
      // the capture handlers (inside the window pointer clicks are swallowed, a keyboard click passes, and a mousedown
      // arms a one-shot document listener; once settled only the click a guarded press released within 100ms is).
      { target: 'reveal-guard.mjs', source: 'c96d752d0-D9VB6ArX.js', exports: { Jst: 'useRevealSettled', ect: 'revealClickGuard' },
        aliases: { Jst: 'Kt', ect: 'Wt' },
        features: { Jst: [loose('return M0(e, t !== void 0 && t).armed', { keep: ['M0'] })], ect: [loose('return e ? $st : Qst', { keep: ['$st', 'Qst'] })],
          M0: ['timer: setTimeout(e, 400)', 'restingArm: c', 'prolong: m', loose('n !== e && (r(e), a(i + 1), t && e === null && (s(i + 1), l(!0)))')],
          Qst: [loose('onClickCapture: V0'), loose('onMouseDownCapture: B0'), loose('onMouseUpCapture: U0')],
          $st: [loose('onClickCapture: H0'), loose('onMouseUpCapture: U0')], Xst: ['Xst = 100'],
          z0: ['e.nativeEvent.detail === 0'], Zst: ['releasedAt: null'], I0: ['e.timeStamp - t <= Xst'], N0: ['e.preventDefault()', 'e.stopPropagation()'] } },
    ],
  };
})();
export const contractVersions = Object.freeze([referenceVersion, official4.referenceVersion]);
// The 4.16336.0 contract and its engine, for tests that prove generation stops (a renamed alias, a non-unique root, D46).
export { target4 as contract4, extractTarget as extractContract };

const featureMissing = (text, features = []) => features.filter(f => (f instanceof RegExp ? !f.test(text) : !text.includes(f)));
// 4.16336.0: the root is the only top-level declaration of its chunk that carries every feature.
function assertUniqueRoot(label, src, name, features = []) {
  if (!features.length) throw Error(`${label}: root ${name} has no features to locate it by`);
  const hits = Object.entries(src.program.scope.bindings)
    .filter(([, b]) => (b.path.isFunctionDeclaration() || b.path.isVariableDeclarator()) && !featureMissing(declarationText(src, b.path), features).length)
    .map(([n]) => n);
  if (hits.length !== 1 || hits[0] !== name) throw Error(`${label}: root ${name} is not the unique declaration with its features (${hits.join(', ') || 'none'})`);
}
// A top-level declaration in the unformatted chunk bytes: the text a runSlicer graph (cds-core) hashes its bindings by.
function rawDeclarationText(src, name) {
  src.raw ??= new Map(parsers.babel.parse(src.text, {}).program.body.flatMap(node => (node.type === 'FunctionDeclaration' ? [[node.id.name, node]]
    : node.type === 'VariableDeclaration' ? node.declarations.filter(d => d.id.type === 'Identifier').map(d => [d.id.name, d]) : [])));
  const node = src.raw.get(name);
  if (!node) throw Error(`${src.name}: no top-level declaration ${name} in the chunk bytes`);
  return src.text.slice(node.start, node.end);
}
// sharedGraph 'cds-core': the manifest is on this version and snapshot, every module's bytes equal its recorded sha256
// and its sourceSha256 equals the official chunk read here, and every publicName is a binding its target module exports
// under exportName (the runSlicer sharedGraph contract, as extract-btw-pane.mjs).
async function sharedGraph(contract) {
  const { official } = contract, area = contract.sharedGraph, dir = path.join(root, 'src/generated', area);
  const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
  if (manifest.referenceVersion !== official.referenceVersion) throw Error(`${area} is ${manifest.referenceVersion}, expected ${official.referenceVersion}`);
  if (manifest.referenceSnapshot !== official.referenceSnapshot) throw Error(`${area} snapshot is ${manifest.referenceSnapshot}, expected ${official.referenceSnapshot}`);
  const byTarget = new Map(), held = new Map(), published = new Map();
  for (const m of manifest.modules) {
    if ((m.referenceVersion ?? manifest.referenceVersion) !== official.referenceVersion) throw Error(`shared module ${area}/${m.target} is ${m.referenceVersion}, expected ${official.referenceVersion}`);
    if (sha(await fs.readFile(path.join(dir, m.target))) !== m.sha256) throw Error(`${area}/${m.target} differs from its manifest`);
    const bytes = await fs.readFile(path.join(official.ionSource, path.basename(m.source))).catch(() => null);
    if (!bytes || !/^[0-9a-f]{64}$/.test(m.sourceSha256 ?? '') || sha(bytes) !== m.sourceSha256)
      throw Error(`${area}/${m.target} was sliced from ${m.source} ${m.sourceSha256 ?? '(no sourceSha256)'}, which is not the source this area reads`);
    byTarget.set(m.target, m);
    for (const b of m.bindings) held.set(`${path.basename(m.source)}#${typeof b === 'string' ? b : b.name}`, { target: m.target, sha256: typeof b === 'string' ? null : b.sha256 });
  }
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) {
    const m = byTarget.get(entry.target);
    const exported = m && (m.exports?.[entry.local] ?? (m.sharedExports?.includes(entry.local) ? entry.local : null));
    if (!m || path.basename(m.source) !== entry.file || !m.bindings.some(b => (typeof b === 'string' ? b : b.name) === entry.local) || !entry.exportName || exported !== entry.exportName)
      throw Error(`${area} publicName ${name} (${entry.file}#${entry.local}) is not exported by ${entry.target} as ${entry.exportName}`);
    published.set(`${entry.file}#${entry.local}`, { name, ...entry });
  }
  return { area, held, published };
}
// src/generated/btw-pane-v4 (the dependency region's 4.16336.0 graph): same version, snapshot and shared graph; each module
// cut from the very chunk bytes read here and equal to its manifest.
async function linkedGraph(contract, cache) {
  const { official } = contract, area = contract.linkedArea, dir = path.join(root, 'src/generated', area);
  const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
  if (manifest.referenceVersion !== official.referenceVersion || manifest.referenceSnapshot !== official.referenceSnapshot)
    throw Error(`${area} is ${manifest.referenceVersion} (${manifest.referenceSnapshot}), expected ${official.referenceVersion} (${official.referenceSnapshot})`);
  if (manifest.sharedGraph !== contract.sharedGraph) throw Error(`${area} links ${manifest.sharedGraph}, expected ${contract.sharedGraph}`);
  const linked = [];
  for (const m of manifest.modules) {
    const src = await readSource(m.source, cache, official.ionSource);
    if (sha(src.bytes) !== m.sourceSha256) throw Error(`${area} ${m.target} was cut from other ${m.source} bytes`);
    if (sha(await fs.readFile(path.join(dir, m.target), 'utf8')) !== m.sha256) throw Error(`${area} ${m.target} differs from its manifest`);
    linked.push({ target: `../${area}/${m.target}`, source: m.source, exports: m.exports, linked: true,
      bindings: new Map(m.bindings.map(b => [b.name, b.sha256])) });
  }
  return { area, sha256: sha(JSON.stringify(manifest)), linked };
}
// Module state a second copy would split: a context, or a module-level WeakMap / Map / Set / WeakSet (D46).
function isModuleState(contract, src, p) {
  if (!p.isVariableDeclarator()) return false;
  const init = p.node.init;
  if (init?.type === 'NewExpression' && init.callee.type === 'Identifier' && ['WeakMap', 'Map', 'Set', 'WeakSet'].includes(init.callee.name)) return true;
  if (init?.type === 'CallExpression' && init.callee.type === 'Identifier') {
    const callee = src.program.scope.getBinding(init.callee.name)?.path;
    if (callee?.isImportSpecifier()) {
      const file = callee.parent.source.value.replace(/^\.\//, '');
      if (file === contract.official.vendorFrame && contract.official.reactAliases[callee.node.imported.name]?.[1] === 'createContext') return true;
    }
  }
  return false;
}

async function extractTarget(contract, { check }) {
  const { official, output, label } = contract, dir = official.ionSource;
  const cache = new Map(), files = {};
  const graph = await sharedGraph(contract);
  const link = await linkedGraph(contract, cache);
  const emitted = [...link.linked];
  const manifest = { referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-approval-landing.mjs',
    sharedGraph: graph.area, linkedGraph: link.area, isolatedGraph: contract.isolatedGraph, modules: [] };
  const sharedImport = (file, local) => {
    const shared = graph.published.get(`${file}#${local}`);
    return shared ? { from: `../${graph.area}/${shared.target}`, name: shared.exportName, kind: 'shared-graph' } : null;
  };
  // The declaration a cds-core publicName stands for must hash as the one cds-core holds (a re-pointed alias fails).
  const linkedSha = (src, file, local, shared) => {
    const held = graph.held.get(`${file}#${local}`);
    if (!held?.sha256 || held.sha256 !== sha(rawDeclarationText(src, local))) throw Error(`${file}#${local} differs from the declaration ${graph.area} publishes as ${shared.name}`);
    return held.sha256;
  };
  for (const spec of contract.modules) {
    const src = await readSource(spec.source, cache, dir);
    if (spec.compilerHelpers) {
      const proved = official.assertCompilerHelpers(src.text);
      for (const [local, name] of Object.entries(spec.exports)) {
        if (proved[name]?.local !== local) throw Error(`${spec.target}: ${local} is not the proved compiler helper ${name}`);
        const owner = emitted.find(m => m.source === spec.source && m.exports[local]);
        if (owner) throw Error(`${spec.target}: ${owner.target} already exports ${local} (${name}); link it`);
      }
    }
    const roots = Object.keys(spec.exports);
    const exportsAll = { ...spec.exports, ...spec.reexports };
    const selected = new Map(), imports = new Map(), seen = new Set(), heldByCdsCore = [], heldByLinked = [];
    const add = async name => {
      if (seen.has(name)) return;
      seen.add(name);
      const binding = src.program.scope.getBinding(name);
      if (!binding) throw Error(`${spec.target}: unbound ${name}`);
      const p = binding.path;
      const host = spec.host?.[name];
      if (host) {
        // An import whose declaration in its own chunk is the one the host adapter answers for.
        if (!p.isImportSpecifier()) throw Error(`${spec.target}: host binding ${name} is not an import`);
        const file = p.parent.source.value.replace(/^\.\//, ''), alias = p.node.imported.name;
        const replacedSrc = await readSource(file, cache, dir);
        const local = replacedSrc.exported.get(alias), replaced = local && replacedSrc.program.scope.getBinding(local)?.path;
        if (!replaced || (!replaced.isVariableDeclarator() && !replaced.isFunctionDeclaration())) throw Error(`${spec.target}: host binding ${name} imports ${file}:${alias}, which is not an exported declaration`);
        assertFeatures(`${spec.target}: host ${name}`, declarationText(replacedSrc, replaced), host.features);
        imports.set(name, { from: host.from, name: host.name, via: `${file}:${alias}`, kind: 'host', original: local, replacedSha256: sha(declarationText(replacedSrc, replaced)) });
        return;
      }
      if (p.isImportSpecifier()) {
        const file = p.parent.source.value.replace(/^\.\//, ''), alias = p.node.imported.name, via = `${file}:${alias}`;
        const dep = await readSource(file, cache, dir);
        if (file === official.vendorFrame && official.reactAliases[alias]) {
          const { module, member } = official.assertVendorAlias(dep.text, alias);
          imports.set(name, { from: module, name: member, via, kind: 'react' });
          return;
        }
        const local = dep.exported.get(alias);
        if (!local) throw Error(`${spec.target}: ${file} does not export ${alias}`);
        const shared = sharedImport(file, local);
        if (shared) { imports.set(name, { ...shared, via, original: local, linkedSha256: linkedSha(dep, file, local, shared) }); return; }
        const owner = emitted.find(m => m.source === file && m.exports[local]);
        if (!owner) throw Error(`${spec.target}: unresolved import ${via} (${local})`);
        imports.set(name, { from: owner.linked ? owner.target : `./${owner.target}`, name: owner.exports[local], via,
          kind: owner.linked ? 'linked' : 'generated', original: local });
        return;
      }
      if (!p.isFunctionDeclaration() && !p.isVariableDeclarator()) throw Error(`${spec.target}: unsupported declaration ${name}`);
      const key = `${spec.source}#${name}`;
      // One copy: a same-chunk binding an earlier module (here or btw-pane-v4) exports is imported from it.
      const holder = !exportsAll[name] && emitted.find(m => m.source === spec.source && m.exports[name]);
      if (holder) {
        imports.set(name, { from: holder.linked ? holder.target : `./${holder.target}`, name: holder.exports[name], via: key,
          kind: holder.linked ? 'linked' : 'generated', original: name });
        return;
      }
      const silent = emitted.find(m => !m.linked && m.source === spec.source && m.selectedNames.includes(name));
      if (silent) throw Error(`${spec.target}: ${name} is held by ${silent.target} but not exported there`);
      // A binding cds-core publishes is linked, never cut again, roots included; one it holds without a publicName is
      // cut again only when pure and equal (D46).
      const shared = sharedImport(spec.source, name), held = graph.held.get(key);
      if (shared) {
        if (roots.includes(name) || spec.reexports?.[name]) throw Error(`${spec.target}: root ${key} is the cds-core publicName ${shared.name}; link it instead`);
        imports.set(name, { ...shared, via: key, original: name, linkedSha256: linkedSha(src, spec.source, name, shared) });
        return;
      }
      if (held) {
        if (isModuleState(contract, src, p)) throw Error(`module state ${graph.area} holds without a semantic name (add it to ${graph.area} publicNames, D46): ${spec.target}: ${key}`);
        if (held.sha256 !== sha(rawDeclarationText(src, name))) throw Error(`${spec.target}: ${key} differs from the declaration ${graph.area}/${held.target} holds`);
        heldByCdsCore.push(name);
      }
      const linkedHolder = emitted.find(m => m.linked && m.source === spec.source && m.bindings.has(name));
      if (linkedHolder) {
        if (isModuleState(contract, src, p)) throw Error(`module state ${link.area} holds without exporting it: ${spec.target}: ${key} (${linkedHolder.target})`);
        if (linkedHolder.bindings.get(name) !== sha(declarationText(src, p))) throw Error(`${spec.target}: ${key} differs from the declaration ${linkedHolder.target} holds`);
        heldByLinked.push(name);
      }
      if (!roots.includes(name) && spec.features?.[name]) assertFeatures(`${spec.target}: ${name}`, declarationText(src, p), spec.features[name]);
      selected.set(name, p);
      p.traverse({ ImportExpression() { throw Error(`${spec.target}: dynamic import inside ${name}`); } });
      for (const dep of declarationDeps(src, p)) await add(dep);
    };
    for (const name of roots) {
      const binding = src.program.scope.getBinding(name);
      if (!binding || binding.path.isImportSpecifier()) throw Error(`${spec.target}: root ${name} is not a declaration of ${spec.source}`);
      if (!spec.compilerHelpers) {
        const alias = spec.aliases?.[name];
        if (alias === undefined) throw Error(`${spec.target}: root ${name} names no export alias (null for a private root)`);
        if (alias !== null && src.exported.get(alias) !== name) throw Error(`${spec.target}: ${spec.source} exports ${alias} as ${src.exported.get(alias) ?? 'nothing'}, not ${name}`);
        if (alias === null && [...src.exported.values()].includes(name)) throw Error(`${spec.target}: private root ${name} is exported by ${spec.source}`);
        assertFeatures(`${spec.target}: root ${name}`, declarationText(src, binding.path), spec.features?.[name]);
        assertUniqueRoot(spec.target, src, name, spec.features?.[name]);
      }
      await add(name);
    }
    const unreached = [...Object.keys(spec.reexports ?? {}), ...Object.keys(spec.features ?? {})].filter(name => !selected.has(name));
    if (unreached.length) throw Error(`${spec.target}: listed bindings ${unreached.join(', ')} are not part of the module`);
    const order = [...selected].sort((a, b) => a[1].node.start - b[1].node.start);
    const blocks = order.map(([, p]) => (p.isVariableDeclarator() ? `var ${declarationText(src, p)};` : declarationText(src, p)));
    const groups = new Map();
    for (const [local, entry] of imports) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const importText = [...groups].map(([from, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const exportText = `export { ${Object.entries(exportsAll).map(([local, name]) => (local === name ? local : `${local} as ${name}`)).join(', ')} };`;
    const header = `// Original Claude Desktop ${official.referenceVersion} bindings from ${spec.source}; generated by extract-approval-landing.mjs.\n// Edit the extractor, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    let globals;
    babel.traverse(babel.babelParse(text, spec.target, true), { Program(p) { globals = Object.keys(p.scope.globals); } });
    const foreign = globals.filter(name => !contract.hostGlobals.has(name));
    if (foreign.length) throw Error(`${spec.target}: unbound ${foreign.join(', ')}`);
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: spec.source, sourceSha256: sha(src.bytes), sha256: sha(text),
      bindings: order.map(([name, p]) => ({ name, sha256: sha(declarationText(src, p)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}),
        ...(e.replacedSha256 ? { replacedSha256: e.replacedSha256 } : {}), ...(e.linkedSha256 ? { linkedSha256: e.linkedSha256 } : {}) })),
      exports: exportsAll,
      ...(spec.compilerHelpers ? {} : { roots: Object.fromEntries(roots.map(name => [name, spec.aliases[name]])) }),
      heldByCdsCore, heldByLinked,
    });
    emitted.push({ ...spec, exports: exportsAll, selectedNames: [...selected.keys()] });
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`${label} output set changed: ${present.join(',')}. Run scripts/extract-approval-landing.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`${label} source mismatch: ${name}. Run scripts/extract-approval-landing.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} ${label} modules (${count} original ${official.referenceVersion} bindings).`);
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  for (const version of contractVersions) await extractApprovalLanding({ check: process.argv.includes('--check'), version });
