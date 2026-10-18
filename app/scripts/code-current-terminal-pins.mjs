// R3-terminal FT-03/FT-04 (research/files-terminal.md §4.3, §5 terminal): pins for the terminal helpers that
// scripts/extract-code-ui-current.mjs emits from the 2.42304.0 renderer. Before an emit slices its hand-listed binding
// set, this module checks, against the shipped chunk:
//   - the set is exactly the same-chunk closure of the roots the helper exports (stopping at imports);
//   - every binding still carries feature strings of its original text;
//   - the chunk still exports the roots under the official aliases its consumers import (officialExports);
//   - the imports the emit replaces are exactly the ones listed, and each still names the same kind of declaration in
//     its chunk (dependencies);
//   - the official call sites that give a binding its meaning are still there (uses), e.g. the link handler's
//     `r.button !== 0 || xn(e, r)` for the selection guard.
// The binding lists replace the 2.31226.0 terminal adapters of extract-code-editor.mjs (generated/code-editor
// terminal-selection/-output/-mouse/-colors/-titles); research/files-terminal-data/maps/map-old3.json maps every old
// binding to these, all identical except the title description (now terminal-description.mjs, R2-files).
import fs from 'node:fs/promises';
import path from 'node:path';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const terminal = 'c6bf19e8f-oq2b1_8O.js', titles = 'cf718f694-jeQhHLuv.js', pane = 'cccc2cf0a-B0D--VZp.js';
export const terminalPins = {
  // c6bf19e8f selection pill geometry (old 2.31226.0 Br..Yr): pi's onSelectionChange/onScroll and li use them.
  'terminal-geometry.mjs': {
    source: terminal, roots: ['ri', 'ii', 'oi', 'si', 'ci'], bindings: ['$r', 'ei', 'ni', 'ri', 'ii', 'ai', 'oi', 'si', 'ci'],
    features: {
      $r: ['$r = 8'], ei: ['ei = 16'], ni: ['ni = 0'], ri: ['t.x === 0 && t.y > e.y ? t.y - 1 : t.y'],
      ii: ['.xterm-screen', 'below: n >= c + a'], ai: ['t.getChars().trim() !== ""', 'n + t.getWidth()'],
      oi: ['r.y === e.buffer.active.baseY + e.rows - 1'], si: ['beside: !0', 'Math.max(a, r.cursorX + 1)'],
      ci: ['["below", "above"]', 'e.x + $r + i'],
    },
    uses: { pi: ['let i = oi(e, n)', 'a = i ? si(e, D.current) : void 0', 'sel: ii(e, D.current, o.y, n)', 'c = i ? n.start.y : ri(n)'], li: ['} = ci('] },
  },
  // c6bf19e8f attach-visible-output and the replay-banner normalization (old kn,jn,Mn,Nn,Pn,Kn).
  'terminal-output.mjs': {
    source: terminal, roots: ['$n', 'Vn'], bindings: ['In', 'Rn', 'zn', 'Bn', 'Vn', '$n'],
    features: {
      In: ['In = "[shell reconnected '], Rn: ['Math.ceil(47 / e)'], zn: ['e.slice(47)', 'r.trim() !== ""'],
      Bn: ['e.trimEnd().length'], Vn: ['zn(Bn(e))'], $n: ['e.selectLines(n, t.viewportY + e.rows - 1)', 'e.clearSelection(), t(r), !0'],
    },
    uses: { mi: ['attachVisibleTerminalOutput: $n'], Wr: ['Vn(e.getSelection())'] },
  },
  // c6bf19e8f Ur: a program with mouse tracking owns the right click (Gr's host contextmenu listener).
  'terminal-mouse.mjs': {
    source: terminal, roots: ['Ur'], bindings: ['Ur'],
    imports: { ae: 'shared-78-D6VXYXaQ.js:kw' },
    dependencies: { 'shared-78-D6VXYXaQ.js:kw': ['window.navigator.userAgent.toLowerCase()'] },
    features: { Ur: ['t.button === 2 || (n && t.ctrlKey)', 'e.modes.mouseTrackingMode === "none"', 'macOptionClickForcesSelection === !0'] },
    uses: { Gr: ['Ur(l, e) && e.preventDefault()'] },
  },
  // c6bf19e8f Mn..Fn: color OSC writes are swallowed so the UI theme stays; queries pass (old Tn,En,Dn,On).
  'terminal-colors.mjs': {
    source: terminal, roots: ['Nn'], bindings: ['Mn', 'Nn', 'Pn', 'Fn'],
    features: { Mn: ['[4, 10, 11, 12, 104, 110, 111, 112]'], Nn: ['registerOscHandler(t, (e) => (t === 4 ? !Pn(e) : !Fn(e)))'], Pn: ['t[e] !== "?"'], Fn: ['t.every((e) => e === "?")'] },
    uses: { Gr: ['Nn(l);'] },
  },
  // c6bf19e8f xn (terminal-01): a link click opens nothing while it would end a real selection drag.
  'terminal-link-selection.mjs': {
    source: terminal, roots: ['xn'], bindings: ['xn'],
    features: { xn: ['t.metaKey || t.ctrlKey || t.shiftKey || t.altKey', 'e.modes.mouseTrackingMode !== "none"', 'e.getSelection().length > 1'] },
    uses: { Sn: ['r.button !== 0 || xn(e, r)'] },
  },
  // c6bf19e8f Kr..Qr (term-v01): the structured start/load error kinds and their copy; pi shows `raw` text as is and
  // gives every kind but needsNewerApp a Try again.
  'terminal-errors.mjs': {
    source: terminal, roots: ['Kr', 'qr', 'Jr', 'Xr', 'Qr'], bindings: ['Kr', 'qr', 'Jr', 'Xr', 'Qr'],
    imports: { fe: 'vendor-intl-Db7hDWRO.js:f' },
    dependencies: { 'vendor-intl-Db7hDWRO.js:f': ['function tn(e){return e}'] },
    features: {
      Kr: ['kind: "needsNewerApp"'], qr: ['kind: "startFailed"'], Jr: ['kind: "loadFailed"'],
      Xr: ['"Failed to start shell"', '"qBdy2LvKK+"', '"Failed to load terminal"', '"1cJ4l/q4+v"', '"dwzB+ieWx6"'],
      Qr: ['e === "Session not found"', '{ kind: "raw", text: e }'],
    },
    uses: { pi: ['A.kind === "raw" ? A.text : i(M, { ...Xr[A.kind] })', 'A.kind !== "needsNewerApp"', 'Qr(t?.error, l, e)', 'defaultMessage: "Shell exited"'] },
  },
  // shared-25 jU (exported Vt): drop lone surrogates, keeping well-formed text as is.
  'terminal-title-wellformed.mjs': {
    source: 'shared-25-DP8p7i1Z.js', roots: ['jU'], bindings: ['OU', 'kU', 'jU'], officialExports: { Vt: 'jU', Bt: 'kU' },
    features: { OU: ['i >= 55296 && i <= 56319 && a >= 56320 && a <= 57343'], kU: ['e.isWellFormed'], jU: ['kU(e) ? e : OU(e, "")'] },
  },
  // shared-0 XP (exported Zl): the blank-looking code points the title whitespace class adds.
  'terminal-title-invisibles.mjs': {
    source: 'shared-0-ByI5P0CP.js', roots: ['XP'], bindings: ['YP', 'XP'], officialExports: { Zl: 'XP', Ql: 'YP' },
    features: { YP: ['[10240, 65532, 119129, 78913, 78914, 92432, 94180]'], XP: ['e.toString(16)'] },
  },
  // shared-52 Uj (exported Ma): caps runs of blank/combining characters by display width; Pj (ja) is their class.
  'terminal-title-runs.mjs': {
    source: 'shared-52-DGviI8xb.js', roots: ['Uj', 'Pj'], bindings: ['Pj', 'Uj', 'Gj', 'Kj', 'qj', 'Jj', 'Yj'], officialExports: { Ma: 'Uj', ja: 'Pj' },
    imports: { F: 'shared-0-ByI5P0CP.js:Py' },
    dependencies: { 'shared-0-ByI5P0CP.js:Py': ['function Hi(e){let t,n=!1;return()=>(n||=(t=e(),!0),t)}'] },
    features: {
      Pj: ['\\\\u2800\\\\u3164', '\\\\u{E0000}-\\\\u{E01EF}'], Uj: ['if (o.length + t.length > 2 * i) break;', 'let e = Jj(t);'], Gj: ['Gj = 128'],
      Kj: ['["\\u200C", 0]', '["\\u3000", 2]'], qj: ['/^[\\p{Mn}\\p{Me}]$/u'], Jj: ['Kj.get(e) ?? 1', 't >= 917504 && t <= 917999'], Yj: ['{5,}/gu'],
    },
  },
  // shared-78 Xw/Yw/eT (exported l_/p_/y_): the title sanitizer cf718f694 X applies (control and format characters,
  // marks, whitespace, the 4000-character window and the long blank-run cap, then a code-point limit).
  'terminal-title-text.mjs': {
    source: 'shared-78-D6VXYXaQ.js', roots: ['Xw', 'Yw', 'eT'],
    bindings: ['ww', 'Tw', 'Dw', 'Ow', 'kw', 'Mw', 'Uw', 'Gw', 'qw', 'Yw', 'Xw', 'Qw', '$w', 'eT'], officialExports: { l_: 'Xw', p_: 'Yw', y_: 'eT' },
    imports: { Ce: 'shared-25-DP8p7i1Z.js:Vt', dn: 'shared-0-ByI5P0CP.js:Py', Rr: 'shared-52-DGviI8xb.js:Ma', Oi: 'shared-52-DGviI8xb.js:ja', Cn: 'shared-0-ByI5P0CP.js:Zl' },
    features: {
      ww: ['\\p{Default_Ignorable_Code_Point}\\u034F\\u115F\\u1160\\u3164'], Tw: ['RegExp(`${Oi}{5,}`, "gu")'], Dw: ['Dw = Cn'],
      Ow: ['RegExp(`[\\\\s${Dw}]+`, "gu")'], kw: ['[\\\\p{Mn}\\\\p{Me}\\\\u200C\\\\u200D]+'], Mw: ['Ce(e).replace(ww()'],
      Uw: ['Rr(t, Tw(), 32).replace(kw(), "$1").replace(Ow, " ").trim()'], Gw: ['Gw = 4e3'], qw: ['return Mw(e);'], Yw: ['$w(e, qw)'],
      Xw: ['.replace(/[\\u200C\\u200D]/g, "")'], Qw: ['\\p{Noncharacter_Code_Point}'], $w: ['Uw(t(Ce(e.slice(0, Gw))).replace(Qw(), " "))'],
      eT: ['Array.from(e.replace(/\\p{Cs}/gu, ""))'],
    },
  },
  // cf718f694 be/me/J/ge/G (exported r/a/n/s/o): running command (OSC 133 C cmdline_url after 500ms) or shell title per
  // ptyKey (old 2.31226.0 ge/ue/q/fe/W, identical).
  'terminal-titles.mjs': {
    source: titles, roots: ['be', 'me', 'J', 'ge', 'G'],
    bindings: ['V', 'H', 'U', 'ue', 'fe', 'pe', 'G', 'K', 'me', 'ge', 'q', 'J', 'Y', 'X', '_e', 've', 'ye', 'be'],
    officialExports: { r: 'be', a: 'me', n: 'J', s: 'ge', o: 'G' },
    imports: {
      a: 'shared-0-ByI5P0CP.js:gy', ee: 'vendor-all-0-CTKbbUUg.js:I', s: 'shared-78-D6VXYXaQ.js:l_', c: 'shared-78-D6VXYXaQ.js:p_',
      l: 'shared-78-D6VXYXaQ.js:y_', p: 'shared-52-DGviI8xb.js:ms',
    },
    dependencies: { 'shared-0-ByI5P0CP.js:gy': ['t===void 0?Qa(e):t'], 'shared-52-DGviI8xb.js:ms': ['growthbook', '"unknown"'] },
    features: {
      V: ['"__gb__736896549"'], H: ['H = 133'], U: ['"cmdline_url="'], ue: ['ue = 200'], fe: ['fe = 500'], pe: ['/^[0-9A-Fa-f]{2}$/'],
      G: ['ee(() => ({ byPtyKey: {} }))'], K: ['K = new Map()'], me: ['n?.command ?? n?.reported'], ge: ['p(V) !== "off"'],
      q: ['clearTimeout(K.get(e)), K.delete(e)'], J: ['if (!(e in t.byPtyKey)) return t;'], Y: ['i.reported === r?.reported && i.command === r?.command'],
      X: ['l(c(e), ue).trim()', 's(t) === "" ? void 0 : t'], _e: ['(?:Administrator: )?'], ve: ['_e.test(t) ? void 0 : t'],
      ye: ['.slice(12, 2412)', 'new TextDecoder().decode(new Uint8Array(n))'], be: ['e.parser.registerOscHandler(H', 'r !== "A" && r !== "C" && r !== "D"', 'a(V) !== !1'],
    },
  },
  // cf718f694 B/z (exported c; terminal-09): the dimmed idle cursor ShellTerminal draws until its xterm is in place,
  // blinking with the Blink cursor preference (epitaxy-terminal-cursor-blink) while __gb__2265785636 is on.
  'terminal-idle-cursor.mjs': {
    source: titles, roots: ['B'], bindings: ['w', 'E', 'z', 'B'], officialExports: { c: 'B', h: 'w', u: 'E' },
    imports: { e: 'vendor-frame-DfPJ1QmD.js:Va', r: 'vendor-frame-DfPJ1QmD.js:za', h: 'shared-28-DcgD7xXH.js:gs', te: 'c51596d2b-Dr10h3fs.js:_' },
    react: { e: 'jsx' }, viewTabs: { r: 'clsx' },
    dependencies: { 'shared-28-DcgD7xXH.js:gs': ['key:`persisted.${e}`'], 'c51596d2b-Dr10h3fs.js:_': ['getForcedFeatures().has(i)', 'return t||!a'] },
    features: {
      w: ['"__gb__2265785636"'], E: ['"epitaxy-terminal-cursor-blink"'], z: ['te(w)', 'h(E, void 0)', '!e || t !== !1'],
      B: ['"data-blink": c', 'pointer-events-none block h-[1lh] w-[1ch] opacity-50', 'c && "motion-safe:animate-blink"', 'lineHeight: "normal"'],
    },
  },
  // cf718f694 _/oe/b/le (exported D/T/S): the window's terminal registry ShellTerminal fills (c6bf19e8f Ee) and the
  // pane's Clear terminal item reads (cccc2cf0a Md/jd).
  'terminal-registry.mjs': {
    source: titles, roots: ['oe', 'b', 'le'], bindings: ['_', 'oe', 'b', 'le'], officialExports: { D: 'oe', T: 'b', S: 'le' },
    features: { oe: ['_ = e;'], b: ['_?.has(e) ?? !1'], le: ['_?.clearSelection(e), _?.clear(e)'] },
  },
  // cccc2cf0a Xy/Zy/Yy (terminal-07): a tab's Clear terminal item, disabled with "No terminal to clear" when its view is
  // mounted but has no live terminal, "Switch to this terminal first." when it never showed here.
  'terminal-clear-item.mjs': {
    source: pane, roots: ['Zy', 'Xy', 'Yy'], bindings: ['Yy', 'Xy', 'Zy'],
    imports: {
      u: 'vendor-frame-DfPJ1QmD.js:Co', g: 'vendor-frame-DfPJ1QmD.js:Va', Qn: 'shared-frame-BfjMqbuN.js:Ii', X: 'vendor-intl-Db7hDWRO.js:l',
      Z: 'vendor-intl-Db7hDWRO.js:p', jd: 'cf718f694-jeQhHLuv.js:S', Md: 'cf718f694-jeQhHLuv.js:T',
    },
    react: { u: 'useState', g: 'jsx' }, viewTabs: { Qn: 'CdsContextMenu' },
    dependencies: {
      'shared-frame-BfjMqbuN.js:Ii': ['Item:EC.Item'], 'vendor-intl-Db7hDWRO.js:l': ['u(Wt,Ut)'],
      'cf718f694-jeQhHLuv.js:S': ['_?.clearSelection(e),_?.clear(e)'], 'cf718f694-jeQhHLuv.js:T': ['_?.has(e)??!1'],
    },
    features: {
      Yy: ['Yy = new Map()'], Xy: ['Md(e) ? "terminal" : Yy.has(e) ? "viewOnly" : "noView"'],
      Zy: ['u(() => Xy(e))', '"No terminal to clear"', '"9WbosGezgw"', '"Switch to this terminal first."', '"IcvUF27v0e"', 'disabled: n !== "terminal"', 'onClick: () => jd(e)', '"m6UYaDfqaN"'],
    },
    uses: { Vy: ['g(Zy, { ptyKey: zu(t, e) })'], Jy: ['Yy.set(b, (Yy.get(b) ?? 0) + 1)', 'e > 0 ? Yy.set(b, e) : Yy.delete(b)'] },
  },
  // R3-terminal FT-15 (terminal-10, global-v01): the shared view-tab strip's overflow menu row cfe7c4b3b ce (2.31226.0
  // I, which closed on ArrowRight/Delete/Backspace whatever the modifiers): a close key with Control, Meta or Alt is
  // left alone, a held key's repeats only preventDefault, and after closing the key's repeats are swallowed on the
  // row's window (shared-19 ba = dZ). The strip's compact size table R (the 2.37337.1 logical `ps-[2px]` that
  // extract-code-editor.mjs used to patch into the old output), the typeahead reset keys L and the RTL key flip I that
  // the menu se applies come along. The Preview and terminal strips' overflow menu (source-preview-tab-overflow.jsx)
  // renders this row.
  'terminal-tab-overflow.mjs': {
    source: 'cfe7c4b3b-CP-IQXj8.js', roots: ['ce', 'R', 'L', 'I'], bindings: ['N', 'I', 'L', 'ce', 'R'],
    imports: {
      c: 'vendor-frame-DfPJ1QmD.js:eo', p: 'vendor-frame-DfPJ1QmD.js:uo', i: 'vendor-frame-DfPJ1QmD.js:Va', n: 'vendor-frame-DfPJ1QmD.js:Ha',
      h: 'vendor-frame-DfPJ1QmD.js:za', g: 'shared-25-DP8p7i1Z.js:Ff', b: 'shared-19-CkPOiIKm.js:ba', O: 'shared-frame-BfjMqbuN.js:qa',
      D: 'shared-frame-BfjMqbuN.js:ou', S: 'shared-frame-BfjMqbuN.js:Hl', x: 'shared-frame-BfjMqbuN.js:Dc',
    },
    react: { c: 'createContext', p: 'useCallback', i: 'jsx', n: 'jsxs' },
    viewTabs: { h: 'clsx', S: 'CdsIcon', x: 'CdsOverflowTooltip', O: 'CdsDropdown' },
    dependencies: {
      'shared-25-DP8p7i1Z.js:Ff': ['e.ownerDocument)?.defaultView??null'],
      'shared-19-CkPOiIKm.js:ba': ['t.key===e&&t.repeat?(t.preventDefault(),t.stopPropagation()):i()', 't.addEventListener("keydown",n,!0)'],
      'shared-frame-BfjMqbuN.js:qa': ['Item:XS'], 'shared-frame-BfjMqbuN.js:ou': ['e&&e!=="base"?{"data-size":e}:{}'],
      'shared-frame-BfjMqbuN.js:Hl': ['"data-cds":"Icon"'], 'shared-frame-BfjMqbuN.js:Dc': ['"data-cds":"OverflowTooltip"'],
    },
    features: {
      N: ['N = c("xs")'], I: ['e === "ArrowLeft"', '? "ArrowRight"'], L: ['"ArrowUp",', '"ArrowRight",', '"Delete",'],
      ce: [
        'let d = e.closable !== !1,', 'let t = s ? I(e.key) : e.key;', '!e.ctrlKey &&', '!e.metaKey &&', '!e.altKey &&',
        '(t === "ArrowRight" || t === "Delete" || t === "Backspace")', 'if ((e.preventDefault(), e.stopPropagation(), e.repeat)) return;',
        'let t = g(e.currentTarget);', '(t && b(e.key, t), m());', 'd && e.button === 1 && (e.preventDefault(), m());',
        '"aria-describedby": d ? t : void 0,', 'className: "gap-sm",', 'i(N, { value: u.leadGlyph, children: e.icon })', '...D(u.closeSize),',
        '"grid shrink-0 cursor-interactive place-items-center rounded-sm text-muted-as-secondary hover:bg-fill-ghost-hover hover:text-primary"',
        'i(S, { name: "X", size: u.closeGlyph })', 'i(x, { delay: 700, hoverable: !1, children: e.label })', 'className: "text-caption text-muted-as-secondary"',
      ],
      R: ['tabIconShed: "min-w-0 ps-[2px]"', 'tabNoIcon: "min-w-[6px] ps-[6px]"', 'basis: "basis-[192px]"', 'closeGlyph: "xs"', 'closeInMenuRow: ""'],
    },
    uses: {
      se: ['h = a() === "rtl"', 'L.has(h ? I(e.key) : e.key) && (v.current = !1)', 'onContextMenu: F,', 'onKeyDownCapture: b,', 'delay: 700,', 'hintIds: `${m} ${s}`,',
        'rtl: h,', '_ = e.some((e) => e.closable !== !1),', 'children: h ? o.closeTabHintRtl : o.closeTabHint,'],
      ue: ['return !e || t !== "comfortable"', '? R'],
    },
  },
  // shared-frame aa (exported ou): the CDS size attribute ce spreads on the close glyph's box (`closeSize`, undefined in R).
  'terminal-tab-size-attrs.mjs': {
    source: 'shared-frame-BfjMqbuN.js', roots: ['aa'], bindings: ['aa'], officialExports: { ou: 'aa' },
    features: { aa: ['return e && e !== "base" ? { "data-size": e } : {};'] },
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
    const { publicNames } = JSON.parse(await fs.readFile(path.resolve(import.meta.dirname, '../src/generated/view-tabs/manifest.json'), 'utf8'));
    for (const [name, semantic] of Object.entries(pin.viewTabs)) {
      const [file, alias] = (pin.imports?.[name] ?? '').split(':');
      const { exported: raw } = await rawChunk(directory, file);
      const entry = publicNames[semantic];
      if (!entry || entry.file !== file || entry.local !== raw.get(alias)) throw Error(`${label}: ${file} ${alias} (${raw.get(alias)}) is not view-tabs ${semantic}`);
    }
  }
  return [...pin.bindings];
}
