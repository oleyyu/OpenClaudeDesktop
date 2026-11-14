// session-rail-kit, 4.16336.0 source contract (OpenClaude v0.3 -> Claude 4.16336.0, frozen snapshot
// reference/snapshots/claude-4.16336.0-20261104): the Code session rail's primitives and shell, re-located in the
// 4.16336.0 chunks and sliced into the isolated graph src/generated/session-rail-kit-v4.
//
// Region plan (batch 4 / workflow batch 3, session-rail-kit): src/generated/session-rail-kit stays 3.6556.2, byte for byte,
// written by the unchanged 3.6556.2 contract of scripts/extract-session-rail-kit.mjs. Fifteen 3.6556.2 areas link it by
// original identity (cutover.oldConsumersAtGeneration: chat-side-chat, code-current:upper, code-transcript,
// composer-notices, cowork-approval, cowork-live, effort-control, pierre-changes, proposal-group, session-rail,
// session-rail-changes, session-rail-context, session-rail-sections, sidebar-hover-card, transcript-rows), so this graph is
// staged next to it (productionSwitchNotBeforeBatch 11). Nothing imports it until the cutover. scripts/extract-session-
// rail-kit.mjs runs both contracts (without --version) and verify-gen-session-rail-kit.mjs checks both.
//
// Roots (`roots`, semantic name -> how the 4.16336.0 binding is found; never by minified name alone):
//   { at: 'file#local', features }      the root is a top-level declaration of `file` whose prettier form carries every
//                                       feature (text or official.looseFeature) and it is the only top-level declaration
//                                       of that chunk that does (the chunk is formatted once; declarations whose raw
//                                       skeleton cannot contain a feature are skipped before formatting). `export` pins
//                                       the chunk's export alias (null: chunk-private). `closureFeatures` must appear in
//                                       the raw text of the root's same-chunk closure.
//   { at, readBy: 'Name', features }    the root is the only binding (resolved through imports, file#local) that the
//                                       located root `Name` reads directly and whose prettier form carries `features`
//                                       (a context, a hook or a class constant too small to be unique in its chunk).
//   { at, whole: true, rawFeatures }    a chunk without imports emitted whole (only its export line renamed).
// A 3.6556.2 root whose original has no 4.16336.0 counterpart is listed in `absent` with the evidence (the official text
// it carried no longer occurs in any 4.16336.0 chunk, or was folded into another binding); it is not emitted.
//
// Resolution (4.16336.0, sharedGraph 'cds-core', manifest pinned by bytes): every binding a root reaches is the original
// top-level declaration of its chunk, sliced once into that chunk's module (<chunk>.mjs). A reached binding resolves, in
// this order, to: a host adapter of this graph (src/source-session-rail-kit-adapters.jsx, unchanged; the 4.16336.0
// original it replaces is pinned by features), a React alias of vendor-frame (official.assertVendorAlias), a cds-core
// publicName (its raw declaration must hash as cds-core's: linkedSha256), a binding cds-core holds without a publicName
// (cut again only when it is pure and hashes the same: heldByCdsCore; module state stops generation and is reported as
// error.stateConflicts {binding, heldBy, kind, text, reachedBy}, D46), a binding a linked 4.16336.0 area holds
// (`linkedAreas`, declaration hash equal, imported under the name its module exports: routines-shared-v4, the D1 owner
// of shared-120 qe / Ke (the panels icon size context) and the gated-message formatter shared-62 zI; files-changes-v4,
// the D1 owner of ce574895a _ (useHeadCut) and its measure state h / m / c / s; code-current:base, the dependency
// region, has no 4.16336.0 output at generation time, see `pendingLinks`), then a copy here. A vendor binding
// outside the copyable UI vendors, a class, a destructured declaration or a dynamic import stops generation.
// D1: bindings cut here that another 4.16336.0 graph also cuts are reported (manifest-free, survey and return value);
// stateful ones (Map / Set / WeakMap / WeakSet, React context, a module binding written after its declaration) are
// d1Pending until cds-core wave 5 or the owner region publishes them.
//
// `node scripts/extract-session-rail-kit.mjs --version 4.16336.0 [--check] [--survey]`.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as official4 from './official-4.16336.0.mjs';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
const adapterModule = '../../source-session-rail-kit-adapters.jsx';
const sharedAdapterModule = '../../source-routines-shared-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export const SESSION_RAIL_KIT_V4_OUTPUT = 'src/generated/session-rail-kit-v4';
// region-plan session-rail-kit cutover.oldConsumersAtGeneration (15) plus the 3.6556.2 graphs outside that list that still
// import src/generated/session-rail-kit by original identity (legacyConsumersOutsidePlan). Every generated folder whose
// modules import ../session-rail-kit/ must be listed here (checked on every run; code-current:upper lives in the combined
// 3.6556.2 folder code-current).
export const planConsumers = Object.freeze(['chat-side-chat', 'code-current:upper', 'code-transcript', 'composer-notices', 'cowork-approval',
  'cowork-live', 'effort-control', 'pierre-changes', 'proposal-group', 'session-rail', 'session-rail-changes', 'session-rail-context',
  'session-rail-sections', 'sidebar-hover-card', 'transcript-rows']);
export const legacyConsumersOutsidePlan = Object.freeze({
  'mcp-app-host': 'url-redaction.mjs imports isPlainObject (sW) from ../session-rail-kit/plain-object.mjs; region-plan graph turned this edge into resliceInsteadOfLink (mcp-app-host re-cuts isPlainObject in its own 4.16336.0 output), so the plan omits it, but its 3.6556.2 output still links the legacy folder until mcp-app-host switches production (batch 9 or later)',
});
export const legacyConsumers = Object.freeze([...planConsumers, ...Object.keys(legacyConsumersOutsidePlan)].sort());
const legacyConsumerFolder = consumer => consumer.split(':')[0];

