// AskUserQuestion card, 4.16336.0 source contract (claude-4.16336.0-migrate-20261104, account2 batch 6, region
// question-card): the same semantic names extract-question-card.mjs cuts from 3.6556.2 into src/generated/question-card,
// cut from the frozen 4.16336.0 snapshot into the isolated graph src/generated/question-card-v4. The 3.6556.2 output is
// untouched (staged double output; no production switch: src/source-question-card.jsx, source-async-questions.jsx,
// source-approval-card.jsx, source-plan-card.jsx and source-session.jsx keep reading src/generated/question-card).
//
// 4.16336.0 moved things around (3.6556.2 local -> 4.16336.0 local):
//   c9ed5627b-DLvwQtiq  the card itself is vt (3.6556.2 dt, export t). Its option row _t (ut) now draws the shared answer
//                       button of c2f6611a3 (hr, export o) instead of its own <button>; st -> mt, ot -> pt, at -> ft,
//                       vt -> Tt (it now also lets c2f6611a3 cr close an open popover on Escape first), _t -> wt,
//                       mt -> xt, ht -> St, gt -> Ct. The landing guard tt (onLandedCard) left the chunk: it is
//                       c6dc54e94 P, which approval-landing-v4 card-landing.mjs already holds and exports (isLandedCard).
//   c2f6611a3-Dcq4MBgv  the card-presentation answer row Tn -> Wr (now over hr too), cn -> Dr, Sn -> Vr, Cn -> Hr,
//                       bn -> zr, xn -> Br; hr (QuestionOptionButton) is the button both rows share.
//   shared-33-DtdykY0y  the card title row (3.6556.2 shared-5 bL) is rG (export ft); it reads the compact-header
//                       context shared-33 BW through HW (cds-core publishes BW: ctx_shared33_BW). questionDisplayText
//                       (3.6556.2 shared-5 $A) is _I (export ti).
//   c30607cef-DbSe2rPb  the primary button i (export t) is already proposal-group-v4's (c30607cef.mjs exports it as `i`):
//                       linked, not cut again.
//   c8187a2dc-Dp9Zia_4  the [unicode-bidi:plaintext] class e (export t), byte-identical to 3.6556.2.
// Expression cuts (INNER): vt's document-level digit listener (React Compiler slot 65, run by `c(bn, xn)`), its row
// press handler (slot 108) and drag-select test (slot 109) are cut out of vt by AST with vt's own locals as named
// parameters, as extract-question-card.mjs does for 3.6556.2 dt. Every program-level binding they read is imported from
// where the slicer places it: cds-core (publicNames), a linked area's export, or this graph's chunk module (the binding
// is added to that module's linkExports, so the slicer cuts and exports it).
//
// Machinery: the shared runSlicer engine (scripts/extract-working-line.mjs, not changed here):
//   - sourceContract scripts/official-4.16336.0.mjs; sharedGraph 'cds-core' (pinned manifest sha256);
//   - linkedAreas (D1, account2/plan.json question-card `linked`): approval-landing-v4 (card-landing.mjs: the landing
//     state afterCardState = c6dc54e94 j, isLandedCard P, deliberateCardKey F; window-attention.mjs: shared-26 pC),
//     btw-pane-v4, routines-shared-v4, and of proposal-group-v4 only c30607cef.mjs (the primary button) and shared-26.mjs
//     (mC, the time since an input event, read by the digit listener's fullscreen-exit guard);
//   - one host boundary (HOST_ADAPTERS): cb8c5a88f Zi, the transcript plain-text painter the answer button hands to the
//     description renderer when an option description contains a URL (c2f6611a3 fr). Its closure is the transcript's link
//     and session-chip layer (~6600 bindings: session chips, PR rows, artifact pane, environments query, telemetry), which
//     no 4.16336.0 graph owns yet; src/source-question-card-v4-adapters.jsx documents the stand-in and the pending owner.
// Roots, linked roots, inner expressions and the adapted original are located on the official AST and pinned by raw
// declaration sha256 (ROOT_PINS / LINKED_ROOT_PINS / INNER / ADAPTER_PINS); no pin is ever refreshed by a script.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import * as official from './official-4.16336.0.mjs';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
export const QUESTION_CARD_V4_OUTPUT = 'src/generated/question-card-v4';
const ADAPTER_FILE = 'src/source-question-card-v4-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The cds-core graph this area was reviewed against (cds-core wave 6).
export const CDS_CORE_MANIFEST_SHA256 = '06d2026939e5c8992713c2a0dda1b1abc9adffe7a0c223fe3c1e79eecd08d62c';

export const QUESTION = 'c9ed5627b-DLvwQtiq.js';
export const ANSWER = 'c2f6611a3-Dcq4MBgv.js';
export const HEADER = 'shared-33-DtdykY0y.js';
export const BIDI = 'c8187a2dc-Dp9Zia_4.js';
export const PRIMARY = 'c30607cef-DbSe2rPb.js';
export const LANDING = 'c6dc54e94-Ci7MQEoh.js';
export const PAINTER = 'cb8c5a88f-Cxti0pWl.js';

