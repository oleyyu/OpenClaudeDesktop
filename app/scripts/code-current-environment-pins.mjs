// R2-home (home-env-03 / home-env-04 / map-cc-env / SC-ENV, research/home-env.md §2.9 and §5 WI-03/WI-04): pins for the
// environment-* helpers that scripts/extract-code-ui-current.mjs emits from the 2.42304.0 renderer. Before each emit
// this checks that the hand-listed binding set is exactly the same-chunk closure of the roots the helper exports (minus
// the locals the emit replaces with host adapters), that every binding still carries feature strings of its original
// text, that the chunk still exports the roots under the official aliases its consumers import, and that every replaced
// import still names the same export of its vendor/shared chunk. Minified names are reused for unrelated values between
// releases (2.37337.1 `lt` was the default branch, 2.42304.0 `lt` is an import), so a re-pointed name fails here instead
// of emitting the wrong binding.
import fs from 'node:fs/promises';
import path from 'node:path';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const vendor = 'vendor-frame-DfPJ1QmD.js', frame = 'shared-frame-BfjMqbuN.js', intl = 'vendor-intl-Db7hDWRO.js';
const react = member => ({ react: member });

export const environmentHelperPins = {
  // c29df1c52 v/y (2.37337.1 _/v): the environment form's scroll body class and its bordered footer.
  'environment-form-layout.mjs': {
    source: 'c29df1c52-Ba85JL5f.js', roots: ['v', 'y'], bindings: ['v', 'y'], officialExports: { n: 'v', i: 'y' },
    imports: { n: `${vendor}:Va`, o: `${frame}:Js` },
    dependencies: { [`${vendor}:Va`]: react('jsx'), [`${frame}:Js`]: ['Footer:D_', 'CloseButton:'] },
    features: { v: ['scroll-fade-y px-xl pt-3 pb-sm', 'min-h-[calc-size(min-content,min(size,6rem))]'], y: ['-mx-pad-xl mt-auto border-t px-xl pt-lg', 'className: "mt-0"'] },
  },
  // shared-52 n_ (2.37337.1 ty): a path's last segment.
  '../../../electron/generated/environment-basename.mjs': {
    source: 'shared-52-DGviI8xb.js', roots: ['n_'], bindings: ['n_'], officialExports: { wd: 'n_' },
    features: { n_: ['t.lastIndexOf("/")', 't.lastIndexOf("\\\\")'] },
  },
  // shared-18 jR (2.37337.1 rB): a path's parent folder.
  '../../../electron/generated/environment-parent.mjs': {
    source: 'shared-18-D4XxL6Tg.js', roots: ['jR'], bindings: ['jR'], officialExports: { An: 'jR' },
    features: { jR: ['e.lastIndexOf("/")', 'e.slice(0, t)'] },
  },
  // cd0cf5b5e (2.37337.1 cd0cf5b5e-zXuejA0A): saved-environment record model. 2.42304.0 renames _e..Le and changes y,
  // which now keeps an additional folder's branch only with its worktree.
  '../../../electron/generated/environment-presets.mjs': {
    source: 'cd0cf5b5e-BajR1nyG.js', roots: ['c', 'l', 'fe', 'm', 'g', 'y', 'ke', 'x', 'S', 'Re', 'D', 'O'],
    bindings: ['c', 'ue', 'de', 'fe', 'l', 've', 'ye', 'm', 'g', 'v', 'y', 'ke', 'Ae', 'b', 'je', 'Me', 'Ne', 'Pe', 'x', 'S', 'Re', 'D', 'O'],
    // x / Re / D are module-internal in the chunk (no export alias); the host uses them through this module.
    officialExports: { W: 'c', G: 'l', U: 'fe', k: 'm', b: 'g', p: 'y', E: 'ke', N: 'S', S: 'O' },
    imports: { o: 'shared-52-DGviI8xb.js:wd', re: 'shared-18-D4XxL6Tg.js:An' },
    dependencies: { 'shared-52-DGviI8xb.js:wd': ['lastIndexOf("/")'], 'shared-18-D4XxL6Tg.js:An': ['return t>0?e.slice(0,t):null'] },
    features: {
      c: ['e.trim().toLowerCase() === t.trim().toLowerCase()'], ue: ['"worktrees"', '".claude"'],
      y: ['e === !0 && (n[r] = { worktree: e, ...(i ? { branch: i } : {}) })'], ke: ['worktree === !0) ==', 'branch || void 0'],
    },
  },
  // ca690a791 (2.37337.1 ca690a791-Dbu-vGd9): the environment dialog's draft model, branch model and height hold.
  // ht replaces the deleted lt (default branch from the repo info), gt returns {pick, none}, vt takes firstWorktree,
  // Ot holds the popup height per view (Tt/Et/F/Dt), Qt is the new max-h class over --environment-dialog-cap.
  'environment-dialog-model.mjs': {
    source: 'ca690a791-BG2HOgzO.js',
    roots: ['mt', 'ht', 'gt', '_t', 'vt', 'yt', 'xt', 'Nt', 'Ft', 'Bt', 'Wt', 'qt', 'Ot', 'Qt', 'Tt', '$t', 'en', 'Zt', 'rn'],
    bindings: ['mt', 'ht', 'gt', '_t', 'vt', 'yt', 'xt', 'Nt', 'Pt', 'Ft', 'Bt', 'Wt', 'qt', 'Kt', 'sn', 'Tt', 'Et', 'F', 'Dt', 'Ot', 'Qt', '$t', 'en', 'Zt', 'rn'],
    imports: {
      i: `${vendor}:So`, d: `${vendor}:yo`, c: `${vendor}:ho`, f: 'shared-25-DP8p7i1Z.js:Ff', v: 'shared-1-CAAiD7E3.js:_',
      b: 'shared-52-DGviI8xb.js:wd', k: 'cd0cf5b5e-BajR1nyG.js:p', Be: 'cd0cf5b5e-BajR1nyG.js:E',
    },
    dependencies: {
      [`${vendor}:So`]: react('useRef'), [`${vendor}:yo`]: react('useLayoutEffect'), [`${vendor}:ho`]: react('useEffectEvent'),
      'shared-25-DP8p7i1Z.js:Ff': ['.ownerDocument)?.defaultView??null'], 'shared-1-CAAiD7E3.js:_': ['"AltGraph"', '"CapsLock"'],
      'shared-52-DGviI8xb.js:wd': ['lastIndexOf("/")'], 'cd0cf5b5e-BajR1nyG.js:p': ['e===!0&&(n[r]={worktree:e'],
      'cd0cf5b5e-BajR1nyG.js:E': ['worktree===!0==(t?.[n]?.worktree===!0)'],
    },
    features: {
      mt: ['e === "main" ? 0 : e === "master" ? 1 : 2'], ht: ['e?.defaultBranch ??', 'n === "local"', 'e === "main" || e === "master"'],
      gt: ['"starts-worktree"', '"switches-folder"', 'mark: "default"', 'mark: "current"', '"Current branch"'],
      _t: ['"Not a Git repository"'], vt: ['firstWorktree: a', 'worktree: c === 0 ? a'], yt: ['worktree: t?.worktree ?? !1'],
      Nt: ['nameDirty: r !== void 0', 'name: r ?? b(e.cwd)'], Ft: ['!Be(', 'k(t.additionalFolders, t.folderSettings)'],
      qt: ['additionalFolders: e.additionalFolders', 'folderSettings: n'], Tt: ['"--pinned-popup-open-height"'],
      Et: ['"pointerdown"', '"keydown"', '"click"'], F: ['e.style.top !== ""'], Dt: ['e.style.setProperty(Tt, `${t.height}px`)'],
      Ot: ['"--desktop-titlebar-inset"', 'v.has(t.key)', 'for (let e of Et) m.addEventListener(e, l, !0)', 'e.style.setProperty("height", `${s}px`)'],
      Qt: ['[--environment-dialog-cap:calc(100dvh_-_', 'max-h-[min(1056px,var(--environment-dialog-cap),', 'var(--pinned-popup-open-height,var(--environment-dialog-cap))'],
      $t: ['"min-h-0"'], en: ['"mb-0 gap-md pb-lg"'], Zt: ['"flex min-h-5 items-center gap-xs"'], rn: ['"h-5"'],
    },
  },
  // c0a531389 E: the head/tail split of a long folder name.
  'environment-name-parts.mjs': {
    source: 'c0a531389-TdrucM3-.js', roots: ['E'], bindings: ['E'], officialExports: { i: 'E' },
    features: { E: ['t.length < 16'] },
  },
  // c387a4508 i: a field header (label, "(optional)", tip, add slot); 2.42304.0 mutes "(optional)" as secondary.
  'environment-field-header.mjs': {
    source: 'c387a4508-D8y47PUE.js', roots: ['i'], bindings: ['i'], officialExports: { t: 'i' },
    imports: { e: `${vendor}:Ha`, t: `${vendor}:Va`, n: `${frame}:xd`, r: `${intl}:l` },
    dependencies: { [`${vendor}:Ha`]: react('jsxs'), [`${vendor}:Va`]: react('jsx'), [`${frame}:xd`]: ['return Gt(Y(e))'], [`${intl}:l`]: ['"MemoizedFormattedMessage"'] },
    features: { i: ['flex h-[1lh] items-center justify-between gap-sm', '"(optional)"', 'text-footnote text-muted-as-secondary'] },
  },
  // cd8823d73 (2.37337.1 cd8823d73-ByKW_cNu z/B/V/H/U): the folder field, list, empty box, row and name, plus the
  // 2.42304.0 row controls `he` that replace the folder's "More options" menu: the inline branch picker (searchable
  // menu over pe), the Worktree checkbox, the note and the X remove button. R3-home: ge (over ue) is the Folders
  // field's Select props for its "+ Add" control (outline sm, no caret, end-aligned w-max min-w-48 max-w-96 popup).
  'environment-folder-view.mjs': {
    source: 'cd8823d73-CFoM8Jt9.js', roots: ['B', 'V', 'H', 'U', 'W', 'de', 'he', 'pe', 'fe', 'q', 'J', 'ge'],
    bindings: ['B', 'V', 'H', 'U', 'W', 'G', 'K', 'de', 'fe', 'q', 'pe', 'me', 'J', 'he', 'ue', 'ge'],
    officialExports: { u: 'B', d: 'V', l: 'H', p: 'U', f: 'de', m: 'he', s: 'ge' },
    imports: {
      e: `${vendor}:Ca`, t: `${vendor}:Co`, r: `${vendor}:So`, s: `${vendor}:go`, n: `${vendor}:Ha`, i: `${vendor}:Va`,
      S: `${frame}:Hl`, E: `${frame}:kc`, C: `${frame}:Oc`, O: `${frame}:qa`, ee: `${frame}:ui`, x: `${frame}:Dc`, w: `${frame}:cl`, k: `${frame}:xd`,
      A: `${intl}:l`, j: `${intl}:p`, _: 'shared-104-Cqo2-vQh.js:Rp', P: 'ce574895a-h0uyeRAC.js:n',
      ie: 'c0a531389-TdrucM3-.js:i', ae: 'c387a4508-D8y47PUE.js:t',
    },
    dependencies: {
      [`${vendor}:Ca`]: react('flushSync'), [`${vendor}:Co`]: react('useState'), [`${vendor}:So`]: react('useRef'), [`${vendor}:go`]: react('useId'),
      [`${vendor}:Ha`]: react('jsxs'), [`${vendor}:Va`]: react('jsx'),
      [`${frame}:Hl`]: ['"data-cds":"Icon"'], [`${frame}:kc`]: ['closeDelay:t=200'], [`${frame}:Oc`]: ['content:e,detail:t', 'side:a="top"'],
      [`${frame}:qa`]: ['TriggerButton:mC', 'SearchablePopup:yC', 'GroupLabel:nC', 'Header:tC'], [`${frame}:ui`]: ['"data-cds":"Checkbox"'],
      [`${frame}:Dc`]: ['"data-cds":"OverflowTooltip"'], [`${frame}:cl`]: { window: 8000, features: ['"data-cds":"Button"', 'iconOnly:r=!1'] }, [`${frame}:xd`]: ['return Gt(Y(e))'],
      [`${intl}:l`]: ['"MemoizedFormattedMessage"'], [`${intl}:p`]: ['let e=o(K);return Mt(e),e'],
      'shared-104-Cqo2-vQh.js:Rp': ['removeItem:{defaultMessage:"Remove {item}"'], 'ce574895a-h0uyeRAC.js:n': ['headRef:i,head:a,identity:o,remeasureKey:s'],
      'c0a531389-TdrucM3-.js:i': ['t.length<16'], 'c387a4508-D8y47PUE.js:t': ['"(optional)"'],
    },
    features: {
      B: ['role: "group"', 'aria-labelledby'], V: ['rounded shadow-card-ring', 'role: "list"'],
      H: ['outline-dashed', 'text-muted-as-secondary'], U: ['group/place flex min-w-0', 'items-start gap-sm', 'mt-1.5 shrink-0 text-secondary', 'min-w-[45%]'],
      W: ['P({ headRef: a, head: s, identity: e, remeasureKey: "" })'], K: ['font-mono-ui'], q: ['e.typed && t !== ""'],
      pe: ['r.mark === "current"', 'checked: e === i ||'], me: ['side: "inline-start"', 'checkedRole: "radio"'], J: ['"data-place-first"'],
      he: [
        'max-w-[72%]', 'modal: !1', '"Branch for {label}:"', '"Switch to {branch}"', '"Start worktree from"', '"Switch this folder to"',
        '"Worktree for {label}"', '"Worktree"', '_.removeItem', 'size: "xxs"', 'group-hover/place:opacity-100', 'w-max min-w-64 max-w-96',
      ],
      ue: ['variant: "ghost"', 'align: "end"', 'className: "min-w-0 shrink"', 'popupClassName: "w-max min-w-48 max-w-96"'],
      ge: ['...ue', 'variant: "outline"', 'size: "sm"', 'hideCaret: !0', 'value: null', 'flex items-center gap-xs text-primary', 'name: "Add"', '"2/2yg+qAwp"'],
    },
  },
  // c227f4d5e zK..JK (2.37337.1 ca80fca8d tX..uX; the ca80fca8d family is gone): the environment menu's row actions.
  'environment-menu-controls.mjs': {
    source: 'c227f4d5e-Ba-r--Rl.js', roots: ['zK', 'BK', 'VK', 'HK', 'UK', 'JK'], bindings: ['zK', 'BK', 'VK', 'HK', 'UK', 'JK'],
    officialExports: { Sn: 'BK', wn: 'VK', xn: 'HK', Cn: 'UK', vn: 'JK' },
    imports: { D: `${vendor}:Va`, ro: `${frame}:Hl`, Z: `${intl}:l`, k: `${vendor}:Wn` },
    dependencies: { [`${vendor}:Va`]: react('jsx'), [`${frame}:Hl`]: ['"data-cds":"Icon"'], [`${intl}:l`]: ['"MemoizedFormattedMessage"'], [`${vendor}:Wn`]: ['?.direction??"ltr"'] },
    features: {
      zK: ['text-muted-as-secondary opacity-0', 'pointer-coarse:opacity-100', 'e.stopPropagation()'], BK: ['"Settings"'],
      VK: ['"ArrowLeft" : "ArrowRight"'], HK: ['", edit environment, right arrow"', '", environment settings, left arrow"'],
      UK: ['"env-picker-unstar"', '"StarSlash"'], JK: ['checkedRole: "radio"', 'role: "menuitemradio"'],
    },
  },
  // shared-frame xO/SO/wO/tx (2.37337.1 shared-frame-BjUcQ1Qc YE/XE/QE/qy): Field, Label, FieldError and TextInput of the
  // environment form. 2.42304.0 moves the TextInput paddings to logical ps/pe (Kb/$b/ex), mutes its slots with Mt and
  // lets FieldError wrap (wrap-break-word). Base UI's Field parts are the host's native field adapters.
  'environment-field-controls.mjs': {
    source: frame, roots: ['bO', 'xO', 'SO', 'wO', 'tx'],
    bindings: ['aa', 'Sn', 'Cn', 'Tn', 'En', 'Dn', 'gs', 'uh', 'dh', 'fh', 'ph', 'Fb', 'Ib', 'Lb', 'Rb', 'zb', 'Hb', 'Ub', 'Wb', 'Gb', 'Kb', 'qb', 'Xb', 'Zb', 'Qb', '$b', 'ex', 'Mt', 'tx', 'bO', 'xO', 'SO', 'wO'],
    officialExports: {},
    // X (twMerge joiner), Z (CDS copy lookup), $l (Button) and Jo (Icon) are the host's.
    hosts: { X: ['return Gt(Y(e));'], Z: ['return bn(W(vn), e, t, n);'], $l: ['iconOnly: r = !1'], Jo: ['"data-cds": "Icon"'] },
    imports: {
      q: `${vendor}:ro`, G: `${vendor}:eo`, W: `${vendor}:do`, V: `${vendor}:So`, f: `${vendor}:Co`, U: `${vendor}:bo`, J: `${vendor}:uo`,
      gt: `${vendor}:vo`, H: `${vendor}:Va`, T: `${vendor}:Ha`,
      Ue: `${vendor}:jt`, s: `${vendor}:At`, Ke: `${vendor}:kt`, v: `${vendor}:Et`, b: `${vendor}:Ft`,
    },
    dependencies: {
      [`${vendor}:ro`]: react('forwardRef'), [`${vendor}:eo`]: react('createContext'), [`${vendor}:do`]: react('useContext'),
      [`${vendor}:So`]: react('useRef'), [`${vendor}:Co`]: react('useState'), [`${vendor}:bo`]: react('useMemo'),
      [`${vendor}:uo`]: react('useCallback'), [`${vendor}:vo`]: react('useInsertionEffect'), [`${vendor}:Va`]: react('jsx'), [`${vendor}:Ha`]: react('jsxs'),
      // Base UI Field.Root / Field.Label / Field.Error / Field.Control and the field metadata hook (labelId/messageIds).
      [`${vendor}:jt`]: ['K(Wm,{children:K(oh,{...e,ref:t})})'], [`${vendor}:At`]: ['nativeLabel:o=!0', 'En("label",e,'],
      [`${vendor}:kt`]: ['match:a', 'setMessageIds:f'], [`${vendor}:Et`]: ['onValueChange:c', 'setFilled:b'], [`${vendor}:Ft`]: ['function Um(){return N(Hm)}'],
    },
    features: {
      Kb: ['h-control ps-md rounded'], $b: ['pe-'], ex: ['"pe-[calc((var(--cds-h-control)-var(--cds-h-control-nested))/2)]"'],
      tx: ['"data-cds": "TextInput"', 'Mt'], wO: ['"wrap-break-word"'], xO: ['"data-cds": "Field"'],
    },
  },
  // shared-1 GV: the modifier keys Ot ignores, so pressing only a modifier does not hold the dialog height.
  'environment-modifier-keys.mjs': {
    source: 'shared-1-CAAiD7E3.js', roots: ['GV'], bindings: ['GV'], officialExports: { _: 'GV' },
    features: { GV: ['"Alt"', '"AltGraph"', '"CapsLock"', '"Control"', '"Meta"', '"Shift"'] },
  },
  // shared-104 Fl (exported `Rp`): the common CDS copy; he labels its X "Remove {item}" from it.
  'environment-common-copy.mjs': {
    source: 'shared-104-Cqo2-vQh.js', roots: ['Fl'], bindings: ['Pl', 'Fl'], officialExports: { Rp: 'Fl' },
    features: { Pl: ['return e;'], Fl: ['removeItem: { defaultMessage: "Remove {item}", id: "GHRzoS0vqm" }'] },
  },
  // shared-frame wA (exported `ui`): the CDS Checkbox, with its box (CA over Ob), root (Ab) and glyph (Nb). The Base UI
  // Checkbox.Root (vendor-frame Q), the twMerge joiner X, the Icon Jo and the disabled-reason wrapper aD are host-provided.
  'environment-checkbox.mjs': {
    source: frame, roots: ['wA'], bindings: ['Mt', 'aa', '_s', 'vs', 'Ob', 'Ab', 'Mb', 'CA', 'Nb', 'wA'], officialExports: { ui: 'wA' },
    hosts: { X: ['return Gt(Y(e));'], Jo: ['"data-cds": "Icon"'], aD: ['H(Tl, {', 'onCheckedChange(e, t)'] },
    imports: { q: `${vendor}:ro`, Pe: `${vendor}:go`, f: `${vendor}:Co`, T: `${vendor}:Ha`, H: `${vendor}:Va`, ae: `${vendor}:Q`, Y: `${vendor}:za` },
    dependencies: {
      [`${vendor}:ro`]: react('forwardRef'), [`${vendor}:go`]: react('useId'), [`${vendor}:Co`]: react('useState'),
      [`${vendor}:Ha`]: react('jsxs'), [`${vendor}:Va`]: react('jsx'),
      [`${vendor}:Q`]: { window: 4000, features: ['role:"checkbox"', '"aria-checked":ye?"mixed":ve', 'e.key!=="Enter"'] },
      [`${vendor}:za`]: ['(e=arguments[n])&&(t=he(e))'],
    },
    features: {
      aa: ['"data-size": e'], _s: ['e.detail <= 1'], vs: ['_s(t)'], Ob: ['size-[var(--cds-checkbox)]', 'border border-strong'],
      Ab: ['inline-flex gap-xs text-start'], Mt: ['text-[color:var(--cds-text-stays-secondary,var(--cds-text-muted))]'], Mb: ['text-footnote leading-snug ${Mt}'], CA: ['group-data-[checked]/cb:bg-fill-accent', 'group-focus-visible/cb:shadow-focus'],
      Nb: ['e ? "Minus" : "Check"', '"var(--cds-checkbox-glyph)"'],
      wA: ['"data-cds": "Checkbox"', 'cds-reset group/cb', '[--cds-checkbox:var(--cds-checkbox-xxs)]', 'H(aD, { reason: l.disabled ? i : void 0'],
    },
  },
  // R3-home (home-env-05): shared-19 ZB/QB/$B/sV/A7 (with YB, j7), the environment picker's star keys. A local preset
  // stars as machine-preset:<id> (ZB over YB), either form lists it (QB, sV); This computer stars as local:this-computer
  // ($B) and is labelled by A7/j7. The starred store itself (XB and its toggle cV, exported `al`) is the host's.
  'environment-picker-keys.mjs': {
    source: 'shared-19-CkPOiIKm.js', roots: ['ZB', 'QB', '$B', 'sV', 'A7'], bindings: ['YB', 'ZB', 'QB', '$B', 'sV', 'j7', 'A7'],
    officialExports: { $c: 'ZB', el: 'QB', Xc: '$B', nl: 'sV', K: 'A7' },
    features: {
      YB: ['local: !0', 'ssh: !0', 'cloud: !1', 'bridge: !1'], ZB: ['`machine-preset:${e.id}`', '`preset:${e.id}`'],
      QB: ['[`preset:${e.id}`, `machine-preset:${e.id}`]'], $B: ['"local:this-computer"'], sV: ['t.some((t) => e.includes(t))'],
      j7: ['"This computer"', '"Red8UM0oCv"'], A7: ['return j7(e)'],
    },
  },
  // R3-home (home-env-05): c3f9f1667 Me (exported `f`, cc43287c9's LR) over I: whether this machine has any local
  // environment variable beyond CLAUDE_CONFIG_DIR / CLAUDE_CODE_TMPDIR, queried while the picker is open and re-read
  // after a save (je's revision). The desktop bridge `f` (shared-0 Em = LocalSessionEnvironment) and the revision store
  // je are host-provided.
  'environment-machine-variables.mjs': {
    source: 'c3f9f1667-DEkdCUsq.js', roots: ['Me'], bindings: ['I', 'Me'], officialExports: { f: 'Me' },
    hosts: { je: ['revision: 0', 'bump: () =>'] },
    imports: { n: `${vendor}:Co`, l: `${vendor}:mo`, f: 'shared-0-ByI5P0CP.js:Em' },
    dependencies: { [`${vendor}:Co`]: react('useState'), [`${vendor}:mo`]: react('useEffect'), 'shared-0-ByI5P0CP.js:Em': ['?.LocalSessionEnvironment'] },
    features: {
      I: ['"CLAUDE_CONFIG_DIR"', '"CLAUDE_CODE_TMPDIR"'],
      Me: ['je((e) => e.revision)', '!e || !f?.get', '!I.includes(e.toUpperCase())', '.catch(() => !0)', 'r.has && r.revision === t'],
    },
  },
  // R3-home (home-env-05, research/home-env.md §2.7): cc43287c9 k0 (environment row: labelDir auto, settings before
  // star), A0 (a kind's rows, filtered by the query), j0 (New environment), e2 (This computer), a2 (a preset's listed key),
  // l2/p2 (the menu's note and "No matches"). The menu body h2 is the host's (source-environment-menu.jsx): its remote
  // groups, chords and default-env offer have no host counterpart. X (Menu) and Zr (the starred store's toggle) are host
  // adapters; the row actions, star keys and machine-variable query are the generated modules above.
  'environment-menu-rows.mjs': {
    source: 'cc43287c9-DAfOi8yP.js', roots: ['k0', 'A0', 'j0', 'e2', 'a2', 'l2', 'p2'], bindings: ['k0', 'A0', 'j0', 'e2', 'a2', 'l2', 'p2'],
    officialExports: {},
    imports: {
      p: `${vendor}:Ha`, v: `${vendor}:Va`, u: `${vendor}:Ba`, X: `${frame}:qa`, Zu: `${frame}:Hl`, id: `${frame}:Vl`, Q: `${intl}:p`, Z: `${intl}:l`,
      qx: 'c227f4d5e-Ba-r--Rl.js:wn', Hx: 'c227f4d5e-Ba-r--Rl.js:vn', qy: 'c227f4d5e-Ba-r--Rl.js:Sn', Yv: 'c227f4d5e-Ba-r--Rl.js:Cn', tS: 'c227f4d5e-Ba-r--Rl.js:xn',
      Zr: 'shared-19-CkPOiIKm.js:al', Dr: 'shared-19-CkPOiIKm.js:$c', ti: 'shared-19-CkPOiIKm.js:el', oi: 'shared-19-CkPOiIKm.js:nl', Fr: 'shared-19-CkPOiIKm.js:K',
      LR: 'c3f9f1667-DEkdCUsq.js:f',
    },
    dependencies: {
      [`${vendor}:Ha`]: react('jsxs'), [`${vendor}:Va`]: react('jsx'), [`${vendor}:Ba`]: react('Fragment'),
      [`${frame}:qa`]: ['TriggerButton:mC', 'SearchablePopup:yC', 'GroupLabel:nC', 'Submenu:QS', 'SubmenuTrigger:ZS'], [`${frame}:Hl`]: ['"data-cds":"Icon"'],
      [`${frame}:Vl`]: ['onRemove:i,removeLabel:a'], [`${intl}:l`]: ['"MemoizedFormattedMessage"'], [`${intl}:p`]: ['let e=o(K);return Mt(e),e'],
      'c227f4d5e-Ba-r--Rl.js:wn': ['k()==="rtl"?"ArrowLeft":"ArrowRight"'], 'c227f4d5e-Ba-r--Rl.js:vn': ['role:"menuitemradio","aria-checked":!1'],
      'c227f4d5e-Ba-r--Rl.js:Sn': ['icon:"Settings"'], 'c227f4d5e-Ba-r--Rl.js:Cn': ['"env-picker-unstar"'], 'c227f4d5e-Ba-r--Rl.js:xn': ['", edit environment, right arrow"'],
      'shared-19-CkPOiIKm.js:al': ['toggleStarred:r}=XB.getState()'], 'shared-19-CkPOiIKm.js:$c': ['`machine-preset:${e.id}`:`preset:${e.id}`'],
      'shared-19-CkPOiIKm.js:el': ['return[`preset:${e.id}`,`machine-preset:${e.id}`]'], 'shared-19-CkPOiIKm.js:nl': ['return t.some(t=>e.includes(t))'],
      'shared-19-CkPOiIKm.js:K': ['return j7(e)'], 'c3f9f1667-DEkdCUsq.js:f': ['!I.includes(e.toUpperCase())'],
    },
    features: {
      k0: ['labelDir: "auto"', '"env-picker-environment"', 'onToggle: () => Zr(Dr(e), ti(e))', 'l && v(qy, { onOpen: l })', 'children: [e.name, l && v(tS, { edit: !0 })]'],
      A0: ['(t.target?.kind ?? "local") === e', 't.name.toLowerCase().includes(i)', 'a && v(X.Separator, {})'],
      j0: ['"env-picker-new-environment"', 'defaultMessage: "New environment"', '"YxxUA60sT0"'],
      e2: ['"env-picker-this-computer"', '"Desktop only"', 'className: "size-icon shrink-0"', 'x = LR(h)', 'S = m && (!t || x)', 'e ? Fr(y)'],
      a2: ['`preset:${e.id}`'], l2: ['px-md py-sm text-footnote text-muted-as-secondary'], p2: ['"No matches"', '"96GJ5wSQam"'],
    },
  },
  // R3-home (cd8823d73 ge): the CDS Select pieces the Folders field's "+ Add" control renders, from shared-frame's
  // Combobox (xA = Ak): the trigger (HO + UO.outline + WO.select over the field rings Hb/Ub/Gb, its button qO), the
  // Empty row (dk over PO), the footer rule (fk) and slot (pk), the FooterAction (tA over Qo/Xo/Zo/Yo), the popup
  // search field (rk) and the default filter (Sk over xk). The Base UI Combobox itself is the host's menu popup.
  'environment-select-parts.mjs': {
    source: frame, roots: ['HO', 'UO', 'WO', 'qO', 'tA', 'PO', 'dk', 'fk', 'pk', 'rk', 'xk', 'Sk'],
    bindings: ['Yo', 'Xo', 'Zo', 'Qo', 'Hb', 'Ub', 'Gb', 'PO', 'HO', 'UO', 'WO', 'qO', 'rk', 'dk', 'fk', 'pk', 'xk', 'Sk', 'tA'],
    officialExports: {},
    hosts: { X: ['return Gt(Y(e));'], Jo: ['"data-cds": "Icon"'] },
    imports: { q: `${vendor}:ro`, H: `${vendor}:Va`, T: `${vendor}:Ha` },
    dependencies: { [`${vendor}:ro`]: react('forwardRef'), [`${vendor}:Va`]: react('jsx'), [`${vendor}:Ha`]: react('jsxs') },
    features: {
      Yo: ['typeof e == "string"'], Xo: ['flex size-icon shrink-0 items-center justify-center'], Qo: ['t ? Zo : Xo'],
      Hb: ['bg-fill-field shadow-field-ring'], Ub: [':shadow-field-hover'], Gb: ['has-[:focus-visible]:shadow-focus'],
      PO: ['px-md py-1.5 text-body text-muted select-none'], HO: ['cds-reset group/cbx inline-flex items-center gap-1.5 h-control'],
      UO: ['outline: `${Hb} ${Ub}`'], WO: ['select: `ps-0 ${Gb} data-[disabled]:cursor-default`'],
      qO: ['cds-reset flex min-w-0 flex-1 items-center gap-1.5 self-stretch ps-sm text-start'], rk: ['border-b-[var(--cds-border)]', 'placeholder:text-muted'],
      dk: ['`empty:hidden ${PO}`'], fk: ['mx-pad-md mt-1 h-px shrink-0 bg-border'], pk: ['"shrink-0 pt-1"'],
      xk: ['.normalize("NFD")', '\\p{Diacritic}'], Sk: ['xk(e.label).includes(n) || xk(e.value).includes(n)'],
      tA: ['min-h-control px-md rounded', 'hover:bg-fill-ghost-hover focus-visible:bg-fill-ghost-hover', 'className: "text-muted"'],
    },
  },
};