// ROOTS-BEGIN
const roots = {
  // ---- react-store.mjs (3.6556.2 vendor-all-0-DXM0MGjZ.js) ----
  "persist": { at: "vendor-all-0-uUCo-eCX.js#fe", old: "vendor-all-0-DXM0MGjZ.js#ue", features: ["version: 0,"] },
  "createJSONStorage": { at: "vendor-all-0-uUCo-eCX.js#ue", old: "vendor-all-0-DXM0MGjZ.js#le", features: ["getItem: (e) =>", "JSON.parse(e, t?.reviver)"] },
  "useStore": { at: "vendor-all-0-uUCo-eCX.js#g", old: "vendor-all-0-DXM0MGjZ.js#g", features: [".useSyncExternalStore(","e.subscribe,","() => t(e.getInitialState()),"] },
  // ---- logger.mjs (3.6556.2 shared-0-DDOOdL6P.js) ----
  "logger": { at: "shared-0-CnnWnVrT.js#Rc", old: "shared-0-DDOOdL6P.js#Ui", features: ["debug: (e, ...t) => {},","console.warn(e, ...","__errorMarked: (e, t, ...n) => {"] },
  "LOG_CATEGORIES": { at: "shared-0-CnnWnVrT.js#N", old: "shared-0-DDOOdL6P.js#F", features: ["LOCAL_STORAGE: \"[LOCAL_STORAGE]\","] },
  "windowStorage": { at: "shared-0-CnnWnVrT.js#_s", old: "shared-0-DDOOdL6P.js#Xr", features: ["if (typeof window > \"u\") return","return window[e] ??"] },
  // ---- local-storage.mjs (3.6556.2 shared-52-uHFNjl7C.js) ----
  "guardedLocalStorage": { at: "shared-92-BOgyxePb.js#vx", old: "shared-52-uHFNjl7C.js#Qh", features: ["(\"localStorage\"), \"local_storage\","] },
  // ---- plain-object.mjs (3.6556.2 shared-0-DDOOdL6P.js) ----
  "isPlainObject": { at: "shared-0-CnnWnVrT.js#ky", old: "shared-0-DDOOdL6P.js#sW", features: ["return typeof e == \"object\" && !!e && !Array.isArray(e);"] },
  // ---- cds-tokens.mjs (3.6556.2 c25d7186f-CHE_J2eY.js) ----
  "cdsTokens": { at: "c25d7186f-CHE_J2eY.js#i", old: "c25d7186f-CHE_J2eY.js#i", whole: true, rawFeatures: ["md:{cssVar:\"var(--cds-pad-md)\",value:\"0.5rem\"", "Object.defineProperty(e.chart.categorical,\"byHue\",{value:r});var i=e;export{i as t};"] },
  // ---- window-actions.mjs (3.6556.2 shared-frame-6jtSkIit.js) ----
  "writeClipboardText": { at: "shared-frame-CJdE5Ria.js#_a", old: "shared-frame-6jtSkIit.js#ca", features: [".navigator.clipboard.writeText(t), \"written\");"] },
  "openWindow": { at: "shared-frame-CJdE5Ria.js#ya", old: "shared-frame-6jtSkIit.js#ua", features: [".open(t, n, r), !0) : !1;"] },
  "useInOtherWindow": { at: "shared-frame-CJdE5Ria.js#ho", old: "shared-frame-6jtSkIit.js#co", features: ["e !== void 0 && e !== globalThis.window;"] },
  // ---- scrollbar-hit.mjs (3.6556.2 shared-frame-6jtSkIit.js) ----
  "pointOnScrollbar": { at: "shared-frame-CJdE5Ria.js#Pm", old: "shared-frame-6jtSkIit.js#dg", features: ["if (r.display === \"inline\") return !1;","r.direction === \"rtl\" ?"] },
  // ---- owner-resize-observer.mjs (3.6556.2 shared-25-DOWZRSlq.js) ----
  "ownerResizeObserver": { at: "shared-25-D-aF0gt9.js#bd", old: "shared-25-DOWZRSlq.js#gf", features: ["?.ResizeObserver ?? globalThis.ResizeObserver;"] },
  // ---- element-size.mjs (3.6556.2 shared-5-Bg6ZMqvt.js) ----
  "useElementSize": { at: "shared-5-u8kha2eH.js#iv", old: "shared-5-Bg6ZMqvt.js#Cy", features: ["\"select\" in n ? n.select : null,","let e = t.getBoundingClientRect();","r.observe(t, { box: i }),"] },
  // ---- rail-focus-rescue.mjs (3.6556.2 c30c42d34-B0SRB643.js) ----
  // ---- grip-dots.mjs (3.6556.2 cc5183ea5-B0t0M3XC.js) ----
  "GripDots": { at: "cc5183ea5-ChRR43kI.js#r", old: "cc5183ea5-B0t0M3XC.js#r", features: ["\"grid grid-cols-2 gap-[3px]\""] },
  // ---- define-messages.mjs (3.6556.2 vendor-intl-DYfox5Co.js) ----
  // ---- remote-link-label.mjs (3.6556.2 c5da7eb42-XijZdwf1.js) ----
  "remoteLinkLabel": { at: "c5da7eb42-aEqbSKbC.js#LC", old: "c5da7eb42-XijZdwf1.js#Up", features: ["t === \"repository\" ?","{ host: i },"] },
  // ---- lazy-preload.mjs (3.6556.2 shared-78-D5Fw2h0a.js) ----
  // ---- keyboard-click.mjs (3.6556.2 shared-8-Db1QN4mf.js) ----
  "isKeyboardClick": { at: "shared-8-BqfCbkJd.js#UI", old: "shared-8-Db1QN4mf.js#pR", features: ["return e.detail === 0 && !(\"pointerType\" in e && e.pointerType);"] },
  "usageSeverity": { at: "shared-8-BqfCbkJd.js#DZ", old: "shared-8-Db1QN4mf.js#hX", features: ["? \"critical\" :","? \"warning\" : \"normal\";"] },
  // ---- prevent-mouse-down.mjs (3.6556.2 c81ea1931-ChuE7vym.js) ----
  "preventMouseDown": { at: "c81ea1931-ChuE7vym.js#e", old: "c81ea1931-ChuE7vym.js#e", features: ["return e.preventDefault();"] },
  // ---- rail-icon-name.mjs (3.6556.2 shared-1-BJhqMmkf.js) ----
  "RAIL_TOGGLE_ICON": { at: "shared-1-D1bGaTaN.js#Y3", old: "shared-1-BJhqMmkf.js#wV", features: ["= \"ListCard\""] },
  // ---- rail-column.mjs (3.6556.2 shared-6-sd9jbJqs.js) ----
  "RAIL_COLUMN_ATTRIBUTE": { at: "shared-38-DyF0_Fim.js#Kn", old: "shared-6-sd9jbJqs.js#xg", features: ["= \"data-epitaxy-rail-column\""] },
  "RAIL_OVERLAY_SHIFT_CLASS": { at: "shared-38-DyF0_Fim.js#dn", old: "shared-6-sd9jbJqs.js#Hh", features: ["epitaxy-overlay-rail-shift"] },
  "LEAD_NO_ORIGIN_CLASS": { at: "shared-38-DyF0_Fim.js#hn", old: "shared-6-sd9jbJqs.js#qh", features: ["\"w-[max(0px,calc(1rem-var(--tiles-padding,0px)-var(--tiles-border,1px)))] shrink-0\""] },
  // ---- rail-layout.mjs (3.6556.2 shared-18-D3y8YMFN.js) ----
  "RAIL_WIDTH_CLASS": { at: "shared-18-Cfqwgjc5.js#nw", old: "shared-18-D3y8YMFN.js#Tx", features: ["= \"w-[var(--session-rail-w,17.5rem)]\""] },
  "RAIL_FLAT_ATTRIBUTE": { at: "shared-18-Cfqwgjc5.js#rw", old: "shared-18-D3y8YMFN.js#Ex", features: ["= \"data-session-rail-flat\""] },
  "RAIL_CARD_CLASS": { at: "shared-18-Cfqwgjc5.js#aw", old: "shared-18-D3y8YMFN.js#Ox", features: ["[[data-session-rail-flat]_&]:shadow-none"] },
  "RAIL_STACK_CLASS": { at: "shared-18-Cfqwgjc5.js#ow", old: "shared-18-D3y8YMFN.js#kx", features: ["[[data-session-rail-flat]_&]:gap-0"] },
  "RAIL_SECTION_ATTRIBUTE": { at: "shared-18-Cfqwgjc5.js#sw", old: "shared-18-D3y8YMFN.js#Ax", features: ["= \"data-rail-section\""] },
  "RAIL_SLOT_CLASS": { at: "shared-18-Cfqwgjc5.js#cw", old: "shared-18-D3y8YMFN.js#jx", features: ["has-[[data-rail-section]]:flex"] },
  "railFit": { at: "shared-18-Cfqwgjc5.js#Sw", old: "shared-18-D3y8YMFN.js#Kx", features: ["return bw(e, yw, 800);"], closureFeatures: ["\"beside-pane\"", "\"alone\""] },
  "railFits": { at: "shared-18-Cfqwgjc5.js#xw", old: "shared-18-D3y8YMFN.js#qx", features: ["return t ? e === \"beside-pane\" : e !== \"none\";"] },
  "useRailFits": { at: "shared-18-Cfqwgjc5.js#ww", old: "shared-18-D3y8YMFN.js#Yx", features: ["box: \"border-box\",","initial: \"none\",","sync: !0"] },
  "railRaisesPickers": { at: "shared-18-Cfqwgjc5.js#Aw", old: "shared-18-D3y8YMFN.js#tS", features: ["return !i && e && !t && !n && r;"] },
  "RAIL_OVERLAY_COLUMN_CLASS": { at: "shared-18-Cfqwgjc5.js#jw", old: "shared-18-D3y8YMFN.js#nS", features: ["end-[var(--titlebar-end-inset,0.5rem)]"] },
  "RAIL_OVERLAY_CARD_CLASS": { at: "shared-18-Cfqwgjc5.js#Mw", old: "shared-18-D3y8YMFN.js#rS", features: ["rounded-card border bg-surface-1 shadow-panel-md transition-opacity"] },
  "RAIL_CHAT_GEOMETRY_CLASS": { at: "shared-18-Cfqwgjc5.js#gw", old: "shared-18-D3y8YMFN.js#zx", features: ["[--session-rail-w:17.5rem]","[--session-rail-column-start:"] },
  "RAIL_GUTTER_CLASS": { at: "shared-18-Cfqwgjc5.js#pw", old: "shared-18-D3y8YMFN.js#Ix", features: ["[--session-rail-g:var(--session-rail-gutter,24px)]"] },
  "RAIL_TITLEBAR_INSET_CLASS": { at: "shared-18-Cfqwgjc5.js#mw", old: "shared-18-D3y8YMFN.js#Lx", features: ["[--titlebar-end-inset:"] },
  "RAIL_BAND_PADDING_CLASS": { at: "shared-18-Cfqwgjc5.js#_w", old: "shared-18-D3y8YMFN.js#Bx", features: ["pe-[calc(var(--session-rail-w)+var(--session-rail-end))]"] },
  "RAIL_BAND_START_CLASS": { at: "shared-18-Cfqwgjc5.js#vw", old: "shared-18-D3y8YMFN.js#Hx", features: ["-start-[var(--session-rail-band-start,0px)]"] },
  "RAIL_OVERFLOW_ATTRIBUTE": { at: "shared-18-Cfqwgjc5.js#fw", old: "shared-18-D3y8YMFN.js#Fx", features: ["= \"data-session-rail-overflow\""] },
  "RAIL_POPUP_COLLISION_PADDING": { at: "shared-18-Cfqwgjc5.js#OJ", old: "shared-18-D3y8YMFN.js#wU", features: ["{ top: 48, right: 8, bottom: 8, left: 8 }"] },
  "releaseFlatComposerMenu": { at: "shared-18-Cfqwgjc5.js#Ew", old: "shared-18-D3y8YMFN.js#Zx", features: ["!n.pickerRowMounted &&",".setState({ openComposerMenu: null });"] },
  "FLAT_RELEASED_MENUS": { at: "shared-18-Cfqwgjc5.js#Tw", old: "shared-18-D3y8YMFN.js#Xx", features: ["new Set([\"model\", \"mode\", \"permissions\", \"effort\"])"] },
  // ---- rail-shown-store.mjs (3.6556.2 shared-20-mUr7IqZY.js) ----
  "sessionRailShownStore": { at: "shared-20-DUEo90UF.js#Uy", old: "shared-20-mUr7IqZY.js#Ah", features: ["name: \"persisted.epitaxy.sessionRailShown\",","version: 1,","shown: !0,","typeof e.shown == \"boolean\" ? e.shown : t.shown,"] },
  "selectRailShown": { at: "shared-20-DUEo90UF.js#Wy", old: "shared-20-mUr7IqZY.js#jh", features: ["return e.shown;"] },
  "PANELS_ICON_SIZE": { at: "shared-20-DUEo90UF.js#by", old: "shared-20-mUr7IqZY.js#Th", features: ["= { size: \"auto\" }"] },
  "PANELS_CARD_CLASS": { at: "shared-20-DUEo90UF.js#my", old: "shared-20-mUr7IqZY.js#yh", features: ["= fy.join(\" \");"], closureFeatures: ["\"epitaxy-rail-lined\""] },
  "PANELS_ROW_HEIGHT_CLASS": { at: "shared-20-DUEo90UF.js#_y", old: "shared-20-mUr7IqZY.js#Sh", features: ["= \"min-h-6\""] },
  "PANELS_LEADING_CLASS": { at: "shared-20-DUEo90UF.js#vy", old: "shared-20-mUr7IqZY.js#Ch", features: ["= \"leading-4\""] },
  "titlebarIcon": { at: "shared-20-DUEo90UF.js#Bg", old: "shared-20-mUr7IqZY.js#gp", features: ["return i(Vg, { name: e });"], closureFeatures: ["customSize:"] },
  // ---- rail-section-ids.mjs (3.6556.2 c68c4283d-CWbOoVxS.js) ----
  "RAIL_SECTION_IDS": { at: "shared-55-BRv2XBP7.js#Tb", old: "c68c4283d-CWbOoVxS.js#g", features: ["\"environment\",","\"backgroundTasks\","] },
  // ---- fizzy-icon.mjs (3.6556.2 shared-9-CM21XrJw.js) ----
  // ---- rail-caret-icon.mjs (3.6556.2 cced621b6-BqCKLL3Y.js) ----
  "railCaretIcon": { at: "cced621b6-BzJn1GRx.js#t", old: "cced621b6-BqCKLL3Y.js#n", features: ["name: \"CaretRightFilled\",", "headSize: \"sm\","] },
  // ---- rail-repo-icon.mjs (3.6556.2 cccebaa3a-DQt76PcF.js) ----
  "RAIL_REPO_ICON": { at: "cccebaa3a-DQt76PcF.js#e", old: "cccebaa3a-DQt76PcF.js#e", features: ["= \"BookClosed\";"] },
  // ---- rail-sections-store.mjs (3.6556.2 c227f4d5e-B-FYKrwT.js) ----
  "railSectionsStore": { at: "c227f4d5e-DGDdGBTz.js#u6", old: "c227f4d5e-B-FYKrwT.js#x6", features: ["setOpenByHand: (t, n, r) =>", "t === \"session-rail\" ? void 0 : r,", "startsOpen:", "resetSections: (t) =>"] },
  "isRailPluginSection": { at: "c227f4d5e-DGDdGBTz.js#R3", old: "c227f4d5e-B-FYKrwT.js#Q3", features: ["return typeof e == \"string\" && e.startsWith(\"plugin:\")"] },
  "RAIL_SECTIONS_OFF": { at: "c227f4d5e-DGDdGBTz.js#V3", old: "c227f4d5e-B-FYKrwT.js#t6", features: ["= [\"progress\"]"] },
  "RAIL_SECTIONS_OFF_WHEN_FLAT": { at: "c227f4d5e-DGDdGBTz.js#H3", old: "c227f4d5e-B-FYKrwT.js#n6", features: ["= [\"settings\", \"usage\"]"] },
  "railSectionHideable": { at: "c227f4d5e-DGDdGBTz.js#z3", old: "c227f4d5e-B-FYKrwT.js#$3", features: ["return e !== \"environment\";"] },
  "railSectionExcluded": { at: "c227f4d5e-DGDdGBTz.js#W3", old: "c227f4d5e-B-FYKrwT.js#i6", features: ["return r6(e) || (t && e6(n6, e));"] },
  "railSectionHidden": { at: "c227f4d5e-DGDdGBTz.js#h6", old: "c227f4d5e-B-FYKrwT.js#E6", features: ["e.hidden.includes(t)) : !1;"] },
  "railSectionOrder": { at: "c227f4d5e-DGDdGBTz.js#v6", old: "c227f4d5e-B-FYKrwT.js#k6", features: [".splice(a.indexOf(t), 0, e);","{ id: t, before: n }"] },
  "railHideableSections": { at: "c227f4d5e-DGDdGBTz.js#G3", old: "c227f4d5e-B-FYKrwT.js#a6", features: ["function a6(e = !1)"] },
  "railSectionsCustomized": { at: "c227f4d5e-DGDdGBTz.js#y6", old: "c227f4d5e-B-FYKrwT.js#A6", features: ["e.startsOpen[n] ==="] },
  "useRailSectionOpen": { at: "c227f4d5e-DGDdGBTz.js#m6", old: "c227f4d5e-B-FYKrwT.js#T6", features: ["J2($, 0, t, e) ? K2($, 0, t, e, (n) => p6(n, e, t))"], closureFeatures: ["e.startsOpen["] },
  "useRailSectionHidden": { at: "c227f4d5e-DGDdGBTz.js#g6", old: "c227f4d5e-B-FYKrwT.js#D6", features: ["J2($, 0, e, t) ? K2($, 0, e, t, (n) => h6(n, e, t))"], closureFeatures: ["e.hidden.includes("] },
  "railSectionOpen": { at: "c227f4d5e-DGDdGBTz.js#p6", old: "c227f4d5e-B-FYKrwT.js#w6", features: ["e.startsOpen[n] ?? i"] },
  // ---- rail-rows.mjs (3.6556.2 c227f4d5e-B-FYKrwT.js) ----
  "RailWorktreeMark": { at: "c227f4d5e-DGDdGBTz.js#VE", old: "c227f4d5e-B-FYKrwT.js#JB", features: ["\"data-rail-worktree\": r,","r === \"preparing\"","defaultMessage: \"Preparing worktree\\u2026\",","id: \"TLlRYRP6LZ\",","defaultMessage: \"Worktree on edit\",","id: \"s6jTAlTXBc\",","defaultMessage: \"Not in worktree\",","id: \"ik7GusaS8F\",","? \"text-accent\" : void 0,","defaultMessage: \"Worktree\", id: \"Cqp4C6aPD2\"","\"flex shrink-0 items-center gap-sm ps-sm text-footnote text-secondary\"","wrapperClassName: `shrink-0 ${"] },
  "RailMarkedRow": { at: "c227f4d5e-DGDdGBTz.js#BE", old: "c227f4d5e-B-FYKrwT.js#qB", features: ["\"flex w-full min-w-0 items-center\""] },
  "RailInteractiveRow": { at: "c227f4d5e-DGDdGBTz.js#zE", old: "c227f4d5e-B-FYKrwT.js#KB", features: ["[&>button]:h-6.5 [&>button]:w-full [&>button]:max-w-none [&>button]:flex-1 [&>button]:justify-start [&>button]:ps-8 [&>button]:pe-xs"] },
  "RailFolderRow": { at: "c227f4d5e-DGDdGBTz.js#HE", old: "c227f4d5e-B-FYKrwT.js#YB", features: ["repository: n,",": \"Folder\";","flushStart: !0,"] },
  "RailRowIcon": { at: "c227f4d5e-DGDdGBTz.js#IE", old: "c227f4d5e-B-FYKrwT.js#UB", features: ["children: p(je, { name: t, size: $s.size }),"] },
  "RailRowText": { at: "c227f4d5e-DGDdGBTz.js#PE", old: "c227f4d5e-B-FYKrwT.js#VB", features: ["\"flex min-w-0 flex-1 text-start text-primary\""] },
  "RailRowSeparator": { at: "c227f4d5e-DGDdGBTz.js#AE", old: "c227f4d5e-B-FYKrwT.js#LB", features: ["children: \"\\u00B7\","] },
  "RailRowButton": { at: "c227f4d5e-DGDdGBTz.js#aD", old: "c227f4d5e-B-FYKrwT.js#fV", features: ["type: \"button\",","\"aria-label\": i,","lazy: !0, content: n, detail: r,"] },
  "RailNamedRow": { at: "c227f4d5e-DGDdGBTz.js#iD", old: "c227f4d5e-B-FYKrwT.js#dV", features: ["`group/setting ${","htmlFor: n,","cursor-interactive truncate"] },
  "useRailCardPresence": { at: "c227f4d5e-DGDdGBTz.js#vD", old: "c227f4d5e-B-FYKrwT.js#gV", features: ["{ content: e, leaving: !1, onLeft: u }"] },
  "useRailCardLeave": { at: "c227f4d5e-DGDdGBTz.js#yD", old: "c227f4d5e-B-FYKrwT.js#_V", features: ["?.closest(\"[data-rail-card]\")",".setAttribute(\"inert\", \"\")"] },
  "RailLimitedList": { at: "c227f4d5e-DGDdGBTz.js#TE", old: "c227f4d5e-B-FYKrwT.js#MB", features: ["onKeyDownCapture: w,","byPointer: !If(e.nativeEvent),","role: \"presentation\","] },
  "RAIL_ICON_BOX_CLASS": { at: "c227f4d5e-DGDdGBTz.js#FE", old: "c227f4d5e-B-FYKrwT.js#HB", features: ["\"flex size-5 shrink-0 items-center justify-center text-secondary\""] },
  "railAsideClickGuard": { at: "c227f4d5e-DGDdGBTz.js#vE", old: "c227f4d5e-B-FYKrwT.js#TB", features: ["e.detail <= 1 ?","(e.stopPropagation(), e.preventDefault());"] },
  "railSettingsRollup": { at: "c227f4d5e-DGDdGBTz.js#YE", old: "c227f4d5e-B-FYKrwT.js#nV", features: [".querySelector(`[${","return typeof t == \"string\" ? { text: n, warning: t } : n;"] },
  "RailPctMeter": { at: "c227f4d5e-DGDdGBTz.js#WE", old: "c227f4d5e-B-FYKrwT.js#ZB", features: ["\"flex h-2.5 w-6 shrink-0 rounded-full bg-alpha-2 p-0.5\""] },
  "RAIL_PANEL_TRANSITION_CLASS": { at: "c227f4d5e-DGDdGBTz.js#aE", old: "c227f4d5e-B-FYKrwT.js#fB", features: ["data-[ending-style]:h-auto"] },
  "DEFAULT_RAIL_SESSION_KEY": { at: "c227f4d5e-DGDdGBTz.js#Y3", old: "c227f4d5e-B-FYKrwT.js#s6", features: ["var Y3 = \"session-rail\";"] },
  "RAIL_ROW_CLASS": { at: "c227f4d5e-DGDdGBTz.js#oE", old: "c227f4d5e-B-FYKrwT.js#pB", features: ["= \"flex min-h-6.5 w-full min-w-0 items-center gap-sm px-xs text-body\""] },
  "RAIL_ROW_GAP_CLASS": { at: "c227f4d5e-DGDdGBTz.js#nE", old: "c227f4d5e-B-FYKrwT.js#lB", features: ["\"flex min-h-6.5 w-full min-w-0 items-center gap-md px-xs text-body\""] },
  "RAIL_ROW_HOVER_CLASS": { at: "c227f4d5e-DGDdGBTz.js#lE", old: "c227f4d5e-B-FYKrwT.js#gB", features: ["[&[aria-haspopup][aria-expanded=true]]:bg-fill-ghost-hover"] },
  "RailShowMoreToggle": { at: "c227f4d5e-DGDdGBTz.js#xE", old: "c227f4d5e-B-FYKrwT.js#OB", features: ["defaultMessage: \"Show more\", id: \"aWpBzjCXKS\"","defaultMessage: \"Show less\", id: \"qyJtWyZ0yt\"","\"aria-expanded\": t,"] },
  "forwardWheel": { at: "c227f4d5e-DGDdGBTz.js#S1", old: "c227f4d5e-B-FYKrwT.js#kH", features: ["?.WheelEvent ?? WheelEvent;","new n(\"wheel\", {","t.deltaMode === 1 ? 16 : t.deltaMode === 2 ? 800 : 1;"] },
  "markRailPointerPress": { at: "c227f4d5e-DGDdGBTz.js#yE", old: "c227f4d5e-B-FYKrwT.js#EB", features: ["If(e.nativeEvent) || (wB = !0);"] },
  // ---- lazy-body.mjs (3.6556.2 shared-16-ByfgAyLr.js) ----
  // ---- branch-chip.mjs (3.6556.2 c96d752d0-CWv_7-n9.js) ----
  "BranchChipFaceContext": { at: "c96d752d0-D9VB6ArX.js#jE", old: "c96d752d0-CWv_7-n9.js#mL", features: ["(\"mono\");"] },
  "ChangesRowLayoutContext": { at: "c96d752d0-D9VB6ArX.js#ME", old: "c96d752d0-CWv_7-n9.js#hL", features: ["(\"stacked\");"] },
  // ---- rail-card.mjs (3.6556.2 c73f45bc3-B7hbL7H9.js) ----
  "RailCard": { at: "cdbb20c70-MNoYKqNP.js#M", old: "c73f45bc3-B7hbL7H9.js#xx", features: ["\"group/railcard flex shrink-0 flex-col py-md\"", "t.reason !== \"trigger-press\"", "t.event.altKey ?", "?.closest(\"[data-rail-grab]\")", "\"aria-hidden\": !0,", "\"data-rail-grab\": \"\",", "name: be.name,", "size: be.headSize,", "hideCaret: !0,", "\"flex min-w-0 flex-1 rounded group-data-[rail-menu-open]/railtop:bg-alpha-1\"", "\"aria-labelledby\": A,"] },
  "RAIL_SECTION_TITLES": { at: "cdbb20c70-MNoYKqNP.js#Te", old: "c73f45bc3-B7hbL7H9.js#lx", features: ["pullRequests: { defaultMessage: \"Changes\", id: \"dgqhUM6BxJ\" },"] },
  "RailCardGripContext": { at: "cdbb20c70-MNoYKqNP.js#Se", old: "c73f45bc3-B7hbL7H9.js#ix", export: "a", features: ["var Se = i(null);"] },
  "useRailToggleHandler": { at: "c73f45bc3-C7dtUSq8.js#Qv", old: "c73f45bc3-B7hbL7H9.js#d_", features: ["e.onScreen ||","\"show_raised\"","e.onToggle(r)"] },
  // ---- rail-shell.mjs (3.6556.2 cc43287c9-Me-M2ucD.js) ----
  "SessionRailToggle": { at: "cc43287c9-dzfX-J5i.js#KK", old: "cc43287c9-Me-M2ucD.js#TH", features: ["defaultMessage: \"Hide session rail\",","id: \"U0R7oYkTM1\",","defaultMessage: \"Show session rail\",","id: \"JYaBivMdHH\",","defaultMessage: \"Session rail\", id: \"FUvHAfJy+j\"","unseen: a","variant: \"ghost\",","iconOnly: !0,","pressed: t.onScreen,","pressedVariant: \"selected\",","\"aria-expanded\": C,","\"aria-controls\": w,","\"aria-label\": h,","(t, \"titlebar\")"] },
  "FLAT_TOGGLE_STYLE": { at: "cc43287c9-dzfX-J5i.js#UK", old: "cc43287c9-Me-M2ucD.js#SH", features: ["\"--cds-bg-accent\": \"var(--cds-fill-ghost-selected)\","] },
  "SessionRailOpener": { at: "cc43287c9-dzfX-J5i.js#qK", old: "cc43287c9-Me-M2ucD.js#EH", features: ["kind: \"opener\",","region: \"sessionDetails\",","(t, \"command_palette\")"] },
  "SessionRailDockedColumn": { at: "cc43287c9-dzfX-J5i.js#IK", old: "cc43287c9-Me-M2ucD.js#hH", features: ["onWheel: c,", "sessionRef: t,", "scrollRef: s,", "bandHeightsBySession[t.id]", "PrBarSlot:"], deferred: "4.16336.0: the docked column now mounts the PR bar (PrBarSlot kK -> AK: the lazy PR bar entry DK / OK, the band reserve ta / Hj / hO over prBarHeightBySession) besides the lazy rail host; the PR bar is session-rail-changes / pierre-changes territory (batch 5+), so the column is rooted by the session-rail view (batch 6) or here once that owner publishes kK" },
  "SessionRailOverlay": { at: "cc43287c9-dzfX-J5i.js#ZK", old: "cc43287c9-Me-M2ucD.js#AH", features: ["role: \"group\",", "defaultMessage: \"Session details\",", "id: \"v52hoKcuPM\",", "outline-none`,", "className: \"h-full w-full rounded-[inherit]\",", "focusOnMount: u,", "onDismiss: d,", "PrBarSlot:"], deferred: "4.16336.0: the overlay now hands the lazy rail host the PR bar (PrBarSlot kK -> AK: the lazy PR bar entry DK / OK and its band reserve); the PR bar is session-rail-changes / pierre-changes territory (batch 5+), so the overlay is rooted by the session-rail view (batch 6) or here once that owner publishes kK. Its dismiss / wheel parts (useRailOverlayDismiss, outsideLayer, onScrollbar, useRailWheelHandoff) are rooted here" },
  "useRailOverlayDismiss": { at: "cc43287c9-dzfX-J5i.js#XK", old: "cc43287c9-Me-M2ucD.js#kH", features: ["if (n.key !== \"Escape\" || n.defaultPrevented) return;","e.addEventListener(\"pointerdown\", c, !0),"] },
  "outsideLayer": { at: "cc43287c9-dzfX-J5i.js#JK", old: "cc43287c9-Me-M2ucD.js#DH", features: [".ownerDocument.body;"] },
  "onScrollbar": { at: "cc43287c9-dzfX-J5i.js#YK", old: "cc43287c9-Me-M2ucD.js#OH", features: ["e.pointerType !== \"touch\" &&","(e.offsetX, e.offsetY, t);"] },
  "useRailWheelHandoff": { at: "cc43287c9-dzfX-J5i.js#FK", old: "cc43287c9-Me-M2ucD.js#mH", features: ["t.ctrlKey ||","t.deltaY === 0 ||","Math.abs(t.deltaY) <= Math.abs(t.deltaX) ||","{ deltaY: t.deltaY, deltaX: 0, deltaMode: t.deltaMode }"] },
  "wheelStaysInRail": { at: "cc43287c9-dzfX-J5i.js#PK", old: "cc43287c9-Me-M2ucD.js#pH", features: ["if (n === null || !t.contains(n)) return !0;"] },
  "scrollsVertically": { at: "cc43287c9-dzfX-J5i.js#NK", old: "cc43287c9-Me-M2ucD.js#fH", features: ["return t === \"auto\" || t === \"scroll\";"] },
  "RailShownStoreContext": { at: "cc43287c9-dzfX-J5i.js#eq", old: "cc43287c9-Me-M2ucD.js#NH", features: ["holdsInSplit: !0"] },
  "RailShownStoreProvider": { at: "cc43287c9-dzfX-J5i.js#nq", old: "cc43287c9-Me-M2ucD.js#FH", features: [".Provider, { value: n, children: t }", "[n] = v(rq);"], closureFeatures: ["holdsInSplit:!0"] },
  "useRailShown": { at: "cc43287c9-dzfX-J5i.js#dq", old: "cc43287c9-Me-M2ucD.js#HH", features: ["holdsInSplit: r", ".getState().shown.has(s)", "{ shown: l, setShown: f }"] },
  "selectSetRailShown": { at: "cc43287c9-dzfX-J5i.js#tq", old: "cc43287c9-Me-M2ucD.js#PH", features: ["return e.setShown;"] },
  "useRailFlat": { at: "c73f45bc3-C7dtUSq8.js#wC", old: "c73f45bc3-B7hbL7H9.js#oS", export: "a", features: ["return ji();"], readsAdapter: "useSessionPresetsFlat" },
  "railSectionTitle": { at: "cdbb20c70-MNoYKqNP.js#Ee", old: "c73f45bc3-B7hbL7H9.js#ux", features: ["t === \"flask\"", ".formatMessage(Te[t])"] },
  "RailPluginSectionsContext": { at: "cdbb20c70-MNoYKqNP.js#O", old: "c73f45bc3-B7hbL7H9.js#ox", export: "r", features: ["var O = i([]);"] },
  "RailFlatContext": { at: "shared-18-Cfqwgjc5.js#iw", old: "shared-18-D3y8YMFN.js#Dx", readBy: "RailCard", features: ["(!1);"] },
  "defineMessages": { at: "vendor-intl-BJgYK7RA.js#tn", old: "vendor-intl-DYfox5Co.js#tn", readBy: "RAIL_SECTION_TITLES", features: ["return e;"] },
  "create": { at: "vendor-all-0-uUCo-eCX.js#v", old: "vendor-all-0-DXM0MGjZ.js#v", features: ["(e) => (e ? _(e) : _)"], closureFeatures: ["Object.assign(n,t)"] },
  "createStore": { at: "vendor-all-0-uUCo-eCX.js#m", old: "vendor-all-0-DXM0MGjZ.js#m", features: ["(e) => (e ? p(e) : p)"], closureFeatures: ["getInitialState:()=>o"], closureLacks: ["Object.assign(n,t)"] },
  "isPlainRecord": { at: "shared-92-BOgyxePb.js#J", old: "shared-52-uHFNjl7C.js#K", features: ["return typeof e == \"object\" && !!e && !Array.isArray(e);"] },
  "useReducedMotion": { at: "shared-frame-CJdE5Ria.js#Jg", old: "shared-frame-6jtSkIit.js#Mh", features: ["return f(Gg, Kg, qg);"], closureFeatures: ["typeof window.matchMedia==\"function\"?window.matchMedia(", "attributeFilter:["] },
  "useRailFocusRescue": { at: "c0a54ccd3-DO5tXxAj.js#n", old: "c30c42d34-B0SRB643.js#u", features: ["sectionWide: a,", "portaled: o,", "successorIn: s", "tagName !== \"ASIDE\""] },
  "useLazyPreloadProps": { at: "shared-123-1Hc1RTKl.js#v$", old: "shared-78-D5Fw2h0a.js#t3", features: ["?.preload(\"intent\");", "onPointerEnter: n, onFocus: n, onPointerDown: n"] },
  "severityFillClass": { at: "shared-8-BqfCbkJd.js#AZ", old: "shared-8-Db1QN4mf.js#vX", readBy: "RailPctMeter", features: ["return OZ[e];"] },
  "RAIL_FIT_ALONE": { at: "shared-18-Cfqwgjc5.js#yw", old: "shared-18-D3y8YMFN.js#Wx", readBy: "railFit", features: ["= 320 +"] },
  "RAIL_CONTAINER_CLASS": { at: "shared-18-Cfqwgjc5.js#hw", old: "shared-18-D3y8YMFN.js#Rx", features: ["= \"@container\""], precedes: "RAIL_CHAT_GEOMETRY_CLASS" },
  "titlebarTextClass": { at: "shared-38-DyF0_Fim.js#oo", old: "shared-18-D3y8YMFN.js#Mb", features: ["() ? void 0 : e;"] },
  "PANELS_LINED_ROW_CLASS": { at: "shared-20-DUEo90UF.js#hy", old: "shared-20-mUr7IqZY.js#bh", features: ["[.epitaxy-rail-lined_&]:[&>button]:h-list-row"] },
  "PANELS_USAGE_CARD_CLASS": { at: "shared-20-DUEo90UF.js#py", old: "shared-20-mUr7IqZY.js#vh", features: ["\"[&_.flex-col.outline-none]:gap-[var(--rail-row-gap,--spacing(0.5))]\""] },
  "isRailSectionId": { at: "shared-55-BRv2XBP7.js#Db", old: "c68c4283d-CWbOoVxS.js#_", features: [".some((t) => t === e);"], closureFeatures: ["\"backgroundTasks\"", "\"flask\""] },
  "FIZZY_CARET_DROP_STYLE": { at: "shared-18-Cfqwgjc5.js#tP", old: "shared-9-CM21XrJw.js#Sw", readBy: "railCaretIcon", features: ["{ translate: \"0 0.5px\" }"] },
  "RAIL_SECTIONS_FOLDED_BY_DEFAULT": { at: "c227f4d5e-DGDdGBTz.js#q3", old: "c227f4d5e-B-FYKrwT.js#o6", features: ["= [\"connectors\", \"context\", \"usage\", \"flask\"]"] },
  "RailRow": { at: "c227f4d5e-DGDdGBTz.js#LE", old: "c227f4d5e-B-FYKrwT.js#WB", features: ["{ ...e }"], closureFeatures: ["\"flex min-w-0 flex-1 items-center text-primary\"", "flushStart"] },
  "RAIL_ROW_BUTTON_CLASS": { at: "c227f4d5e-DGDdGBTz.js#pE", old: "c227f4d5e-B-FYKrwT.js#bB", features: ["`${oE} ${cE} ${lE}`"], closureFeatures: ["\"flex min-h-6.5 w-full min-w-0 items-center gap-sm px-xs text-body\""] },
  "RailLiveSlotContext": { at: "c227f4d5e-DGDdGBTz.js#tE", old: "c227f4d5e-B-FYKrwT.js#cB", readBy: "RailCard", features: ["(void 0);"] },
  "RailSessionKeyContext": { at: "c227f4d5e-DGDdGBTz.js#X3", old: "c227f4d5e-B-FYKrwT.js#c6", export: "C", features: ["var X3 = F(Y3);"], closureFeatures: ["\"session-rail\""] },
  "useRailSessionKey": { at: "c227f4d5e-DGDdGBTz.js#Q3", old: "c227f4d5e-B-FYKrwT.js#l6", export: "I", features: ["return I(X3);"], closureFeatures: ["\"session-rail\""] },
  "RAIL_FOCUS_RING_CLASS": { at: "c227f4d5e-DGDdGBTz.js#cE", old: "c227f4d5e-B-FYKrwT.js#hB", features: ["= \"rounded focus-visible:outline-hidden focus-visible:shadow-focus\""] },
  "useLazyBody": { at: "shared-140-DfG6VwpK.js#to", old: "shared-16-ByfgAyLr.js#xl", features: ["requestBody: l,", "triggerProps: m,", "onPointerDownCapture: s,", "openOnHover === !0"] },
  "BranchChip": { at: "c96d752d0-D9VB6ArX.js#NE", old: "c96d752d0-CWv_7-n9.js#gL", features: ["var NE = w(xje);"], closureFeatures: ["face:", "branchUrl:", "extraMenuItems:", "Copy branch name"] },
};
const absent = {
  RAIL_SLOT_DIVIDER_CLASS: { old: 'shared-18-D3y8YMFN.js#Mx', gone: ['[[data-session-rail-flat]_:not(:empty):not([data-rail-slot-off])~&]:border-t'],
    successor: 'shared-20-DUEo90UF.js#Dy (the flat rail draws its dividers on the card: ~[data-rail-card]>&]:before:bg-alpha-1; RailCard reads it, emitted in the closure)' },
  RAIL_DOCKED_COLUMN_CLASS: { old: 'shared-18-D3y8YMFN.js#Ux', gone: ['flex-col pt-3 pb-0.75 end-[var(--session-rail-end)]'],
    successor: 'shared-20-DUEo90UF.js#Py (the docked column props object { className, [rail column marker]: "" }, read by the deferred SessionRailDockedColumn)' },
  RAIL_FIT_BESIDE_PANE: { old: 'shared-18-D3y8YMFN.js#Gx', gone: [{ file: 'shared-18-Cfqwgjc5.js', text: '=760+' }],
    successor: 'the literal 800 inside railFit (shared-18 Sw: bw(e, yw, 800))' },
  RAIL_SCROLL_BLEED_CLASS: { old: 'shared-18-D3y8YMFN.js#Vx', gone: ['-me-[calc(var(--session-rail-w)+var(--session-rail-end))]'] },
  PANELS_GAP_CLASS: { old: 'shared-20-mUr7IqZY.js#wh', gone: [{ file: 'shared-20-DUEo90UF.js', text: '="gap-0.5"' }],
    successor: 'the rail row gap variable in PANELS_USAGE_CARD_CLASS ([&_.flex-col.outline-none]:gap-[var(--rail-row-gap,--spacing(0.5))])' },
  fizzyIconName: { old: 'shared-9-CM21XrJw.js#yw', gone: ['("icons")'],
    successor: 'none: the fizzy-lake "icons" part is gone; railCaretIcon is the plain CaretRightFilled descriptor' },
  RAIL_CARD_PAD_CLASS: { old: 'c227f4d5e-B-FYKrwT.js#sB', gone: [{ file: 'c227f4d5e-DGDdGBTz.js', text: '="px-md"' }] },
  RAIL_PANEL_CLASS: { old: 'c227f4d5e-B-FYKrwT.js#dB', gone: ['"epitaxy-rail-panel"'] },
};
// 3.6556.2 roots not rooted here although their original survives: the reason says why (no gate; recorded in the
// manifest so a consumer knows to cut its own copy or root it through its reader).
const unrooted = {
  pickFields: { old: 'shared-78-D5Fw2h0a.js#L4', reason: 'shared-123 holds two identical declarations (rG, exported Qa, and gq); nothing the kit roots reads either, so no text or reader tells them apart. A consumer roots the one its reader imports (pure, D1 copy allowed).' },
};
const adapters = {
  // react-intl useIntl / FormattedMessage over the local catalog (the same host adapters as 3.6556.2: useStartIntl /
  // StartMessage).
  'vendor-intl-BJgYK7RA.js': {
    q: { name: 'useIntl', features: ['return (Mt(e), e);'] },
    Gt: { name: 'FormattedMessage', features: ['var Gt = a(Wt, Ut);'] },
  },
  // shared-39 Gl (exported Bs; 3.6556.2 shared-11 Pc / ds): the presets gate's hook form; D10: on.
  'shared-39-ZCs0lAwB.js': {
    Gl: { name: 'useSessionPresetsFlat', closure: true, features: ['return nr(Dl)', 'Dl="claudeai_cc_epitaxy_session_presets_main"'] },
  },
  // shared-123 ZU (exported Ho; 3.6556.2 shared-78 L2): the claude.ai account's GitHub sync setting; no claude.ai account here.
  'shared-123-1Hc1RTKl.js': {
    ZU: { name: 'useGithubSyncEnabled', features: ['return Qr().vcs.github_sync;'] },
    // kB (exported Zc; new in 4.16336.0): a server gate AND its GrowthBook flag (`AB(e) && V(e)`, AB over the boot
    // configuration's serverGateNames or the server gate store hu); the rail menu's "flask" section row reads it
    // through shared-55 Yz (__gb__428353835). This host has no claude.ai boot configuration and no server gate store
    // (see source-routine-cowork-adapters useAppConfiguration), so the answer is the host's; the adapter export is new in
    // src/source-session-rail-kit-adapters.jsx (host GrowthBook table AND the server gate; session-page lane).
    kB: { name: 'useServerGatedFeature', features: ['let t = AB(e);', 'return V(e) && t;'] },
  },
  // shared-31 PT (exported W; 3.6556.2 shared-4 NE, exported Z): renders the region registry's body
  // (`AT(FT)`, AT the zustand store frame-sidebar's region writer jT sets); a copy here would read its own empty store,
  // so it is the same host adapter as 3.6556.2 (RegionEntry).
  'shared-31-C9BqSSuD.js': {
    PT: { name: 'RegionEntry', features: ['t = AT(FT);', 't === null ? null : E(t, e)'] },
  },
  // c68c4283d _n (exported Er; 3.6556.2 un): the branch chip menu's claudeai.code.local_pr.menu_action telemetry (D17).
  // Xf / Jf (exported uf / lf; 3.6556.2 _f / hf): telemetry (D17: nothing is sent) for the rail sections
  // (expanded / collapsed / control_pressed / moved / hidden; 4.16336.0 skips the new "flask" section) and the toggle.
  'c68c4283d-FxwfdZSA.js': {
    _n: { name: 'logLocalPrMenuAction', features: ['u("claudeai.code.local_pr.menu_action", e);'] },
    Xf: { name: 'logRailSectionEvent', features: ['u("claudeai.epitaxy.session_rail.section_moved", { section: t });', 't === "flask"'] },
    Jf: { name: 'logRailTogglePressed', features: ['u(`claudeai.epitaxy.session_rail.${e}_pressed`, { via: t, in_popout: n });'] },
  },
  // shared-120 U / Sn (exported $t / wt; 3.6556.2 shared-16 Q / Bo): the pane layout store and the panes of a mode, which
  // the split-window shown map (cc43287c9 uq) subscribes to; this host has no official pane layout store (see the adapter).
  'shared-120-DCdTP1_5.js': {
    U: { name: 'paneLayoutStore', features: ['extraPanesByMode: {},', 'colWeightsByMode: {},', 'parkedPanes: null,'] },
    Sn: { name: 'panesOfMode', features: ['let n = e.extraPanesByMode[t] ?? F,', 'r = e.parkedPanes?.[t] ?? F;'] },
  },
  // cc43287c9 jK / MK (3.6556.2 uH / dH): the lazy code_session_view rail host and its handle; the host provides the rail
  // content through SessionRailHostContext.
  'cc43287c9-dzfX-J5i.js': {
    MK: { name: 'sessionRailLazyHandle', features: ['pick: (e) => e.EpitaxySessionRailHost,', 'overlayHost: "LazyEpitaxySessionRail.EpitaxySessionRailHost",'] },
  },
};
const vendorCopies = {
  // react-intl defineMessages, the identity (the section titles and the remote link labels).
  'vendor-intl-BJgYK7RA.js#tn': ['return e;'],
};
// Original text the host wiring follows but cannot import (prettier form of the named top-level declaration, which must
// be the only declaration of its chunk carrying the features). 3.6556.2 -> 4.16336.0: cc43287c9 yH -> BK, cf74bc599 DA -> hM.
const callSites = [
  // cc43287c9 BK: while the rail is off screen, a composer request to open a picker raises it. Flat (D10): the pickers
  // released to the composer (shared-18 Tw, releaseFlatComposerMenu) do not raise it, "context" always does; 4.16336.0
  // adds a third branch (dL: the composer menus in the rail own the request, gf hands it over), then the bridge session
  // (claude.ai Remote Control, not applicable here). Host: SR-7.
  { source: 'cc43287c9-dzfX-J5i.js', binding: 'BK', role: 'Composer picker request raises the off-screen rail (flat: released pickers stay; "context" raises); host: SR-7',
    features: ['pickersElsewhere: a,', 'onRaise: o,', 'c?.menu === "context" && o());', 'RK.has(c.menu) && !(s && nf.has(c.menu)) && o();', 'm?.bridgeSessionUrl'] },
  // cf74bc599 hM (exported EpitaxyTitlebarOverflowMenuBody): the session pane titlebar's ⋮ menu body. With the rail
  // toggle folded into it, the first group is the one item "Hide session rail" / "Show session rail", selecting the
  // toggle's press handler (useRailToggleHandler via "overflow"); host: SR-6.
  { source: 'cf74bc599-BytvntCE.js', binding: 'hM', role: 'Titlebar ⋮ menu: the folded rail toggle is the first group (host: SR-6)',
    features: ['railToggle: s,', 'p = Nv(s, "overflow"),', 'label: s?.onScreen', 'defaultMessage: "Hide session rail",', 'defaultMessage: "Show session rail",', 'onSelect: p,'] },
];
// Pinned on the minified bytes: each must occur exactly once. `loose` features go through official.looseFeature (R2:
// identifiers of up to three characters generalized, literals and keys kept).
const rawCallSites = [
  // The presets gate the rail reads (shared-39 Dl; Ol, exported zs; the hook form Gl, exported Bs, is the
  // useSessionPresetsFlat adapter). D10: on. `cai_epitaxy_worktree` (jl = presets ∧ worktree) stays off in this host (E13).
  { source: 'shared-39-ZCs0lAwB.js', role: 'Presets gate (zs = Ol; the hook form Bs = Gl is the useSessionPresetsFlat adapter) read one GrowthBook key; D10 on. Worktree gate jl off (E13)',
    loose: true, keep: ['Dl'],
    features: ['var Dl="claudeai_cc_epitaxy_session_presets_main";function Ol(){return Ke(Dl)}', 'var Al="cai_epitaxy_worktree";function jl(){let e=Ol(),t=Ke(Al);return e&&t}', 'n=ar();return e&&!t&&n}function Gl(){return nr(Dl)}'] },
  // shared-31 rc: the lazy chunk behind jK / MK (cf74bc599 exports EpitaxySessionRailHost).
  { source: 'shared-31-C9BqSSuD.js', role: 'Lazy entry code_session_view loads cf74bc599 (host: bundled, SessionRailHostContext)', loose: true,
    features: ['={id:"code_session_view",tier:"T2",largeClosure:!0,onUnrecoverable:"reload",load:()=>l(()=>import("./cf74bc599-BytvntCE.js")'] },
  { source: 'cc43287c9-dzfX-J5i.js', role: 'Lazy rail host and handle (host adapters LazySessionRailHost / sessionRailLazyHandle)', loose: true,
    features: ['var{Component:jK,handle:MK}=Da({entry:Tm,pick:e=>e.EpitaxySessionRailHost,options:{loading:()=>p(lp,{})},overlayHost:"LazyEpitaxySessionRail.EpitaxySessionRailHost"})'] },
  // The rail state machine of the Code session view (cc43287c9 fAe): the shown store hook read with the session key and
  // the split-window flag (dq(be, oe); the host's useRailShown() passes neither), the composer-menu veto fO(pAe), rail
  // mode / docked / overlay, the spawning reserve LK. Host: SR-7.
  { source: 'cc43287c9-dzfX-J5i.js', role: 'Code session view rail state machine (host: SR-7)', loose: true,
    features: ['let{shown:pn,setShown:mn}=dq(be,oe),hn=W&&!dn,gn=hn&&!Oe,_n=W&&!Oe,yn=gn?de:null,bn=yn!==null,xn=fO(pAe),Sn=pn&&!xn,Cn=bn&&Sn&&ae,wn=(bn||gn&&fe==="spawning")&&Sn&&ae,Tn=bm(wn),En=Cm(wn);LK(wn&&!bn,fe==="spawning");let[Dn,On]=v(null),kn=yn!==null&&!Cn&&Dn?.id===yn.id;Dn!==null&&!kn&&On(null);let An=Cn||kn'] },
  // Where the session view mounts the pieces: the opener inside the chat region, the overlay (deferred ZK), BK while the
  // rail is off screen, and the docked column (deferred IK) or the spawning draftRail slot.
  { source: 'cc43287c9-dzfX-J5i.js', role: 'Code session view mount points of qK / ZK / BK / IK (host: SR-7)', loose: true,
    features: ['bn&&!z&&p(qK,{model:Vn,scopeRef:xt})',
      'kn&&yn&&p(ZK,{sessionRef:yn,scopeStore:ce,mountKey:t,isPanelActive:Vt,onRequestComposerFocus:ir,readOnly:He||nn,scrollRef:yt,panelId:In,toggleRef:Fn,focusOnMount:Dn?.focus===!0,onDismiss:Rn})',
      'yn&&!An&&p(BK,{sessionRef:yn,scopeStore:ce,isPanelActive:Vt,readOnly:He||nn,pickersElsewhere:Mn,onRaise:Ln})',
      'wn?yn?p(IK,{sessionRef:yn,scopeStore:ce,mountKey:t,isPanelActive:Vt,onRequestComposerFocus:ir,readOnly:He||nn,scrollRef:yt}):p("div",{ref:cn,[wy]:"",...pm}):null'] },
  // The session pane titlebar (cc43287c9 RX): KK sits before the agent mark (`unseen` while the session is not active);
  // 4.16336.0 adds a second placement after the overflow menu (Ve: the pane title is see-through); it folds into the ⋮
  // menu when the titlebar runs out of room. Host: SR-6.
  { source: 'cc43287c9-dzfX-J5i.js', role: 'Session pane titlebar: rail toggle placements and fold into the ⋮ menu (host: SR-6)', loose: true,
    features: ['{railToggleFolded:rt,hiddenMainPanes:it}=J3($,56,$e,He,Be)?K3($,56,$e,He,Be,wV({railToggleFoldable:Be,paneSlots:He,hiddenCount:$e})):$[59]',
      '!Ve&&b&&!rt&&h(y,{children:[p(KK,{model:b,buttonRef:x,onUnmountFocused:ot,inert:!G,unseen:!se})',
      ',Ve&&b&&!rt&&p(KK,{model:b,buttonRef:x,onUnmountFocused:ot,inert:!G,unseen:!se})',
      'railToggle:rt?b:void 0,railToggleRef:rt?x:void 0'] },
];
// ROOTS-END