// ── Roots: file -> local -> { name, export (the chunk's own alias, null: chunk-internal), previous (3.6556.2), probe (raw), features } ──
export const ROOTS = {
  [QUESTION]: {
    _t: { name: 'QuestionOptionRow', export: null, previous: 'c9ed5627b ut', probe: 'onRowMouseDown:c,endsDragSelect:l,onOptionClick:d',
      features: ['l(e) || d(r, !ye(e.nativeEvent) && !ie(e.nativeEvent));', '`flex items-center gap-sm rounded-[5px] px-md py-md text-start ${i ? mt : a ? "bg-alpha-2" : "bg-alpha-1 hover:bg-alpha-2"}`',
        '"data-size": "sm",', 'className: "flex shrink-0",', 'className: "pointer-events-none flex pointer-coarse:hidden",', 'children: e(te, { keys: String(r + 1) }),',
        'textClassName: "gap-0.5",', 'descriptionClassName: "text-footnote text-muted-as-secondary",'] },
    mt: { name: 'selectedRowClass', export: null, previous: 'c9ed5627b st', probe: 'mt="bg-[light-dark(',
      features: ['"bg-[light-dark(var(--cds-surface-popover),var(--cds-alpha-2))] [box-shadow:inset_0_0_0_1px_var(--cds-fill-secondary-ring)]";'] },
    pt: { name: 'dragSelectThreshold', export: null, previous: 'c9ed5627b ot', probe: 'pt=4', features: ['var pt = 4;'] },
    ft: { name: 'preventMouseDown', export: null, previous: 'c9ed5627b at', probe: 'ft(e){return e.preventDefault()}', features: ['return e.preventDefault();'] },
    Tt: { name: 'otherFieldArrowKeys', export: null, previous: 'c9ed5627b vt', probe: '(e.key==="ArrowUp"||e.key==="ArrowDown")&&e.stopPropagation()',
      features: ['(h(e), (e.key === "ArrowUp" || e.key === "ArrowDown") && e.stopPropagation());'] },
    wt: { name: 'stopClickPropagation', export: null, previous: 'c9ed5627b _t', probe: '(e){e.stopPropagation()}', features: ['function wt(e) {', 'e.stopPropagation();'] },
    xt: { name: 'composedHopElements', export: null, previous: 'c9ed5627b mt', probe: 'return p(e)??[]', features: ['return p(e) ?? [];'] },
    St: { name: 'isTextboxRole', export: null, previous: 'c9ed5627b ht', probe: '[role="searchbox"]\')}',
      features: ['return e.matches(\'[role="combobox"],[role="textbox"],[role="searchbox"]\');'] },
    Ct: { name: 'isInEditableContent', export: null, previous: 'c9ed5627b gt', probe: '[contenteditable]:not(',
      features: ['return e.closest(\'[contenteditable]:not([contenteditable="false"])\') !== null;'] },
  },
  [ANSWER]: {
    Wr: { name: 'QuestionAnswerOption', export: null, previous: 'c2f6611a3 Tn', probe: 'onSelect:s}=e',
      features: ['{ option: n, index: r, isSelected: i, isMultiSelect: a, disabled: o, onSelect: s }', 'Vr(e) || s(r);', 't(a ? ne : Dr, { checked: i, className: f })',
        'className: Ur,', 'textClassName: "gap-xs",', 'descriptionClassName: "text-body text-secondary",', 'lead: l,'] },
    Dr: { name: 'QuestionRadioMark', export: null, previous: 'c2f6611a3 cn', probe: 'epitaxy-radio-mark',
      features: ['o = `epitaxy-radio-mark ${r ?? ""}`,', 't("span", { className: "epitaxy-radio-mark-dot" })', '"aria-hidden": "true",', '"data-checked": i,', '"data-unchecked": a,'] },
    Vr: { name: 'endsAnswerSelection', export: null, previous: 'c2f6611a3 Sn', probe: 'getRangeAt(0).intersectsNode(e.currentTarget)',
      features: ['let t = e.currentTarget.ownerDocument.getSelection();', 't.getRangeAt(0).intersectsNode(e.currentTarget)'] },
    Hr: { name: 'answerOptionInset', export: null, previous: 'c2f6611a3 Cn', probe: 'Hr="px-lg"', features: ['var Hr = "px-lg";'] },
    zr: { name: 'preventAnswerMouseDown', export: null, previous: 'c2f6611a3 bn', probe: '(e){e.preventDefault()}', features: ['function zr(e) {', 'e.preventDefault();'] },
    Br: { name: 'stopAnswerClick', export: null, previous: 'c2f6611a3 xn', probe: '(e){e.stopPropagation()}', features: ['function Br(e) {', 'e.stopPropagation();'] },
    hr: { name: 'QuestionOptionButton', export: 'o', previous: null, probe: 'descriptionClassName:l,lead:te',
      features: ['h = typeof r.description == "string" ? r.description : "",', 'oe = `relative flex min-w-0 flex-1 flex-col select-text ${c}`,',
        'className: `text-body text-primary ${lr}`,', 'className: `whitespace-pre-wrap ${l} ${lr}`,', 'children: t(at, { text: F(h), paint: ae ? fr : void 0 }),',
        't("button", { type: "button", disabled: p, "aria-pressed": i, ...ue, ...de })', 'role: "presentation",'] },
  },
  [HEADER]: {
    rG: { name: 'QuestionCardHeader', export: 'ft', previous: 'shared-5 bL', probe: 'titleNamesCard:o',
      features: ['{ above: t, leading: n, children: r, subtitle: i, trailing: a, titleNamesCard: o }', 'u = HW(),', 'className: "text-body text-muted-as-secondary",',
        'className: "shrink-0 self-center",', '"data-question-stop-name": p,', 'm = `${u ? "text-body" : "text-body-semibold"} min-w-0 break-words`,',
        'className: "flex items-start gap-xs min-w-0",', 'className: "flex flex-1 min-w-0 flex-col gap-[2px]",',
        'v = u ? "-mx-pad-lg flex flex-col gap-xs bg-alpha-1 px-lg py-md" : "contents",', 'className: "text-primary min-h-[24px] shrink-0 flex items-center gap-1",'] },
    _I: { name: 'questionDisplayText', export: 'ti', previous: 'shared-5 $A', probe: 'keepLegibilityJoiners:!0});return yI(n)',
      features: ['let t = vI(e),', 'n = vt(hs(t), { keepLegibilityJoiners: !0 });', 'return yI(n) ? vt(t) : n;'] },
  },
  [BIDI]: {
    e: { name: 'bidiPlaintext', export: 't', previous: 'c8187a2dc e', probe: '[unicode-bidi:plaintext]', features: ['var e = "[unicode-bidi:plaintext]";'] },
  },
};
export const ROOT_PINS = {
  'c9ed5627b-DLvwQtiq.js#_t': '7d7ca3a4fe533251bf6923527a3263ee946206554ba0e3ef337faeda79299017',
  'c9ed5627b-DLvwQtiq.js#mt': '872d042a86722fee081b676b013bf9eb553455e4bf2368bacac2956fd757cb36',
  'c9ed5627b-DLvwQtiq.js#pt': '68235fd79e5a55f7157d0faf304fc72f00460ad6c0b90753882e0c68801c2f51',
  'c9ed5627b-DLvwQtiq.js#ft': 'dbaed59a2685a079e17e3cad5f3ea9d30a281fb0ae0ecbcf4048a3f8076514c1',
  'c9ed5627b-DLvwQtiq.js#Tt': '3b0e0f3633d66083282702b5020022331c5c15c301e8352361f7f2938b1d1487',
  'c9ed5627b-DLvwQtiq.js#wt': 'd6cfdef0534b2d2c4d37a6276a995a5b3771a37ca07b119dac4889977058baa0',
  'c9ed5627b-DLvwQtiq.js#xt': '3f8dac691ca8f4b581695c39ec0b8e5b05845e3f3e28eca2ce71c5c3a5d7489a',
  'c9ed5627b-DLvwQtiq.js#St': 'a5ba30f97d6cd860f82146bbc38aab968d6452bdbd9c3ef5fa64470f16b9dec1',
  'c9ed5627b-DLvwQtiq.js#Ct': 'fdea43915b35e8ede4e8a1f5bbc3c8f0486791da29a497432167a96fc15d754c',
  'c2f6611a3-Dcq4MBgv.js#Wr': '67575372b7a74d929425b5922eb3007462e604877b4a79fd6df89fc9c91d6745',
  'c2f6611a3-Dcq4MBgv.js#Dr': '11bfca3902f1196c2786e204c0187abb0e361968983e85243e2a1621945b22a7',
  'c2f6611a3-Dcq4MBgv.js#Vr': '5a5124174a8c41f059a78e37eff1e01e27f17af9242e0244ac7f57c5adcd809f',
  'c2f6611a3-Dcq4MBgv.js#Hr': '87e23455a635040b542dc159d79757f83c858b38804cb62141eddb83b395fed9',
  'c2f6611a3-Dcq4MBgv.js#zr': '2ad3b251de92d234ae71204777884b2c9751cb1225c9a3b180fa7bbfc45c8b0c',
  'c2f6611a3-Dcq4MBgv.js#Br': '460c1cdfa31487bc979adb7ab153d3befa76d9f32083729286dd573bd684809b',
  'c2f6611a3-Dcq4MBgv.js#hr': '4fe57a9f07da7ff6fb5857cdfef0c0948df80aa4ca77c1e7f3fef1dd7f39702c',
  'shared-33-DtdykY0y.js#rG': '9fa732d0196ad67e0bf6748214b4bd92ff28537d754f4bb5a0d9d6c4a165d0f0',
  'shared-33-DtdykY0y.js#_I': '70686ce12647e98fd55b58dbbe88ba155657ae59ec70392198d825fa1437957e',
  'c8187a2dc-Dp9Zia_4.js#e': 'df15440d036832d114cd80a53c1f7b6e69e5b6c276a44c986d303c59cd2d0b0e',
};

