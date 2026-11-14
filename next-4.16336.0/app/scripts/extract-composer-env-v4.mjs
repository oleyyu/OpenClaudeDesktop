// Composer environment bar, Claude Desktop 4.16336.0 (surfaces-prod-2 lane "composer-env"). The Home draft's bar under the
// presets card (cc43287c9 dxe → Uye `modelMenu: "bar"` → `rail: (e) => vge({…})`) is drawn by the host
// src/source-composer-environment-bar.jsx over:
//   - the bar, its chips and groups: cc43287c9 vge / d8 / u8 / X5 / Y5 / s8 as sliced by the code-composer region
//     (src/generated/code-composer-v4/environment-bar.mjs, extract-code-composer.mjs). They are linked, never sliced again
//     here (D1: s8 EnvironmentIconOnlyContext is a Context, one copy only); this generator does not edit that region.
//   - model-effort.mjs (sliced here, runSlicer, sharedGraph 'cds-core'): cc43287c9 Exe, the rail's `modelEffort(Exe)` render
//     that puts the model trigger and the effort trigger each in a u8 group (u8 imported from code-composer-v4).
//   - environment-row.mjs (picked literals, like extract-chat-composer.mjs's model selector): the parts of the bar that
//     4.16336.0 writes inline in components the host cannot run (the model / permission rail Uye reads the official model
//     store and GrowthBook; dxe is the whole composer):
//       Uye renderTrigger (data-testid environment-row-model): the ghost Button, `Y5(bar, bar)`, X5 with givesWay, the tail
//         words fastMode / effort / toggle in `shrink-0 whitespace-pre ${toggle ? "text-pro" : overridden ? "text-accent"
//         : "text-muted-as-secondary"}` (cc43287c9: the 3.6556.2 x6 effort word was text-muted-control), the end Warning
//         icon and the "Model: {value}" accessible name;
//       Hye (environment-row-permission): the bar's permission trigger class `Y5(inBar)`;
//       dxe rail: the slots (mode = permission.control, model = modelEffort(Exe), ring = u8(ring)) and `modelMenu: "bar"`;
//       Jge: the place chip (d8, "Environment: {value}") and the folder chip (Folder icon, title = the ~ paths, tooltip
//         `paths ? da(paths) : label`, da = shared-55 gV = code-composer-v4 pathTooltipContent, and its four messages);
//       Kge: the place tooltip detail `iconOnly ? (tooltipDetail ?? placeText) : tooltipDetail`;
//       $3: the place tooltip (content "Environment" K7kuIZkkhY, hoverable false, collisionPadding 48/8/8/8).
// Every pick root is located on the official AST (the only top-level declaration of the chunk whose raw text has the probe
// and whose prettier text carries all features), under the reviewed local, with its raw declaration sha256 pinned; every pick
// must match exactly once; the cross-checks (E5) tie each named callee to the linked code-composer-v4 export or to the
// sliced Exe. Nothing here executes desktop code.
//
// Host boundaries (no adapter imports from the generated code): the model name / effort / permission values are OpenClaude's
// own (main.jsx models and permission modes); the ~ path is shared-3 VM (cc43287c9 Yg) under Jge's label context
// `oe = localKind ? rT() : iT`: cd8a7d7c0 export i = y (useHomeLabelContext over the module store u = $v(l()), l() =
// window.desktopHomePath) and export n = p (no home). That store is module state owned by the code-routines-v4 slice, so it
// is linked (linkedAreas { area: 'code-routines-v4', modules: [cd8a7d7c0-DuH0T8rm.mjs] }, one instance), never sliced
// again; E5 ties Jge's rT / iT to the y / p that module exports, which src/source-composer-env-adapters.jsx imports. The
// host sets window.desktopHomePath in electron/preload.cjs (the official mainView preload's managed-config homePath).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as official from './official-4.16336.0.mjs';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
export const COMPOSER_ENV_V4_OUTPUT = 'src/generated/composer-env-v4';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The finalized cds-core graph this area was reviewed against (same pin as code-start-v4 / code-composer-v4).
export const CDS_CORE_MANIFEST_SHA256 = '06d2026939e5c8992713c2a0dda1b1abc9adffe7a0c223fe3c1e79eecd08d62c';
const LINKED = 'code-composer-v4';
const LINKED_MODULE = 'environment-bar.mjs';
const LINKED_TOOLTIP = 'path-tooltip-placement.mjs';
// The official home label context's owner (cd8a7d7c0 l, u, d, f, p, y).
const LABEL_AREA = 'code-routines-v4';
const LABEL_CHUNK = 'cd8a7d7c0-DuH0T8rm.js';
const LABEL_MODULE = 'cd8a7d7c0-DuH0T8rm.mjs';

