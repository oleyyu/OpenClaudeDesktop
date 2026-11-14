// Quick Entry's page: the official quick-window.html, reassembled from its slices (generated/quick-window-official.cjs,
// scripts/extract-quick-window.mjs) with the host's bindings and additions around them.
//
// Official, byte for byte: the <html> / <body> tags, the inline style sheet, the body markup (starburst logo + prompt
// textarea), the font sheet (its four url()s point at the copies in dist/assets/v1), the theme statement and the load
// handler (placeholder, skooch after 750 ms of typing, click outside → dismiss, Enter → submit, Escape → dismiss).
//
// Host, hand-written (HOST_STYLE / HOST_SCRIPT): the target button ("New Chat ⌄") and the send button. The official
// app draws those in its macOS-native bar (SwiftUI in @ant/claude-swift's swift_addon.node), for which no page or
// source exists; they are rebuilt here from a screenshot of that bar (760 × 64 pt, 17 pt corners, 26 pt spark, 16 pt
// prompt, 13 pt target label, 32 pt send button) and from its strings (generated nativeStrings). The dark colours of
// the bar are the official page's own (.darkTheme .container); the native bar's dark appearance was not measured.
const official = require("../generated/quick-window-official.cjs");

const WIDTH = 760, HEIGHT = 470;

// The names the official spans use without declaring (manifest freeNames).
const HOST_BINDINGS = String.raw`
const zf = globalThis["claude.internal.ui"]?.QuickWindow;
const $u = globalThis["claude.hybrid"]?.DesktopIntl;
const ed = ($u?.getInitialLocale?.() ?? Promise.reject(Error("DesktopIntl bridge is not exposed in this window")))
  .then(({ locale, messages }) => ({ locale, messages }))
  .catch((error) => (console.error("getInitialLocale failed", error), { locale: "en-US", messages: {} }));
const Vf = null;
const ku = ({ locale, messages }) => ({ locale, formatMessage: ({ id, defaultMessage }) => (messages && typeof messages[id] === "string" ? messages[id] : defaultMessage) });
const Mf = (target, type) => ({ pipe: (operator) => ({ subscribe: (next) => operator(target, type, next) }) });
const Bf = (ms) => (target, type, next) => { let timer; target.addEventListener(type, (event) => { clearTimeout(timer); timer = setTimeout(() => next(event), ms); }); };
`;

const HOST_STYLE = String.raw`
html, body { overflow: hidden; }
/* The official sheet's Tailwind .container caps the width at each breakpoint (40rem from 640px); the bar fills its window. */
.container { max-width: none; min-height: 64px; border-radius: 17px; background: linear-gradient(#ffffff, #f0f0f0); }
.container:before { border-radius: 17.5px; }
.darkTheme .container { background: linear-gradient(#403f3ef2, #292523); }
.app-logo { flex: none; width: 58px; height: 64px; }
.app-logo svg { width: 26px; height: 26px; }
.input-box { min-height: 64px; min-width: 0; }
/* Measured against the native bar: the official page's own 16px / 400 prompt, starting 58pt from the left edge and
   sitting 2pt above the bar's centre line. */
.input-box textarea { margin: 0 6px 4px -9px; }
.input-box textarea::placeholder { color: #7b7b7b; }
.qe-target, .qe-send { -webkit-app-region: no-drag; flex: none; appearance: none; border: 0; margin: 0; padding: 0; font-family: var(--font-anthropic-sans); cursor: default; }
.qe-target { display: flex; align-items: center; gap: 7px; height: 32px; margin: 16px 12px 0 0; padding: 1px 8px 0; max-width: 220px;
  border-radius: 8px; background: transparent; color: #7b7b7b; font-size: 13px; line-height: 20px; font-weight: 400; }
.qe-target:hover, .qe-target[aria-expanded="true"] { background: rgba(0, 0, 0, 0.05); }
.qe-target:focus-visible, .qe-send:focus-visible { outline: 2px solid rgba(217, 119, 87, 0.6); outline-offset: 2px; }
.qe-target-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.qe-target svg { flex: none; width: 8px; height: 4.5px; }
.darkTheme .qe-target { color: var(--claude-text-500); }
.darkTheme .qe-target:hover, .darkTheme .qe-target[aria-expanded="true"] { background: rgba(255, 255, 255, 0.08); }
.qe-send { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; margin: 16px 18px 0 0; border-radius: 6px;
  background: linear-gradient(#df8a65, #d97757 55%, #d56d50); color: #fff; box-shadow: inset 0 0 0 0.5px rgba(0, 0, 0, 0.08); }
.qe-send:active { filter: brightness(0.94); }
.qe-send svg { width: 32px; height: 32px; }
`;