// ── Roots another graph already holds (D1): located and pinned like roots, imported from that graph's export ──────────
export const LINKED_ROOTS = {
  [`${PRIMARY}#i`]: { name: 'QuestionPrimaryButton', export: 't', previous: 'c30607cef i', area: 'proposal-group-v4', probe: 'hideShortcut??!1',
    features: ['i = r() || (n.hideShortcut ?? !1);', 'e(t, { ...n, hideShortcut: i })'] },
  [`${LANDING}#P`]: { name: 'onLandedCard', export: 'h', previous: 'c9ed5627b tt', area: 'approval-landing-v4', probe: 't?.onCard===!0&&t.at===e',
    features: ['let t = j.get(l(e));', 'return t?.onCard === !0 && t.at === e;'] },
};
export const LINKED_ROOT_PINS = {
  'c30607cef-DbSe2rPb.js#i': 'f64fed25ad7e977ee8a2e6f1d8a9d93218cbbc398061b5ed5be6f046cad21bc2',
  'c6dc54e94-Ci7MQEoh.js#P': '4e48757df8046c889a80e56590b6719ad421d3c5265217bf576551145e2e8855',
};

// ── Expression cuts out of the card (vt): { name, module (artifact file), within, probe/features (raw text of the arrow),
// params (vt's locals the arrow reads, in the order the host passes them), sha256 (raw arrow text) } ─────────────────
export const INNER = [
  // The document-level digit listener: digits 1..N pick option N, N+1 the Other row; guarded by vt's panel / focus /
  // collapsed / submitted / no-question / enable flags, the composer popup test (Bt), the card's root ref (O), the page's
  // option count (z), the time the card became active (gn), the "focus the card" ref (sn) and handleOptionClick (I).
  { name: 'questionDigitShortcuts', module: 'digit-shortcuts.mjs', within: 'vt', previous: 'c9ed5627b dt $t (slot 57)',
    features: ['if(!_||!v||P||R||w||!y)return;', 'e.isComposing||e.keyCode===229', 'r=z+1', 'n<1||n>r', 'a.isTruncated',
      '\'input,textarea,select,[role^="menu"],[role="listbox"],[role="option"],[role="tab"]\'', '!(!e.repeat&&Date.now()-gn.current<400)',
      'I(n===r?-1:n-1)', 'e.addEventListener("keydown",n,!0)', 'r?.setAttribute(ge,String(z+1))', 'r?.removeAttribute(ge)'],
    params: ['_', 'v', 'P', 'R', 'w', 'y', 'O', 'z', 'Bt', 'gn', 'sn', 'I'], sha256: '2af5e2911378e407154ab469d0ec18a9de8003479969c3720d6b0219cf3fb24a' },
  // The rows' press handler: a plain press clears a selection inside the row and watches the mouseup; a drag past pt, or
  // a shift-extended selection, marks the press as a drag-select and blurs the row. jn holds the mouseup's abort
  // controller, An the press record.
  { name: 'questionRowMouseDown', module: 'row-pointer.mjs', within: 'vt', previous: 'c9ed5627b dt mn (slot 100)',
    features: ['if(e.button!==0)return;', 'e.getRangeAt(0).intersectsNode(t)', 'e.shiftKey&&!!i&&!i.isCollapsed', '"mouseup"',
      'Math.hypot(e.clientX-c,e.clientY-l)>pt', 's.dragSelected=u&&(d||a)', 'capture:!0,signal:o.signal'],
    params: ['jn', 'An'], sha256: 'b4c61d33144aab68d34eb16aa2227642f8068f503aac28856c3bfea0086a4eb6' },
  // That press's click is not a pick when it ended a drag-select.
  { name: 'questionEndsDragSelect', module: 'row-pointer.mjs', within: 'vt', previous: 'c9ed5627b dt hn (slot 101)',
    features: ['let t=An.current;return An.current=null,e.detail!==0&&!!t?.dragSelected'], params: ['An'], sha256: 'd9c95b4a17d4fa786e41d594adcbd693d8c154e4b8e6a21761e056be7fd9aa3e' },
];
// vt itself (the expressions' host) is pinned too: a reshaped card is reviewed again.
export const INNER_HOST_PINS = { 'c9ed5627b-DLvwQtiq.js#vt': '2002162b7c7f3015e64bc54f70f445671a71560a39c3833c5218c20e2476aef8' };
// Globals the expressions read from the page.
const INNER_GLOBALS = new Set(['parseInt', 'Number', 'Date', 'String', 'Math', 'AbortController']);

