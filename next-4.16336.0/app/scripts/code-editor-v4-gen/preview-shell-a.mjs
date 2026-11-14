// Area "preview-shell-a", 4.16336.0 contract (round 2 unit code-editor:d): Preview address field, navigation row, menu
// item renderer, split dev-server menu, URL copy, tab strip pieces and dev server log tint. Same adapter file names as the
// 3.6556.2 area (scripts/code-editor-gen/preview-shell-a.mjs).
//
// Roots are located on the official AST (common.mjs locatePinned: the one top-level declaration carrying the probe or
// matching the pattern, with its export alias) and their raw declaration sha256 is pinned below; the emitted code is the
// official closure of the roots (preview-shell-common.mjs part(): preview-graph.mjs sliceLinked with React, cds-core,
// the linked graphs and sibling adapters imported, everything else copied per chunk). Nothing is renamed or rewritten.
//
// 4.16336.0 vs 3.6556.2: the 3.6556.2 adapters were factories taking host Button/Tooltip/Menu/Spinner/intl/stores,
// because CDS was not sliced then. In 4.16336.0 the CDS primitives, intl context, owner-window and event-callback hooks
// are cds-core's (sharedGraph 'cds-core'), so every adapter exports the official component or hook itself:
//   preview-address-field  cf550b864-BHVEoOWt T / w (3.6556.2 cf550b864-hZr1-4Cn pe / C), display URL cf790d7f8 x
//                          (3.6556.2 c224804cc Y; c224804cc no longer exists).
//   preview-navigation     ce4a0ab47-DBiD0syd P (3.6556.2 c224804cc P) over the pane header line cd5e3435c o (s) and its
//                          panels context shared-120 Je (3.6556.2 shared-15 bn); the tooltip context is the address
//                          field's (sibling link).
//   preview-menu-items     cfca6870a-CdqZXIck y (3.6556.2 cfca6870a S): the item renderer factory y(container, intl, onClose,
//                          rtl); menu collision padding links code-composer-v4 (region plan), the side helper is shared-33.
//   preview-server-menu    cf580efe9-CkBqyp3f qi / Hi / zi (3.6556.2 cf580efe9 mi / li / labels): the item renderer is
//                          preview-menu-items.mjs (sibling link).
//   preview-copy-url       c23ea5d22-BM7J8mDe V and gate z (3.6556.2 cf580efe9 Ba / Ra); the GrowthBook context it reads is
//                          code-current-v4's (D1 link).
//   preview-tab-strip      c30602caf-DIztNgWD G / W (3.6556.2 cf580efe9 Oa's mapping and Ca), cf580efe9 no / ro (wa / Ta),
//                          c46fc892f e (c224804cc G), ccf0f6a0b r (c224804cc K, over cowork-live-v4's c25e47851 a and the
//                          cds-core useViewTabIconSize), c155b6b71 l / _ / E (l / _ / x), c62dc633f t (t). The 3.6556.2
//                          stop-server close confirmation (cf580efe9 va) is gone from 4.16336.0: no adapter.
//   preview-log-lines      cf580efe9 qo / Yo over Ko (3.6556.2 _o / vo over go).
import { ion, part, member, emitAdapter, pins, header } from './preview-shell-common.mjs';

const area = 'preview-shell-a';
const ADDRESS = 'cf550b864-BHVEoOWt.js', DISPLAY = 'cf790d7f8-C-RpKvlh.js', NAV = 'ce4a0ab47-DBiD0syd.js', ITEMS = 'cfca6870a-CdqZXIck.js';
const PANEL = 'cf580efe9-CkBqyp3f.js', COPY = 'c23ea5d22-BM7J8mDe.js', TABS = 'c30602caf-DIztNgWD.js', CAP = 'c46fc892f-EskhKjW8.js';
const TAB_ORIGIN = 'c155b6b71-CtScXPSD.js', TAB_LABELS = 'c62dc633f-HFV5-6LR.js', TAB_FAVICON = 'ccf0f6a0b-D3sbUGkE.js';

