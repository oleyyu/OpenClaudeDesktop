// Quick Entry (U-QUICK-ENTRY): the official Quick Entry page, sliced from the frozen Claude 4.16336.0 desktop bundle
// without executing it. Official code is copied byte for byte; the host (electron/quick-entry/) binds its free names.
//
// What the official app ships, and what this generator can and cannot slice:
//   - asar/.vite/renderer/quick_window/quick-window.html + assets/main-*.js + assets/main-*.css: the web Quick Entry
//     ("legacy" in the app's own preference names: legacyQuickEntryEnabled) — the starburst logo and the prompt
//     textarea in a rounded container. Sliced here: the <html> and <body> tags, the whole inline style sheet, the body
//     markup, the font sheet, and from the page script the theme statement and the load handler (placeholder, skooch,
//     click-outside, Enter, Escape, wheel, drag refusal, focus).
//   - The Quick Entry bar that macOS users see (the "New Chat" target menu and the orange send button) is NOT in that
//     page: it is SwiftUI inside @ant/claude-swift's compiled swift_addon.node (QuickEntryBar / QuickEntryPresenter /
//     QuickEntryCoordinator, quickAccess.overlay.{toggle,setRecentChats,setActiveChatId}, event quickEntrySubmitted).
//     There is no source to slice. Its user-visible strings are in the app's en.lproj/Localizable.strings and its
//     images/colours in Assets.car; `nativeStrings` / `nativeAssets` below record the ones the host's hand-written
//     additions (electron/quick-entry/page.cjs) follow, as a contract checked against nothing but this table.
//
//   node scripts/extract-quick-window.mjs [--check]
//
// Output: electron/generated/quick-window-official.cjs (+ quick-window-official-manifest.json).
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { referenceVersion, referenceSnapshot, snapshotRoot } from './official-4.16336.0.mjs';

const root = path.resolve(import.meta.dirname, '..');
const PAGE_DIR = path.join(snapshotRoot, 'asar/.vite/renderer/quick_window');
const HTML = 'quick-window.html', SCRIPT = 'assets/main-BIvVfet_.js', FONT_SHEET = 'assets/main-CiwjW8Wn.css';
const OUTPUT = path.join(root, 'electron/generated/quick-window-official.cjs');
const MANIFEST = path.join(root, 'electron/generated/quick-window-official-manifest.json');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

// The official fonts the page's sheet names, and the byte-identical copies the app already ships (prepare-ui.mjs
// copies public/assets/v1 from the same release; the content hash is the file-name suffix).
const FONTS = {
  'AnthropicSans-Roman-Variable-DDVos-BJ.woff2': 'cc27851ad-DDVos-BJ.woff2',
  'AnthropicSans-Italic-Variable-CJtkx3-S.woff2': 'c9d3a3a49-CJtkx3-S.woff2',
  'AnthropicSerif-Roman-Variable-2VcCjn5t.woff2': 'c66fc489e-2VcCjn5t.woff2',
  'AnthropicSerif-Italic-Variable-Dcb-9NUS.woff2': 'cc410af59-Dcb-9NUS.woff2',
};

// Names the two sliced script spans use and do not declare: the host page defines them before the spans run.
const FREE_NAMES = {
  zf: 'globalThis["claude.internal.ui"].QuickWindow — { requestDismiss(text | null), requestSkooch(width, height) } (official preload quickWindow.js)',
  $u: 'globalThis["claude.hybrid"].DesktopIntl — { getInitialLocale(), onLocaleChanged(handler) }',
  ed: 'the promise of { locale, messages } from $u.getInitialLocale()',
  ku: 'react-intl createIntl({ locale, messages }, cache): the host returns { formatMessage({ id, defaultMessage }) }',
  Vf: 'react-intl createIntlCache() result (Xl()), passed through to ku',
  Mf: 'rxjs fromEvent(target, type)',
  Bf: 'rxjs debounce by a timer of the given milliseconds (Bf(e) = debounce(() => timer(e)))',
};

// Strings and assets of the native (SwiftUI) bar that the host's additions follow. Not sliced: recorded.
const nativeStrings = {
  source: '/Applications/Claude.app/Contents/Resources/en.lproj/Localizable.strings (5.1231.2) and strings(1) of 4.16336.0 swift_addon.node',
  targetNewChat: 'New Chat', menuSendToNewChat: 'Send to new chat', menuRecentHeading: 'Recent',
  placeholderNewChat: 'What can I help you with today?', placeholderExistingChat: 'Keep chatting with Claude about...',
  tooShort: 'Quick access prompts must be at least 3 characters',
};
const nativeAssets = {
  source: 'assetutil --info /Applications/Claude.app/Contents/Resources/Assets.car (5.1231.2)',
  spark: { name: 'ClaudeSpark', points: 26 }, accent: '#D97757 (Claude_Assets/Color-2, P3 0.851 0.467 0.341)',
  recentChats: 'ion-dist index-DN24_FmB.js QuickEntryApiRegistrar: setRecentChats(conversations.slice(0, QB = 5).map(({ uuid, name }) => ({ chatId: uuid, chatName: name || "Untitled" })), activeChatId)',
};

function between(text, start, end, label) {
  const from = text.indexOf(start);
  if (from < 0 || text.indexOf(start, from + 1) >= 0) throw new Error(`quick-window: ${label}: start marker not found exactly once`);
  const to = text.indexOf(end, from);
  if (to < 0) throw new Error(`quick-window: ${label}: end marker not found`);
  return text.slice(from, to + end.length);
}