export const COMPOSER = 'cc43287c9-dzfX-J5i.js';
const SHARED55 = 'shared-55-BRv2XBP7.js';
const ENV_TARGETS = 'cd0cf5b5e-DJvJrkr3.js';
const I = '[\\w$]+';
const STR = '"((?:[^"\\\\]|\\\\.)*)"';

// Pick roots (and Exe, the one sliced root): probe = a raw (minified) token; features = prettier-form strings.
const rootSpecs = {
  Exe: { probe: 'children:[p(u8,{children:t}),p(u8,{children:n})]', features: ['let { model: t, effort: n } = e;', 'return h(y, { children: [p(u8, { children: t }), p(u8, { children: n })] });'] },
  Uye: { probe: '"environment-row-model"', features: ['"data-testid": "environment-row-model"', '"data-testid": "environment-row-effort"', 'modelEffort: Ae,', 'permission: { control: Fe, name: le },'] },
  Hye: { probe: '"environment-row-permission"', features: ['"data-testid": "environment-row-permission"', 'inBar: _,', 'id: "DCd6P2bj7j"'] },
  dxe: { probe: 'modelMenu:"bar"', features: ['modelMenu: "bar",', 'rail: (e) =>', 'model: e.modelEffort(Exe),'] },
  Jge: { probe: '"environment-bar-folder"', features: ['"data-testid": "environment-bar-trigger"', '"data-testid": "environment-bar-folder"', 'renderFolderTrigger: M,'] },
  Kge: { probe: 'tooltipDetail', features: ['({ placeText: n, tooltipDetail: r, ...t } = e)', 'p($3, { ...t, tooltipDetail: i })'] },
  $3: { probe: '"epitaxy-env-pill"', features: ['"data-testid": "epitaxy-env-pill"', 'collisionPadding: Qa,', 'id: "K7kuIZkkhY"'] },
};

// Reviewed pins: raw declaration sha256 (official bytes) of every root.
export const ROOT_PINS = {
  Exe: 'ed07cc743ad7313932b2e3083ebecdce74ed528d1f0ff61d0fdf9c847dfae267',
  Uye: '8e89cba579017f0c70b9b45a15053d2eb129cfe0ee95c81b843254d4be42fdcb',
  Hye: '9305bf46fc843405b39d469856349a146879a038d996c391ddf363214f179b43',
  dxe: 'e709e6181ea5eb361944f419c83f4c1ac6722713e58f492658b6578663a32321',
  Jge: 'e39d79e18634ed3367926944af677a01dbb5621481f414c99ce68a31dfaee322',
  Kge: 'fb1ac92e1c35b39047c5ea16c519f134109155f8eb02101cea007296f952fcab',
  $3: 'e472753924c854ae69c810b867c904b36936df5f87ba597215d0521e223b4bc6',
};