export const rootPins = {
  [ADDRESS]: {
    PreviewAddressField: { probe: '"group/field relative h-full min-w-0 flex-1', alias: 'c', sha256: '20fadde60c8322c4e36f6460f3f31e6b991dde7fcfe79a559daa9c95aba7ab1b', previous: 'cf550b864-hZr1-4Cn pe' },
    PreviewAddressTooltipProvider: { pattern: /^[\w$]{1,3}=[\w$]{1,3}\.Provider$/, alias: 'l', sha256: 'e371313a53882aee1f877d3c041548943c5349bce3f075f0d257a14700c510f0', previous: 'cf550b864-hZr1-4Cn C' },
  },
  [DISPLAY]: {
    displayPreviewURL: { probe: 'let t=e.replace(/^https?:\\/\\//,"");if(t===e)return e;', alias: 'h', sha256: 'fb7d06dc7c163703d5d9d621eac6142870a6e0974017ef760876cb992538451c', previous: 'c224804cc-Ct9XIdre Y' },
  },
  [NAV]: {
    PreviewNavigation: { probe: 'extraTool:', alias: 'a', features: ['"aria-label":'], sha256: 'bc214855cb1f45b96edd8a3323f8ffc5f095e368b0279ae2c526dd2ec40e4716', previous: 'c224804cc-Ct9XIdre P' },
  },
  [ITEMS]: {
    previewMenuItemRenderer: { probe: '"press right arrow to activate"', alias: 'i', features: ['"press left arrow to activate"'], sha256: '032e2479e872f4ffb6e8490957f7bca0c3a9359da4777496c98f49f0a369c55e', previous: 'cfca6870a-Dn2eYjs8 S' },
  },
  [PANEL]: {
    PreviewServerMenu: { probe: 'onStopAll:c,onAddServer:l,loading:u,disabled:d', alias: null, sha256: 'e55f7faeb9f334c611369255133241674bc84b3100d1a9600bd05c5cebc03724', previous: 'cf580efe9-BFcQCjF9 mi' },
    usePreviewServerSections: { probe: 'key:"add-server"', alias: null, features: ['icon:e.running?"StopFilled":"Play"', 'className:"min-w-8 shrink-0"'], sha256: 'fb497e46af16e41994561d55059ae1be57d1c4e6064cf6f7ae4d2d7de3902d5e', previous: 'cf580efe9-BFcQCjF9 li' },
    previewServerMenuLabels: { probe: 'empty:"No dev server configured"', alias: null, sha256: '15af28d26228417856fff63e36bf9f80ae4020a2c7a12c53fb7832cf17a90eb5', previous: 'cf580efe9-BFcQCjF9 (labels in li)' },
    isWebOrigin: { probe: '{protocol:t}=new URL(e);return t==="http:"||t==="https:"', alias: null, sha256: '4f5926477ed8e9fe083f826a9e81bba6f87bdc535326f6f56c4b656283fb2006', previous: 'cf580efe9-BFcQCjF9 wa' },
    PreviewTabOpenInBrowserItem: { probe: 'onOpenInBrowser:i}=e', alias: null, sha256: 'ef17ac5b09a7db2ed46e92f0bc5fa0ea9b8f03d82240c421593d452eb37296c8', previous: 'cf580efe9-BFcQCjF9 Ta' },
    devServerLogTone: { probe: 'n.includes("ERR!")', alias: null, sha256: '832f8d9610330206a17b9361f51ae904ca88d7d17bdfc7e2a4c3314cbd59ab1c', previous: 'cf580efe9-BFcQCjF9 _o' },
    devServerLogToneClasses: { probe: 'warn:"text-warning"', alias: null, sha256: '6f374ad586475d63cf8e83a7c29cac467c197cf1291c13a0e766dcedac179371', previous: 'cf580efe9-BFcQCjF9 vo' },
  },
  [COPY]: {
    usePreviewCopyUrl: { probe: '"This only works for websites."', alias: 'n', sha256: '280d63e8c5fc6bfd29a3ec0b2e9b45b8c782ac665590a418ba1358d620413776', previous: 'cf580efe9-BFcQCjF9 Ba' },
    previewCopyUrlGate: { probe: '__gb__110515556', alias: null, sha256: '9e4829d013a09e518fa6ae22ead0d0e6b32dde501e046266d768273c5deae9ed', previous: 'cf580efe9-BFcQCjF9 Ra' },
  },
  [TABS]: {
    previewTabItems: { probe: 'closable:!1}]', alias: 't', features: ['detail:t.origin', 'closable:!0'], sha256: 'abfd8d0e5df72cdf1908635797e663467d5c451e5cf585d350780a4b8cd17e77', previous: 'cf580efe9-BFcQCjF9 Oa (tab mapping)' },
    previewTabLabel: { probe: 'if(t&&f(e))return t', alias: null, sha256: 'cc1487c9f1c106a52700c8a28d756041223a792ed3faff7d5e977f38af23c7fc', previous: 'cf580efe9-BFcQCjF9 Ca' },
  },
  [CAP]: { previewTabsAtCap: { pattern: /^function e\(e\)\{return e>8\}$/, alias: 't', sha256: '6bfad4af6d6a0c993a16a6544f81028b54cef07897e29a2465a12269ac2835e0', previous: 'c224804cc-Ct9XIdre G' } },
  [TAB_ORIGIN]: {
    previewSeedTabId: { pattern: /^l="seed"$/, alias: 't', sha256: 'c185f24a014c5cdb65032f9d42841339cac9eb93a9f28a80a923de2892f81e62', previous: 'c155b6b71-66pw54FW l' },
    isLocalOrigin: { probe: 'URL.parse(e)?.hostname', alias: 'o', sha256: 'eb28e66edbc18eda264e3d41dbdf448b4c855238407a52c50c14056790f37547', previous: 'c155b6b71-66pw54FW _' },
    originLabel: { probe: 'decodeURIComponent(n[n.length-1]??e)', alias: 'l', sha256: 'e50543a1fe914e4b59b1b0d7086141824f2ba6eade7cd30de69e7c090f8f549f', previous: 'c155b6b71-66pw54FW x' },
  },
  [TAB_LABELS]: {
    usePreviewTabStripLabels: { probe: 'Tab limit reached. Close a tab to open a new one.', alias: 't', sha256: '03d91a8c27b55746010d9e1b751475d08a7f3b881594c4120ec6b8dbc69476fe', previous: 'c62dc633f-DX11ZrnB t' },
  },
};

