// R3-terminal FT-03/FT-04 (research/files-terminal.md §4.3, §5 terminal): pins for the terminal helpers that
// scripts/extract-code-ui-current.mjs emits (from the 3.6556.2 renderer since cc-rest-terminal-a/-b). Before an emit slices its hand-listed binding
// set, this module checks, against the shipped chunk:
//   - the set is exactly the same-chunk closure of the roots the helper exports (stopping at imports);
//   - every binding still carries feature strings of its original text;
//   - the chunk still exports the roots under the official aliases its consumers import (officialExports);
//   - the imports the emit replaces are exactly the ones listed, and each still names the same kind of declaration in
//     its chunk (dependencies);
//   - the official call sites that give a binding its meaning are still there (uses), e.g. the link handler's
//     `r.button !== 0 || xn(e, r)` for the selection guard.
// The binding lists replace the 2.31226.0 terminal adapters of extract-code-editor.mjs (retired by w10-editor-split; were generated/code-editor
// terminal-selection/-output/-mouse/-colors/-titles); research/files-terminal-data/maps/map-old3.json maps every old
// binding to these, all identical except the title description (now terminal-description.mjs, R2-files).
//
// cc-rest-terminal-a (3.6556.2 migration, research/code-current-rest.md §2/§5, data/code-current-rest-map.json): a pin
// with `version: '3.6556.2'` slices the 3.6556.2 renderer (official-3.6556.2.mjs ionSource); every binding of those
// pins is identical to its 2.42304.0 original after renaming (formatted declaration by declaration).
// cc-rest-terminal-b moved the last four (terminal-errors / -idle-cursor / -clear-item / -tab-overflow) to 3.6556.2:
// every pin now has `version: '3.6556.2'`. Their React Compiler cache helpers are view-tabs' E3 names (memo() below).
// `reexport` pins slice nothing: the emit re-exports the declaration view-tabs publishes under that semantic name from
// the concrete view-tabs file (R6/E2), and the pin checks the official declaration and the publication; a pin that
// also slices bindings re-exports only the listed declarations (terminal-tab-overflow: viewTabSizes).
import fs from 'node:fs/promises';
import path from 'node:path';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';
import { routinesSharedLink } from './routines-shared-compat.mjs';
import { compilerHelpers, sharedFrame, vendorFrame } from './official-3.6556.2.mjs';

