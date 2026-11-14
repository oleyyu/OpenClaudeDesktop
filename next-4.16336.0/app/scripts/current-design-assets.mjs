// Pinned local snapshot. CSS, referenced fonts, the icon map and the icon font move together (styles-audit §7 step 2).
// 4.16336.0: the official ion-dist/index.html links three entry sheets, in this order; every other sheet is a component
// sheet the official app loads with its owning module (vite __vite__mapDeps), never from index.html.
export const designVersion = '4.16336.0';
export const designSnapshot = 'snapshots/claude-4.16336.0-20261104';
export const designIconModule = 'shared-frame-CJdE5Ria.js';
// Anthropicons-Variable, declared by both shared-frame-BRemtw6F.css and c6a992d55-_JRfOmTh.css and preloaded by the
// official index.html after the two text faces.
export const designIconFont = 'c0f671921-DhLyA8zC.woff2';
export const designPreloadFonts = Object.freeze(['cc27851ad-DDVos-BJ.woff2', 'c66fc489e-2VcCjn5t.woff2', designIconFont]);
export const designEntryStylesheets = Object.freeze([
  'shared-frame-BRemtw6F.css',
  'shared-styles-C9nbzN1z.css',
  'c6a992d55-_JRfOmTh.css',
]);
// Component sheets named by the migration brief, with the official modules whose __vite__mapDeps load them. They are
// not linked from index.html; they ship only once a host consumer loads them (none does yet: the ckv viewer is not in
// the host, and the 3.6556.2 regions that use epitaxy still need their own version, below).
export const designComponentStylesheets = Object.freeze({
  'c8e31bf58-C7gq8dUF.css': Object.freeze({ owners: Object.freeze(['ca2ef848d-DA54buzo.js']), role: 'ckv viewer' }),
  'c3fde7009-Dl-p803_.css': Object.freeze({ owners: Object.freeze(['c10f0af0c-C9pD769f.js', 'c57eefbba-C9AT53Bo.js', 'c5f242ca9-DkyIR3lB.js',
    'c812301a9-DedB3mNd.js', 'c96d752d0-D9VB6ArX.js', 'cc43287c9-dzfX-J5i.js', 'cd2efac6e-B38TGyig.js', 'cd377abb5-C6rYA6dk.js',
    'index-DN24_FmB.js', 'shared-23-BRmsPtuN.js', 'shared-31-C9BqSSuD.js']), role: 'epitaxy documents' }),
});
// The complete target set (entry + component) the style-compatibility layer and class checks compare against.
export const designStylesheets = Object.freeze([...designEntryStylesheets, ...Object.keys(designComponentStylesheets)]);

// Legacy-region dependencies (migration debt, not 4.16336.0 parity). Generated regions still on 3.6556.2 name these
// 3.6556.2 sheets (their __vite__mapDeps lists, or a host link for the region); 4.16336.0 replaced or dropped them. They
// are copied byte-for-byte from the 3.6556.2 snapshot (only /assets/v1/ URLs made relative), recorded in
// public/ui-provenance.json with legacyRegion / referenceVersion 3.6556.2, and go away when the listed regions migrate.
// prepare-ui.mjs fails if the regions that actually name a sheet differ from `regions`, or if one of them is not on
// 3.6556.2. `global`: also linked from index.html because a bundled host consumer renders its classes without loading it.
// `globalRegions` (required with `global`): the generated regions whose classes that host consumer renders — they hold
// the global link even when their own code never names the sheet. prepare-ui.mjs fails once one of them is no longer on
// 3.6556.2, so migrating it forces the global link (and this entry) to be revisited instead of silently outliving it.
export const designLegacyVersion = '3.6556.2';
export const designLegacySnapshot = 'snapshots/claude-3.6556.2-20261025-192807';
export const legacyRegionStylesheets = Object.freeze({
  'shared-frame-CegduNQ2.css': Object.freeze({ replacedBy: 'shared-frame-BRemtw6F.css',
    regions: Object.freeze(['code-transcript', 'mcp-app-card', 'transcript-rows']) }),
  'shared-styles-D_GJawPO.css': Object.freeze({ replacedBy: 'shared-styles-C9nbzN1z.css',
    regions: Object.freeze(['code-transcript', 'mcp-app-card', 'transcript-rows']) }),
  'c19e90103-CuNz46ca.css': Object.freeze({ replacedBy: 'c19e90103-CUD1JNzE.css',
    regions: Object.freeze(['code-transcript', 'mcp-app-card', 'transcript-rows']),
    hostLinks: Object.freeze(['src/source-code-transcript.jsx CODE_TRANSCRIPT_SHEETS (code-transcript renderer)']) }),
  'cd5136de8-DQmKjkcG.css': Object.freeze({ replacedBy: 'shared-styles-C9nbzN1z.css (chat-image-preview rules)',
    regions: Object.freeze(['code-transcript', 'mcp-app-card']) }),
  'c3fde7009-BszyXGym.css': Object.freeze({ replacedBy: 'c3fde7009-Dl-p803_.css',
    regions: Object.freeze(['code-transcript', 'mcp-app-card']),
    globalRegions: Object.freeze(['code-current', 'code-transcript']),
    global: Object.freeze(['src/source-file-viewer.jsx (generated/code-current csv-view, document-frame: epitaxy-document-*)',
      'src/source-code-transcript.jsx (generated/code-transcript c19e90103-BQFzF8EA: epitaxy-document-anchor/alert/table/zoomable/image-chip)']) }),
});
export const legacyGlobalStylesheets = Object.freeze(Object.keys(legacyRegionStylesheets).filter(name => legacyRegionStylesheets[name].global));