const copyableVendors = ['vendor-all-0-', 'vendor-base-ui-', 'vendor-icons-'];
const allowedGlobals = new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'TypeError', 'String', 'Boolean', 'Set', 'Map', 'WeakMap', 'WeakSet', 'JSON',
  'Symbol', 'Promise', 'RegExp', 'Date', 'Intl', 'undefined', 'Infinity', 'NaN', 'globalThis', 'window', 'document', 'navigator', 'console',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'encodeURIComponent', 'decodeURIComponent',
  'URL', 'URLSearchParams', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'Reflect', 'Proxy', 'getComputedStyle', 'ResizeObserver', 'AbortController',
  'MutationObserver', 'IntersectionObserver', 'HTMLElement', 'Element', 'Node', 'queueMicrotask', 'structuredClone', 'localStorage', 'sessionStorage',
  'RangeError', 'HTMLButtonElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'SVGElement', 'Event', 'FocusEvent', 'KeyboardEvent',
  'MouseEvent', 'PointerEvent', 'WheelEvent', 'NodeFilter', 'CSS', 'reportError', 'arguments']);

export const contract = Object.freeze({
  official: official4, output: SESSION_RAIL_KIT_V4_OUTPUT, sharedGraph: 'cds-core', linkedAreas: ['files-changes-v4', 'routines-shared-v4'],
  // Host services another 4.16336.0 graph already answers for the very same original (as cowork-session-states-v4 and
  // chat-markdown-v4 do): the host adapters routines-shared-v4 records (src/source-routines-shared-adapters.jsx).
  sharedAdapterGraph: 'routines-shared-v4',
  // The dependency region code-current:base has no 4.16336.0 output yet (its v4 contract is staged in the same batch).
  // The bindings this graph reaches that its 3.6556.2 contract imported from code-current are cut here until
  // src/generated/code-current-v4 exists; then they move to linkedAreas (one copy, D1) and this graph is regenerated.
  // The pending area counts as delivered when its region report exists (an output folder alone may still be mid-generation);
  // from then on generation stops until the entries move to linkedAreas, --check warns (it stays green for prepare:ui) and
  // tests/session-rail-kit-v4.test.mjs fails.
  pendingLinks: { 'code-current-v4': ['titlebar-panels-scope (shared-15 vn in 3.6556.2)', 'environment-name-parts (c96d752d0 pL)', 'breadcrumb-measure useHeadCut (ce574895a g)'] },
  pendingLinkDelivery: { 'code-current-v4': '../analysis/claude-4.16336.0-migrate-20261104/regions/batch3/code-current:base/report.json' },
  isolatedGraph: { productionOutput: 'src/generated/session-rail-kit', productionSwitchNotBeforeBatch: 11, heldBy: legacyConsumers, outsidePlan: legacyConsumersOutsidePlan },
  // D1: module state cut here that another 4.16336.0 graph also cuts, held temporarily (no owner publishes it yet).
  // Anything else stateful another graph cuts stops generation (link its owner through linkedAreas instead).
  // shared-0 Pc (the logger tag Set) was held here until cds-core wave 5 published it (loggerTags): it is a link now.
  d1Pending: {},
  roots, absent, unrooted, adapters, vendorCopies, callSites, rawCallSites, copyableVendors, allowedGlobals,
});

