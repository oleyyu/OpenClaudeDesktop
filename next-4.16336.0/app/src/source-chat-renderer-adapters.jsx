// Host adapters for src/generated/chat-renderer (scripts/extract-chat-renderer.mjs; the generator checks each original
// declaration's features before it points the slice here). The renderer is 3.6556.2 c89efce1a rc (StandardMarkdown)
// behind cc1aae219 OR, the Chat answer renderer. OpenClaude Desktop has no claude.ai account, no Statsig / GrowthBook, no
// datadog (plan-w13 E59): the telemetry and analytics hooks answer nothing, the favicon is the original's own fallback,
// and links / images open in the browser through the host's "external" call.
import React from 'react';
import { CdsIcon } from './generated/view-tabs/shared-frame-6jtSkIit.js';

// vendor-intl q / Gt (react-intl useIntl / FormattedMessage): the local catalog, the adapter routines-shared answers
// them with (D1: one adapter per original binding).
export { useIntl, FormattedMessage } from './source-routines-shared-adapters.jsx';

// shared-frame ua (cdsOpenWindow, `i.open(t, n, r)` on the anchor's owner window): OpenClaude Desktop's windows deny
// window.open (electron/main.cjs setWindowOpenHandler), so the URL goes to the opener the Chat transcript registers (its
// "external" call: the system browser). c82d645d5 J calls it for a confirmed or modified-click link, c89efce1a sc for a
// confirmed image. True when the opener took it, as the original reports an opened window.
const linkOpeners = new Set();
export function registerChatLinkOpener(open) {
  if (typeof open !== 'function') return () => {};
  linkOpeners.add(open);
  return () => { linkOpeners.delete(open); };
}
export function openChatLinkWindow(anchor, url, target = '_blank', features = 'noopener') {
  const open = [...linkOpeners].at(-1);
  if (!open || typeof url !== 'string' || url === '') return false;
  try { open(url, { target, features }); return true; } catch { return false; }
}

// c851b27a8 qr: the KaTeX chunks the latex loader (Jr) waits for, `[[katex namespace, rehype-katex, remark-math], css]`.
// katex is the npm module (the generator asserts it is the 0.16.47 the official chunk inlines), set into `katexApi`
// before ca129fbf3 evaluates (its top level reads `_.version`); rehype-katex / remark-math are this graph's own slices of
// ca129fbf3 / c6369e48b; the stylesheet is the npm katex.min.css (the same rules as cf1a02a1a-Bzv8x2Cs.css, whose
// /assets/v1 font URLs this renderer does not serve; its @font-face fonts ship in katex/dist/fonts, served as 'self').
// The second promise never rejects, and once the stylesheet settled (loaded or failed) it runs the original's
// `.then(Hr)`: c851b27a8 Hr (markLatexStylesheetSettled) sets Rr and calls Vr, which starts document.fonts.load for
// the KaTeX faces, so Wr holds the plugins until they load (Ur, at most Ir = 500 ms) when the math is on screen (Gr).
// The failure record `_r` only feeds the o11y report, which answers nothing here (reportO11yError).
export let katexApi = null;
let katexStylesheet = null;
function settleKatexStylesheet() {
  return import('./generated/chat-renderer/c851b27a8-BxvTOAx3.mjs').then((loader) => { loader.markLatexStylesheetSettled(); });
}
export function loadLatexPluginChunks() {
  const plugins = import('katex').then(async (module) => {
    katexApi = module.default;
    const [rehype, remark] = await Promise.all([
      import('./generated/chat-renderer/ca129fbf3-CdfQB5sF.mjs'),
      import('./generated/chat-renderer/c6369e48b-Cz3VPKCm.mjs'),
    ]);
    return [{ default: module.default }, rehype, remark];
  });
  katexStylesheet ??= import('katex/dist/katex.min.css').catch(() => undefined).then(settleKatexStylesheet);
  return Promise.all([plugins, katexStylesheet]);
}

// shared-0 iO (the o11y error report: `I(cO, F.O11Y_INTERNALS)`) and B (datadog's action: `I(Nv, F.O11Y_INTERNALS)`):
// nothing is reported here.
export function reportO11yError() {}
export function trackAction() {}

// shared-10 dd: the formatter telemetry hook (KaTeX phase, first frame, waiting counts); rc ignores its result.
export function useFormatterTelemetry() {}

// shared-52 wT: the analytics client (`return Ly`, segment's track / page / identify / alias); nothing is sent.
const NO_ANALYTICS = Object.freeze({ track() {}, page() {}, identify() {}, alias() {} });
export function analyticsClient() { return NO_ANALYTICS; }

// shared-4 HC: a citation directive's attributes, `{ citationUuids: VC.parse(e).citations.split(",") }` with VC the zod
// object `{ citations: string }`, else `{ citationUuids: [] }`.
export function parseCitationAttributes(attributes) {
  const citations = attributes !== null && typeof attributes === 'object' ? attributes.citations : undefined;
  return typeof citations === 'string' ? { citationUuids: citations.split(',') } : { citationUuids: [] };
}

// shared-78 WF: a source's favicon. The original fetches `https://www.google.com/s2/favicons?domain=…` (after loading
// the public suffix list); this renderer's CSP allows no remote image, so it draws WF's own fallback:
// `r || g(oe, { name: "Globe", customSize: l + 2, className: "text-[color:var(--muted-as-secondary,var(--cds-text-muted))]" })`
// with l = size ?? 12.
export function ChatSourceFavicon({ size = 12, fallbackSvg }) {
  return fallbackSvg || <CdsIcon name="Globe" customSize={size + 2} className="text-[color:var(--muted-as-secondary,var(--cds-text-muted))]" />;
}

// vendor-markdown T: decode-named-character-reference's DOM build (micromark's named entity decoder), which creates its
// `<i>` at module load. The npm package is that same function (its browser export is the DOM build, its node export the
// entity table), so the renderer also loads where there is no document (the SSR tests, the Code transcript's tests).
export { decodeNamedCharacterReference } from 'decode-named-character-reference';