const HOST_SCRIPT = String.raw`
(() => {
  const host = globalThis.quickEntryHost;
  const container = document.querySelector(".container"), input = document.getElementById("prompt-input");
  const svg = (markup) => { const holder = document.createElement("span"); holder.innerHTML = markup; return holder.firstElementChild; };
  const target = document.createElement("button");
  target.type = "button"; target.className = "qe-target"; target.id = "qe-target"; target.setAttribute("aria-haspopup", "menu"); target.setAttribute("aria-expanded", "false");
  const label = document.createElement("span");
  label.className = "qe-target-label";
  target.append(label, svg('<svg viewBox="0 0 8 4.5" fill="none" aria-hidden="true"><path d="M0.75 0.75L4 3.75 7.25 0.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'));
  const send = document.createElement("button");
  send.type = "button"; send.className = "qe-send"; send.id = "qe-send";
  send.append(svg('<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 21.7V11M11.6 15.3L16 10.9l4.4 4.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'));
  container.append(target, send);

  let state = null, placeholderForNewChat = null;
  const render = (next) => {
    if (!next || typeof next !== "object") return;
    state = next;
    const chat = next.target;
    label.textContent = chat ? chat.chatName : next.labels.newChat;
    target.title = chat ? chat.chatName : "";
    send.setAttribute("aria-label", next.labels.send);
    // The official load handler owns the new-chat placeholder (S3MXlbjkax); an existing chat shows the native bar's own.
    if (chat) { if (placeholderForNewChat === null) placeholderForNewChat = input.placeholder; input.placeholder = next.labels.existingChatPlaceholder; }
    else if (placeholderForNewChat !== null) { input.placeholder = placeholderForNewChat; placeholderForNewChat = null; }
  };
  host?.getState?.().then(render, () => {});
  host?.onState?.(render);
  $u?.onLocaleChanged?.(() => { placeholderForNewChat = null; host?.getState?.().then(render, () => {}); });

  target.addEventListener("click", () => {
    const box = target.getBoundingClientRect();
    target.setAttribute("aria-expanded", "true");
    Promise.resolve(host?.openTargetMenu?.({ x: Math.round(box.left), y: Math.round(box.bottom + 6) }))
      .catch(() => {}).then(() => { target.setAttribute("aria-expanded", "false"); input.focus(); });
  });
  // The send button is the Enter key of the official handler: requestDismiss(text), then an empty field.
  send.addEventListener("click", () => { zf?.requestDismiss?.(input.value); input.value = ""; input.focus(); });
})();
`;

/**
 * The page's HTML. `fontBase` is the URL (with a trailing slash) of the folder that holds the app's copies of the
 * official fonts (dist/assets/v1).
 */
function quickEntryPage({ fontBase }) {
  let fontSheet = official.fontSheet;
  for (const [name, shipped] of Object.entries(official.fonts)) fontSheet = fontSheet.replaceAll(`url(./${name})`, `url(${fontBase}${shipped})`);
  return [
    "<!doctype html>",
    official.htmlOpenTag,
    "<head><meta charset=\"utf-8\">",
    "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src file: app:; img-src data:\">",
    `<style>${official.styleSheet}</style>`,
    `<style>${fontSheet}</style>`,
    `<style>${HOST_STYLE}</style>`,
    "</head>",
    official.bodyOpenTag,
    official.bodyMarkup,
    `<script>${HOST_BINDINGS}\n${official.themeScript}\n${official.loadScript}</script>`,
    `<script>${HOST_SCRIPT}</script>`,
    "</body></html>",
  ].join("\n");
}

module.exports = { quickEntryPage, WIDTH, HEIGHT, HOST_STYLE, HOST_SCRIPT, HOST_BINDINGS };