// ---- chunk reading ---------------------------------------------------------------------------------------------------
async function readSource(source, name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  const code = bytes.toString();
  const ast = parsers.babel.parse(code, {});
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const top = new Map();
  const patternNames = (node, out = []) => {
    if (!node) return out;
    if (node.type === 'Identifier') out.push(node.name);
    else if (node.type === 'ObjectPattern') for (const p of node.properties) patternNames(p.type === 'RestElement' ? p.argument : p.value, out);
    else if (node.type === 'ArrayPattern') for (const e of node.elements) patternNames(e, out);
    else if (node.type === 'AssignmentPattern') patternNames(node.left, out);
    else if (node.type === 'RestElement') patternNames(node.argument, out);
    return out;
  };
  let imports = false;
  for (const node of ast.program.body) {
    if (node.type === 'ImportDeclaration') {
      imports = true;
      for (const s of node.specifiers) top.set(s.local.name, { kind: 'import', file: node.source.value.replace(/^\.\//, ''), alias: s.imported?.name ?? 'default' });
    } else if (node.type === 'FunctionDeclaration') top.set(node.id.name, { kind: 'function', node });
    else if (node.type === 'VariableDeclaration') {
      for (const d of node.declarations) {
        if (d.id.type === 'Identifier') top.set(d.id.name, { kind: 'var', node: d });
        else for (const n of patternNames(d.id)) top.set(n, { kind: 'pattern', node: d });
      }
    } else if (node.type === 'ClassDeclaration') top.set(node.id.name, { kind: 'class', node });
  }
  const record = { name, bytes, code, exported, top, imports, formatted: new Map(), deps: new Map() };
  cache.set(name, record);
  return record;
}
const declarationText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
// A top-level declaration in the prettier form of its whole chunk: the text some 4.16336.0 graphs (files-changes-v4)
// hash their bindings by, where cds-core and routines-shared-v4 hash the raw chunk bytes.
async function formattedChunkDeclaration(src, local) {
  if (!src.formattedChunk) {
    const code = await format(src.code, { parser: 'babel' });
    const decls = new Map(parsers.babel.parse(code, {}).program.body.flatMap(node => (node.type === 'FunctionDeclaration' ? [[node.id.name, node]]
      : node.type === 'VariableDeclaration' ? node.declarations.filter(d => d.id.type === 'Identifier').map(d => [d.id.name, d]) : [])));
    src.formattedChunk = { code, decls };
  }
  const node = src.formattedChunk.decls.get(local);
  return node ? src.formattedChunk.code.slice(node.start, node.end) : null;
}
const emittedText = (src, entry) => (entry.kind === 'var' || entry.kind === 'pattern' ? `var ${declarationText(src, entry)};` : declarationText(src, entry));
async function featureText(src, entry) {
  if (!src.formatted.has(entry)) src.formatted.set(entry, await format(emittedText(src, entry), { parser: 'babel' }));
  return src.formatted.get(entry);
}
function declarationDeps(src, name) {
  if (src.deps.has(name)) return src.deps.get(name);
  const entry = src.top.get(name);
  const ast = babel.babelParse(emittedText(src, entry), `${src.name}#${name}`, true);
  let globals;
  babel.traverse(ast, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
  const deps = globals.filter(n => n !== name && src.top.has(n));
  src.deps.set(name, deps);
  return deps;
}
function closureText(src, name) {
  const seen = new Set(), parts = [];
  const visit = n => {
    if (seen.has(n)) return;
    seen.add(n);
    const entry = src.top.get(n);
    if (!entry || entry.kind === 'import') return;
    parts.push(declarationText(src, entry));
    for (const dep of declarationDeps(src, n)) visit(dep);
  };
  visit(name);
  return parts.join('\n');
}
const normalised = text => text.replace(/\s+/g, ' ');
const looseCache = new Map();
const loose = f => {
  if (!looseCache.has(f)) {
    let pattern = null;
    const bare = f.startsWith('\0bare\0');
    try { pattern = official4.looseFeature(bare ? unpunctuated(f.slice(6)) : f); } catch { /* text only */ }
    looseCache.set(f, pattern);
  }
  return looseCache.get(f);
};
const featureHit = (text, flat, f) => text.includes(f) || flat.includes(normalised(f)) || !!loose(f)?.test(text);
function missingFeatures(text, features = []) {
  const flat = normalised(text);
  return features.filter(f => !featureHit(text, flat, f));
}
function assertFeatures(label, text, features = []) {
  const missing = missingFeatures(text, features);
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}
// A cheap necessary condition for "the prettier form of this declaration carries the feature": prettier only adds
// whitespace, semicolons, commas and parentheses, normalises quotes and leading-zero decimals; the skeleton drops those.
const skeleton = text => text.replace(/'/g, '"').replace(/(^|[^\w$.])\.(\d)/g, '$10.$2').replace(/[\s;,()]/g, '');
// The same with minified names generalised: looseFeature over both texts with ; , ( ) turned into spaces.
const unpunctuated = text => text.replace(/(^|[^\w$.])\.(\d)/g, '$10.$2').replace(/[;,()]/g, ' ');
const looseBare = f => loose(`\0bare\0${f}`);
function mayCarry(raw, rawSkeleton, f, rawBare) {
  return rawSkeleton.includes(skeleton(f)) || !!looseBare(f)?.test(rawBare);
}
// Every top-level declaration of the chunk (name -> raw text), and the prettier form of those that may carry `features`.
async function declarationsCarrying(src, features) {
  if (!src.rawDeclarations) {
    src.rawDeclarations = [];
    for (const [name, entry] of src.top) if (entry.kind === 'function' || entry.kind === 'var') {
      const raw = emittedText(src, entry);
      src.rawDeclarations.push({ name, entry, raw, skeleton: skeleton(raw), bare: unpunctuated(raw) });
    }
  }
  const hits = [];
  for (const d of src.rawDeclarations) {
    if (!features.every(f => mayCarry(d.raw, d.skeleton, f, d.bare))) continue;
    if (!missingFeatures(await featureText(src, d.entry), features).length) hits.push(d.name);
  }
  return hits;
}
async function resolveImport(source, entry, cache, via) {
  let file = entry.file, alias = entry.alias;
  for (let hops = 0; hops < 8; hops++) {
    const dep = await readSource(source, file, cache);
    const local = dep.exported.get(alias);
    if (!local) throw Error(`${via}: ${file}:${alias} is not exported`);
    const target = dep.top.get(local);
    if (!target) throw Error(`${via}: ${file}:${alias} (${local}) is not declared`);
    if (target.kind !== 'import') return { file, local };
    file = target.file; alias = target.alias;
  }
  throw Error(`${via}: re-export chain too long`);
}
async function readsOf(source, src, name, cache) {
  const out = new Set();
  for (const dep of declarationDeps(src, name)) {
    const entry = src.top.get(dep);
    const target = entry.kind === 'import' ? await resolveImport(source, entry, cache, `${src.name}#${name}`) : { file: src.name, local: dep };
    out.add(`${target.file}#${target.local}`);
  }
  return out;
}
const reactAlias = (official, src, local) => [...src.exported].find(([alias, l]) => l === local && Object.hasOwn(official.reactAliases, alias))?.[0];

// ---- other graphs ----------------------------------------------------------------------------------------------------
async function cdsCoreGraph(official, area) {
  const dir = path.join(generatedRoot, area);
  const manifestBytes = await fs.readFile(path.join(dir, 'manifest.json'));
  const manifest = JSON.parse(manifestBytes);
  if (manifest.referenceVersion !== official.referenceVersion) throw Error(`${area} is ${manifest.referenceVersion}, expected ${official.referenceVersion}`);
  if (manifest.referenceSnapshot !== official.referenceSnapshot) throw Error(`${area} snapshot is ${manifest.referenceSnapshot}, expected ${official.referenceSnapshot}`);
  const modules = new Map(), held = new Map(), published = new Map();
  for (const m of manifest.modules) {
    if ((m.referenceVersion ?? manifest.referenceVersion) !== official.referenceVersion) throw Error(`shared module ${area}/${m.target} is ${m.referenceVersion}, expected ${official.referenceVersion}`);
    if (sha(await fs.readFile(path.join(dir, m.target))) !== m.sha256) throw Error(`${area}/${m.target} differs from its manifest`);
    const bytes = await fs.readFile(path.join(official.ionSource, path.basename(m.source))).catch(() => null);
    if (!bytes || !/^[0-9a-f]{64}$/.test(m.sourceSha256 ?? '') || sha(bytes) !== m.sourceSha256)
      throw Error(`${area}/${m.target} was sliced from ${m.source} ${m.sourceSha256 ?? '(no sourceSha256)'}, which is not the source this area reads`);
    modules.set(m.target, m);
    for (const b of m.bindings) held.set(`${path.basename(m.source)}#${typeof b === 'string' ? b : b.name}`, { target: m.target, sha256: typeof b === 'string' ? null : b.sha256 });
  }
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) {
    const m = modules.get(entry.target);
    const exported = m && (m.exports?.[entry.local] ?? (m.sharedExports?.includes(entry.local) ? entry.local : null));
    if (!m || path.basename(m.source) !== entry.file || !m.bindings.some(b => (typeof b === 'string' ? b : b.name) === entry.local) || !entry.exportName || exported !== entry.exportName)
      throw Error(`${area} publicName ${name} (${entry.file}#${entry.local}) is not exported by ${entry.target} as ${entry.exportName}`);
    published.set(`${entry.file}#${entry.local}`, { name, ...entry });
  }
  return { area, modules, held, published, manifestSha256: sha(manifestBytes) };
}
// The host adapters a 4.16336.0 graph records for 4.16336.0 originals (file#local -> adapter name of its adapter module).
async function sharedAdapterGraph(official, area) {
  const manifest = JSON.parse(await fs.readFile(path.join(generatedRoot, area, 'manifest.json'), 'utf8'));
  if (manifest.referenceVersion !== official.referenceVersion || manifest.referenceSnapshot !== official.referenceSnapshot)
    throw Error(`${area} is ${manifest.referenceVersion} ${manifest.referenceSnapshot}, expected ${official.referenceVersion} ${official.referenceSnapshot}`);
  if (manifest.adapterModule !== 'src/source-routines-shared-adapters.jsx') throw Error(`${area} adapters live in ${manifest.adapterModule}`);
  return new Map((manifest.adapters ?? []).map(a => [a.original, a.name]));
}
async function moduleExports(file) {
  const text = await fs.readFile(file, 'utf8');
  const out = new Map();
  for (const m of text.matchAll(/^export \{([^}]*)\};/gm))
    for (const spec of m[1].split(',').map(x => x.trim()).filter(Boolean)) {
      const [local, as] = spec.split(/\s+as\s+/);
      if (!out.has(local)) out.set(local, as ?? local);
    }
  return out;
}
// A linked 4.16336.0 area: same version and snapshot, every module's bytes equal to its manifest and cut from the chunk
// this generator reads; a binding it holds is imported under the name its module exports it as.
async function linkedArea(official, area) {
  const dir = path.join(generatedRoot, area);
  const manifestBytes = await fs.readFile(path.join(dir, 'manifest.json'));
  const manifest = JSON.parse(manifestBytes);
  if (manifest.referenceVersion !== official.referenceVersion || manifest.referenceSnapshot !== official.referenceSnapshot)
    throw Error(`${area} is ${manifest.referenceVersion} ${manifest.referenceSnapshot}, expected ${official.referenceVersion} ${official.referenceSnapshot}`);
  const held = new Map(), modules = new Map();
  for (const m of manifest.modules) {
    const text = await fs.readFile(path.join(dir, m.target), 'utf8');
    if (sha(text) !== m.sha256) throw Error(`${area}/${m.target} differs from its manifest; run its generator`);
    const bytes = await fs.readFile(path.join(official.ionSource, path.basename(m.source))).catch(() => null);
    if (!bytes || sha(bytes) !== m.sourceSha256) throw Error(`${area}/${m.target} was cut from another ${m.source}; run its generator`);
    modules.set(m.target, m.sha256);
    const exported = await moduleExports(path.join(dir, m.target));
    for (const b of m.bindings ?? []) {
      const name = typeof b === 'string' ? b : b.name;
      if (exported.has(name)) held.set(`${path.basename(m.source)}#${name}`, { area, target: m.target, sha256: b.sha256, exportName: exported.get(name) });
    }
  }
  return { area, held, modules, manifestSha256: sha(manifestBytes) };
}
// 3.6556.2 generated folders (other than the legacy output itself) whose modules import ../session-rail-kit/.
async function legacyOutputImporters() {
  const out = new Set();
  for (const entry of await fs.readdir(generatedRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'session-rail-kit') continue;
    for (const file of await fs.readdir(path.join(generatedRoot, entry.name))) {
      if (!/\.(?:m?js|jsx)$/.test(file)) continue;
      if (/from\s*["']\.\.\/session-rail-kit\//.test(await fs.readFile(path.join(generatedRoot, entry.name, file), 'utf8'))) { out.add(entry.name); break; }
    }
  }
  return [...out].sort();
}
async function otherTargetGraphs(official, own) {
  const out = new Map();
  for (const entry of await fs.readdir(generatedRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || own.has(entry.name)) continue;
    let manifest;
    try { manifest = JSON.parse(await fs.readFile(path.join(generatedRoot, entry.name, 'manifest.json'), 'utf8')); } catch { continue; }
    if (!Array.isArray(manifest.modules)) continue;
    for (const m of manifest.modules) {
      if ((m.referenceVersion ?? manifest.referenceVersion) !== official.referenceVersion || typeof m.source !== 'string') continue;
      for (const b of m.bindings ?? []) {
        const key = `${path.basename(m.source)}#${typeof b === 'string' ? b : b.name}`;
        if (!out.has(key)) out.set(key, []);
        out.get(key).push(entry.name);
      }
    }
  }
  return out;
}
function writtenBindings(src) {
  if (src.written) return src.written;
  const ast = babel.babelParse(src.code, src.name, false);
  let written;
  babel.traverse(ast, { Program(p) { written = new Set(Object.entries(p.scope.bindings).filter(([, b]) => b.constantViolations.length).map(([n]) => n)); p.stop(); } });
  src.written = written;
  return written;
}
async function moduleStateKind(official, source, src, entry, cache) {
  if (entry.kind !== 'var') return null;
  if (writtenBindings(src).has(entry.node.id.name)) return 'module-level binding written after its declaration';
  const init = entry.node.init;
  if (init?.type === 'NewExpression' && init.callee.type === 'Identifier' && ['WeakMap', 'Map', 'Set', 'WeakSet'].includes(init.callee.name)) return `module ${init.callee.name}`;
  if (init?.type === 'CallExpression' && init.callee.type === 'Identifier') {
    const callee = src.top.get(init.callee.name);
    const target = callee?.kind === 'import' ? await resolveImport(source, callee, cache, `${src.name}#${init.callee.name}`) : { file: src.name, local: init.callee.name };
    if (target.file === official.vendorFrame) {
      const vendor = await readSource(source, target.file, cache);
      const alias = reactAlias(official, vendor, target.local);
      if (alias && official.reactAliases[alias]?.[1] === 'createContext') return 'context (createContext)';
    }
  }
  return null;
}
const moduleName = file => file.replace(/\.js$/, '.mjs');
const short = key => key.replace(/-[\w-]{8}\.js#/, '#');

// ---- the generator ---------------------------------------------------------------------------------------------------
// `contract` (tests only): a variant, run check-only or survey-only so it can never write the output folder.
export async function extractSessionRailKitV4({ check = false, survey = false, contract: variant } = {}) {
  if (variant && !check && !survey) throw Error('extract-session-rail-kit-v4: a contract variant runs with check: true only');
  const c = variant ?? contract;
  const { official } = c;
  const { referenceVersion, referenceSnapshot } = official;
  const source = official.ionSource;
  const output = path.join(root, c.output);
  const cache = new Map();
  const graph = await cdsCoreGraph(official, c.sharedGraph);
  const linked = [];
  for (const area of c.linkedAreas ?? []) linked.push(await linkedArea(official, area));
  const linkedHeld = key => linked.map(a => a.held.get(key)).find(Boolean);
  const sharedAdapters = c.sharedAdapterGraph ? await sharedAdapterGraph(official, c.sharedAdapterGraph) : new Map();
  const problems = [];
  const fail = message => { if (!survey) throw Error(message); problems.push(message); };

  // 0. Contract freshness: every 3.6556.2 folder importing the legacy output is a listed consumer, and no pending link
  // waits on an area that has been delivered.
  const legacyImporters = await legacyOutputImporters();
  const listedFolders = new Set((c.isolatedGraph?.heldBy ?? []).map(legacyConsumerFolder));
  for (const folder of legacyImporters) if (!listedFolders.has(folder)) fail(`${folder} imports ../session-rail-kit/ but is not in isolatedGraph.heldBy (legacyConsumers)`);
  const pendingDelivered = [];
  for (const area of Object.keys(c.pendingLinks ?? {})) {
    const report = c.pendingLinkDelivery?.[area];
    if (!report) { fail(`pendingLinks ${area} has no pendingLinkDelivery report`); continue; }
    const outputExists = await fs.stat(path.join(generatedRoot, area, 'manifest.json')).then(() => true, () => false);
    const delivered = await fs.stat(path.resolve(root, report)).then(() => true, () => false);
    if (outputExists && delivered) pendingDelivered.push(area);
  }
  for (const area of pendingDelivered) {
    const message = `pendingLinks ${area}: its region is delivered (${c.pendingLinkDelivery[area]}); move ${c.pendingLinks[area].join(', ')} to linkedAreas and rerun`;
    if (check || survey) { console.warn(`WARN ${message}`); problems.push(message); } else throw Error(message);
  }

  // 1. Locate the roots.
  const located = new Map(); // name -> { file, local, key }
  const wholeChunks = new Map(); // file -> { name, exports }
  const order = Object.keys(c.roots);
  for (const name of order) {
    const spec = c.roots[name];
    if (!spec.at) { fail(`root ${name}: not located`); continue; }
    const [file, local] = spec.at.split('#');
    const src = await readSource(source, file, cache);
    if (spec.whole) {
      if (src.imports) { fail(`root ${name}: ${file} has imports; it cannot be emitted whole`); continue; }
      const missing = missingFeatures(src.code, spec.rawFeatures);
      if (missing.length) { fail(`root ${name}: ${file} lacks ${JSON.stringify(missing)}`); continue; }
      if (!src.top.has(local)) { fail(`root ${name}: ${local} is not a declaration of ${file}`); continue; }
      if (!wholeChunks.has(file)) wholeChunks.set(file, { exports: {} });
      wholeChunks.get(file).exports[local] = name;
      located.set(name, { file, local, key: spec.at });
      continue;
    }
    const entry = src.top.get(local);
    if (!entry || entry.kind === 'import') { fail(`root ${name}: ${spec.at} is not a declaration`); continue; }
    if (spec.export !== undefined) {
      const aliases = [...src.exported].filter(([, l]) => l === local).map(([a]) => a);
      if (spec.export === null ? aliases.length : !aliases.includes(spec.export)) { fail(`root ${name}: ${spec.at} is exported as ${aliases.join(',') || '(none)'}, expected ${spec.export}`); continue; }
    }
    const missing = missingFeatures(await featureText(src, entry), spec.features);
    if (missing.length) { fail(`root ${name}: ${spec.at} lacks ${JSON.stringify(missing)}`); continue; }
    if (spec.closureFeatures) {
      const lacking = missingFeatures(closureText(src, local), spec.closureFeatures);
      if (lacking.length) { fail(`root ${name}: closure of ${spec.at} lacks ${JSON.stringify(lacking)}`); continue; }
    }
    if (spec.closureLacks && missingFeatures(closureText(src, local), spec.closureLacks).length !== spec.closureLacks.length) { fail(`root ${name}: closure of ${spec.at} carries one of ${JSON.stringify(spec.closureLacks)}`); continue; }
    if (!spec.features?.length) { fail(`root ${name}: no features to locate it by`); continue; }
    if (spec.readBy) {
      const reader = located.get(spec.readBy);
      if (!reader) { fail(`root ${name}: its reader ${spec.readBy} is not located (list it first)`); continue; }
      const readerSrc = await readSource(source, reader.file, cache);
      const hits = [];
      for (const key of await readsOf(source, readerSrc, reader.local, cache)) {
        const [f, l] = key.split('#');
        const s = await readSource(source, f, cache);
        const e = s.top.get(l);
        if (!e || e.kind === 'import' || e.kind === 'class' || e.kind === 'pattern') continue;
        if (!missingFeatures(await featureText(s, e), spec.features).length) hits.push(key);
      }
      if (hits.length !== 1 || hits[0] !== spec.at) { fail(`root ${name}: not the unique binding ${spec.readBy} reads with its features (${hits.join(', ') || 'none'})`); continue; }
    } else {
      let hits = await declarationsCarrying(src, spec.features);
      if (spec.closureFeatures) hits = hits.filter(other => !missingFeatures(closureText(src, other), spec.closureFeatures).length);
      // `closureLacks`: strings the root's same-chunk closure must not carry (two declarations of one shape, one of which
      // builds on the other).
      if (spec.closureLacks) hits = hits.filter(other => missingFeatures(closureText(src, other), spec.closureLacks).length === spec.closureLacks.length);
      // `precedes`: the declarator right before the named located root in the same var statement (two identical
      // constants told apart by where the chunk declares them).
      if (spec.precedes) {
        const next = located.get(spec.precedes);
        if (!next || next.file !== file) { fail(`root ${name}: ${spec.precedes} is not a located root of ${file}`); continue; }
        hits = hits.filter(other => {
          const a = src.top.get(other), b = src.top.get(next.local);
          if (a.kind !== 'var' || b.kind !== 'var') return false;
          const between = src.code.slice(a.node.end, b.node.start);
          return /^\s*,\s*$/.test(between);
        });
      }
      if (spec.readsAdapter) {
        const [af, al] = Object.entries(c.adapters).flatMap(([f, ls]) => Object.entries(ls).filter(([, a]) => a.name === spec.readsAdapter).map(([l]) => [f, l]))[0] ?? [];
        if (!af) { fail(`root ${name}: no adapter ${spec.readsAdapter}`); continue; }
        const keep = [];
        for (const other of hits) if ((await readsOf(source, src, other, cache)).has(`${af}#${al}`)) keep.push(other);
        hits = keep;
      }
      if (hits.length !== 1 || hits[0] !== local) { fail(`root ${name}: ${spec.at} is not the unique declaration of ${file} with its features (${hits.join(', ') || 'none'})`); continue; }
    }
    located.set(name, { file, local, key: spec.at });
  }

  // An absent root: every `gone` string of its 3.6556.2 original occurs in no 4.16336.0 ion chunk (`successor` names
  // what replaced it, when something did; that binding is not emitted under the old name).
  if (Object.keys(c.absent).length) {
    const gone = new Map(Object.entries(c.absent).flatMap(([name, a]) => (a.gone ?? []).map(g => [g, name])));
    if ([...Object.values(c.absent)].some(a => !a.gone?.length)) fail('absent roots need `gone` evidence');
    for (const file of (await fs.readdir(source)).filter(f => f.endsWith('.js'))) {
      const text = await fs.readFile(path.join(source, file), 'utf8');
      for (const [g, name] of gone) {
        const [inFile, needle] = typeof g === 'string' ? [null, g] : [g.file, g.text];
        if ((inFile === null || inFile === file) && text.includes(needle)) fail(`absent root ${name}: ${JSON.stringify(needle)} still occurs in ${file}`);
      }
    }
  }

  // 2. Classify and walk the closure.
  const resolved = new Map();
  const chunks = new Map();
  const used = { adapters: new Set(), sharedAdapters: new Set(), react: new Set(), shared: new Set(), linked: new Set() };
  const stateConflicts = [];
  const heldByCdsCore = new Map();
  const rootKeys = new Set([...located.values()].map(r => r.key));
  const classify = async (key, reachedBy = []) => {
    if (resolved.has(key)) return resolved.get(key);
    const [file, local] = key.split('#');
    const src = await readSource(source, file, cache);
    const entry = src.top.get(local);
    const isRoot = rootKeys.has(key);
    let result;
    const adapter = c.adapters[file]?.[local];
    const shared = graph.published.get(key), owned = graph.held.get(key), fromLinked = linkedHeld(key);
    if (wholeChunks.has(file)) {
      const name = wholeChunks.get(file).exports[local];
      if (!name) throw Error(`${key}: ${file} is emitted whole and does not export ${local}`);
      result = { kind: 'whole', file, local };
    } else if (adapter) {
      if (isRoot) throw Error(`root ${key} is replaced by the host adapter ${adapter.name}`);
      if (!entry || entry.kind === 'import') throw Error(`adapter ${key} is not a declaration`);
      assertFeatures(`adapter ${key} (${adapter.name})`, adapter.closure ? closureText(src, local) : await featureText(src, entry), adapter.features);
      for (const [other, features] of Object.entries(adapter.also ?? {})) {
        const also = src.top.get(other);
        if (!also || also.kind === 'import') throw Error(`adapter ${key} pins ${other}, which is not a declaration of ${file}`);
        assertFeatures(`adapter ${key} (${other})`, await featureText(src, also), features);
      }
      result = { kind: 'adapter', name: adapter.name };
    } else if (sharedAdapters.has(key) && !isRoot) {
      if (!entry || entry.kind === 'import') throw Error(`shared adapter ${key} is not a declaration`);
      result = { kind: 'shared-adapter', name: sharedAdapters.get(key) };
    } else if (file === official.vendorFrame && !shared && reactAlias(official, src, local)) {
      const { module, member } = official.assertVendorAlias(src.code, reactAlias(official, src, local));
      result = { kind: 'react', module, name: member };
    } else if (shared) {
      if (!entry || entry.kind === 'import') throw Error(`${key} (cds-core ${shared.name}) is not a declaration`);
      if (!owned?.sha256 || owned.sha256 !== sha(declarationText(src, entry))) throw Error(`${key} differs from the declaration cds-core publishes as ${shared.name}`);
      result = { kind: 'shared-graph', file, target: shared.target, name: shared.exportName, publicName: shared.name, linkedSha256: owned.sha256 };
    } else if (owned) {
      if (!entry || entry.kind === 'import') throw Error(`${key} (held by cds-core) is not a declaration`);
      const state = await moduleStateKind(official, source, src, entry, cache);
      if (state) {
        stateConflicts.push({ binding: key, heldBy: `${graph.area}/${owned.target}`, kind: state, text: declarationText(src, entry).slice(0, 400), reachedBy: reachedBy.map(short).join(' <- ') });
        result = { kind: 'problem' };
      } else {
        if (owned.sha256 !== sha(declarationText(src, entry))) throw Error(`${key} differs from the declaration cds-core/${owned.target} holds`);
        if (!heldByCdsCore.has(file)) heldByCdsCore.set(file, new Set());
        heldByCdsCore.get(file).add(local);
      }
    } else if (fromLinked) {
      const same = entry && entry.kind !== 'import' && (sha(declarationText(src, entry)) === fromLinked.sha256
        || sha((await formattedChunkDeclaration(src, local)) ?? '') === fromLinked.sha256);
      if (!same) throw Error(`${key}: ${fromLinked.area} holds a different declaration; rerun its generator`);
      result = { kind: 'linked', area: fromLinked.area, target: fromLinked.target, name: fromLinked.exportName, linkedSha256: fromLinked.sha256 };
    } else if (file.startsWith('vendor-frame-')) {
      throw Error(`vendor-frame ${local} (${entry ? declarationText(src, entry).slice(0, 60) : '?'}) is neither a React export nor a cds-core binding`);
    } else if (file.startsWith('vendor-') && !c.vendorCopies[key] && !c.copyableVendors.some(p => file.startsWith(p))) {
      throw Error(`${key} is a vendor binding (${entry ? declarationText(src, entry).slice(0, 80) : '?'}); give it an adapter`);
    }
    if (!result) {
      if (!entry) throw Error(`${key} is not declared`);
      if (entry.kind === 'class' || entry.kind === 'pattern') throw Error(`${key} is a ${entry.kind} declaration (${declarationText(src, entry).slice(0, 80)}); give it an adapter`);
      if (/\bimport\s*\(/.test(declarationText(src, entry))) throw Error(`${key} has a dynamic import (${declarationText(src, entry).slice(0, 120)}); give it an adapter`);
      if (c.vendorCopies[key]) assertFeatures(`vendor copy ${key}`, await featureText(src, entry), c.vendorCopies[key]);
      result = { kind: 'generated', file, local };
    }
    resolved.set(key, result);
    return result;
  };
  const parent = new Map();
  const trail = key => { const out = []; for (let k = key; k && out.length < 24; k = parent.get(k)) out.push(k); return out.slice(1); };
  const chain = key => [key, ...trail(key)].slice(0, 12).map(short).join(' < ');
  const visit = async (key, from) => {
    if (!parent.has(key)) parent.set(key, from);
    let cls;
    try { cls = await classify(key, trail(key)); } catch (error) { if (!survey) throw error; problems.push(`${error.message}\n      ${chain(key)}`); resolved.set(key, { kind: 'problem' }); return; }
    if (cls.kind === 'problem') return;
    if (cls.kind === 'adapter') { used.adapters.add(key); return; }
    if (cls.kind === 'shared-adapter') { used.sharedAdapters.add(key); return; }
    if (cls.kind === 'react') { used.react.add(key); return; }
    if (cls.kind === 'shared-graph') { used.shared.add(key); return; }
    if (cls.kind === 'linked') { used.linked.add(key); return; }
    if (cls.kind === 'whole') return;
    const { file, local } = cls;
    if (!chunks.has(file)) chunks.set(file, new Set());
    if (chunks.get(file).has(local)) return;
    chunks.get(file).add(local);
    const src = await readSource(source, file, cache);
    for (const name of declarationDeps(src, local)) {
      const entry = src.top.get(name);
      const target = entry.kind === 'import' ? await resolveImport(source, entry, cache, key) : { file, local: name };
      await visit(`${target.file}#${target.local}`, key);
    }
  };
  // A deferred root is located and pinned (manifest.deferred, declaration sha256) but not sliced here (its reason says
  // who owns what it now mounts).
  const deferred = {};
  for (const name of order) {
    const r = located.get(name);
    if (!r || !c.roots[name].deferred) continue;
    const src = await readSource(source, r.file, cache);
    deferred[name] = { file: r.file, local: r.local, sha256: sha(declarationText(src, src.top.get(r.local))), reason: c.roots[name].deferred };
    located.delete(name);
  }
  const rootKeysLive = new Set([...located.values()].map(r => r.key));
  for (const key of rootKeys) if (!rootKeysLive.has(key)) rootKeys.delete(key);
  for (const name of order) if (located.has(name)) await visit(located.get(name).key);
  for (const [file, locals] of Object.entries(c.adapters)) for (const local of Object.keys(locals))
    if (!used.adapters.has(`${file}#${local}`)) fail(`adapter ${file}#${local} is not reached; remove it`);
  if (official.compilerHelpers) {
    const helperLocals = new Set(Object.values(official.compilerHelpers).map(h => h.local));
    if ([...(chunks.get(official.sharedFrame) ?? [])].some(local => helperLocals.has(local)))
      official.assertCompilerHelpers((await readSource(source, official.sharedFrame, cache)).code);
  }
  // D1 against the other 4.16336.0 graphs.
  const d1 = [], d1Pending = [];
  const others = await otherTargetGraphs(official, new Set([path.basename(output), graph.area, 'session-rail-kit', ...linked.map(a => a.area)]));
  for (const [file, locals] of chunks) for (const local of locals) {
    const key = `${file}#${local}`;
    const src = await readSource(source, file, cache);
    const state = await moduleStateKind(official, source, src, src.top.get(local), cache);
    if (state && !heldByCdsCore.get(file)?.has(local)) d1Pending.push({ binding: key, kind: state, areas: [...new Set(others.get(key) ?? [])].sort() });
    if (heldByCdsCore.get(file)?.has(local) || !others.has(key)) continue;
    d1.push({ binding: key, areas: [...new Set(others.get(key))].sort(), ...(state ? { state } : {}) });
  }

  const d1Held = d1Pending.filter(d => d.areas.length);
  for (const d of d1Held) if (!c.d1Pending?.[d.binding]) fail(`D1: module state ${d.binding} (${d.kind}) is also cut by ${d.areas.join(', ')}; link its owner (linkedAreas) or list it in d1Pending`);
  for (const key of Object.keys(c.d1Pending ?? {})) if (!d1Held.some(d => d.binding === key)) fail(`d1Pending ${key} is no longer module state cut here and elsewhere; remove it`);

  // 3. Call sites (original text the host follows but cannot import).
  const sites = [];
  for (const site of c.callSites) {
    try {
      const src = await readSource(source, site.source, cache);
      const entry = src.top.get(site.binding);
      if (!entry || entry.kind === 'import') throw Error(`call site ${site.source}#${site.binding} is not a declaration`);
      assertFeatures(`call site ${site.source}#${site.binding}`, await featureText(src, entry), site.features);
      const hits = await declarationsCarrying(src, site.features);
      if (hits.length !== 1 || hits[0] !== site.binding) throw Error(`call site ${site.source}#${site.binding} is not the unique declaration with its features (${hits.join(', ') || 'none'})`);
      sites.push({ source: site.source, binding: site.binding, role: site.role, sourceSha256: sha(src.bytes), sha256: sha(declarationText(src, entry)), features: site.features });
    } catch (error) { fail(error.message); }
  }
  for (const site of c.rawCallSites) {
    const src = await readSource(source, site.source, cache);
    let ok = true;
    for (const feature of site.features) {
      const count = site.loose ? [...src.code.matchAll(official.looseFeature(feature, { flags: 'g', keep: site.keep ?? [] }))].length : src.code.split(feature).length - 1;
      if (count !== (site.count ?? 1)) { ok = false; fail(`call site ${site.source} (raw): ${JSON.stringify(feature)} occurs ${count} times, expected ${site.count ?? 1}`); }
    }
    if (ok) sites.push({ source: site.source, role: site.role, sourceSha256: sha(src.bytes), raw: true, ...(site.loose ? { loose: true } : {}), features: site.features });
  }

  if (survey) {
    for (const p of problems) console.log('PROBLEM', p);
    for (const s of stateConflicts) console.log('STATE', JSON.stringify(s));
    for (const s of d1) console.log('D1', JSON.stringify(s));
    for (const s of d1Pending) console.log('D1-STATEFUL', JSON.stringify(s));
    for (const [file, locals] of chunks) console.log('CHUNK', file, locals.size, [...locals].join(' '), heldByCdsCore.has(file) ? `(heldByCdsCore ${[...heldByCdsCore.get(file)].join(' ')})` : '');
    if (process.env.SESSION_RAIL_KIT_PATHS) for (const [file, locals] of chunks) for (const local of locals) console.log('PATH', chain(`${file}#${local}`));
    for (const [k, set] of Object.entries(used)) console.log('USED', k, [...set].map(key => `${short(key)}=>${resolved.get(key).name}`).join(' '));
    console.log('LEGACY-IMPORTERS', legacyImporters.join(' '));
    for (const area of Object.keys(c.pendingLinks ?? {})) for (const [key, areas] of others) if (areas.includes(area) && chunks.get(key.split('#')[0])?.has(key.split('#')[1])) console.log('PENDING-OVERLAP', area, key);
    return { problems, stateConflicts, d1, d1Pending, located, chunks, legacyImporters, pendingDelivered };
  }
  if (stateConflicts.length) {
    const error = Error(`module state ${graph.area} holds without a semantic name (add it to ${graph.area} publicNames, D46): ${stateConflicts.map(s => s.binding).join(', ')}`);
    error.stateConflicts = stateConflicts;
    throw error;
  }

  // 4. Emit.
  const files = {};
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-session-rail-kit.mjs (4.16336.0 contract: scripts/extract-session-rail-kit-v4.mjs)',
    adapterModule: 'src/source-session-rail-kit-adapters.jsx', sharedGraph: graph.area, sharedGraphManifestSha256: graph.manifestSha256,
    linkedAreas: Object.fromEntries(linked.map(a => [a.area, a.manifestSha256])), pendingLinks: c.pendingLinks ?? {}, pendingLinkDelivery: c.pendingLinkDelivery ?? {}, isolatedGraph: c.isolatedGraph,
    d1Pending: Object.entries(c.d1Pending ?? {}).map(([binding, until]) => ({ binding, kind: d1Held.find(d => d.binding === binding).kind, until })),
    publicNames: {}, absent: c.absent, unrooted: c.unrooted ?? {}, deferred, modules: [], contexts: [], adapters: [], callSites: sites,
  };
  const createContextKeys = new Set([...used.react].filter(k => resolved.get(k).name === 'createContext'));
  const moduleGraph = new Map();
  const unboundGlobals = [];
  const sharedTargets = new Set(), linkedTargets = new Map();
  for (const [file, spec] of wholeChunks) {
    const src = await readSource(source, file, cache);
    const body = src.code.replace(/export\s*\{[^}]*\}\s*;?\s*$/, '');
    if (body === src.code) throw Error(`${file}: no trailing export`);
    const target = moduleName(file);
    const text = `// Original Claude Desktop ${referenceVersion} chunk ${file} (whole, bytes as installed but the export line);\n// generated by extract-session-rail-kit.mjs. Edit the extractor, never this file.\n${body}\nexport { ${Object.keys(spec.exports).join(', ')} };\n`;
    babel.babelParse(text, target, true);
    files[target] = text;
    manifest.modules.push({ target, source: file, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion, whole: true, bindings: [], imports: [], exports: Object.keys(spec.exports) });
  }
  for (const [file, locals] of [...chunks].sort((a, b) => a[0].localeCompare(b[0]))) {
    const src = await readSource(source, file, cache);
    const selected = [...locals].map(l => [l, src.top.get(l)]).sort((a, b) => a[1].node.start - b[1].node.start);
    const imports = new Map();
    for (const [local] of selected) {
      for (const name of declarationDeps(src, local)) {
        if (locals.has(name) && src.top.get(name).kind !== 'import') continue;
        const entry = src.top.get(name);
        const target = entry.kind === 'import' ? await resolveImport(source, entry, cache, `${file}#${local}`) : { file, local: name };
        const key = `${target.file}#${target.local}`;
        const cls = resolved.get(key);
        let spec;
        if (cls.kind === 'adapter') spec = { from: adapterModule, name: cls.name, kind: 'adapter' };
        else if (cls.kind === 'shared-adapter') spec = { from: sharedAdapterModule, name: cls.name, kind: 'shared-adapter' };
        else if (cls.kind === 'react') spec = { from: cls.module, name: cls.name, kind: 'react' };
        else if (cls.kind === 'shared-graph') { spec = { from: `../${graph.area}/${cls.target}`, name: cls.name, kind: cls.kind, linkedSha256: cls.linkedSha256 }; sharedTargets.add(cls.target); }
        else if (cls.kind === 'linked') { spec = { from: `../${cls.area}/${cls.target}`, name: cls.name, kind: 'linked', linkedSha256: cls.linkedSha256 }; linkedTargets.set(`${cls.area}/${cls.target}`, cls); }
        else if (cls.kind === 'whole') spec = { from: `./${moduleName(cls.file)}`, name: cls.local, kind: 'whole' };
        else if (cls.kind === 'generated') {
          if (cls.file === file) throw Error(`${file}#${name} resolves to its own chunk but is not selected`);
          spec = { from: `./${moduleName(cls.file)}`, name: cls.local, kind: 'generated' };
        } else throw Error(`${key}: unresolved (${cls.kind})`);
        const prev = imports.get(name);
        if (prev && (prev.from !== spec.from || prev.name !== spec.name)) throw Error(`${file}#${name} resolves two ways`);
        imports.set(name, { ...spec, via: key });
      }
    }
    for (const [local, entry] of selected) {
      const init = entry.kind === 'var' ? entry.node.init : null;
      if (init?.type !== 'CallExpression' || init.callee.type !== 'Identifier') continue;
      const calleeEntry = src.top.get(init.callee.name);
      if (!calleeEntry) continue;
      const target = calleeEntry.kind === 'import' ? await resolveImport(source, calleeEntry, cache, `${file}#${local}`) : { file, local: init.callee.name };
      if (createContextKeys.has(`${target.file}#${target.local}`)) {
        if (graph.held.has(`${file}#${local}`) || linkedHeld(`${file}#${local}`)) throw Error(`${file}#${local} is a context another graph holds; it must be imported, not copied`);
        manifest.contexts.push(`${file}#${local}`);
      }
    }
    const groups = new Map();
    for (const [local, spec] of imports) {
      if (!groups.has(spec.from)) groups.set(spec.from, []);
      groups.get(spec.from).push(spec.name === local ? local : `${spec.name} as ${local}`);
    }
    const target = moduleName(file);
    moduleGraph.set(target, [...groups.keys()].filter(f => f.startsWith('./')).map(f => f.slice(2)));
    const importText = [...groups].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([from, names]) => `import { ${names.sort().join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const emittedNodes = new Set();
    const blocks = selected.filter(([, entry]) => !emittedNodes.has(entry.node) && emittedNodes.add(entry.node)).map(([, entry]) => emittedText(src, entry));
    const exportText = `export { ${selected.map(([l]) => l).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${file}; generated by extract-session-rail-kit.mjs (4.16336.0 contract).\n// Edit scripts/extract-session-rail-kit-v4.mjs or src/source-session-rail-kit-adapters.jsx, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    const closed = babel.babelParse(text, target, true);
    let globals;
    babel.traverse(closed, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
    const unbound = globals.filter(name => !c.allowedGlobals.has(name));
    if (unbound.length) unboundGlobals.push(`${target}: ${unbound.join(', ')}`);
    files[target] = text;
    manifest.modules.push({
      target, source: file, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: selected.map(([name, entry]) => ({ name, sha256: sha(declarationText(src, entry)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, kind: e.kind, via: e.via, ...(e.linkedSha256 ? { linkedSha256: e.linkedSha256 } : {}) })),
      heldByCdsCore: [...(heldByCdsCore.get(file) ?? [])].sort(),
    });
  }
  if (unboundGlobals.length) throw Error(`unbound globals:\n${unboundGlobals.join('\n')}`);
  const state = new Map();
  const walk = (name, path_) => {
    if (state.get(name) === 'done') return;
    if (state.get(name) === 'open') throw Error(`module cycle: ${[...path_, name].join(' -> ')}`);
    state.set(name, 'open');
    for (const next of moduleGraph.get(name) ?? []) walk(next, [...path_, name]);
    state.set(name, 'done');
  };
  for (const name of moduleGraph.keys()) walk(name, []);
  // index.mjs: the semantic names (the 3.6556.2 kit export names) of every located root.
  const groups = new Map();
  for (const name of order) {
    const r = located.get(name);
    if (!r) continue;
    const cls = resolved.get(r.key);
    let from, exportName, extra = {};
    if (cls.kind === 'generated' || cls.kind === 'whole') { from = `./${moduleName(r.file)}`; exportName = r.local; }
    else if (cls.kind === 'shared-graph') { from = `../${graph.area}/${cls.target}`; exportName = cls.name; extra = { cdsCore: cls.publicName }; }
    else if (cls.kind === 'linked') { from = `../${cls.area}/${cls.target}`; exportName = cls.name; extra = { linked: cls.area }; }
    else throw Error(`root ${name} (${r.key}) is answered by ${cls.kind}`);
    manifest.publicNames[name] = { file: r.file, local: r.local, target: from.replace(/^\.\//, ''), exportName: name, ...extra };
    if (!groups.has(from)) groups.set(from, []);
    groups.get(from).push(exportName === name ? name : `${exportName} as ${name}`);
  }
  const indexText = [...groups].map(([from, names]) => `export { ${names.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
  files['index.mjs'] = await format(`// Semantic names of the session-rail-kit roots (4.16336.0); generated by extract-session-rail-kit.mjs. Never edit.\n${indexText}\n`, { parser: 'babel' });
  for (const [file, locals] of Object.entries(c.adapters)) for (const [local, spec] of Object.entries(locals)) manifest.adapters.push({ original: `${file}#${local}`, name: spec.name });
  manifest.sharedAdapterModule = 'src/source-routines-shared-adapters.jsx';
  manifest.sharedAdapterGraph = c.sharedAdapterGraph;
  manifest.sharedAdapters = [...used.sharedAdapters].sort().map(original => ({ original, name: sharedAdapters.get(original) }));
  manifest.sharedGraphModules = Object.fromEntries([...sharedTargets].sort().map(target => [target, graph.modules.get(target).sha256]));
  manifest.linkedGraphModules = Object.fromEntries([...linkedTargets.keys()].sort().map(key => { const [area, target] = key.split('/'); return [key, linked.find(a => a.area === area).modules.get(target)]; }));
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  const label = `Session rail kit ${referenceVersion}`;
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`${label} output set changed: ${present.join(',')}. Run scripts/extract-session-rail-kit.mjs --version ${referenceVersion}.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`${label} source mismatch: ${name}. Run scripts/extract-session-rail-kit.mjs --version ${referenceVersion}.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} session rail kit ${referenceVersion} modules (${count} original bindings, ${Object.keys(manifest.publicNames).length} roots, ${Object.keys(c.absent).length} absent, ${used.adapters.size} adapters, ${used.shared.size} ${graph.area} links ${graph.manifestSha256.slice(0, 8)}, ${used.linked.size} linked, ${manifest.callSites.length} pinned call sites).`);
  Object.defineProperty(manifest, 'd1', { value: { overlaps: d1, pending: d1Pending }, enumerable: false });
  Object.defineProperty(manifest, 'contractFreshness', { value: { legacyImporters, pendingDelivered }, enumerable: false });
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await extractSessionRailKitV4({ check: process.argv.includes('--check'), survey: process.argv.includes('--survey') });
