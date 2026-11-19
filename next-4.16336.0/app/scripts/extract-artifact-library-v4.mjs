// Artifact library, 4.16336.0 source contract (claude-4.16336.0-migrate-20261104 round 2, unit artifact-library): the same
// semantic roots scripts/extract-artifact-library.mjs cuts from 3.6556.2 into src/generated/artifact-library (the gallery
// page shell the library routes render, the artifact card thumbnail and glyph, the viewer title and header action, the
// "More options" trigger and the viewer frame classes), cut from the frozen 4.16336.0 snapshot into the isolated graph
// src/generated/artifact-library-v4. The 3.6556.2 generator, output and tests are untouched (staged double output; no
// production switch this round: src/source-artifact-library.jsx and src/source-artifact-viewer.jsx keep reading
// src/generated/artifact-library, region-plan cutover.productionSwitchNotBeforeBatch 9; the host patches are
// analysis/claude-4.16336.0-migrate-20261104/round2/artifact-library/patches/).
//
//   c230724a2-qhV7Crzy  vc  ArtifactLibraryPage   (3.6556.2 c230724a2 Ns; chunk-internal: the routes render `o(vc,{title,
//                                                   tabs,…})` and `D=vc`), now with iconActions / actions / hero / promo,
//                                                   the top-banner placeholder and the own-list / augmenting states.
//                       Fs  ArtifactMenuTrigger   (export Mn; 3.6556.2 c69e9937a cn): "More options for {label}", now
//                                                   DotsHorizontal, variant onContent on a card and ghost on a row.
//   c33ae67d6-D8ma6JPd  B   ArtifactThumbnail     (export r; 3.6556.2 cbbbbbd87 V)
//                       P   ArtifactGlyph         (chunk-internal; 3.6556.2 cbbbbbd87 I): the frame source has no "Code"
//                                                   default icon any more (design -> Palette, else Artifacts).
//   c2bb74286-pk_O67sD  mt  ArtifactTitle         (export r; 3.6556.2 Lt): the title now goes through c2bb74286 w.
//                       bt  ArtifactAction        (chunk-internal; 3.6556.2 Bt): the viewer header / switcher button.
//   shared-38-DyF0_Fim  xa / Sa / Ca  artifactFrameClass / artifactHeaderClass / artifactBodyClass (exports K / G / U;
//                                                   3.6556.2 shared-9 fh / ph / mh, byte-identical strings).
//
// Machinery: the shared runSlicer engine (scripts/extract-working-line.mjs, not changed here):
//   - sourceContract scripts/official-4.16336.0.mjs (vendor-frame React aliases checked against their declarators);
//   - sharedGraph 'cds-core' (CDS names are cds-core publicNames: CdsIcon / cdsIconSizes directly, as working-line-v4
//     does; the 3.6556.2 cdsIconAliases table is gone from the 4.16336.0 closure (region plan G3) and no alias is made;
//     isFizzyLakePartEnabled, ownerWindow, getResizeObserverClass and safeLocalStorage resolve to their cds-core
//     publicNames wherever the closure reaches them; cds-core module state without a publicName stops generation, D46);
//     the reviewed cds-core manifest sha256 is pinned (CDS_CORE_MANIFEST_SHA256);
//   - linkedAreas (D1, round2/plan.json artifact-library): routines-shared-v4, code-routines-v4, cowork-scheduled-v4,
//     home-chat-cowork (the cowork-home surface) and transcript-rows-v4: a binding one of them already slices and exports
//     is imported from it, never cut again (the 3.6556.2 mcp-app-card links were shared-78 / shared-7 pure helpers; the
//     4.16336.0 closure reaches no mcp-app-card binding);
//   - host boundaries as localAdapters (file#local), answered by src/source-artifact-library-v4-adapters.jsx: the same
//     official services the 3.6556.2 graph adapts (now in their 4.16336.0 chunks/locals). Each original is pinned by
//     features and by its raw declaration sha256 (ADAPTER_PINS).
// Roots are located on the official AST: each root is the only top-level declaration of its chunk whose raw text has the
// probe and whose prettier form carries every feature, under the reviewed local, with its export alias as reviewed and
// its raw declaration sha256 pinned (ROOT_PINS). No pin is ever refreshed by a script.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as official from './official-4.16336.0.mjs';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
export const ARTIFACT_LIBRARY_V4_OUTPUT = 'src/generated/artifact-library-v4';
const ADAPTER_FILE = 'src/source-artifact-library-v4-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The cds-core graph this area was reviewed against (cds-core wave 6, cds-integrate/wave6/apply-real.json).
export const CDS_CORE_MANIFEST_SHA256 = 'a0f228ae3f997f54f3e3ebafc254794bd26d8f1fc6999943a08b1d5730f638cd';