// Literal picks: [name, root, pattern] (each must match exactly once in the root's prettier text).
const picks = [
  ['tail.fields', 'Uye', new RegExp(`\\{ field: ${STR}, word: (${I})\\.fastLabel \\},\\s*\\{ field: ${STR}, word: \\2\\.thinkingLabel \\},`)],
  ['tail.toggle', 'Uye', new RegExp(`field: null,\\s*word:\\s*(${I})\\.toggleLabel &&\\s*\`((?:\\\\u00B7|·) )\\$\\{\\1\\.toggleLabel\\}\`,`)],
  ['tail.class', 'Uye', new RegExp(`className: \`([^\`$]+) \\$\\{(${I}) === null \\? ${STR} : (${I})\\(\\2\\) \\? ${STR} : ${STR}\\}\`,`)],
  ['tail.lead', 'Uye', new RegExp(`children: \\[${STR}, (${I})\\],\\s*\\},\\s*(${I}) \\?\\? ${STR},`)],
  ['tail.onlyBar', 'Uye', new RegExp(`(${I}) = (${I}) && !(${I})\\.loading,`)],
  ['bar', 'Uye', new RegExp(`let (${I}) = (${I}) === ${STR};\\s*if \\(!(${I})\\) \\{`)],
  ['trigger', 'Uye', new RegExp(`return p\\((${I}), \\{\\s*variant: ${STR},\\s*className: (${I})\\((${I}), \\4\\),\\s*icon: (${I})\\s*\\?\\s*p\\((${I}), \\{\\s*name: ${STR},\\s*size: ${STR},\\s*alt: \\5,\\s*className:\\s*${STR},?\\s*\\}\\)\\s*: void 0,\\s*iconPosition: ${STR},\\s*"data-testid": ${STR},\\s*"aria-label": (${I}),\\s*children: (${I}),?\\s*\\}\\);`)],
  ['label', 'Uye', new RegExp(`(${I}) = p\\((${I}), \\{\\s*overridden:[^;]*?,\\s*label: (${I})\\((${I}) \\?\\? (${I})\\),\\s*givesWay: (${I}),`)],
  ['aria', 'Uye', new RegExp(`\\{\\s*defaultMessage: ${STR},\\s*id: "(/BH9qS3xcc)",?\\s*\\},\\s*\\{\\s*value: \\[(${I})\\((${I})\\), \\.\\.\\.(${I})\\.map\\((${I})\\), (${I})\\]\\s*\\.filter\\(Boolean\\)\\s*\\.join\\(${STR}\\),?\\s*\\},`)],
  ['permission.class', 'Hye', new RegExp(`(${I}) = J1\\(\\$, \\d+, (${I})\\) \\? K1\\(\\$, \\d+, \\2, (${I})\\(\\2\\)\\) : \\$\\[\\d+\\],`)],
  ['permission.inBar', 'Hye', new RegExp(`inBar: (${I}),`)],
  ['permission.testId', 'Hye', new RegExp(`"data-testid": ${STR},\\s*"aria-label": ${I},\\s*"aria-describedby": ${I},`)],
  ['rail', 'dxe', new RegExp(`rail: \\((${I})\\) =>\\s*p\\((${I}), \\{\\s*place: (${I})\\.place,\\s*second: \\3\\.second,\\s*worktreeToggle: \\3\\.worktreeToggle,\\s*lastChip: ${I},\\s*mode: \\1\\.permission\\.control,\\s*line: ${I},\\s*lineEl: ${I},\\s*note: ${I},\\s*model: \\1\\.modelEffort\\((${I})\\),\\s*ring: p\\((${I}), \\{ children: ${I} \\}\\),?\\s*\\}\\)`)],
  ['railMenu', 'dxe', new RegExp(`modelMenu: ${STR},\\s*shortcutsActive: ${I},\\s*rail: \\(`)],
  ['place', 'Jge', new RegExp(`trigger: p\\((${I}), \\{\\s*icon: ${I},\\s*label: ${I},\\s*placeholder: ${I},\\s*caret: ${I},\\s*"data-testid": ${STR},\\s*"aria-label": ${I}\\.formatMessage\\(\\s*\\{\\s*defaultMessage: ${STR},\\s*id: ${STR},?\\s*\\},`)],
  ['folder', 'Jge', new RegExp(`icon: ${STR},\\s*label: (${I}),\\s*tail: (${I}),\\s*caret: ${I},\\s*"data-testid": ${STR},\\s*title: (${I}),\\s*tooltip: (${I}),`)],
  ['folderTooltip', 'Jge', new RegExp(`(${I}) = J2\\(\\$, \\d+, (${I}), (${I})\\) \\? K2\\(\\$, \\d+, \\2, \\3, \\2 \\? (${I})\\(\\2\\) : \\3\\) : \\$\\[\\d+\\],`)],
  ['folderSlot', 'Jge', new RegExp(`if \\((${I}) && !(${I}) && \\((${I}) === null \\|\\| (${I})\\)\\) \\{`)],
  ['folderSlot.cloud', 'Jge', new RegExp(`(${I}) = (${I}) !== null && (${I})\\(\\2\\.target\\),`)],
  ['labelContext', 'Jge', new RegExp(`(${I}) = (${I})\\(\\),\\s*(${I}) = (${I}) \\? \\1 : (${I}),`)],
  ['labelContext.localKind', 'Jge', new RegExp(`localKind: (${I}),`)],
  ['folderSlot.names', 'Jge', new RegExp(`shown: (${I}),\\s*starting: (${I}),[\\s\\S]*?activeStored: (${I}),`)],
  ['messages.choose', 'Jge', new RegExp(`\\{ defaultMessage: ${STR}, id: "(36ZE\\+1nZbE)" \\}`)],
  ['messages.extraCount', 'Jge', new RegExp(`defaultMessage: ${STR},\\s*id: "(bJpae0eVNj)",`)],
  ['messages.folderExtra', 'Jge', new RegExp(`defaultMessage: ${STR},\\s*id: "(kIIspeB92o)",`)],
  ['messages.folder', 'Jge', new RegExp(`\\{ defaultMessage: ${STR}, id: "(hSyWJr4x1N)" \\}`)],
  ['detail', 'Kge', new RegExp(`let (${I}) = (${I})\\((${I})\\) \\? \\((${I}) \\?\\? (${I})\\) : \\4;`)],
  ['detailNames', 'Kge', new RegExp(`\\(\\{ placeText: (${I}), tooltipDetail: (${I}), \\.\\.\\.${I} \\} = e\\)`)],
  ['placeTooltip.content', '$3', new RegExp(`(${I}) = J1\\(\\$, \\d+, (${I})\\)\\s*\\? K1\\(\\s*\\$,\\s*\\d+,\\s*\\2,\\s*\\2\\.formatMessage\\(\\{\\s*defaultMessage: ${STR},\\s*id: "(K7kuIZkkhY)",?\\s*\\}\\),?\\s*\\)`)],
  ['placeTooltip.padding', '$3', new RegExp(`(${I}) = J0\\(\\$, \\d+\\)\\s*\\? K0\\(\\$, \\d+, \\{ top: (\\d+), right: (\\d+), bottom: (\\d+), left: (\\d+) \\}\\)`)],
  ['placeTooltip.call', '$3', new RegExp(`p\\((${I}), \\{\\s*content: (${I}),\\s*detail: (${I}),\\s*hoverable: (!0|!1),\\s*collisionPadding: (${I}),\\s*children: (${I}),?\\s*\\}\\)`)],
];