// Sibling links (chunk:alias -> adapter export); features pin the declaration the import stands for.
const tooltipProvider = { 'cf550b864-BHVEoOWt.js:l': { module: './preview-address-field.mjs', name: 'PreviewAddressTooltipProvider', features: ['.Provider'] } };
const itemRenderer = { 'cfca6870a-CdqZXIck.js:i': { module: './preview-menu-items.mjs', name: 'previewMenuItemRenderer', features: ['"press right arrow to activate"'] } };

export async function emit(ctx) {
  const r = {};
  for (const [file, table] of Object.entries(rootPins)) Object.assign(r, pins(ctx, file, table));
  const local = name => r[name].local;
  const pick = (...names) => Object.fromEntries(names.map(n => [n, r[n]]));

  // ---- address field + display URL
  {
    const field = await part(ADDRESS, [local('PreviewAddressField'), local('PreviewAddressTooltipProvider')]);
    const display = await part(DISPLAY, [local('displayPreviewURL')], { scoped: true });
    await emitAdapter(ctx, 'preview-address-field.mjs', {
      header: header(area, `Preview address field (${ADDRESS} T), its tooltip context provider (w) and display URL (${DISPLAY} x)`),
      parts: [field, display],
      exports: { PreviewAddressField: local('PreviewAddressField'), PreviewAddressTooltipProvider: local('PreviewAddressTooltipProvider'), displayPreviewURL: member(display, DISPLAY, local('displayPreviewURL')) },
      roots: pick('PreviewAddressField', 'PreviewAddressTooltipProvider', 'displayPreviewURL'), previous: 'cf550b864-hZr1-4Cn.js',
    });
  }
  // ---- navigation row (pane header line, panels context)
  {
    const nav = await part(NAV, [local('PreviewNavigation')], { hosts: tooltipProvider });
    if (!nav.text.includes('N="hidden @[320px]:inline-flex"') || !nav.text.includes('"data-pane-header-line":""')) throw Error(`${NAV}: navigation row features changed`);
    await emitAdapter(ctx, 'preview-navigation.mjs', {
      header: header(area, `Preview navigation row (${NAV} P) and pane header line (cd5e3435c o)`),
      parts: [nav], exports: { PreviewNavigation: local('PreviewNavigation') }, roots: pick('PreviewNavigation'), previous: 'c224804cc-Ct9XIdre.js',
    });
  }
  // ---- menu item renderer
  {
    const items = await part(ITEMS, [local('previewMenuItemRenderer')]);
    await emitAdapter(ctx, 'preview-menu-items.mjs', {
      header: header(area, `menu item renderer (${ITEMS} y): submenus, searchable popups, tooltips, loading and trailing actions`),
      parts: [items], exports: { previewMenuItemRenderer: local('previewMenuItemRenderer') }, roots: pick('previewMenuItemRenderer'), previous: 'cfca6870a-Dn2eYjs8.js',
    });
  }
  // ---- split dev-server menu
  {
    const servers = await part(PANEL, [local('PreviewServerMenu'), local('usePreviewServerSections'), local('previewServerMenuLabels')], { hosts: itemRenderer });
    await emitAdapter(ctx, 'preview-server-menu.mjs', {
      header: header(area, `dev-server menu (${PANEL} qi), its section builder (Hi) and labels (zi)`),
      parts: [servers],
      exports: { PreviewServerMenu: local('PreviewServerMenu'), usePreviewServerSections: local('usePreviewServerSections'), previewServerMenuLabels: local('previewServerMenuLabels') },
      roots: pick('PreviewServerMenu', 'usePreviewServerSections', 'previewServerMenuLabels'), previous: 'cf580efe9-BFcQCjF9.js',
    });
  }
  // ---- URL copy hook (GrowthBook gate __gb__110515556)
  {
    const copy = await part(COPY, [local('usePreviewCopyUrl'), local('previewCopyUrlGate')]);
    if (!copy.text.includes('"preview_copy_url_failed"')) throw Error(`${COPY}: copy failure event changed`);
    await emitAdapter(ctx, 'preview-copy-url.mjs', {
      header: header(area, `Preview URL copy hook (${COPY} V) and its GrowthBook gate (z)`),
      parts: [copy], exports: { usePreviewCopyUrl: local('usePreviewCopyUrl'), previewCopyUrlGate: local('previewCopyUrlGate') },
      roots: pick('usePreviewCopyUrl', 'previewCopyUrlGate'), previous: 'cf580efe9-BFcQCjF9.js',
    });
  }
  // ---- tab strip pieces
  {
    const tabs = await part(TABS, [local('previewTabItems'), local('previewTabLabel')]);
    const iconImport = ctx.chunk(TABS, ion).imports.get('x');
    if (iconImport?.from !== TAB_FAVICON) throw Error(`${TABS}: the tab icon is no longer ${TAB_FAVICON}`);
    const faviconLocal = ctx.exportedLocal(TAB_FAVICON, ion, iconImport.imported);
    const panel = await part(PANEL, [local('isWebOrigin'), local('PreviewTabOpenInBrowserItem')], { scoped: true });
    const cap = await part(CAP, [local('previewTabsAtCap')], { scoped: true });
    const origin = await part(TAB_ORIGIN, [local('previewSeedTabId'), local('isLocalOrigin'), local('originLabel')], { scoped: true });
    const labels = await part(TAB_LABELS, [local('usePreviewTabStripLabels')], { scoped: true });
    await emitAdapter(ctx, 'preview-tab-strip.mjs', {
      header: header(area, `Preview tab strip pieces around ViewTabBar: tab items (${TABS} G / W), web-origin test and open-in-browser item (${PANEL} no / ro), cap (${CAP} e), favicon (${TAB_FAVICON} r), origin helpers (${TAB_ORIGIN} l / _ / E) and labels (${TAB_LABELS} t)`),
      parts: [tabs, panel, cap, origin, labels],
      exports: {
        previewTabItems: local('previewTabItems'), previewTabLabel: local('previewTabLabel'), PreviewTabFavicon: member(tabs, TAB_FAVICON, faviconLocal),
        isWebOrigin: member(panel, PANEL, local('isWebOrigin')), PreviewTabOpenInBrowserItem: member(panel, PANEL, local('PreviewTabOpenInBrowserItem')),
        previewTabsAtCap: member(cap, CAP, local('previewTabsAtCap')), previewSeedTabId: member(origin, TAB_ORIGIN, local('previewSeedTabId')),
        isLocalOrigin: member(origin, TAB_ORIGIN, local('isLocalOrigin')), originLabel: member(origin, TAB_ORIGIN, local('originLabel')),
        usePreviewTabStripLabels: member(labels, TAB_LABELS, local('usePreviewTabStripLabels')),
      },
      roots: { ...pick('previewTabItems', 'previewTabLabel', 'isWebOrigin', 'PreviewTabOpenInBrowserItem', 'previewTabsAtCap', 'previewSeedTabId', 'isLocalOrigin', 'originLabel', 'usePreviewTabStripLabels'),
        PreviewTabFavicon: { file: TAB_FAVICON, local: faviconLocal, via: 'previewTabItems import x', previous: 'c224804cc-Ct9XIdre K' } },
      previous: 'cf580efe9-BFcQCjF9.js',
    });
  }
  // ---- dev server log tint
  {
    const logs = await part(PANEL, [local('devServerLogTone'), local('devServerLogToneClasses')]);
    if (!logs.text.includes('"FOUND 0 ERRORS. WATCHING FOR FILE CHANGES."')) throw Error(`${PANEL}: tsc banner changed`);
    await emitAdapter(ctx, 'preview-log-lines.mjs', {
      header: header(area, `dev server log line tint (${PANEL} qo over Ko) and its classes (Yo)`),
      parts: [logs], exports: { devServerLogTone: local('devServerLogTone'), devServerLogToneClasses: local('devServerLogToneClasses') },
      roots: pick('devServerLogTone', 'devServerLogToneClasses'), previous: 'cf580efe9-BFcQCjF9.js',
    });
  }
}
