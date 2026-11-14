// integration-1 preload-helper: the host's answer for the official Vite preload helper's assetsURL. Plain .mjs on purpose:
// the view-tabs preload helper (generated/view-tabs/preload-helper-D0dM6GpB.js) is imported directly by Node for tagErrorText
// (electron-isomorphic stores, model tests), and Node cannot load a .jsx host module.
//
// 3.6556.2 sheets that 4.16336.0 superseded with a sheet index.html already links (public/ui-provenance.json legacyDebt
// `replacedBy`; scripts/current-design-assets.mjs legacyRegionStylesheets), keyed by sheet name. The generated 3.6556.2
// regions still list the old names in their __vite__mapDeps; preloading one would either fail (packaged) or stack the
// 3.6556.2 rules over the 4.16336.0 entry sheets (dev server), so the preload helper is pointed at the linked
// replacement, which it then finds among the document's <link>s and does not load again. scripts/prepare-ui.mjs reads
// this table (packagedLoad) and fails if it disagrees with the legacy-sheet pins. Keep it a JSON object literal.
export const SUPERSEDED_LEGACY_SHEETS = Object.freeze({"shared-frame-CegduNQ2.css":"shared-frame-BRemtw6F.css","shared-styles-D_GJawPO.css":"shared-styles-C9nbzN1z.css","cd5136de8-DQmKjkcG.css":"shared-styles-C9nbzN1z.css"});

// Vite's assetsURL for the official preload helper (`a`, bound by scripts/extract-view-tabs.mjs). Official declaration
// (3.6556.2 preload-helper-D0dM6GpB.js; 4.16336.0 preload-helper-BBljBeZo.js carries the same):
//   a=function(e){return"/"+e}
// The official app serves its bundle from the origin root. This host loads dist/index.html with loadFile (file://,
// vite base './'), where "/assets/v1/<sheet>" is file:///assets/v1/<sheet>: the sheet fails, vite:preloadError rejects
// the first lazy import listing it, and a sheet index.html / CODE_TRANSCRIPT_SHEETS already links is never recognised
// (its link.href is file:///…/dist/assets/v1/<sheet>). Vite's assetsURL for a relative base resolves against the
// document, which yields exactly those hrefs under file:// and on the dev server. Without a document base (SSR tests
// with a stub document) the official value is returned unchanged, as before.
export function viteAssetUrl(dep) {
  const name = typeof dep === 'string' && dep.startsWith('assets/v1/') ? dep.slice('assets/v1/'.length) : null;
  const target = name !== null && Object.hasOwn(SUPERSEDED_LEGACY_SHEETS, name) ? 'assets/v1/' + SUPERSEDED_LEGACY_SHEETS[name] : dep;
  const base = typeof document !== 'undefined' ? document.baseURI : undefined;
  return typeof base === 'string' && base ? new URL(target, base).href : '/' + target;
}