const unescape = value => JSON.parse(`"${value}"`);
const declarations = src => [...new Set([...src.top.values()].filter(entry => entry.kind !== 'import'))];
const rawText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);

async function carries(src, entry, features) {
  try { assertFeatures('', await featureText(src, entry), features); return true; } catch { return false; }
}

// AST location of every root: the only top-level declaration of the composer chunk carrying its features, under the pinned
// local, with the pinned raw declaration hash.
export async function locateRoots(cache = new Map()) {
  const src = await readSource(COMPOSER, cache, official.ionSource);
  const found = {};
  for (const [local, spec] of Object.entries(rootSpecs)) {
    const hits = [];
    for (const entry of declarations(src)) if (rawText(src, entry).includes(spec.probe) && await carries(src, entry, spec.features)) hits.push(entry);
    if (hits.length !== 1) throw Error(`${COMPOSER} ${local}: ${hits.length} top-level declarations carry its features, expected 1`);
    const names = [...src.top].filter(([, entry]) => entry === hits[0]).map(([name]) => name);
    if (!names.includes(local)) throw Error(`${COMPOSER}: the declaration carrying ${local}'s features is ${names.join(', ')}`);
    const declarationSha256 = sha(rawText(src, hits[0]));
    const pin = ROOT_PINS[local];
    if (pin === undefined) throw Error(`${COMPOSER}#${local}: no reviewed pin`);
    if (pin !== null && pin !== declarationSha256) throw Error(`${COMPOSER} ${local}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
    found[local] = { local, entry: hits[0], declarationSha256, pinned: pin !== null, text: await featureText(src, hits[0]) };
  }
  return { src, found };
}

async function linkedExports() {
  const manifest = JSON.parse(await fs.readFile(path.join(generatedRoot, LINKED, 'manifest.json'), 'utf8'));
  const table = target => {
    const m = manifest.modules.find(mod => mod.target === target);
    if (!m) throw Error(`${LINKED}/${target} is not in its manifest`);
    if (m.referenceVersion !== official.referenceVersion) throw Error(`${LINKED}/${target} is ${m.referenceVersion}`);
    return m;
  };
  return { manifestSha256: sha(await fs.readFile(path.join(generatedRoot, LINKED, 'manifest.json'))), bar: table(LINKED_MODULE), tooltip: table(LINKED_TOOLTIP) };
}

// The label context owner: code-routines-v4's cd8a7d7c0 module on this version, cut from these chunk bytes, equal to its
// manifest, holding and exporting the bindings Jge reads (each under its own name).
async function labelOwner(locals) {
  const dir = path.join(generatedRoot, LABEL_AREA);
  const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
  const m = manifest.modules.find(mod => mod.target === LABEL_MODULE);
  if (!m) throw Error(`${LABEL_AREA}/${LABEL_MODULE} is not in its manifest`);
  if ((m.referenceVersion ?? manifest.referenceVersion) !== official.referenceVersion) throw Error(`${LABEL_AREA}/${LABEL_MODULE} is ${m.referenceVersion}`);
  if (path.basename(m.source) !== LABEL_CHUNK) throw Error(`${LABEL_AREA}/${LABEL_MODULE} was cut from ${m.source}, not ${LABEL_CHUNK}`);
  const chunkBytes = await fs.readFile(path.join(official.ionSource, LABEL_CHUNK));
  if (sha(chunkBytes) !== m.sourceSha256) throw Error(`${LABEL_AREA}/${LABEL_MODULE} was cut from other ${LABEL_CHUNK} bytes`);
  const text = await fs.readFile(path.join(dir, LABEL_MODULE), 'utf8');
  if (sha(text) !== m.sha256) throw Error(`${LABEL_AREA}/${LABEL_MODULE} differs from its manifest`);
  const exported = new Set(([...text.matchAll(/^export \{([^}]*)\};$/gm)].flatMap(x => x[1].split(',').map(n => n.trim()))));
  for (const local of locals) {
    if (!(m.bindings ?? []).some(b => (typeof b === 'string' ? b : b.name) === local)) throw Error(`${LABEL_AREA}/${LABEL_MODULE} does not hold ${LABEL_CHUNK}#${local}`);
    if (!exported.has(local)) throw Error(`${LABEL_AREA}/${LABEL_MODULE} does not export ${local} under its own name`);
  }
  // Only this module's bytes are pinned (not the whole code-routines-v4 manifest, which its own region regenerates).
  return { moduleSha256: m.sha256 };
}

export async function pickEnvironmentRow(cache = new Map()) {
  const { src, found } = await locateRoots(cache);
  const m = {}, records = [];
  for (const [name, rootKey, pattern] of picks) {
    const text = found[rootKey].text;
    const all = [...text.matchAll(new RegExp(pattern.source, 'g'))];
    if (all.length !== 1) throw Error(`pick ${name}: ${all.length} matches in ${rootKey}, expected 1`);
    m[name] = all[0];
    records.push({ name, root: rootKey, sha256: sha(all[0][0]) });
  }
  // `bar`: the renderTrigger closure opens with `let t = d === "bar"; if (!re) {…}` (the model menu's placement).
  const barFlag = m.bar[1], barValue = unescape(m.bar[3]);
  const linked = await linkedExports();
  const barExports = linked.bar.exports;
  const exportOf = local => barExports[local] ?? null;
  // E5 (Uye): the tail words follow the bar test; their tone template tests the bar's overrides; the trigger class is the
  // linked Y5 (environmentTriggerClass) called (bar, bar); the label is the linked X5 (EnvironmentTriggerLabel) with
  // givesWay = the bar test.
  const [, fastField, , effortField] = m['tail.fields'];
  const [, onlyBarFlag, onlyBarTest] = m['tail.onlyBar'];
  if (onlyBarTest !== barFlag) throw Error(`Uye: the tail words are gated on ${onlyBarTest}, not the bar test ${barFlag}`);
  const [, tailBase, tailField, toneToggle, , toneOverridden, tonePlain] = m['tail.class'];
  const [, lead, , keyField, toggleKey] = m['tail.lead'];
  if (keyField !== tailField) throw Error('Uye: the tail key no longer falls back on the field');
  const [, button, variant, classFn, classArg, , icon, warnName, warnSize, warnClass, iconPosition, testId] = m.trigger;
  if (exportOf(classFn) !== 'environmentTriggerClass') throw Error(`Uye: the model trigger class is ${classFn}, not ${LINKED} environmentTriggerClass`);
  if (classArg !== barFlag) throw Error(`Uye: the model trigger class takes ${classArg}, not the bar test ${barFlag}`);
  const [, , labelFn, , , , givesWay] = m.label;
  if (exportOf(labelFn) !== 'EnvironmentTriggerLabel') throw Error(`Uye: the trigger label is ${labelFn}, not ${LINKED} EnvironmentTriggerLabel`);
  if (givesWay !== barFlag) throw Error(`Uye: givesWay is ${givesWay}, not the bar test`);
  const imported = local => { const e = src.top.get(local); return e?.kind === 'import' ? e : null; };
  const buttonImport = imported(button), iconImport = imported(icon);
  if (buttonImport?.file !== official.sharedFrame || iconImport?.file !== official.sharedFrame) throw Error('Uye: the trigger Button / Icon are no longer shared-frame imports');
  const [, ariaDefault, ariaId, , , , , , ariaJoin] = m.aria;
  // E5 (Hye): the permission trigger class is the linked Y5 over the inBar prop.
  const [, , permArg, permFn] = m['permission.class'];
  if (exportOf(permFn) !== 'environmentTriggerClass' || permArg !== m['permission.inBar'][1]) throw Error('Hye: the permission class is no longer Y5(inBar)');
  // E5 (dxe rail): vge / u8 are the linked EnvironmentBar / EnvironmentChipGroup, modelEffort renders the sliced Exe.
  const [, , barCallee, , modelEffortFn, ringWrap] = m.rail;
  if (exportOf(barCallee) !== 'EnvironmentBar') throw Error(`dxe rail renders ${barCallee}, not ${LINKED} EnvironmentBar`);
  if (exportOf(ringWrap) !== 'EnvironmentChipGroup') throw Error(`dxe rail wraps the ring in ${ringWrap}, not ${LINKED} EnvironmentChipGroup`);
  if (modelEffortFn !== 'Exe') throw Error(`dxe rail model is modelEffort(${modelEffortFn}), not the sliced Exe`);
  const railMenu = unescape(m.railMenu[1]);
  if (railMenu !== barValue) throw Error(`dxe passes modelMenu ${railMenu}; Uye tests ${barValue}`);
  // E5 (Jge): the chips are the linked d8 (EnvironmentChip); the folder tooltip is da(paths) with da = shared-55 gV, which
  // code-composer-v4 path-tooltip-placement.mjs exports as pathTooltipContent.
  const [, placeChip, placeTestId, placeAriaDefault, placeAriaId] = m.place;
  if (exportOf(placeChip) !== 'EnvironmentChip') throw Error(`Jge place chip is ${placeChip}, not ${LINKED} EnvironmentChip`);
  const [, folderIcon, , , folderTestId, folderTitle, folderTooltip] = m.folder;
  const [, tooltipBinding, tooltipPaths, , tooltipFn] = m.folderTooltip;
  if (tooltipBinding !== folderTooltip || tooltipPaths !== folderTitle) throw Error('Jge: the folder tooltip is no longer `title ? da(title) : label`');
  const da = imported(tooltipFn);
  const shared55 = await readSource(SHARED55, cache, official.ionSource);
  if (da?.file !== SHARED55 || linked.tooltip.exports[shared55.exported.get(da.alias)] !== 'pathTooltipContent')
    throw Error(`Jge folder tooltip ${tooltipFn} is not ${SHARED55} gV (${LINKED} pathTooltipContent)`);
  // E5 (Jge folder slot): the folder chip is drawn only while the bar is shown, not starting, and no saved environment is
  // active (`_ === null`) — or the active one is a cloud environment without repos (cd0cf5b5e `kind === "cloud" &&
  // repos.length === 0`), which the host has none of.
  const [, slotShown, slotStarting, slotStored, slotCloud] = m.folderSlot;
  const [, cloudBinding, cloudStored, cloudFn] = m['folderSlot.cloud'];
  const [, namesShown, namesStarting, namesStored] = m['folderSlot.names'];
  if (slotShown !== namesShown || slotStarting !== namesStarting || slotStored !== namesStored || cloudBinding !== slotCloud || cloudStored !== namesStored)
    throw Error('Jge: the folder slot is no longer `shown && !starting && (activeStored === null || cloudWithoutRepos(activeStored.target))`');
  // E5 (Jge label context): `ae = rT(), oe = localKind ? ae : iT` — rT / iT are cd8a7d7c0 exports whose declarations
  // (y useHomeLabelContext, p the empty context) the linked code-routines-v4 module holds and exports.
  const [, ctxValue, ctxHookFn, ctxBinding, ctxTest, ctxOther] = m.labelContext;
  if (ctxTest !== m['labelContext.localKind'][1]) throw Error(`Jge: the label context is chosen by ${ctxTest}, not localKind`);
  const labelChunk = await readSource(LABEL_CHUNK, cache, official.ionSource);
  const labelLocal = fn => { const e = imported(fn); if (e?.file !== LABEL_CHUNK) throw Error(`Jge: ${fn} is not a ${LABEL_CHUNK} import`); return labelChunk.exported.get(e.alias); };
  const homeLocal = labelLocal(ctxHookFn), noHomeLocal = labelLocal(ctxOther);
  const homeEntry = labelChunk.top.get(homeLocal), noHomeEntry = labelChunk.top.get(noHomeLocal);
  if (!homeEntry || !rawText(labelChunk, homeEntry).includes('{home:'))
    throw Error(`Jge: ${LABEL_CHUNK} ${homeLocal} is no longer the { home } label context hook`);
  if (!noHomeEntry || !/=\{\}$/.test(rawText(labelChunk, noHomeEntry))) throw Error(`Jge: ${LABEL_CHUNK} ${noHomeLocal} is no longer the empty label context`);
  const label = await labelOwner([homeLocal, noHomeLocal]);
  const cloudImport = imported(cloudFn);
  if (cloudImport?.file !== ENV_TARGETS) throw Error(`Jge: ${cloudFn} is not a ${ENV_TARGETS} import`);
  const envTargets = await readSource(ENV_TARGETS, cache, official.ionSource);
  const cloudLocal = envTargets.exported.get(cloudImport.alias);
  const cloudEntry = cloudLocal && envTargets.top.get(cloudLocal);
  if (!cloudEntry || !rawText(envTargets, cloudEntry).includes('return e.kind==="cloud"&&e.repos.length===0'))
    throw Error(`Jge: ${ENV_TARGETS} ${cloudImport.alias} is no longer the cloud-without-repos test`);
  // E5 (Kge): the detail rule reads the linked s8 (EnvironmentIconOnlyContext) through useContext.
  const [, , ctxHook, ctx, detailName, placeName] = m.detail;
  const [, placeTextName, tooltipDetailName] = m.detailNames;
  if (exportOf(ctx) !== 'EnvironmentIconOnlyContext') throw Error(`Kge reads ${ctx}, not ${LINKED} EnvironmentIconOnlyContext`);
  if (placeName !== placeTextName || detailName !== tooltipDetailName) throw Error('Kge: the detail rule is no longer iconOnly ? (tooltipDetail ?? placeText) : tooltipDetail');
  if (imported(ctxHook)?.file !== official.vendorFrame) throw Error(`Kge: ${ctxHook} is not a vendor-frame (React) import`);
  // E5 ($3): the place tooltip takes the picked content and padding.
  const [, contentBinding, , contentDefault, contentId] = m['placeTooltip.content'];
  const [, paddingBinding, top, right, bottom, left] = m['placeTooltip.padding'];
  const [, , callContent, , callHoverable, callPadding] = m['placeTooltip.call'];
  if (callContent !== contentBinding || callPadding !== paddingBinding) throw Error('$3: the place tooltip no longer takes the picked content / padding');
  const descriptor = (defaultMessage, id) => ({ defaultMessage: unescape(defaultMessage), id });
  const data = {
    barMenu: barValue,
    modelTrigger: {
      variant: unescape(variant), testId: unescape(testId), iconPosition: unescape(iconPosition), givesWay: true,
      warningIcon: { name: unescape(warnName), size: unescape(warnSize), className: unescape(warnClass) },
      tail: {
        fields: [unescape(fastField), unescape(effortField)],
        toggle: { key: unescape(toggleKey), prefix: unescape(m['tail.toggle'][2]) },
        lead: unescape(lead), baseClass: tailBase,
        tone: { toggle: unescape(toneToggle), overridden: unescape(toneOverridden), plain: unescape(tonePlain) },
      },
      ariaLabel: { message: descriptor(ariaDefault, ariaId), join: unescape(ariaJoin) },
    },
    permissionTrigger: { testId: unescape(m['permission.testId'][1]), classArgs: 'inBar' },
    rail: { mode: 'permission.control', model: 'modelEffort', ring: 'EnvironmentChipGroup' },
    placeChip: {
      testId: unescape(placeTestId), ariaLabel: descriptor(placeAriaDefault, placeAriaId),
      tooltip: { content: descriptor(contentDefault, contentId), hoverable: callHoverable === '!0',
        collisionPadding: { top: Number(top), right: Number(right), bottom: Number(bottom), left: Number(left) }, iconOnlyDetailFallback: 'placeText' },
    },
    folderChip: {
      icon: unescape(folderIcon), testId: unescape(folderTestId), tooltip: 'pathTooltipContent',
      shownWhen: { activeStored: null, orActiveStoredTarget: { kind: 'cloud', repos: 0 } },
      messages: {
        choose: descriptor(m['messages.choose'][1], m['messages.choose'][2]),
        folder: descriptor(m['messages.folder'][1], m['messages.folder'][2]),
        folderExtra: descriptor(m['messages.folderExtra'][1], m['messages.folderExtra'][2]),
        extraCount: descriptor(m['messages.extraCount'][1], m['messages.extraCount'][2]),
      },
    },
  };
  const labelContext = { area: LABEL_AREA, module: LABEL_MODULE, home: homeLocal, noHome: noHomeLocal, chosenBy: 'localKind',
    jge: `${ctxBinding} = ${ctxTest} ? ${ctxValue} : ${ctxOther}`, moduleSha256: label.moduleSha256 };
  return { data, found, records, linked, labelContext, onlyBarFlag };
}

const modules = [
  { source: COMPOSER, target: 'model-effort.mjs', internal: true, exports: { Exe: 'EnvironmentModelEffort' }, features: { Exe: rootSpecs.Exe.features } },
];

export const COMPOSER_ENV_V4 = {
  name: 'composer environment bar (4.16336.0)', generator: 'extract-composer-env-v4.mjs', output: path.join(root, COMPOSER_ENV_V4_OUTPUT),
  adapterModule: '../../source-composer-env-adapters.jsx', adapterFile: 'src/source-composer-env-adapters.jsx', adapters: {}, modules,
  sharedGraph: 'cds-core', generatedRoot, sourceContract: official,
  linkedAreas: [{ area: LINKED, modules: [LINKED_MODULE] }, { area: LABEL_AREA, modules: [LABEL_MODULE] }],
  referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
  vendor: { [official.vendorFrame]: official.reactAliases },
};

async function cdsCorePin() {
  const now = sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json')));
  if (now !== CDS_CORE_MANIFEST_SHA256)
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the composer-env-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

const literal = value => JSON.stringify(value, null, 2);

export async function extractComposerEnvV4({ check = false, dryRun = false } = {}) {
  const cdsCore = await cdsCorePin();
  const { data, found, records, linked, labelContext } = await pickEnvironmentRow();
  const rowModule = `// Original Claude Desktop ${official.referenceVersion} literals picked from ${COMPOSER} (Uye renderTrigger, Hye, dxe rail, Jge,\n`
    + `// Kge, $3); generated by extract-composer-env-v4.mjs. Edit the extractor, never this file.\n`
    + `export const environmentRow = Object.freeze(${literal(data)});\n`;
  const cfg = {
    ...COMPOSER_ENV_V4,
    async artifacts(m) {
      return {
        'environment-row.mjs': rowModule,
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-composer-env-v4.mjs',
          sharedGraph: { area: 'cds-core', manifestSha256: cdsCore },
          linked: { area: LINKED, modules: [LINKED_MODULE, LINKED_TOOLTIP], manifestSha256: linked.manifestSha256 },
          labelContext,
          roots: Object.values(found).map(f => ({ file: COMPOSER, local: f.local, declarationSha256: f.declarationSha256, pinned: f.pinned })),
          picks: records,
          imports: m.modules.flatMap(mod => mod.imports.map(i => ({ module: mod.target, local: i.local, kind: i.kind, from: i.from, name: i.name, via: i.via }))),
        }, null, 2) + '\n',
      };
    },
  };
  return runSlicer(cfg, { check, dryRun });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--locate')) {
    const { found } = await locateRoots();
    for (const f of Object.values(found)) console.log(f.local, f.declarationSha256, f.pinned ? 'pinned' : 'UNPINNED');
  } else await extractComposerEnvV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