// ── Host boundaries: file#local -> { name (export of the adapter module), features, why } ───────────────────────────
export const HOST_ADAPTERS = {
  [`${PAINTER}#Zi`]: { name: 'paintTranscriptText',
    features: ['function Zi(e, t, i, a, s, c, l, u, d) {', 'p = c !== void 0 && e.includes("@[");', 'if (!e.includes("://"))', 'for (let r of e.matchAll(et)) {'],
    why: 'the transcript plain-text painter (session mentions, links, file paths), owned by no 4.16336.0 graph yet' },
};
export const ADAPTER_PINS = {
  'cb8c5a88f-Cxti0pWl.js#Zi': '6e2b8c9218ac42b12b0b446ef6ba356fbb36c972067a90ddfbf19d1a87d51b35',
};
if (!process.argv.includes('--locate')) for (const key of Object.keys(HOST_ADAPTERS)) if (!/^[0-9a-f]{64}$/.test(ADAPTER_PINS[key] ?? '')) throw Error(`adapter ${key}: no reviewed pin`);

export const LINKED_AREAS = ['approval-landing-v4', 'btw-pane-v4', 'routines-shared-v4', { area: 'proposal-group-v4', modules: ['c30607cef.mjs', 'shared-26.mjs'] }];
const linkedAreaName = a => (typeof a === 'string' ? a : a.area);
const target = file => `${/^(shared-\d+|shared-frame|vendor-[a-z0-9]+(?:-\d+)?|c[0-9a-f]+)-/.exec(file)[1]}.mjs`;
// The originals the roots and expressions read, one module per chunk (listing a chunk the closure never enters, or
// entering one not listed, stops generation).
export const CLOSURE_CHUNKS = [
  'c2ed6676f-Bf5-wRdo.js', 'c53f67064-r7vrXjrE.js', 'c88cd06ec-Cb6ANuHe.js', 'c96d6655d-BjCrWdGK.js', 'c9c0413df-DcWW5dIy.js', 'cd902d735-DCi6CgIM.js', PAINTER,
  'shared-0-CnnWnVrT.js', 'shared-12-DVKzjo12.js', 'shared-183-B2N6Zy4J.js', 'shared-26-B-POtn5S.js', 'shared-8-BqfCbkJd.js', 'shared-92-BOgyxePb.js', 'vendor-all-0-uUCo-eCX.js',
];