export const PAGE = 'c230724a2-qhV7Crzy.js';
export const THUMB = 'c33ae67d6-D8ma6JPd.js';
export const VIEWER = 'c2bb74286-pk_O67sD.js';
export const FRAME = 'shared-38-DyF0_Fim.js';

// ── Roots: file -> local -> { name, export (the chunk's own alias, null: chunk-internal), probe (raw), features } ──────
export const ROOTS = {
  [PAGE]: {
    vc: { name: 'ArtifactLibraryPage', export: null, probe: 'listingDrawsLoadingMore:C',
      features: ['title: t,', 'tabs: n,', 'tabPanel: r,', 'contentGap: i,', 'search: a,', 'iconActions: u,', 'viewToggle: d,', 'actions: f,',
        'primaryAction: p,', 'topBannerPlaceholder: v,', 'listingDrawsLoadingMore: C,', 'ownListFollows: k,', 'isAugmenting: A,', 'hasMore: B,',
        'onLoadMore: H,', 'te = i === void 0 ? "lg" : i,', 'ne = x === void 0 ? "grid" : x,', 'new IntersectionObserver(',
        'defaultMessage: "No artifacts matching \\u201C{search}\\u201D",', 'id: "9R4NPWEKk0",', 'defaultMessage: "No artifacts match your search",',
        'id: "CfUVWU/VXs",', '"data-testid": "gallery-load-more-sentinel",', '"data-testid": "gallery-band-top",', 'primaryActionCompactIcon: "Add",'] },
    Fs: { name: 'ArtifactMenuTrigger', export: 'Mn', probe: '"More options for {label}"',
      features: ['label: n,', 'placement: s,', 'd = s === "card" ? "onContent" : "ghost",', '"[scroll-margin-top:var(--list-header-scroll-offset)]"',
        '{ defaultMessage: "More options for {label}", id: "rKQPgfPvWS" },', 'icon: "DotsHorizontal",', 'iconOnly: !0,', 'tooltip: !1,',
        '(e.stopPropagation(), e.preventDefault(), r?.(e));'] },
  },
  [THUMB]: {
    B: { name: 'ArtifactThumbnail', export: 'r', probe: '{item:n,priority:r,markless:i}=e',
      features: ['{ item: n, priority: r, markless: i } = e,', 'if (n.thumbnail)', 'iconSize: "lg",', 'bare: !0,', 'if (n.source === "chat")',
        'if (n.thumbnailImgSrc) {', '"h-full w-full object-cover grayscale opacity-70",', 's = a ? "eager" : "lazy",'] },
    P: { name: 'ArtifactGlyph', export: null, probe: '"data-gallery-type-media":f',
      features: ['{ source: r, icon: i, typeIcon: a, tint: o, iconSize: s, bare: c } = n,', '"flex h-full w-full items-center justify-center",',
        '"text-muted-as-secondary"', 'm = a ?? i ?? (r === "design" ? "Palette" : "Artifacts"),', '"data-gallery-type-media": f,'] },
  },
  [VIEWER]: {
    mt: { name: 'ArtifactTitle', export: 'r', probe: '"data-testid":"frame-artifact-title"',
      features: ['{ title: n, titlePending: r, heading: i } = e,', 'c = i ? "h2" : "span",', '"aria-label": a.formatMessage(we.pending),',
        '"data-testid": "frame-artifact-title",'] },
    bt: { name: 'ArtifactAction', export: null, probe: '{glyph:r,label:i,detail:n,menuOpen:o,...a}=e',
      features: ['({ glyph: r, label: i, detail: n, menuOpen: o, ...a } = e),', '"aria-label": i', 'label: i, detail: n, open: s, children: c'] },
  },
  [FRAME]: {
    xa: { name: 'artifactFrameClass', export: 'K', probe: 'cds-pane-ground', features: ['xa = "cds-pane-ground flex h-full min-h-0 flex-col"'] },
    Sa: { name: 'artifactHeaderClass', export: 'G', probe: 'h-frame-row',
      features: ['"flex h-frame-row shrink-0 items-center justify-between gap-sm bg-surface-3 ps-2 pe-3 pb-[var(--frame-row-line,0px)] -mb-[var(--frame-row-line,0px)]"'] },
    Ca: { name: 'artifactBodyClass', export: 'U', probe: 'after:border-[color:var(--cds-border-line',
      features: ['"relative min-h-0 flex-1 bg-surface-2 after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:border-t after:border-[color:var(--cds-border-line,var(--cds-alpha-1))] after:content-[\'\']"'] },
  },
};
// Reviewed pins: raw declaration sha256 (official bytes) of every root (`--locate` prints them; never refreshed by a script).
export const ROOT_PINS = {
  'c230724a2-qhV7Crzy.js#vc': '240ac6c427b3156537e45cb115596a9d9a1722d2ff6536da27e6de3dfcdfa20f',
  'c230724a2-qhV7Crzy.js#Fs': '0e0c08c079493378f128488c95335fadb68e422586a75cde8b5a96377d750452',
  'c33ae67d6-D8ma6JPd.js#B': '39b4cf79251808ec0dce24cbfcfe1c2114c0a6d437d438326c62355d33b39ea3',
  'c33ae67d6-D8ma6JPd.js#P': 'be48b1d8874ec0a73c33030ec2637b5fa40a70b5681c5fb437dba3955c9a85f4',
  'c2bb74286-pk_O67sD.js#mt': '1556800a812054e0b3f5ca3e3b5b7859ac832425f58a9720ae7b78963b561c14',
  'c2bb74286-pk_O67sD.js#bt': '5119cb818fed07db906ec206b1c4361f90d6816eded34a34ddc355baf664fb74',
  'shared-38-DyF0_Fim.js#xa': '818ed6bf4eff406049fd8b8497209c8309ab35820a8a9dae08191a6026f21e7c',
  'shared-38-DyF0_Fim.js#Sa': 'c0300c699ffb95318f7f7b1bb82e82fe8d5e296202014a429221257abcb16978',
  'shared-38-DyF0_Fim.js#Ca': '8e9dbdae5dd532a42578cd993d06299187cbf57bfd2847ce1c9f918853401595',
};
// Feature checks on the page's own parts the roots reach (a reused minified name cannot pass): file#local -> features.
export const INNER = {
  // Ns (3.6556.2 c69e9937a on): an item's menu: its own `menu`, else the official item menu (shared-140 Xo) when it has
  // official actions (shared-140 wo) or menuExtras, as the row's context menu or behind the Ps "More options" trigger.
  'c230724a2-qhV7Crzy.js#Ns': ['return e.menu', '? e.menu(t)', ': Ia(e, {}).length === 0 && !e.menuExtras', 'o(Fa, { item: e, contextMenuTrigger: t.contextMenuTrigger })',
    'o(Ps, { item: e, placement: t.placement });'],
  // Ps (3.6556.2 c69e9937a sn): the trigger Fs labelled by the item, inside the item menu.
  'c230724a2-qhV7Crzy.js#Ps': ['{ item: t, placement: n } = e,', 'o(Fs, { label: i, placement: n })', 'o(Fa, { item: t, trigger: a })'],
};