const within = (outer, q) => q.node.start >= outer.node.start && q.node.end <= outer.node.end;
const exportTable = bytes => new Map(([...bytes.matchAll(/export\s*\{([^}]*)\}/g)].pop()?.[1] ?? '').split(',')
  .map(s => s.trim().split(/\s+as\s+/)).filter(([l]) => l).map(([l, e]) => [e ?? l, l]));
const escape = name => name.replace(/\$/g, '\\$');

// Returns the pinned binding list, which is what the emit slices; `run` false (target skipped by --only) skips the checks.
export async function pinEnvironmentHelper(target, directory, run = true) {
  const pin = environmentHelperPins[target];
  if (!pin) throw Error(`No environment pin for ${target}`);
  if (!run) return [...pin.bindings];
  const label = `${target} (${pin.source})`;
  const raw = await fs.readFile(path.join(directory, pin.source), 'utf8');
  const code = await format(raw, { parser: 'babel' });
  const ast = parsers.babel.parse(code, {});
  let program;
  babel.traverse(ast, { Program(p) { program = p; } });
  const exported = exportTable(code);
  const declaration = name => {
    const p = program.scope.getBinding(name)?.path;
    if (!p || p.isImportSpecifier()) throw Error(`${label}: ${name} is not a top-level declaration`);
    return p;
  };
  const text = p => code.slice(p.node.start, p.node.end);
  const missing = (name, features = []) => {
    const found = features.filter(f => !text(declaration(name)).includes(f));
    if (found.length) throw Error(`${label}: ${name} lacks ${found.map(f => JSON.stringify(f)).join(', ')}`);
  };
  for (const [alias, local] of Object.entries(pin.officialExports ?? {}))
    if (alias !== local && exported.get(alias) !== local) throw Error(`${label}: exports ${alias} as ${exported.get(alias)}, not ${local}`);
  for (const [name, features] of Object.entries(pin.features)) missing(name, features);
  for (const [name, features] of Object.entries(pin.hosts ?? {})) missing(name, features);
  // The same-chunk closure of the roots, stopping at imports and at the host-replaced locals.
  const closure = new Set(), imports = new Map();
  const visit = name => {
    if (closure.has(name) || pin.hosts?.[name]) return;
    const binding = program.scope.getBinding(name);
    if (!binding) throw Error(`${label}: unbound ${name}`);
    if (binding.path.isImportSpecifier()) {
      imports.set(name, `${binding.path.parent.source.value.replace(/^\.\//, '')}:${binding.path.node.imported.name}`);
      return;
    }
    closure.add(name);
    const p = binding.path;
    for (const [dep, b] of Object.entries(program.scope.bindings))
      if (b.referencePaths.some(q => within(p, q)) || b.constantViolations.some(q => within(p, q))) visit(dep);
  };
  pin.roots.forEach(visit);
  const listed = [...pin.bindings].sort(), reached = [...closure].sort();
  if (JSON.stringify(listed) !== JSON.stringify(reached)) throw Error(`${label}: closure of ${pin.roots.join(',')} is ${reached.join(',')}, emit lists ${listed.join(',')}`);
  const expectedImports = JSON.stringify(Object.entries(pin.imports ?? {}).sort());
  const actualImports = JSON.stringify([...imports].sort());
  if (actualImports !== expectedImports) throw Error(`${label}: replaced imports are ${actualImports}, expected ${expectedImports}`);
  // Each replaced import still names the same export of its vendor/shared chunk, checked on the shipped bytes. Vendor
  // chunks reuse short locals across inlined modules, so any declaration of the local that carries the features passes.
  for (const [via, check] of Object.entries(pin.dependencies ?? {})) {
    const [file, alias] = via.split(':');
    const bytes = await fs.readFile(path.join(directory, file), 'utf8');
    const local = exportTable(bytes).get(alias);
    if (!local) throw Error(`${label}: ${file} no longer exports ${alias}`);
    if (check.react) {
      if (!new RegExp(`(?<![\\w$.])${escape(local)}=[\\w$]+\\.${check.react}\\b`).test(bytes))
        throw Error(`${label}: ${file} ${alias} (${local}) no longer resolves to React ${check.react}`);
      continue;
    }
    const features = Array.isArray(check) ? check : check.features, size = Array.isArray(check) ? 1200 : check.window;
    const starts = [...bytes.matchAll(new RegExp(`(?:function ${escape(local)}\\(|(?<![\\w$.])${escape(local)}=)`, 'g'))].map(m => m.index);
    if (!starts.length) throw Error(`${label}: ${file} ${alias} (${local}) has no declaration`);
    if (!starts.some(start => features.every(f => bytes.slice(start, start + size).includes(f))))
      throw Error(`${label}: ${file} ${alias} (${local}) lacks ${features.map(f => JSON.stringify(f)).join(', ')}`);
  }
  return [...pin.bindings];
}