const declarations = src => [...new Set([...src.top.values()].filter(entry => entry.kind !== 'import'))];
const rawText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
async function carries(src, entry, features) {
  try { assertFeatures('', await featureText(src, entry), features); return true; } catch { return false; }
}
const locating = process.argv.includes('--locate');
function checkPin(label, pins, key, value) {
  const pin = pins[key];
  if (!/^[0-9a-f]{64}$/.test(pin ?? '')) { if (locating) return false; throw Error(`${label}: no reviewed pin`); }
  if (pin !== value) throw Error(`${label}: declaration ${value} differs from the reviewed pin ${pin}`);
  return true;
}
// The only top-level declaration of a chunk whose raw text has the probe and whose prettier form carries every feature,
// under the reviewed local and export alias.
async function locateOne(file, local, spec, cache) {
  const src = await readSource(file, cache, official.ionSource);
  const hits = [];
  for (const entry of declarations(src)) if (rawText(src, entry).includes(spec.probe) && await carries(src, entry, spec.features)) hits.push(entry);
  if (hits.length !== 1) throw Error(`${file} ${local} (${spec.name}): ${hits.length} top-level declarations carry its features, expected 1`);
  const names = [...src.top].filter(([, entry]) => entry === hits[0]).map(([name]) => name);
  if (!names.includes(local)) throw Error(`${file}: the declaration carrying ${spec.name}'s features is ${names.join(', ')}, not ${local}`);
  const alias = [...src.exported].find(([, l]) => l === local)?.[0] ?? null;
  if (alias !== spec.export) throw Error(`${file}#${local}: export alias ${alias}, reviewed ${spec.export}`);
  return { src, entry: hits[0], alias, declarationSha256: sha(rawText(src, hits[0])) };
}
export async function locateRoots(cache = new Map()) {
  const found = [];
  for (const [file, roots] of Object.entries(ROOTS)) for (const [local, spec] of Object.entries(roots)) {
    const hit = await locateOne(file, local, spec, cache);
    const pinned = checkPin(`${file}#${local}`, ROOT_PINS, `${file}#${local}`, hit.declarationSha256);
    found.push({ file, local, name: spec.name, export: hit.alias, previous: spec.previous, declarationSha256: hit.declarationSha256, pinned });
  }
  for (const [key, spec] of Object.entries(LINKED_ROOTS)) {
    const [file, local] = key.split('#');
    const hit = await locateOne(file, local, spec, cache);
    const pinned = checkPin(key, LINKED_ROOT_PINS, key, hit.declarationSha256);
    found.push({ file, local, name: spec.name, export: hit.alias, previous: spec.previous, linkedFrom: spec.area, declarationSha256: hit.declarationSha256, pinned });
  }
  return found;
}
export async function pinAdapters(cache = new Map()) {
  const out = [];
  for (const [key, spec] of Object.entries(HOST_ADAPTERS)) {
    const [file, local] = key.split('#');
    const src = await readSource(file, cache, official.ionSource);
    const entry = src.top.get(local);
    if (!entry || entry.kind === 'import') throw Error(`adapter ${key} is not a declaration`);
    assertFeatures(`adapter ${key}`, await featureText(src, entry), spec.features);
    const declarationSha256 = sha(rawText(src, entry));
    const pinned = checkPin(`adapter ${key}`, ADAPTER_PINS, key, declarationSha256);
    out.push({ original: key, name: spec.name, hostAdapter: ADAPTER_FILE, why: spec.why, declarationSha256, pinned });
  }
  return out;
}