// ── Host boundaries: file#local -> { name (export of the adapter module), from, features, why } ─────────────────────────
// `from` names the existing host adapter the v4 adapter module re-exports (its semantics are documented there); null:
// defined in the v4 adapter module itself (same meaning as the 3.6556.2 src/source-artifact-v3-adapters.jsx export of
// the same name, over cds-core instead of view-tabs).
const RS = 'src/source-routines-shared-adapters.jsx';
export const HOST_ADAPTERS = {
  // 3.6556.2 shared-16 $l: the lazy handle of the official artifact menu chunk (artifact_menu, ce9de3a9d), preloaded on idle.
  'shared-140-DfG6VwpK.js#zo': { name: 'artifactMenuItemsLazy', from: null, features: ['var zo = Fo.handle;'],
    why: 'The official artifact menu chunk (ce9de3a9d: rename, duplicate, copy link, delete over the claude.ai artifact APIs) is not loaded; the idle preload has no handle.' },
  // 3.6556.2 shared-16 Vl: which official artifact actions an item offers (pin / rename / duplicate / copy link / remove / delete).
  'shared-140-DfG6VwpK.js#wo': { name: 'artifactMenuActions', from: null,
    features: ['copy_link: So(e),', 'remove_from_list: !!e.onRemoveFromList,', 'delete: !!(t.onDeleteStart ?? e.onDelete),', 'i = e.grayedRows ?? [];'],
    why: 'The official per-item action list (claude.ai artifact APIs) is empty on the host; items bring their local actions as menuExtras.' },
  // 3.6556.2 shared-16 uu: the official item menu (context menu Qo / dropdown Zo over es, the artifact actions then the
  // item's menuExtras).
  'shared-140-DfG6VwpK.js#Xo': { name: 'ArtifactItemMenu', from: null, features: ['e.contextMenuTrigger ? a(Qo, { ...e }) : a(Zo, { ...e })'],
    why: 'The official artifact actions (claude.ai artifact APIs) are not offered; the menu lists only the host item\'s menuExtras, in the cds-core CdsContextMenu (right click) or CdsDropdown (the official Fs trigger).' },
  // 3.6556.2 ce645a5d4 s: the owner names of artifacts another account shared (org members query cd2e30834).
  'c1b2dcb06-Cb9ZmAdr.js#v': { name: 'useArtifactOwners', from: null,
    features: ['t.rel === "shared" &&', 't.ownerAccountUuid !== r &&', '{ membersByUuid: d } = m(s);'],
    why: 'Shared-artifact owner names (org members query) are not available: the host has no account; every row answers undefined, as for a card of your own.' },
  // 3.6556.2 cbbbbbd87 N: the claude.ai chat artifact preview (published screenshot or a markdown / code excerpt); B
  // renders it only for source "chat".
  'c33ae67d6-D8ma6JPd.js#j': { name: 'ChatArtifactPreview', from: 'src/source-artifact-chat-preview.jsx',
    features: ['{ title: n, type: r, preview: i, publishedArtifactUuid: o } = e,', '`/public/artifacts/${o}/screenshot`', 'className: "artifact-markdown-preview",'],
    why: 'Chat artifact previews follow the original (markdown / text / code excerpt from previewText, else the type icon) in src/source-artifact-chat-preview.jsx; no published screenshot (no claude.ai publishing).' },
  // 3.6556.2 shared-25 Cx (RouterLink): B's card anchor for an in-app href; RoutinesSharedHost's navigate.
  'shared-25-D-aF0gt9.js#Ky': { name: 'RouterLink', from: RS, features: ['href: t,', 'replace: a,', 'scroll: s,', 'prefetch: r,', 'onClick: n,', 'target: c,', 'ref: i,'],
    why: 'In-app links go through the host router (RoutinesSharedHost navigate), as for the 3.6556.2 graph.' },
  // shared-5 bC: a card's drag start, which begins a drag of a frame artifact onto the sidebar Starred list (the store
  // mC the sidebar drop target reads, frame-sidebar-nav's copy). Its first statement resets that store (yC); it then
  // answers false unless the item is a frame artifact (`source === "frame"`, not a folder) with onToggleStar, not yet
  // starred, and GrowthBook __gb__2021363468 is on. Host items are local files (source "cowork", or "chat" for a Chat
  // artifact; never "frame") and the host GrowthBook does not serve that flag (shared-0 Ru: no client -> false), so every host
  // call takes the official `return !1` branch; nothing ever sets mC.item, so the reset has nothing to clear. Answered
  // here with that branch instead of a second copy of frame-sidebar-nav's store (D1); when frame-sidebar-nav exports
  // shared-5 mC / yC / bC (round2/artifact-library/report.json requests), this boundary becomes a link.
  'shared-5-u8kha2eH.js#bC': { name: 'beginStarDrag', from: null,
    features: ['yC();', 'e.source !== "frame" ||', 'e.folder === !0 ||', 'e.onToggleStar === void 0 ||', 'e.starred === !0 ||', '!lt("__gb__2021363468")',
      'return !1;', 'mC.setState({ item: e }),'],
    why: 'Dragging a card onto the sidebar Starred list is not offered: host items are local files (source "cowork" / "chat", never "frame") and GrowthBook __gb__2021363468 is not served, so the official drag start answers false.' },
  'vendor-intl-BJgYK7RA.js#q': { name: 'useIntl', from: RS, features: ['return (Mt(e), e);'], why: 'react-intl over the local catalog.' },
  'vendor-intl-BJgYK7RA.js#Gt': { name: 'FormattedMessage', from: RS, features: ['var Gt = a(Wt, Ut);'], why: 'react-intl over the local catalog.' },
};
// Reviewed pins: raw declaration sha256 of every adapted original.
export const ADAPTER_PINS = {
  'shared-140-DfG6VwpK.js#zo': 'a70dbd2a2c37565af70dc4ef530c05f82c47a3294c0cda6003d874e70cb58367',
  'shared-140-DfG6VwpK.js#wo': 'd57484721c3c0ba2efe93190397db849759a7d2518f1e2f136eaba4e3396e61f',
  'shared-140-DfG6VwpK.js#Xo': '6deb52ff52cb27563a69ba2473e8495e5317c602b0f125fa75906eb84b2bdfeb',
  'c1b2dcb06-Cb9ZmAdr.js#v': '0aff60cb11bb56e0644767941c4e5c1c80fd7b23055526fdaf6c53357d6f9364',
  'c33ae67d6-D8ma6JPd.js#j': '5f800cf622d0d054c749ba8f9dc4c1af3bc196f1ce206b71242ee83fd5c839c2',
  'shared-5-u8kha2eH.js#bC': 'f7ed70d298904d9d06eb0c828acf5ca67a0d59daa3a4aa22b05e51e37db6851b',
  'shared-25-D-aF0gt9.js#Ky': '4884879fdd5f05cd45263c786ab487acc75ba4998798ae34e579b75402024130',
  'vendor-intl-BJgYK7RA.js#q': 'edf793bc7b87ae9a38cea39d25d752a5bcfef1d492e06a2219e120311feaaec0',
  'vendor-intl-BJgYK7RA.js#Gt': 'bde2ec1630e0a679fa4135cf75389568e77fa98fdcb08519af8104d5306ff5b5',
};
for (const key of Object.keys(HOST_ADAPTERS)) if (!Object.hasOwn(ADAPTER_PINS, key)) throw Error(`adapter ${key}: no reviewed pin`);