// Every pin slices the 3.6556.2 terminal chunks (cc-rest-terminal-a/-b; c6bf19e8f, cf718f694 and cccc2cf0a kept their
// prefixes from 2.42304.0's c6bf19e8f-oq2b1_8O / cf718f694-jeQhHLuv / cccc2cf0a-B0D--VZp under new hashes).
const v3Terminal = 'c6bf19e8f-CgQ1_Jhf.js', v3Titles = 'cf718f694-C6OUPnrm.js', v3Pane = 'cccc2cf0a-DhZC33Gc.js';
const v3 = '3.6556.2';
// cc-rest-terminal-b: the shared-frame React Compiler helpers a compiled closure imports (`J9 J1 K1`), as pin `imports`
// (official alias) and `viewTabs` (E3 semantic name, checked against the view-tabs publication).
const memo = locals => {
  const imports = {}, viewTabs = {};
  for (const local of locals.split(' ')) {
    const [alias, helper] = Object.entries(compilerHelpers).find(([, h]) => h.local === local) ?? [];
    if (!helper) throw Error(`Unknown React Compiler helper ${local}`);
    imports[local] = `${sharedFrame}:${alias}`;
    viewTabs[local] = helper.name;
  }
  return { imports, viewTabs };
};
export const terminalPins = {
  // cccc2cf0a rS (2.42304.0 qy): the selection the terminal's Add to chat (keyboard and context menu, iS) attaches, its
  // leading blank lines dropped and the first content line's indentation kept.
  'terminal-selection.mjs': {
    version: v3, source: v3Pane, roots: ['rS'], bindings: ['rS'],
    features: { rS: ['let t = e.length - e.trimStart().length;', '.trimEnd()'] },
    uses: { iS: ['x(rS(e), S, E)', 'x(rS(Me), S, E)', 'via: "context_menu"'] },
  },
  // cf718f694 ue/de/he (exported i; 2.42304.0 de/W/he): a terminal tab's description from its shell title (the last
  // path segment; "/" only for a real root).
  'terminal-description.mjs': {
    version: v3, source: v3Titles, roots: ['he'], bindings: ['ue', 'de', 'he'], officialExports: { i: 'he' },
    features: {
      ue: ['/^(?:\\S+:\\s?)?(~|\\S*[/\\\\]\\S*)$/'], de: ['/^[A-Za-z]:[/\\\\]/'],
      he: ['split(/[/\\\\]/).findLast((e) => e !== "")', 'n ?? (r ? "/" : e)'],
    },
  },
  // c6bf19e8f Vt..Kt (2.42304.0 Bt..Gt): OSC 133 command markers, their gutter decorations and prompt navigation.
  // T (shared-0 yb = Zo) is the GrowthBook check of Vt "__gb__1475692361" that gates the prompt-navigation keys.
  'terminal-commands.mjs': {
    version: v3, source: v3Terminal, roots: ['Kt'], bindings: ['Vt', 'Ht', 'Ut', 'Wt', 'Gt', 'Kt'],
    imports: { T: 'shared-0-DDOOdL6P.js:yb' },
    dependencies: { 'shared-0-DDOOdL6P.js:yb': ['t===void 0?qo(e):t'] },
    features: {
      Vt: ['"__gb__1475692361"'], Ht: ['Ht = 133'], Ut: ['Ut = 5'], Wt: ['Wt = 3'],
      Gt: ['calc(var(--terminal-gutter, 0px) / -2 - ${c / 2}px)', '(o.pointerEvents = "none")'],
      Kt: ['/^-?\\d{1,10}$/.test(t)', 'e.registerMarker(a - i)'],
    },
    uses: { ri: ['let u = Kt(l);'] },
  },
  // c6bf19e8f selection pill geometry (old 2.31226.0 Br..Yr; 2.42304.0 $r..ci): Ei's onSelectionChange/onScroll and Si
  // use them.
  'terminal-geometry.mjs': {
    version: v3, source: v3Terminal, roots: ['gi', '_i', 'yi', 'bi', 'xi'], bindings: ['fi', 'pi', 'hi', 'gi', '_i', 'vi', 'yi', 'bi', 'xi'],
    features: {
      fi: ['fi = 8'], pi: ['pi = 16'], hi: ['hi = 0'], gi: ['t.x === 0 && t.y > e.y ? t.y - 1 : t.y'],
      _i: ['.xterm-screen', 'below: n >= c + a'], vi: ['t.getChars().trim() !== ""', 'n + t.getWidth()'],
      yi: ['r.y === e.buffer.active.baseY + e.rows - 1'], bi: ['beside: !0', 'Math.max(a, r.cursorX + 1)'],
      xi: ['["below", "above"]', 'e.x + fi + i'],
    },
    uses: { Ei: ['let i = yi(e, r)', 'a = i ? bi(e, A.current) : void 0', 'sel: _i(e, A.current, o.y, r)', 'c = i ? r.start.y : gi(r)'], Si: ['} = xi('] },
  },
  // c6bf19e8f attach-visible-output and the replay-banner normalization (old kn,jn,Mn,Nn,Pn,Kn; 2.42304.0 In..$n).
  'terminal-output.mjs': {
    version: v3, source: v3Terminal, roots: ['dr', '$n'], bindings: ['Jn', 'Xn', 'Zn', 'Qn', '$n', 'dr'],
    features: {
      Jn: ['Jn = "[shell reconnected '], Xn: ['Math.ceil(47 / e)'], Zn: ['e.slice(47)', 'r.trim() !== ""'],
      Qn: ['e.trimEnd().length'], $n: ['Zn(Qn(e))'], dr: ['e.selectLines(n, t.viewportY + e.rows - 1)', 'e.clearSelection(), t(r), !0'],
    },
    uses: { Di: ['attachVisibleTerminalOutput: dr'], ni: ['$n(e.getSelection())'] },
  },
  // c6bf19e8f ti (2.42304.0 Ur): a program with mouse tracking owns the right click (ri's host contextmenu listener).
  'terminal-mouse.mjs': {
    version: v3, source: v3Terminal, roots: ['ti'], bindings: ['ti'],
    imports: { ce: 'shared-78-D5Fw2h0a.js:mE' },
    dependencies: { 'shared-78-D5Fw2h0a.js:mE': ['window.navigator.userAgent.toLowerCase()'] },
    features: { ti: ['t.button === 2 || (n && t.ctrlKey)', 'e.modes.mouseTrackingMode === "none"', 'macOptionClickForcesSelection === !0'] },
    uses: { ri: ['ti(l, e) && e.preventDefault()'] },
  },
  // c6bf19e8f Rn..Vn (2.42304.0 Mn..Fn): color OSC writes are swallowed so the UI theme stays; queries pass (old
  // Tn,En,Dn,On).
  'terminal-colors.mjs': {
    version: v3, source: v3Terminal, roots: ['zn'], bindings: ['Rn', 'zn', 'Bn', 'Vn'],
    features: { Rn: ['[4, 10, 11, 12, 104, 110, 111, 112]'], zn: ['registerOscHandler(t, (e) => (t === 4 ? !Bn(e) : !Vn(e)))'], Bn: ['t[e] !== "?"'], Vn: ['t.every((e) => e === "?")'] },
    uses: { ri: ['zn(l);'] },
  },
  // c6bf19e8f Dn (2.42304.0 xn, terminal-01): a link click opens nothing while it would end a real selection drag.
  'terminal-link-selection.mjs': {
    version: v3, source: v3Terminal, roots: ['Dn'], bindings: ['Dn'],
    features: { Dn: ['t.metaKey || t.ctrlKey || t.shiftKey || t.altKey', 'e.modes.mouseTrackingMode !== "none"', 'e.getSelection().length > 1'] },
    uses: { On: ['r.button !== 0 || Dn(e, r)'] },
  },
  // c6bf19e8f ii..di (2.42304.0 Kr..Qr, term-v01): the structured start/load error kinds and their copy. 3.6556.2
  // (cc-rest-terminal-b) rewrote the copy ("Couldn’t start the shell" 4oGvcz1sbM, "Couldn’t load the terminal"
  // OqP0kTN27G) and split needsNewerApp into a title (UmCCqFiseY) and a body (needsNewerAppBody "Restart Claude to
  // update." e/Nyj1sdtt). Ei covers the terminal with an error EmptyState (role alert): `raw` text as is, else the kind's
  // copy, the body only for needsNewerApp, and Try again for every kind but needsNewerApp. di now also maps the shell
  // spawn failure ui "Failed to spawn shell" to startFailed. j is vendor-intl f (react-intl defineMessages, the identity).
  // w10-trans-terminal-inline-error (L126): si (TerminalLoadFailed, what Ei wraps a non-Error attach failure in, so the
  // catch maps it to oi) and li (the error kind as plain text, which Ei hands the inline-run store ca41b3815 X through
  // `R.getState().setInlineError(k, li(r))` when the shell PTY fails to start; the code block run card reads it back as
  // inlineRun.error, c19e90103 Bh).
  'terminal-errors.mjs': {
    version: v3, source: v3Terminal, roots: ['ii', 'ai', 'oi', 'si', 'ci', 'li', 'di'], bindings: ['ii', 'ai', 'oi', 'si', 'ci', 'li', 'ui', 'di'],
    imports: { j: 'vendor-intl-DYfox5Co.js:f' },
    dependencies: { 'vendor-intl-DYfox5Co.js:f': ['function tn(e){return e}'] },
    features: {
      ii: ['kind: "needsNewerApp"'], ai: ['kind: "startFailed"'], oi: ['kind: "loadFailed"'],
      ci: ['"Additional terminal tabs require a newer Claude desktop app"', '"UmCCqFiseY"', 'needsNewerAppBody:', '"Restart Claude to update."',
        '"e/Nyj1sdtt"', '"Couldn\\u2019t start the shell"', '"4oGvcz1sbM"', '"Couldn\\u2019t load the terminal"', '"OqP0kTN27G"'],
      ui: ['"Failed to spawn shell"'],
      di: ['t !== n && e === "Session not found"', 'e === ui', '{ kind: "raw", text: e }'],
      si: ['class extends Error', 'super("Failed to load terminal")', 'this.name = "TerminalLoadFailed"'],
      li: ['switch (e.kind)', '"Additional terminal tabs require a newer Claude desktop app. Restart Claude to update."',
        'return "Couldn\\u2019t start the shell";', 'return "Couldn\\u2019t load the terminal";', 'case "raw":', 'return e.text;'],
    },
    uses: {
      Ei: ['let r = di(e?.error, k, c);', 'N.kind === "raw" ? N.text : n(le, { ...ci[N.kind] })', 'n(le, { ...ci.needsNewerAppBody })',
        'N.kind !== "needsNewerApp" &&', 'role: "alert"', 'defaultMessage: "Try again"', 'defaultMessage: "Shell exited"',
        '(R.getState().setInlineError(k, li(r)), t || P(r));', 'R.getState().setInlineError(k, li(ai)),',
        'error: r instanceof Error ? r : new si(),', 'e instanceof Error && !(e instanceof si)'],
    },
  },
  // shared-25 FH (exported An; 2.42304.0 jU): drop lone surrogates, keeping well-formed text as is.
  'terminal-title-wellformed.mjs': {
    version: v3, source: 'shared-25-DOWZRSlq.js', roots: ['FH'], bindings: ['MH', 'NH', 'FH'], officialExports: { An: 'FH', kn: 'NH' },
    features: { MH: ['i >= 55296 && i <= 56319 && a >= 56320 && a <= 57343'], NH: ['e.isWellFormed'], FH: ['NH(e) ? e : MH(e, "")'] },
  },
  // shared-0 ML (exported Bu; 2.42304.0 XP): the blank-looking code points the title whitespace class adds.
  // W13 G11 (D1): slices nothing; jL / ML are routines-shared's shared-0 copy (no imports, plain node, E42), which the
  // emit re-exports under these names (`routinesShared`: checked to be these very official declarations).
  'terminal-title-invisibles.mjs': {
    version: v3, source: 'shared-0-DDOOdL6P.js', roots: [], bindings: [], officialExports: { Bu: 'ML', Vu: 'jL' },
    routinesShared: 'shared-0-DDOOdL6P.mjs',
    features: { jL: ['[10240, 65532, 119129, 78913, 78914, 92432, 94180]'], ML: ['e.toString(16)'] },
  },
  // shared-52 kB (exported ea; 2.42304.0 Uj): caps runs of blank/combining characters by display width; bB ($i) is their
  // class. sn is shared-0 Lb = Pa (lazy-init.mjs).
  'terminal-title-runs.mjs': {
    version: v3, source: 'shared-52-uHFNjl7C.js', roots: ['kB', 'bB'], bindings: ['bB', 'kB', 'jB', 'MB', 'NB', 'PB', 'FB'], officialExports: { ea: 'kB', $i: 'bB' },
    imports: { sn: 'shared-0-DDOOdL6P.js:Lb' },
    dependencies: { 'shared-0-DDOOdL6P.js:Lb': ['function Pa(e){let t,n=!1;return()=>(n||=(t=e(),!0),t)}'] },
    features: {
      bB: ['\\\\u2800\\\\u3164', '\\\\u{E0000}-\\\\u{E01EF}'], kB: ['if (o.length + t.length > 2 * i) break;', 'let e = PB(t);'], jB: ['jB = 128'],
      MB: ['["\\u200C", 0]', '["\\u3000", 2]'], NB: ['/^[\\p{Mn}\\p{Me}]$/u'], PB: ['MB.get(e) ?? 1', 't >= 917504 && t <= 917999'], FB: ['{5,}/gu'],
    },
  },
  // shared-78 bj/yj/Tj (exported jh/Fh/Vh; 2.42304.0 Xw/Yw/eT): the title sanitizer cf718f694 X applies (control and
  // format characters, marks, whitespace, the 4000-character window and the long blank-run cap, then a code-point limit).
  'terminal-title-text.mjs': {
    version: v3, source: 'shared-78-D5Fw2h0a.js', roots: ['bj', 'yj', 'Tj'],
    bindings: ['JA', 'YA', 'ZA', 'QA', '$A', 'nj', 'pj', 'hj', '_j', 'yj', 'bj', 'Cj', 'wj', 'Tj'], officialExports: { jh: 'bj', Fh: 'yj', Vh: 'Tj' },
    imports: { se: 'shared-25-DOWZRSlq.js:An', Ut: 'shared-0-DDOOdL6P.js:Lb', Gi: 'shared-52-uHFNjl7C.js:ea', Mr: 'shared-52-uHFNjl7C.js:$i', Ct: 'shared-0-DDOOdL6P.js:Bu' },
    features: {
      JA: ['\\p{Default_Ignorable_Code_Point}\\u034F\\u115F\\u1160\\u3164'], YA: ['RegExp(`${Mr}{5,}`, "gu")'], ZA: ['ZA = Ct'],
      QA: ['RegExp(`[\\\\s${ZA}]+`, "gu")'], $A: ['[\\\\p{Mn}\\\\p{Me}\\\\u200C\\\\u200D]+'], nj: ['se(e).replace(JA()'],
      pj: ['Gi(t, YA(), 32).replace($A(), "$1").replace(QA, " ").trim()'], hj: ['hj = 4e3'], _j: ['return nj(e);'], yj: ['wj(e, _j)'],
      bj: ['.replace(/[\\u200C\\u200D]/g, "")'], Cj: ['\\p{Noncharacter_Code_Point}'], wj: ['pj(t(se(e.slice(0, hj))).replace(Cj(), " "))'],
      Tj: ['Array.from(e.replace(/\\p{Cs}/gu, ""))'],
    },
  },
  // cf718f694 be/me/J/ge/G (exported r/a/n/s/o): running command (OSC 133 C cmdline_url after 500ms) or shell title per
  // ptyKey (old 2.31226.0 ge/ue/q/fe/W, identical; 2.42304.0 the same names but ue, now W).
  'terminal-titles.mjs': {
    version: v3, source: v3Titles, roots: ['be', 'me', 'J', 'ge', 'G'],
    bindings: ['V', 'H', 'U', 'W', 'fe', 'pe', 'G', 'K', 'me', 'ge', 'q', 'J', 'Y', 'X', '_e', 've', 'ye', 'be'],
    officialExports: { r: 'be', a: 'me', n: 'J', s: 'ge', o: 'G' },
    imports: {
      a: 'shared-0-DDOOdL6P.js:yb', m: 'vendor-all-0-DXM0MGjZ.js:F', u: 'shared-78-D5Fw2h0a.js:jh', c: 'shared-78-D5Fw2h0a.js:Fh',
      l: 'shared-78-D5Fw2h0a.js:Vh', s: 'shared-52-uHFNjl7C.js:Qd',
    },
    // m (vendor-all-0 F = v, zustand's create) is the host store; s (shared-52 Bw) is now React Compiler output.
    dependencies: {
      'shared-0-DDOOdL6P.js:yb': ['t===void 0?qo(e):t'], 'shared-52-uHFNjl7C.js:Qd': ['growthbook', '"unknown"'],
      'vendor-all-0-DXM0MGjZ.js:F': ['v=(e=>e?_(e):_)'],
    },
    features: {
      V: ['"__gb__736896549"'], H: ['H = 133'], U: ['"cmdline_url="'], W: ['W = 200'], fe: ['fe = 500'], pe: ['/^[0-9A-Fa-f]{2}$/'],
      G: ['m(() => ({ byPtyKey: {} }))'], K: ['K = new Map()'], me: ['n?.command ?? n?.reported'], ge: ['s(V) !== "off"'],
      q: ['clearTimeout(K.get(e)), K.delete(e)'], J: ['if (!(e in t.byPtyKey)) return t;'], Y: ['i.reported === r?.reported && i.command === r?.command'],
      X: ['l(c(e), W).trim()', 'u(t) === "" ? void 0 : t'], _e: ['(?:Administrator: )?'], ve: ['_e.test(t) ? void 0 : t'],
      ye: ['.slice(12, 2412)', 'new TextDecoder().decode(new Uint8Array(n))'], be: ['e.parser.registerOscHandler(H', 'r !== "A" && r !== "C" && r !== "D"', 'a(V) !== !1'],
    },
  },
  // cf718f694 B/z (exported c; terminal-09): the dimmed idle cursor ShellTerminal draws until its xterm is in place,
  // blinking with the Blink cursor preference (epitaxy-terminal-cursor-blink) while __gb__2265785636 is on.
  // 3.6556.2 (cc-rest-terminal-b): B is React Compiler output (same literals and props); v (c51596d2b S = q, 2.42304.0
  // te) is the GrowthBook check, on locally; _ (shared-28 Uc = Bp, 2.42304.0 h) reads the persisted preference.
  'terminal-idle-cursor.mjs': {
    version: v3, source: v3Titles, roots: ['B'], bindings: ['w', 'E', 'z', 'B'], officialExports: { c: 'B', h: 'w', u: 'E' },
    imports: {
      t: `${vendorFrame}:Ha`, e: `${vendorFrame}:Ba`, _: 'shared-28-DNYlf4wu.js:Uc', v: 'c51596d2b-Dy8p_zYF.js:S',
      ...memo('J9 J1 K1 J2 K2 J3 K3 J5 K5').imports,
    },
    react: { t: 'jsx' }, viewTabs: { e: 'clsx', ...memo('J9 J1 K1 J2 K2 J3 K3 J5 K5').viewTabs },
    dependencies: {
      'shared-28-DNYlf4wu.js:Uc': ['`persisted.${e}`', 'defaultValue:t'],
      'c51596d2b-Dy8p_zYF.js:S': ['getForcedFeatures().has(t)', 'return t||!r'],
    },
    features: {
      w: ['"__gb__2265785636"'], E: ['"epitaxy-terminal-cursor-blink"'], z: ['v(w)', '_(E, void 0)', '!e || t !== !1'],
      B: ['"data-blink": l', '"pointer-events-none block h-[1lh] w-[1ch] opacity-50"', 'l && "motion-safe:animate-blink"', 'lineHeight: "normal"',
        '"block h-full w-full"', '{ backgroundColor: r }', '"aria-hidden": !0'],
    },
  },
  // cf718f694 _/oe/b/le (exported D/T/S): the window's terminal registry ShellTerminal fills (c6bf19e8f Ee) and the
  // pane's Clear terminal item reads (cccc2cf0a Md/jd).
  // 3.6556.2 (cc-rest-terminal-a): x/ne/ce/se under the same official aliases D/T/S.
  'terminal-registry.mjs': {
    version: v3, source: v3Titles, roots: ['ne', 'ce', 'se'], bindings: ['x', 'ne', 'ce', 'se'], officialExports: { D: 'ne', T: 'ce', S: 'se' },
    features: { ne: ['x = e;'], ce: ['x?.has(e) ?? !1'], se: ['x?.clearSelection(e), x?.clear(e)'] },
  },
  // cccc2cf0a Xy/Zy/Yy (terminal-07): a tab's Clear terminal item, disabled with "No terminal to clear" when its view is
  // mounted but has no live terminal, "Switch to this terminal first." when it never showed here.
  // 3.6556.2 (cc-rest-terminal-b): cccc2cf0a aS/oS/sS (2.42304.0 Yy/Xy/Zy); sS is React Compiler output with the same
  // literals and props (the disabled flag and the click handler are memoized locals now).
  'terminal-clear-item.mjs': {
    version: v3, source: v3Pane, roots: ['sS', 'oS', 'aS'], bindings: ['aS', 'oS', 'sS'],
    imports: {
      k: `${vendorFrame}:wo`, u: `${vendorFrame}:Ha`, me: `${sharedFrame}:qi`, Z: 'vendor-intl-DYfox5Co.js:l',
      Lr: 'vendor-intl-DYfox5Co.js:p', ad: `${v3Titles}:S`, od: `${v3Titles}:T`, ...memo('J9 J1 K1 J0 K0 J3 K3').imports,
    },
    react: { k: 'useState', u: 'jsx' }, viewTabs: { me: 'CdsContextMenu', ...memo('J9 J1 K1 J0 K0 J3 K3').viewTabs },
    dependencies: {
      [`${sharedFrame}:qi`]: ['Item:GT.Item', 'SubmenuPopup:'], 'vendor-intl-DYfox5Co.js:l': ['c(Wt,Ut)'],
      'vendor-intl-DYfox5Co.js:p': ['return Mt(e),e'],
      [`${v3Titles}:S`]: ['x?.clearSelection(e),x?.clear(e)'], [`${v3Titles}:T`]: ['x?.has(e)??!1'],
    },
    features: {
      aS: ['aS = new Map()'], oS: ['od(e) ? "terminal" : aS.has(e) ? "viewOnly" : "noView"'],
      sS: ['K1($, 0, t, () => oS(t))', '[i] = k(r)', '"No terminal to clear"', '"9WbosGezgw"', '"Switch to this terminal first."', '"IcvUF27v0e"',
        'o = i !== "terminal"', '() => ad(t)', '"Clear terminal"', '"m6UYaDfqaN"', 'disabledReason: a'],
    },
    uses: { Zx: ['u(sS, { ptyKey: Eu(n, e) })'], iS: ['aS.set(b, (aS.get(b) ?? 0) + 1)', 'e > 0 ? aS.set(b, e) : aS.delete(b)'] },
  },
  // w11-e31-terminal-cont: ceb49ada3 u (exported t), the selection action bar c6bf19e8f Si renders (`n(B, { actions: p })`
  // with `[{ key: "attach", label, shortcut: "cmd+shift+l", onSelect }]`): a popover-surface split row of ghost CdsButtons
  // (label, or icon-only with pressed state) with a hairline between them; hidden (visibility) while a context menu is
  // open in the window (cd59309dc n, read through session-rail-changes' slice of it, D1). l is its hidden style, c its
  // onMouseDown (keeps the selection), d the "a toggle button is shown" test that pads the row.
  'terminal-action-bar.mjs': {
    version: v3, source: 'ceb49ada3-COmVjFwx.js', roots: ['u'], bindings: ['c', 'l', 'u', 'd'], officialExports: { t: 'u' },
    imports: {
      e: `${vendorFrame}:Ha`, t: `${vendorFrame}:Ua`, n: `${vendorFrame}:Ya`, r: `${sharedFrame}:Al`, i: `${sharedFrame}:Eu`,
      a: `${sharedFrame}:Xu`, o: `${sharedFrame}:Zu`, s: 'cd59309dc-BZMawR8Y.js:n', ...memo('J9 J0 K0 J1 K1 J2 K2 J3 K3').imports,
    },
    react: { e: 'jsx', t: 'jsxs', n: 'Fragment' },
    viewTabs: { r: 'cdsSurfaceClass', i: 'CdsButton', a: 'ariaKeyShortcuts', o: 'useIsMacPlatform', ...memo('J9 J0 K0 J1 K1 J2 K2 J3 K3').viewTabs },
    dependencies: { 'cd59309dc-BZMawR8Y.js:n': ['byWindow.has(e)'] },
    features: {
      c: ['e.preventDefault();'], l: ['{ visibility: "hidden" }'], d: ['e.icon !== void 0 && e.pressed !== void 0'],
      u: ['if (f.length === 0) return null;', 'r("popover")', '!rounded group/split flex ${h ? "p-xs" : ""}', '_ = m ? l : void 0',
        '"w-px my-[7px] bg-alpha-2 shrink-0 transition-opacity motion-reduce:transition-none group-hover/split:opacity-0 group-focus-within/split:opacity-0"',
        '"aria-keyshortcuts": r.shortcut', '? a(r.shortcut, p)', 'onMouseDown: c,', 'children: r.label,', 'iconOnly: !0,',
        'r.pressed === void 0 ? void 0 : "selected"', 'className: "text-secondary",', 'r.key,'],
    },
  },
  // R3-terminal FT-15 (terminal-10, global-v01): the shared view-tab strip's overflow menu row (2.31226.0 I, which closed
  // on ArrowRight/Delete/Backspace whatever the modifiers): a close key with Control, Meta or Alt is left alone, a held
  // key's repeats only preventDefault, and after closing the key's repeats are swallowed on the row's window (shared-19
  // ln = Uj, keyboard-repeat.mjs). The typeahead reset keys and the RTL key flip the menu applies come along. The Preview
  // and terminal strips' overflow menu (source-preview-tab-overflow.jsx) renders this row.
  // 3.6556.2 (cc-rest-terminal-b): cfe7c4b3b se/P/L/ie/ce (2.42304.0 ce/N/I/L, ce's `stopPropagation` callback hoisted to
  // ce); se is React Compiler output and takes the new `arrowCloses` prop: ArrowRight (ArrowLeft in RTL) closes only
  // with it, Delete/Backspace always. The menu ae passes `g = arrowCloses ?? true`, describes the rows by the arrow hint
  // only then, shows that hint only then and resets typeahead on ArrowRight only then; ViewTabBar's overflowArrowCloses
  // is false only on the side chat strip (cccc2cf0a qP), so the terminal and Preview strips keep it on. Since w10-trans-tab-overflow
  // se's `_` is the official shared-frame Jo (view-tabs CdsDropdown) and the host menu renders the rows in a CdsDropdown
  // Root/Popup as ae does. w12-viewtabs (D1): nothing is sliced any more. se, its RTL key flip L, the typeahead reset keys ie
  // and the size table le (2.42304.0 R, now with basisChromePx: 52) are re-exported from the concrete view-tabs file as
  // ViewTabOverflowItem / viewTabRtlArrowKey / viewTabOverflowTypeaheadResetKeys / viewTabSizes, so there is one se and one
  // P = createContext("xs") lead-glyph context (the slice used to make a second instance). The features below still pin the
  // official declarations, and `dependencies` the imports se reads inside view-tabs.
  'terminal-tab-overflow.mjs': {
    version: v3, source: 'cfe7c4b3b-BF79K6ux.js', roots: [], bindings: [],
    dependencies: {
      'shared-19-DIKJVT7c.js:ln': ['t.key===e&&t.repeat?(t.preventDefault(),t.stopPropagation()):i()', 't.addEventListener("keydown",n,!0)'],
      [`${sharedFrame}:Jo`]: ['SearchablePopup:', 'PendingList:'],
      // shared-frame ga (exported wd; 2.42304.0 aa, exported ou): the CDS size attribute se spreads on the close glyph's
      // box (`closeSize`), view-tabs' cdsSizeAttributes inside the re-exported se; w10-cleanup-cc-public retired
      // terminal-tab-size-attrs.mjs, the re-export it used to go through, and moved its feature here.
      [`${sharedFrame}:wd`]: ['function ga(e){return e&&e!=="base"?{"data-size":e}:{}}'],
    },
    reexport: { se: 'ViewTabOverflowItem', L: 'viewTabRtlArrowKey', ie: 'viewTabOverflowTypeaheadResetKeys', le: 'viewTabSizes' },
    features: {
      P: ['P = f("xs")'], L: ['e === "ArrowLeft"', '? "ArrowRight"'], ie: ['"ArrowUp",', '"ArrowRight",', '"Delete",'],
      se: [
        'arrowCloses: o,', 'm = r.closable !== !1,', 'let t = u ? L(e.key) : e.key;', '!e.ctrlKey &&', '!e.metaKey &&', '!e.altKey &&',
        '((o && t === "ArrowRight") || t === "Delete" || t === "Backspace")', 'if ((e.preventDefault(), e.stopPropagation(), e.repeat)) return;',
        'let t = ne(e.currentTarget);', '(t && re(e.key, t), v());', 'm && e.button === 1 && (e.preventDefault(), v());', 'S = m ? i : void 0,',
        '"aria-describedby": S,', 'className: "gap-sm",', 'n(P, { value: p.leadGlyph, children: r.icon })', 'onPointerDown: ce,', '...te(p.closeSize),',
        '"grid shrink-0 cursor-interactive place-items-center rounded-sm text-muted-as-secondary hover:bg-fill-ghost-hover hover:text-primary"',
        'n(ee, { name: "X", size: p.closeGlyph })', 'n(h, { delay: 700, hoverable: !1, children: r.label })', 'className: "text-caption text-muted-as-secondary",',
        'n(_.Item, {',
      ],
      ce: ['return e.stopPropagation();'],
      le: ['tabIconShed: "min-w-0 ps-[2px]"', 'tabNoIcon: "min-w-[6px] ps-[6px]"', 'basis: "basis-[192px]"', 'basisChromePx: 52,', 'closeGlyph: "xs"', 'closeInMenuRow: ""'],
    },
    uses: {
      ae: ['g = d === void 0 || d,', 'let t = x ? L(e.key) : e.key;', 'ie.has(t) && (g || t !== "ArrowRight") && (w.current = !1)', 'hintIds: g ? `${b} ${c}` : c,',
        'arrowCloses: g,', 'n(C, { delay: 700, children: k })', 'onKeyDownCapture: ne,'],
      Re: ['overflowArrowCloses: S,', '_e = S === void 0 || S,', 'arrowCloses: _e,'],
      de: ['return !e || t !== "comfortable"', '? le'],
    },
  },
};