// What the slicer links: cds-core publicNames and the linked areas' exported bindings (the same tables runSlicer reads).
async function linkTables() {
  const cds = JSON.parse(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json'), 'utf8'));
  const published = new Map(Object.values(cds.publicNames ?? {}).map(e => [`${e.file}#${e.local}`, { from: `../cds-core/${e.target}`, name: e.exportName, kind: 'shared-graph' }]));
  const linked = new Map();
  const put = (key, value) => { if (value.name === null && linked.get(key)?.name) return; linked.set(key, value); };
  for (const a of LINKED_AREAS) {
    const area = linkedAreaName(a), only = typeof a === 'string' ? null : new Set(a.modules);
    const manifest = JSON.parse(await fs.readFile(path.join(generatedRoot, area, 'manifest.json'), 'utf8'));
    for (const m of manifest.modules) {
      if (only && !only.has(m.target)) continue;
      const tabled = m.exports !== undefined || m.linkExports !== undefined || m.sharedExports !== undefined;
      let parsed = null;
      if (!tabled) {
        parsed = new Map();
        const text = await fs.readFile(path.join(generatedRoot, area, m.target), 'utf8');
        for (const [, list] of text.matchAll(/export\s*\{([^}]*)\}\s*;/g)) for (const spec of list.split(',').map(s => s.trim()).filter(Boolean)) {
          const [l, as] = spec.split(/\s+as\s+/); parsed.set(l, as ?? l);
        }
      }
      for (const b of m.bindings ?? []) {
        const local = typeof b === 'string' ? b : b.name;
        const name = tabled ? m.exports?.[local] ?? (m.linkExports?.includes(local) || m.sharedExports?.includes(local) ? local : null) : parsed.get(local) ?? null;
        put(`${path.basename(m.source)}#${local}`, { from: `../${area}/${m.target}`, name, area, kind: 'linked' });
      }
    }
  }
  return { published, linked };
}

// The expressions: located in vt by AST (the innermost arrow carrying every feature), their vt locals checked against
// the reviewed params, their program-level reads resolved to where this graph's slice will hold them.
async function cutInner(cache, tables, specs) {
  const src = await readSource(QUESTION, cache, official.ionSource);
  const host = src.top.get('vt');
  checkPin('c9ed5627b vt (inner host)', INNER_HOST_PINS, `${QUESTION}#vt`, sha(rawText(src, host)));
  const ast = babel.babelParse(src.code, QUESTION, true);
  let program;
  babel.traverse(ast, { Program(p) { program = p; p.stop(); } });
  const hostPath = program.scope.getBinding('vt').path;
  const within = (o, q) => q.node.start >= o.node.start && q.node.end <= o.node.end;
  const records = [];
  for (const inner of INNER) {
    const found = [];
    hostPath.traverse({ ArrowFunctionExpression(q) { const t = src.code.slice(q.node.start, q.node.end); if (inner.features.every(f => t.includes(f))) found.push(q); } });
    const innermost = found.filter(q => !found.some(o => o !== q && within(q, o)));
    if (innermost.length !== 1) throw Error(`${inner.name}: vt has ${innermost.length} arrows carrying its features, expected 1`);
    const q = innermost[0], text = src.code.slice(q.node.start, q.node.end);
    const pinned = checkPin(`inner ${inner.name}`, { x: inner.sha256 }, 'x', sha(text));
    const params = new Set(), deps = new Set();
    q.traverse({ ReferencedIdentifier(r) {
      const name = r.node.name, b = r.scope.getBinding(name);
      if (!b) { if (!INNER_GLOBALS.has(name)) throw Error(`${inner.name} reads global ${name}`); return; }
      if (within(q, b.path)) return;
      if (b.scope === program.scope) deps.add(name); else params.add(name);
    } });
    if (JSON.stringify([...params].sort()) !== JSON.stringify([...inner.params].sort()))
      throw Error(`${inner.name} reads ${[...params].sort().join(',')} of vt, reviewed ${[...inner.params].sort().join(',')}`);
    const imports = [];
    for (const name of [...deps].sort()) {
      const entry = src.top.get(name);
      let file = QUESTION, local = name, via = `${QUESTION}#${name}`;
      if (entry.kind === 'import') {
        const dep = await readSource(entry.file, cache, official.ionSource);
        local = dep.exported.get(entry.alias); file = entry.file; via = `${entry.file}:${entry.alias}`;
        if (!local) throw Error(`${inner.name}: ${via} is not exported`);
        if (file === official.vendorFrame) throw Error(`${inner.name}: ${via} is a vendor-frame binding`);
      }
      const key = `${file}#${local}`, rootSpec = ROOTS[file]?.[local];
      const linked = tables.linked.get(key);
      let resolved;
      if (HOST_ADAPTERS[key]) throw Error(`${inner.name}: reads the host boundary ${key}`);
      else if (!rootSpec && tables.published.has(key)) resolved = tables.published.get(key);
      else if (!rootSpec && linked?.name) resolved = linked;
      else if (!rootSpec && linked) throw Error(`${inner.name}: ${key} is held unexported by ${linked.area}`);
      else {
        const spec = specs.find(s => s.source === file);
        if (!spec) throw Error(`${inner.name}: ${key} lives in ${file}, which is not a listed chunk`);
        if (!rootSpec) (spec.linkExports ??= []).includes(local) || spec.linkExports.push(local);
        resolved = { from: `./${spec.target}`, name: rootSpec ? rootSpec.name : local, kind: 'generated' };
      }
      imports.push({ local: name, original: key, via, ...resolved });
    }
    records.push({ ...inner, text, pinned, declared: sha(text), imports });
  }
  return records;
}