// frame-sidebar-nav (D1, round2/artifact-library/tools/d1-pre.mjs): it holds and exports the shared-3 id registry the
// thumbnail's relative-time label reaches; only that module is linked. (Its shared-5 star-drag store mC / gC / _C / vC /
// yC is sliced there without an export, so the one entry into it, shared-5 bC, is a host boundary below.)
export const LINKED_AREAS = ['routines-shared-v4', 'code-routines-v4', 'cowork-scheduled-v4', 'home-chat-cowork', 'transcript-rows-v4',
  { area: 'frame-sidebar-nav', modules: ['shared-3.mjs'] }];
// Every chunk the closure enters, emitted under its own file name (one module per chunk).
// (the dry run lists them; a chunk the closure stops entering, or a new one, stops generation).
export const CHUNKS = [
  'shared-123-1Hc1RTKl.js',
  'shared-26-B-POtn5S.js',
  'shared-33-DtdykY0y.js',
  'shared-92-BOgyxePb.js',
  'shared-183-B2N6Zy4J.js',
  'shared-frame-CJdE5Ria.js',
  'shared-3-IQTrO7Gx.js',
  'shared-153-DMw2VzSq.js',
  'c042dc97b-De6ZPyfn.js',
  'shared-9-BgdM6Y1f.js',
  'shared-36-fqRFYwOb.js',
  'shared-18-Cfqwgjc5.js',
  'shared-5-u8kha2eH.js',
  'c0e0087fe-qRckTYK0.js',
  'cff9648a4-G8f3hGry.js',
  'c1b2dcb06-Cb9ZmAdr.js',
  'ccc2ee5e6-DeK3Sd72.js',
  'ce716e031-BTBhe5Tj.js',
  'shared-25-D-aF0gt9.js',
  'c1f772aa0-njHQEMPb.js',
  'shared-120-DCdTP1_5.js',
  'frame-shell-header-BgKXZK73.js',
  'c63885269-Bcw6iQVr.js',
];
const target = file => file.replace(/\.js$/, '.mjs');
const rootModules = () => Object.entries(ROOTS).map(([file, roots]) => ({
  source: file, target: target(file), internal: Object.values(roots).some(r => r.export === null),
  exports: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.name])),
  features: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.features])),
}));
const modules = [...rootModules(), ...CHUNKS.filter(f => !Object.hasOwn(ROOTS, f)).map(file => ({ source: file, target: target(file), exports: {} }))];