async function build() {
  const html = await fs.readFile(path.join(PAGE_DIR, HTML), 'utf8');
  const script = await fs.readFile(path.join(PAGE_DIR, SCRIPT), 'utf8');
  const fontSheet = await fs.readFile(path.join(PAGE_DIR, FONT_SHEET), 'utf8');

  const htmlOpenTag = between(html, '<html', '>', '<html> tag');
  const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)];
  if (styles.length !== 1) throw new Error(`quick-window: expected one inline style sheet, found ${styles.length}`);
  const styleSheet = styles[0][1];
  const bodyOpenTag = between(html, '<body', '>', '<body> tag');
  const bodyStart = html.indexOf(bodyOpenTag) + bodyOpenTag.length, bodyEnd = html.indexOf('</body>');
  if (bodyEnd < 0) throw new Error('quick-window: </body> not found');
  const bodyMarkup = html.slice(bodyStart, bodyEnd);
  for (const feature of ['class="container"', 'class="app-logo"', 'class="input-box"', 'id="prompt-input"', 'placeholder="What can I help you with today?"', 'maxlength="16384"', 'fill="#D97757"'])
    if (!bodyMarkup.includes(feature)) throw new Error(`quick-window: body markup lost ${feature}`);
  for (const feature of ['.container{-webkit-app-region:drag;', '.darkTheme .container{', '.container:before{', '.app-logo{', '.input-box textarea{', '#prompt-input{box-shadow:none}'])
    if (!styleSheet.includes(feature)) throw new Error(`quick-window: style sheet lost ${feature}`);

  // `var _c=window.matchMedia(…),vc=…;document.body.className=vc,_c.addEventListener("change",…);`
  const themeScript = between(script, 'var _c=window.matchMedia("(prefers-color-scheme: dark)")', 'document.body.className=e.matches?"darkTheme":""});', 'theme statement');
  // `function Hf(e){…}window.addEventListener("load",()=>{…});` — the last statements of the bundle.
  const loadScript = between(script, 'function Hf(e){let t=document.getElementById("prompt-input");', 'setTimeout(()=>e.focus(),0)});', 'load handler');
  for (const feature of ['id:"S3MXlbjkax"', 'Mf(e,"input").pipe(Bf(750))', 'zf?.requestSkooch?.(t.scrollWidth,t.scrollHeight)', 'zf?.requestDismiss?.(null)', 't.key==="Enter"&&!t.shiftKey&&!t.altKey', 'zf?.requestDismiss?.(e.value),e.value=""', 'e.key==="Escape"'])
    if (!loadScript.includes(feature)) throw new Error(`quick-window: load handler lost ${feature}`);
  if (!script.trimEnd().endsWith(loadScript)) throw new Error('quick-window: the load handler is no longer the end of the page script');

  const fonts = {};
  for (const [official, shipped] of Object.entries(FONTS)) {
    if (!fontSheet.includes(`url(./${official})`)) throw new Error(`quick-window: font sheet no longer names ${official}`);
    const [a, b] = await Promise.all([fs.readFile(path.join(PAGE_DIR, 'assets', official)), fs.readFile(path.join(snapshotRoot, 'ion-dist/assets/v1', shipped))]);
    if (!a.equals(b)) throw new Error(`quick-window: ${official} differs from ion-dist ${shipped}`);
    fonts[official] = { shipped, sha256: sha256(a) };
  }

  const parts = { htmlOpenTag, styleSheet, bodyOpenTag, bodyMarkup, fontSheet, themeScript, loadScript };
  const module = [
    `// Generated by scripts/extract-quick-window.mjs from Claude ${referenceVersion} (${referenceSnapshot}/asar/.vite/renderer/quick_window).`,
    '// Official text, byte for byte; do not edit. The host page (electron/quick-entry/page.cjs) binds the free names.',
    `module.exports = ${JSON.stringify({ referenceVersion, ...parts, fonts: Object.fromEntries(Object.entries(fonts).map(([name, value]) => [name, value.shipped])), freeNames: Object.keys(FREE_NAMES), nativeStrings })};`,
    '',
  ].join('\n');
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-quick-window.mjs', output: 'quick-window-official.cjs',
    sources: Object.fromEntries([[HTML, html], [SCRIPT, script], [FONT_SHEET, fontSheet]].map(([name, text]) => [`asar/.vite/renderer/quick_window/${name}`, sha256(text)])),
    slices: Object.fromEntries(Object.entries(parts).map(([name, text]) => [name, { bytes: Buffer.byteLength(text), sha256: sha256(text) }])),
    fonts, freeNames: FREE_NAMES,
    notSliced: { what: 'The macOS native Quick Entry bar (target menu, send button, screenshots, dictation)', why: 'SwiftUI compiled into @ant/claude-swift build/Release/swift_addon.node; no page or script exists for it', hostFile: 'electron/quick-entry/page.cjs', nativeStrings, nativeAssets },
    sha256: sha256(module),
  };
  return { module, manifest: JSON.stringify(manifest, null, 2) + '\n' };
}

export async function extractQuickWindow({ check = false } = {}) {
  const { module, manifest } = await build();
  if (check) {
    const [haveModule, haveManifest] = await Promise.all([fs.readFile(OUTPUT, 'utf8').catch(() => null), fs.readFile(MANIFEST, 'utf8').catch(() => null)]);
    if (haveModule !== module || haveManifest !== manifest) throw new Error('quick-window: electron/generated/quick-window-official.* is stale; run node scripts/extract-quick-window.mjs');
    return;
  }
  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await fs.writeFile(OUTPUT, module);
  await fs.writeFile(MANIFEST, manifest);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await extractQuickWindow({ check: process.argv.includes('--check') });
  console.log(`quick-window: ${process.argv.includes('--check') ? 'VERIFIED' : 'WROTE'} electron/generated/quick-window-official.cjs`);
}