async function assertAdapterModule() {
  const text = await fs.readFile(path.join(root, ADAPTER_FILE), 'utf8');
  const exported = new Set([...text.matchAll(/^export (?:const|function|async function) ([\w$]+)\b/gm)].map(m => m[1]));
  const wanted = new Set(Object.values(HOST_ADAPTERS).map(a => a.name));
  for (const name of wanted) if (!exported.has(name)) throw Error(`${ADAPTER_FILE} does not export ${name}`);
  for (const name of exported) if (!wanted.has(name)) throw Error(`${ADAPTER_FILE}: ${name} is not an adapter of this graph`);
}
async function cdsCorePin() {
  const now = sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json')));
  if (now !== CDS_CORE_MANIFEST_SHA256)
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the question-card-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

export function questionCardV4Config(specs = baseModules()) {
  return {
    name: 'question card (4.16336.0)', generator: 'extract-question-card-v4.mjs', output: path.join(root, QUESTION_CARD_V4_OUTPUT),
    adapterModule: '../../source-question-card-v4-adapters.jsx', adapterFile: ADAPTER_FILE, adapters: {},
    localAdapters: Object.fromEntries(Object.entries(HOST_ADAPTERS).map(([key, a]) => [key, { name: a.name, features: a.features }])),
    modules: specs, sharedGraph: 'cds-core', generatedRoot, sourceContract: official, linkedAreas: LINKED_AREAS,
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
    vendor: { [official.vendorFrame]: official.reactAliases },
  };
}
function baseModules() {
  return [
    ...Object.entries(ROOTS).map(([file, roots]) => ({
      source: file, target: target(file), internal: Object.values(roots).some(r => r.export === null),
      exports: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.name])),
      features: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.features])),
    })),
    ...CLOSURE_CHUNKS.map(source => ({ source, target: target(source) })),
  ];
}
export const probeConfig = questionCardV4Config;