// Pinned on the minified bytes (each exactly once): where the official app renders the roots.
const rawCallSites = [
  { source: PAGE, role: 'The library routes render vc: the main one with tabs, tab panel, banners, search and actions, the other through D=vc and ge',
    features: ['o(vc,{title:en,tabs:tn,tabPanel:nn,topBanner:rn,topBannerPlaceholder:an,onTopBannerShown:G,search:on,actions:sn,primaryAction:', 'D=vc,',
      'ge=e=>o(vc,{title:o(KT,{mode:a}),topBanner:'] },
  { source: THUMB, role: 'The thumbnail B (export r) and its export list', features: ['function B(e){let $=J9(31),{item:n,priority:r,markless:i}=e', 'export{F as a,z as i,U as n,j as o,B as r,G as t}'] },
  { source: VIEWER, role: 'The viewer header action bt, also the artifact switcher trigger', features: ['render:t(bt,{glyph:b,label:_,"data-testid":"frame-artifact-switcher-button"})'] },
];

const declarations = src => [...new Set([...src.top.values()].filter(entry => entry.kind !== 'import'))];
const rawText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
async function carries(src, entry, features) {
  try { assertFeatures('', await featureText(src, entry), features); return true; } catch { return false; }
}

// AST location of every root (unique declaration carrying its features, under the reviewed local, export alias as
// reviewed, raw declaration sha256 as pinned).
export async function locateRoots(cache = new Map()) {
  const found = [];
  for (const [file, roots] of Object.entries(ROOTS)) {
    const src = await readSource(file, cache, official.ionSource);
    for (const [local, spec] of Object.entries(roots)) {
      const hits = [];
      for (const entry of declarations(src)) if (rawText(src, entry).includes(spec.probe) && await carries(src, entry, spec.features)) hits.push(entry);
      if (hits.length !== 1) throw Error(`${file} ${local} (${spec.name}): ${hits.length} top-level declarations carry its features, expected 1`);
      const names = [...src.top].filter(([, entry]) => entry === hits[0]).map(([name]) => name);
      if (!names.includes(local)) throw Error(`${file}: the declaration carrying ${spec.name}'s features is ${names.join(', ')}, not ${local}`);
      const alias = [...src.exported].find(([, l]) => l === local)?.[0] ?? null;
      if (alias !== spec.export) throw Error(`${file}#${local}: export alias ${alias}, reviewed ${spec.export}`);
      const declarationSha256 = sha(rawText(src, hits[0]));
      const pin = ROOT_PINS[`${file}#${local}`];
      if (pin === undefined) throw Error(`${file}#${local}: no reviewed pin`);
      if (pin !== null && pin !== declarationSha256) throw Error(`${file}#${local}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
      found.push({ file, local, name: spec.name, export: alias, declarationSha256, pinned: pin !== null });
    }
  }
  return found;
}

// The page's own parts: each a declaration of its chunk carrying its features.
async function checkInner(cache) {
  const out = [];
  for (const [key, features] of Object.entries(INNER)) {
    const [file, local] = key.split('#');
    const src = await readSource(file, cache, official.ionSource);
    const entry = src.top.get(local);
    if (!entry || entry.kind === 'import') throw Error(`inner ${key} is not a declaration`);
    assertFeatures(`inner ${key}`, await featureText(src, entry), features);
    out.push({ key, sha256: sha(rawText(src, entry)) });
  }
  return out;
}

// Every adapted original: a declaration of its chunk carrying its features, its raw sha256 as pinned.
export async function pinAdapters(cache = new Map()) {
  const out = [];
  for (const [key, spec] of Object.entries(HOST_ADAPTERS)) {
    const [file, local] = key.split('#');
    const src = await readSource(file, cache, official.ionSource);
    const entry = src.top.get(local);
    if (!entry || entry.kind === 'import') throw Error(`adapter ${key} is not a declaration`);
    assertFeatures(`adapter ${key}`, await featureText(src, entry), spec.features);
    const declarationSha256 = sha(rawText(src, entry));
    const pin = ADAPTER_PINS[key];
    if (pin !== null && pin !== declarationSha256) throw Error(`adapter ${key}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
    out.push({ original: key, name: spec.name, hostAdapter: spec.from ?? ADAPTER_FILE, declarationSha256, pinned: pin !== null, difference: spec.why });
  }
  return out;
}

// The host adapter module answers exactly the adapted names: each re-exported from the host adapter that documents it,
// or (from: null) defined in the module itself.
async function assertAdapterModule() {
  const text = await fs.readFile(path.join(root, ADAPTER_FILE), 'utf8');
  const exported = new Map();
  for (const m of text.matchAll(/export \{([^}]*)\} from '\.\/([\w.-]+)';/g))
    for (const name of m[1].split(',').map(s => s.trim()).filter(Boolean)) exported.set(name, `src/${m[2]}`);
  for (const m of text.matchAll(/^export (?:function|const) (\w+)/gm)) exported.set(m[1], null);
  const wanted = new Map(Object.values(HOST_ADAPTERS).map(a => [a.name, a.from]));
  for (const [name, from] of wanted) if (!exported.has(name) || exported.get(name) !== from)
    throw Error(`${ADAPTER_FILE}: ${name} is not ${from ? `re-exported from ${from}` : 'defined here'}`);
  for (const name of exported.keys()) if (!wanted.has(name)) throw Error(`${ADAPTER_FILE}: ${name} is not an adapter of this graph`);
  for (const [name, from] of wanted) {
    if (!from) continue;
    const host = await fs.readFile(path.join(root, from), 'utf8');
    if (!new RegExp(`export (?:const|function|async function) ${name}\\b|export \\{[^}]*\\b${name}\\b[^}]*\\}`).test(host)) throw Error(`${from} does not export ${name}`);
  }
}

async function cdsCorePin() {
  const now = sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json')));
  if (now !== CDS_CORE_MANIFEST_SHA256)
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the artifact-library-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

export function artifactLibraryV4Config() {
  return {
    name: 'artifact library (4.16336.0)', generator: 'extract-artifact-library-v4.mjs', output: path.join(root, ARTIFACT_LIBRARY_V4_OUTPUT),
    adapterModule: '../../source-artifact-library-v4-adapters.jsx', adapterFile: ADAPTER_FILE, adapters: {},
    localAdapters: Object.fromEntries(Object.entries(HOST_ADAPTERS).map(([key, a]) => [key, { name: a.name, features: a.features }])),
    modules, rawCallSites, sharedGraph: 'cds-core', generatedRoot, sourceContract: official, linkedAreas: LINKED_AREAS,
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
    vendor: { [official.vendorFrame]: official.reactAliases },
  };
}
export const probeConfig = artifactLibraryV4Config;

export async function extractArtifactLibraryV4({ check = false, dryRun = false } = {}) {
  const cdsCore = await cdsCorePin();
  const cache = new Map();
  const roots = await locateRoots(cache);
  const inner = await checkInner(cache);
  const adapters = await pinAdapters(cache);
  await assertAdapterModule();
  const linked = {};
  for (const entry of LINKED_AREAS) {
    const area = typeof entry === 'string' ? entry : entry.area;
    linked[area] = sha(await fs.readFile(path.join(generatedRoot, area, 'manifest.json')));
  }
  const cfg = {
    ...artifactLibraryV4Config(),
    async artifacts(m) {
      for (const key of Object.keys(INNER)) {
        const [file, local] = key.split('#');
        if (!m.modules.some(mod => mod.source === file && mod.bindings.some(b => b.name === local))) throw Error(`inner ${key} is no longer reached`);
      }
      return {
        'index.mjs': `// Semantic names for the artifact library roots (${official.referenceVersion}); generated by extract-artifact-library-v4.mjs.\n`
          + Object.entries(ROOTS).map(([file, rs]) => `export { ${Object.values(rs).map(r => r.name).join(', ')} } from "./${target(file)}";`).join('\n') + '\n',
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-artifact-library-v4.mjs',
          previous: { generator: 'scripts/extract-artifact-library.mjs', output: 'src/generated/artifact-library', referenceVersion: official.previousVersion },
          sharedGraph: { area: 'cds-core', manifestSha256: cdsCore }, linkedAreas: linked,
          roots, inner, adapters,
          imports: m.modules.flatMap(mod => mod.imports.filter(i => i.kind !== 'generated').map(i => ({ module: mod.target, local: i.local, kind: i.kind, from: i.from, name: i.name, via: i.via }))),
        }, null, 2) + '\n',
      };
    },
  };
  return runSlicer(cfg, { check, dryRun });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--locate')) {
    const cache = new Map();
    for (const f of await locateRoots(cache)) console.log('root', `${f.file}#${f.local}`, f.declarationSha256, f.pinned ? 'pinned' : 'UNPINNED');
    for (const a of await pinAdapters(cache)) console.log('adapter', a.original, a.declarationSha256, a.pinned ? 'pinned' : 'UNPINNED');
  } else await extractArtifactLibraryV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