const within = (outer, q) => q.node.start >= outer.node.start && q.node.end <= outer.node.end;
const parsed = new Map();
async function chunk(directory, file) {
  const key = path.join(directory, file);
  if (!parsed.has(key)) parsed.set(key, (async () => {
    const code = await format(await fs.readFile(key, 'utf8'), { parser: 'babel' });
    const ast = parsers.babel.parse(code, {});
    let program;
    babel.traverse(ast, { Program(p) { program = p; } });
    const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
      .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
    return { code, program, exported };
  })());
  return parsed.get(key);
}
// The raw top-level declaration of `alias` (an export of `file`), read with an AST over the unformatted bytes so a
// same-named local in another scope of a vendor chunk can't stand in for it.
const rawParsed = new Map();
async function rawChunk(directory, file) {
  const key = path.join(directory, file);
  if (!rawParsed.has(key)) rawParsed.set(key, (async () => {
    const bytes = await fs.readFile(key, 'utf8');
    const ast = parsers.babel.parse(bytes, {});
    const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
      .flatMap(n => n.specifiers).map(s => [s.exported.name, s.local.name]));
    return { bytes, ast, exported };
  })());
  return rawParsed.get(key);
}
async function exportedDeclaration(directory, file, alias) {
  const { bytes, ast, exported } = await rawChunk(directory, file);
  const local = exported.get(alias);
  if (!local) return null;
  for (const node of ast.program.body) {
    if (node.id?.name === local) return bytes.slice(node.start, node.end);
    const d = node.declarations?.find(d => d.id.name === local);
    if (d) return bytes.slice(d.start, d.end);
  }
  return null;
}