// The semantic modules the host reads (same file names as src/generated/question-card): re-exports of the sliced
// chunk modules / linked roots, and the expression modules.
const FACADES = {
  'option-row.mjs': { [QUESTION]: ['_t', 'mt', 'pt', 'ft', 'Tt', 'wt'] },
  'digit-shortcuts.mjs': { [QUESTION]: ['xt', 'St', 'Ct'], linked: [`${LANDING}#P`] },
  'row-pointer.mjs': {},
  'primary-button.mjs': { linked: [`${PRIMARY}#i`] },
  'card-header.mjs': { [HEADER]: ['rG', '_I'] },
  'answer-option.mjs': { [ANSWER]: ['Wr', 'Dr', 'Vr', 'Hr', 'zr', 'Br', 'hr'] },
  'bidi.mjs': { [BIDI]: ['e'] },
};
const header = what => `// ${what} (Claude Desktop ${official.referenceVersion}); generated by extract-question-card-v4.mjs.\n// Edit the extractor, never this file.\n`;
async function emitFacades(m, inner, tables) {
  const files = {};
  const exportedBy = (file, local) => {
    const mod = m.modules.find(x => x.source === file);
    const name = mod?.exports?.[local] ?? (mod?.sharedExports?.includes(local) ? local : null);
    if (!name) throw Error(`facade: ${file}#${local} is not exported by this graph`);
    return { from: `./${mod.target}`, name };
  };
  for (const [file, spec] of Object.entries(FACADES)) {
    const lines = [];
    for (const [chunk, locals] of Object.entries(spec)) {
      if (chunk === 'linked') {
        for (const key of locals) {
          const link = tables.linked.get(key);
          if (!link?.name || link.area !== LINKED_ROOTS[key].area) throw Error(`facade: ${key} is not exported by ${LINKED_ROOTS[key].area}`);
          lines.push(`export { ${link.name === LINKED_ROOTS[key].name ? link.name : `${link.name} as ${LINKED_ROOTS[key].name}`} } from ${JSON.stringify(link.from)};`);
        }
        continue;
      }
      const from = exportedBy(chunk, locals[0]).from;
      lines.push(`export { ${locals.map(l => exportedBy(chunk, l).name).join(', ')} } from ${JSON.stringify(from)};`);
    }
    const mine = inner.filter(x => x.module === file);
    const imports = new Map();
    for (const x of mine) for (const i of x.imports) {
      if (i.kind === 'generated' && !m.modules.find(mod => `./${mod.target}` === i.from)) throw Error(`${x.name}: ${i.from} is not a module of this graph`);
      if (!imports.has(i.from)) imports.set(i.from, new Map());
      const seen = imports.get(i.from).get(i.local);
      if (seen && seen !== i.name) throw Error(`${file}: ${i.local} names two bindings`);
      imports.get(i.from).set(i.local, i.name);
    }
    const importText = [...imports].sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([from, names]) => `import { ${[...names].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([local, name]) => (local === name ? local : `${name} as ${local}`)).join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const body = mine.map(x => `var ${x.name} = ({ ${x.params.join(', ')} }) => ${x.text};`).join('\n');
    const exportText = mine.length ? `export { ${mine.map(x => x.name).join(', ')} };` : '';
    const text = await format(`${header(file)}${importText}\n${body}\n${lines.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    let globals;
    babel.traverse(babel.babelParse(text, file, true), { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
    const unbound = globals.filter(n => !INNER_GLOBALS.has(n));
    if (unbound.length) throw Error(`${file}: unbound ${unbound.join(', ')}`);
    files[file] = text;
  }
  const names = [...Object.values(ROOTS).flatMap(rs => Object.values(rs).map(r => r.name)), ...Object.values(LINKED_ROOTS).map(r => r.name), ...INNER.map(x => x.name)];
  files['index.mjs'] = `${header('Semantic names of the question card')}` + Object.entries(FACADES)
    .map(([file]) => `export * from "./${file}";`).join('\n') + '\n';
  return { files, names };
}

export async function extractQuestionCardV4({ check = false, dryRun = false } = {}) {
  const cdsCore = await cdsCorePin();
  const cache = new Map();
  const roots = await locateRoots(cache);
  const adapters = await pinAdapters(cache);
  await assertAdapterModule();
  const tables = await linkTables();
  for (const key of Object.keys(LINKED_ROOTS)) if (tables.linked.get(key)?.area !== LINKED_ROOTS[key].area || !tables.linked.get(key).name)
    throw Error(`linked root ${key} is not exported by ${LINKED_ROOTS[key].area}`);
  const specs = baseModules();
  const inner = await cutInner(cache, tables, specs);
  const linked = {};
  for (const a of LINKED_AREAS) {
    const area = linkedAreaName(a);
    linked[area] = { manifestSha256: sha(await fs.readFile(path.join(generatedRoot, area, 'manifest.json'))), ...(typeof a === 'string' ? {} : { modules: a.modules }) };
  }
  const cfg = {
    ...questionCardV4Config(specs),
    async artifacts(m) {
      const used = new Set(m.modules.flatMap(mod => mod.imports.filter(i => i.kind === 'adapter').map(i => i.name)));
      const unused = Object.values(HOST_ADAPTERS).map(a => a.name).filter(n => !used.has(n));
      if (unused.length) throw Error(`host adapters no longer reached (drop them): ${unused.join(', ')}`);
      const { files, names } = await emitFacades(m, inner, tables);
      return {
        ...files,
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-question-card-v4.mjs',
          previous: { generator: 'scripts/extract-question-card.mjs', output: 'src/generated/question-card', referenceVersion: official.previousVersion },
          sharedGraph: { area: 'cds-core', manifestSha256: cdsCore }, linkedAreas: linked, publicNames: names,
          roots, adapters,
          inner: inner.map(x => ({ name: x.name, module: x.module, within: x.within, previous: x.previous, params: x.params, sha256: x.declared,
            imports: x.imports.map(i => ({ local: i.local, original: i.original, via: i.via, kind: i.kind, from: i.from, name: i.name })) })),
          withinPins: INNER_HOST_PINS,
          imports: m.modules.flatMap(mod => mod.imports.filter(i => i.kind !== 'generated').map(i => ({ module: mod.target, local: i.local, kind: i.kind, from: i.from, name: i.name, via: i.via }))),
        }, null, 2) + '\n',
      };
    },
  };
  if (locating) return { roots, adapters, inner: inner.map(x => ({ name: x.name, sha256: x.declared, pinned: x.pinned, imports: x.imports })) };
  return runSlicer(cfg, { check, dryRun });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (locating) {
    const r = await extractQuestionCardV4();
    for (const f of r.roots) console.log('root', `${f.file}#${f.local}`, f.declarationSha256, f.pinned ? 'pinned' : 'UNPINNED');
    for (const a of r.adapters) console.log('adapter', a.original, a.declarationSha256, a.pinned ? 'pinned' : 'UNPINNED');
    for (const x of r.inner) console.log('inner', x.name, x.sha256, x.pinned ? 'pinned' : 'UNPINNED', x.imports.map(i => `${i.local}=${i.kind}:${i.from}#${i.name}`).join(' '));
  } else await extractQuestionCardV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