// Returns the pinned binding list the emit slices. `run` false (target skipped by --only) returns it unchecked.
export async function pinTerminalHelper(target, directory, run = true) {
  const pin = terminalPins[target];
  if (!pin) throw Error(`No terminal pin for ${target}`);
  if (pin.version !== v3) throw Error(`${target}: terminal pins slice ${v3} (cc-rest-terminal-b)`);
  if (!run) return [...pin.bindings];
  const label = `${target} (${pin.source})`;
  const { code, program, exported } = await chunk(directory, pin.source);
  const declaration = name => {
    const p = program.scope.getBinding(name)?.path;
    if (!p || p.isImportSpecifier()) throw Error(`${label}: ${name} is not a top-level declaration`);
    return p;
  };
  const text = p => code.slice(p.node.start, p.node.end);
  for (const [alias, local] of Object.entries(pin.officialExports ?? {}))
    if (exported.get(alias) !== local) throw Error(`${label}: exports ${alias} as ${exported.get(alias)}, not ${local}`);
  for (const [name, features] of Object.entries(pin.features)) {
    const absent = features.filter(f => !text(declaration(name)).includes(f));
    if (absent.length) throw Error(`${label}: ${name} lacks ${absent.map(f => JSON.stringify(f)).join(', ')}`);
  }
  for (const [name, features] of Object.entries(pin.uses ?? {})) {
    const absent = features.filter(f => !text(declaration(name)).includes(f));
    if (absent.length) throw Error(`${label}: call site ${name} lacks ${absent.map(f => JSON.stringify(f)).join(', ')}`);
  }
  const closure = new Set(), imports = new Map();
  const visit = name => {
    if (closure.has(name) || imports.has(name)) return;
    const binding = program.scope.getBinding(name);
    if (!binding) throw Error(`${label}: unbound ${name}`);
    if (binding.path.isImportSpecifier()) {
      imports.set(name, `${binding.path.parent.source.value.replace(/^\.\//, '')}:${binding.path.node.imported.name}`);
      return;
    }
    closure.add(name);
    for (const [dep, b] of Object.entries(program.scope.bindings))
      if (b.referencePaths.some(q => within(binding.path, q)) || b.constantViolations.some(q => within(binding.path, q))) visit(dep);
  };
  pin.roots.forEach(visit);
  const listed = [...pin.bindings].sort(), reached = [...closure].sort();
  if (JSON.stringify(listed) !== JSON.stringify(reached)) throw Error(`${label}: closure of ${pin.roots.join(',')} is ${reached.join(',')}, emit lists ${listed.join(',')}`);
  const expectedImports = JSON.stringify(Object.entries(pin.imports ?? {}).sort());
  const actualImports = JSON.stringify([...imports].sort());
  if (actualImports !== expectedImports) throw Error(`${label}: replaced imports are ${actualImports}, expected ${expectedImports}`);
  for (const [via, features] of Object.entries(pin.dependencies ?? {})) {
    const [file, alias] = via.split(':');
    const slice = await exportedDeclaration(directory, file, alias);
    if (slice === null) throw Error(`${label}: ${file} no longer exports ${alias} as a top-level declaration`);
    const absent = features.filter(f => !slice.includes(f));
    if (absent.length) throw Error(`${label}: ${file} ${alias} lacks ${absent.map(f => JSON.stringify(f)).join(', ')}`);
  }
  // react: a replaced vendor-frame import must still be the React member the emit imports instead (the chunk assigns
  // `<local>=<namespace>.<member>`, checked on the minified bytes as extract-r3b-transcript.mjs does).
  for (const [name, member] of Object.entries(pin.react ?? {})) {
    const [file, alias] = (pin.imports?.[name] ?? '').split(':');
    const { bytes, exported: raw } = await rawChunk(directory, file);
    const local = raw.get(alias)?.replace(/\$/g, '\\$');
    if (!local || !new RegExp(`(?<![\\w$.])${local}=[\\w$]+\\.${member}\\b`).test(bytes)) throw Error(`${label}: ${file} ${alias} is no longer React ${member}`);
  }
  // viewTabs: a replaced import is the declaration the view-tabs graph publishes under that semantic name (D1), so the
  // emit's `import {<name> as <local>} from '../view-tabs/<file>'` (or the host stand-in for it) names the same value.
  if (pin.viewTabs) {
    // Every pin slices 3.6556.2 (cc-rest-terminal-b), so it reads the current view-tabs publication, never the 2.42304.0
    // legacy section.
    const { publicNames } = await viewTabsManifestFor(pin.version);
    for (const [name, semantic] of Object.entries(pin.viewTabs)) {
      const [file, alias] = (pin.imports?.[name] ?? '').split(':');
      const { exported: raw } = await rawChunk(directory, file);
      const entry = publicNames[semantic];
      if (!entry || entry.file !== file || entry.local !== raw.get(alias)) throw Error(`${label}: ${file} ${alias} (${raw.get(alias)}) is not view-tabs ${semantic}`);
    }
  }
  // reexport: the declaration (checked above by its features) is what view-tabs publishes under that semantic name in
  // the same official file, so `export {<name>} from '../view-tabs/<source>'` names this very binding.
  if (pin.reexport) {
    const { referenceVersion, publicNames } = await viewTabsManifestFor(pin.version);
    for (const [local, semantic] of Object.entries(pin.reexport)) {
      declaration(local);
      const entry = publicNames[semantic];
      if (!entry || entry.file !== pin.source || entry.local !== local) throw Error(`${label}: view-tabs ${referenceVersion} ${semantic} is not ${pin.source} ${local}`);
    }
  }
  // routinesShared: the official exports are linked, not sliced (routines-shared's copy is this very declaration).
  if (pin.routinesShared) await routinesSharedLink({ referenceVersion: v3, ionSource: directory, target: pin.routinesShared, source: pin.source, names: Object.values(pin.officialExports) });
  return [...pin.bindings];
}
