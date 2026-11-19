// w13-chatui-composer-shell (research/w13-chatui.md §1.1 H3, §1.6 K4/K6; plan-w13 「#### w13-chatui-composer-shell」):
// extract the originals the Chat / Cowork card's placeholder and model trigger are built on, now from 4.16336.0
// (regions-chat). The root keys below keep their 3.6556.2 names as stable keys; each is located in 4.16336.0 by its
// features alone (exactly one declaration of the chunk) and the manifest records the real 4.16336.0 local:
//   XI→gI (export di) lD→QD kH→CU ZH→GU QH→KU $H→qU (export Un) NH→DU KH→BU WH→RU jH→TU (export Gn) in
//   shared-8-BqfCbkJd.js; oD→YD dD→eO in shared-9-BgdM6Y1f.js; dn→_n in c6eb5f8cf-DNzkXANb.js; wE→rS (export hc)
//   TE→iS hE→Jx in shared-33-DtdykY0y.js (3.6556.2: shared-28). OU (new in 4.16336.0) is NH's right-to-left tail part.
// 4.16336.0 changes the picks carry: "Select model" is S8zsaQvAaA (was e15QX1hh5v), the compact trigger class drops
// `compact:!h-6`, the placeholder colour is `text-[var(--cds-fizzy-lake-color-placeholder,var(--cds-text-muted))]`
// (was text-muted), and NH gained an RTL branch whose two class constants (shared-33 ni, shared-183 P) are resolved
// through the imports. The per-root notes below keep the 3.6556.2 names. Nothing here
// executes desktop runtime code; chunks are read, prettier-formatted and parsed (Babel scope analysis) only.
//
//   shared-8 XI (=> jr)   the composer message table; only `replyToClaude` ("Reply to Claude…", ZA4ifEIe2U) is picked —
//                         the reply-form placeholder (also inlined by c6eb5f8cf MiniSessionView and ca0409d7c).
//   shared-9 lD           the new-chat placeholders `[How can I help you today?, Type / for skills]` (both picked).
//   shared-9 oD / dD      the rotation (w13-close-chat-composer): oD.fade's interval and dD's fade-branch classes,
//                         picked as `chatPlaceholderRotation` (the host's RotatingPlaceholder renders them).
//   shared-8 kH           the model-name split `{ base, tail }` at the first version-number word (NH's label), sliced
//                         verbatim as `splitModelName`.
//   shared-8 ZH / QH      $H's popup width class and KH's More models submenu height class, sliced verbatim.
//   shared-8 $H (=> Tn)   the model selector: the trigger's CdsButton props (`variant`, `data-testid:
//                         "model-selector-dropdown"`, `iconPosition`), the CaretDown icon, the tooltip wrapper class, the
//                         compact / type classes, the loading row, and the aria-label / empty copy — picked as literals.
//   shared-8 NH           the trigger label: root class branches, name class, tail class, tail joiner.
//   shared-8 KH           the menu: More models header / submenu testid and row, Search models, No matches row, the
//                         legacy-model header (w13-close-chat-composer).
//   shared-8 WH / jH      KH's model row (model-selector-option, radio check, name wrapper, badge) and the muted tail.
//   shared-28 wE / TE / hE  the Effort submenu (trigger, header copy, level rows, Default badge) and the thinking-mode
//                         toggle row KH lists (gE) — w13-close-chat-composer, read by src/source-chat-model-menu.jsx.
// Roots are found by stable features only (R2/E5): message ids, data-testid values, class strings. Each picked literal is
// read through a structural pattern (minified identifiers generalised to [\w$]+) so a renamed or rewritten call fails
// here instead of drifting. The picked values are emitted as frozen data next to the sliced declarations.
//
// D0: own generator, own output folder (src/generated/chat-composer), own scripts/verify-gen-chat-composer.mjs. The
// host (src/source-chat-composer.jsx) renders the trigger with the view-tabs CdsButton / CdsIcon / CdsSpinner (E41: the
// concrete shared-frame file, the card is in the composer graph); nothing generated here imports view-tabs.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import { referenceVersion, referenceSnapshot, ionSource as source, looseFeature } from './official-4.16336.0.mjs';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'src/generated/chat-composer');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const SHARED8 = 'shared-8-BqfCbkJd.js';
const SHARED9 = 'shared-9-BgdM6Y1f.js';
const MINI = 'c6eb5f8cf-DNzkXANb.js';
const SHARED28 = 'shared-33-DtdykY0y.js';
const SHARED19 = 'shared-19-UalAfDtn.js';
const SHARED36 = 'shared-36-fqRFYwOb.js';
const I = '[\\w$]+';
const STR = '"((?:[^"\\\\]|\\\\.)*)"';
const descriptor = id => new RegExp(`(\\{ defaultMessage: "(?:[^"\\\\]|\\\\.)*", id: "${id.replace(/[+/]/g, '\\$&')}" \\})`);

// Top-level declarations located by features (all must match exactly one declaration of the chunk).
const roots = {
  XI: { source: SHARED8, features: ['replyToClaude: { defaultMessage: "Reply to Claude\\u2026", id: "ZA4ifEIe2U" }',
    'loadEarlierMessages: { defaultMessage: "Load earlier messages", id: "/V89Z1BeEm" }'], exportAlias: 'di' },
  lD: { source: SHARED9, features: ['defaultMessage: "How can I help you today?", id: "ye34lid+ov"',
    'defaultMessage: "Type / for skills", id: "uSmGqlwE3c"'] },
  kH: { source: SHARED8, features: ['n = t.findIndex((e) => /^\\d+(\\.\\d+)?$/.test(e))',
    'base: t.slice(0, n + 1).join(" "), tail: t.slice(n + 1).join(" ")', 'base: e, tail: ""'] },
  ZH: { source: SHARED8, features: ['"max-w-[min(26rem,var(--available-width))]"'] },
  QH: { source: SHARED8, features: ['"max-h-[min(50vh,var(--available-height))]"'] },
  $H: { source: SHARED8, exportAlias: 'Un', features: ['"data-testid": "model-selector-dropdown"', 'id: "S8zsaQvAaA"',
    'id: "0ZMx/tNv6m"', 'id: "D90Mq4jCm6"', 'id: "bV+YmcFCEb"'] },
  NH: { source: SHARED8, features: ['"data-testid": "model-label-qualifier"', '"model-label-thinking-warning"'] },
  // 4.16336.0 (regions-chat): NH (now DU) gained a right-to-left branch (`H() === "rtl"`): the base in a `dir: "auto"`
  // span and each tail part through OU, a `bdi` joined by " · ". OU has no 3.6556.2 counterpart, so its key is the
  // 4.16336.0 local.
  OU: { source: SHARED8, features: ['"bdi"', 't > 0 && " \\u00B7 "'] },
  KH: { source: SHARED8, features: ['"data-testid": "model-selector-more-models"', 'id: "4mzlmbbRYe"', 'id: "96GJ5wSQam"'] },
  // c6eb5f8cf dn (MiniComposeWindow's model control): the desktop caller of $H whose props the card follows.
  dn: { source: MINI, features: ['placement: "compact"', 'compact: !0', 'isNewConversation: !0', 'triggerClassName: "!rounded-lg"', '"yukon_silver_thinking"'] },
  // w13-close-chat-composer (composer-shell-02): shared-9 oD (the rotation intervals) and dD (the rotating placeholder's
  // fade branch: two stacked spans, the leaving one fading out, the shown one fading in).
  oD: { source: SHARED9, features: ['fade: 5e3', 'typewriter: 3500'] },
  dD: { source: SHARED9, features: ['animation: n,', '"animate-placeholder-fade-out motion-reduce:hidden"', '"animate-placeholder-fade-in motion-reduce:animate-none"'] },
  // w13-close-chat-composer (composer-shell-01 / K4): KH's rows (shared-8 WH: model-selector-option, the name and badge),
  // jH's muted version tail, and shared-28 wE (the Effort submenu, => pa), TE (its level rows) and hE (the thinking-mode
  // toggle row gE lists, after the levels or after the model group).
  WH: { source: SHARED8, features: ['"data-testid": "model-selector-option"', 'checkedRole: "radio"', '"model-config-badge"'] },
  jH: { source: SHARED8, exportAlias: 'Gn', features: ['if (e.label_override) return e.label_override;', 'mutedSuffix'] },
  wE: { source: SHARED28, exportAlias: 'hc', features: ['"data-testid": "effort-menu-trigger"', 'id: "VKZ/U8vAsk"', 'id: "Fb3qrhlDSI"'] },
  TE: { source: SHARED28, features: ['effort-option-', 'id: "7Aqe2/LqFL"', '"effort-option-info-icon"'] },
  hE: { source: SHARED28, features: ['"data-testid": "thinking-mode-toggle"', 'keepOpen: !0', 'onCheckedChange: '] },
  // integration-3 review-0 P1 (4.16336.0 keys): the Chat / Cowork card's chin end. shared-19 (UalAfDtn) renders shared-8 FQ
  // (export u) at the chin's end for kind !== "code" with placement "onpage"; FQ renders AK with `showChevron: !1,
  // textSize: "inherit"`; AK passes qU `compact: placement === "compact"` (false on the page) and its triggerClassName
  // ("!rounded !min-w-0 !shrink" once a textSize is given); qU then drops the CaretDown (W = showChevron ?? true), the
  // type class (`p !== "inherit" && (U || p === "footnote") && K`) and the compact class, and DU's root drops text-xs.
  FQ: { source: SHARED8, exportAlias: 'u', features: ['"group/chin-end ms-auto flex min-w-0 items-center"', 'showChevron: !1', 'textSize: "inherit"'] },
  AK: { source: SHARED8, features: ['"!rounded !min-w-0 !shrink"', 'isPrimaryComposer', 'wrapperClassName'] },
  chinEnd: { source: SHARED19, features: ['placement: "onpage", beforeRing: H, noLeadingControls: e === null'] },
  // relink C2 S1 (composer relink-prep): the Chat card's outer shell, shared-9 gO → fO → gD → Cm. gO draws the holder
  // div[data-composer-card-holder] and hands fO forceMultiline / twoLineNew; fO hands gD the className, the dropScope /
  // variant / form / size branches, the heading font-size class (cardClassName), editorMinLines and the Actions gap (ds =
  // shared-3 Lp, resolved through the import); gD takes them as props. Picked as literals (card.mjs), nothing sliced.
  gO: { source: SHARED9, features: ['"data-composer-card-holder": ""', '"relative in-data-cds-dock-masked:bg-page"', 'twoLineNew: cn'] },
  fO: { source: SHARED9, features: ['className: "px-2 md:px-0"', '"[--cmp-font-size:var(--cds-font-size-heading)]"', 'twoLineNew: be', 'Se = vf()'] },
  gD: { source: SHARED9, features: ['dropScope: C, cardClassName: w, className: T, rootRef: E, rootProps: D', 'editorMinLines: R, editorMaxHeight: ne'] },
  // chat-cowork-1to1 r3 (chat-home-r3-05): shared-9 BD, the classic editor (gD's marlin editor is the other `uxkiTeN6WU`
  // site): its root attributes {role: "textbox", data-testid (shared-1 mp), [data-composer-editor]: "classic", host shape,
  // draft-persisted, aria-label = ariaLabel ?? "Write your prompt to Claude", aria-multiline / -required / -invalid,
  // aria-describedby} — picked as literals (card.mjs chatComposerEditor).
  BD: { source: SHARED9, features: ['role: "textbox"', '"aria-required": "false"', 'id: "uxkiTeN6WU"', '"aria-describedby": "claude-code-nudge-body"'] },
  // chat-home r1 (send action): the card's primary action as shared-9 T_ hands it (`inCdsComposer: !0`) to shared-8 VR.
  // Idle (`nt` "idle"): GR (motion div, MR + Gh(OR) entering class, kR exit/style) > WR (NR shown / PR hidden) > tz
  // (div with Gh(OR, skipInitialAnimation) > Tooltip {content, shortcut, side} > div "flex" > Button {variant brand /
  // ghost reply look, icon ArrowUp / ArrowReturn, busy, disabled, onClick, aria-label "Send message", aria-keyshortcuts,
  // data-testid shared-1 hp}). Sampling (`nt` "stop", in a CDS composer): JR → the shell's PrimaryAction {state, midTurnSend,
  // stopLabel "Stop response", stopShortcut "Esc" …} inside HR (div "flex items-center", keyed "stop").
  VR: { source: SHARED8, features: ['inCdsComposer: k', 'replySendLook: A', '"claude.cowork.task.stop_button"'] },
  GR: { source: SHARED8, features: ['{ frozen: t, skipEnter: n, children: r } = e'] },
  WR: { source: SHARED8, features: ['{ shown: t, sendDisabled: n, children: r } = e'] },
  tz: { source: SHARED8, features: ['id: "Xx0WZVz8QS"', '"aria-keyshortcuts": ', 'secondaryHint: '] },
  JR: { source: SHARED8, features: ['"CdsPrimaryActionCluster"', 'id: "9PawskFnw4"', 'sendSecondaryHint: '] },
  OR: { source: SHARED8, features: ['"animate-primary-action-in"'] },
  MR: { source: SHARED8, features: ['"relative flex items-center justify-end"'] },
  NR: { source: SHARED8, features: ['"flex items-center opacity-100 motion-safe:[transition:opacity_120ms_ease-out_80ms,visibility_0s_linear_80ms]"'] },
  PR: { source: SHARED8, features: ['"flex items-center absolute inset-y-0 end-0 invisible pointer-events-none opacity-0 motion-safe:[transition:opacity_80ms_ease-out,visibility_0s_linear_80ms]"'] },
  kR: { source: SHARED8, features: ['exit: { opacity: 0, transition: { duration: 0.08 } }'] },
  // marlin-chin (U-MARLIN, 2026-11-18): the Chat conversation's marlin chin. ca2ef848d Zle hands the composer (shared-9 r → PO
  // → gO) `chin: zo && !Y && … ? u(eee, {…, children: fe === null && u(H9, { inline: !0, … })})` (eee = shared-8 GQ, export
  // i) and renders the non-inline H9 below the composer only on `!zo`. GQ → KQ: with `centred` (GQ x = Rh() = shared-36 lC,
  // `!isLocalAgentRoute && isExternalConversation`) KQ draws pf.Chin {masked, leading: div "flex min-w-0 items-center" (+ HQ's
  // fade) around UM (the controls fO relocated: tO's relocateControlsToChin = hubChinControls = the same lC), trailing: div
  // "flex min-w-0 items-center" around FQ, children: Hh (shared-36 mC, the centred band) around the inline disclaimer}. gO's
  // placeholder is shared-36 PT: "Reply" (9HU8vwHwVV) for an external conversation, "Write a message…" otherwise.
  // Picked as literals (chin.mjs); the host renders them (src/source-chat-composer.jsx ChatMarlinChin).
  GQ: { source: SHARED8, exportAlias: 'i', features: ['handoffLayoutId: r,', 'withoutModePicker: a,', 'modePickerHeld: o,', 'modePickerHoldable: s'] },
  KQ: { source: SHARED8, features: ['"group/chin-trail flex min-w-0 items-center text-muted-as-secondary"', 'modelControlsInChin: r,', 'designSystemChip: o,'] },
  HQ: { source: SHARED8, features: ['"animate-marlin-chin-fade motion-reduce:animate-none"'] },
  lC: { source: SHARED36, features: ['isLocalAgentRoute: e }', 'return !e && t;'] },
  mC: { source: SHARED36, features: ['"pointer-events-none absolute inset-x-0 flex h-control items-center justify-center"', '"whitespace-nowrap text-muted-as-secondary"', '[data-cds="ChatComposerChin"]'] },
  PT: { source: SHARED36, features: ['id: "9HU8vwHwVV"', 'id: "CI9xffp7fP"', 'isExternalConversation: a = !1'] },
  tO: { source: SHARED9, features: ['hubChinControls: t,', 'relocateControlsToChin: _, chinControlsInCard: g', 'f = d && i && a && o && !s && c && !u,'] },
  // marlin-chin mic: fO's relocated cluster ends with n_ (the "chin-mic" slot), shown only when t_ holds (gO's marlin card
  // passes hideAddMenu: !0, so it is the dictation / voice availability); n_ wraps k_, whose split control is shared-8 BL
  // (Dictate + its caret; the voice entry only with voiceModeEnabled).
  t_: { source: SHARED9, features: ['stableDictationAvailable: n, stableVoiceAvailable: r', 'return t && (n || r);'] },
  n_: { source: SHARED9, features: ['"data-testid": "chin-mic"', 'holdSecondControlWidth: !0'] },
  k_: { source: SHARED9, features: ['"flex items-center [&_button]:!rounded"', 'split: !0', 'holdSecondControlWidth: o,'] },
};

// Literal picks: [name, root, pattern, group names]; each pattern must match exactly once in the root's text.
const picks = [
  ['messages.replyToClaude', 'XI', new RegExp(`replyToClaude: (\\{ defaultMessage: ${STR.replace('(', '(?:')}, id: "ZA4ifEIe2U" \\})`), ['value']],
  ['messages.howCanIHelpYouToday', 'lD', descriptor('ye34lid+ov'), ['value']],
  ['trigger', '$H', new RegExp(`render: ${I}\\(${I}, \\{\\s*variant: ${STR},\\s*"data-testid": ${STR},\\s*"aria-label": ${I},\\s*icon: ${I},\\s*iconPosition: ${STR},\\s*className: ${I},\\s*disabled: ${I},\\s*"aria-busy": ${I},\\s*children: ${I},\\s*\\}\\)`), ['variant', 'testId', 'iconPosition']],
  ['caret', '$H', new RegExp(`${I} \\? ${I}\\(${I}, \\{ name: ${STR}, customSize: (\\d+), className: ${STR} \\}\\) : void 0`), ['name', 'customSize', 'className']],
  ['tooltipWrapperClass', '$H', new RegExp(`${I}\\("div", \\{\\s*className: ${STR},\\s*children: ${I}\\(${I}, \\{ multiline: !0, side: "top", content: ${I}, open: ${I}, children: ${I} \\}\\),\\s*\\}\\)`), ['value']],
  ['baseClass', '$H', new RegExp(`${I}\\(${STR}, ${I}, ${I}, ${I}\\)\\)`), ['value']],
  ['typeClass', '$H', new RegExp(`${I} = ${I}\\("(text-\\[14px\\][^"]*)"\\)`), ['value']],
  ['compactClass', '$H', new RegExp(`${I} = ${I} && ${STR},\\s*${I} = ${I}\\(\\$, \\d+, ${I}, ${I}, ${I}\\)`), ['value']],
  ['loading', '$H', new RegExp(`${I}\\("span", \\{\\s*className: ${STR},\\s*children: \\[${I}\\(${I}, \\{ size: ${STR} \\}\\), ${I}\\("span", \\{ className: ${STR}, children: ${I} \\}\\)\\],\\s*\\}\\)`), ['className', 'spinnerSize', 'textClass']],
  ['popupSide', '$H', new RegExp(`${I} = ${I} === "bottom" \\? "top" : "bottom"`), []],
  ['popup', '$H', new RegExp(`${I}\\(${I}\\.Popup, \\{\\s*side: ${I},\\s*sideOffset: (\\d+),\\s*align: ${I},\\s*collisionPadding: (${I}),\\s*"data-size": ${I},\\s*className: (${I}),\\s*children: ${I},\\s*\\}\\)`), ['sideOffset', 'collisionBinding', 'classBinding']],
  // r2 chat-home-r2-04: the popup's collisionPadding is `Ft = { top: gt }` with `gt = mt ? 52 : 0` (mt = shared-0 Yu(Lp):
  // the mac desktop window, true for this host), so the picked top inset is the 52.
  ['popupCollision', '$H', new RegExp(`(${I}) = ${I}\\(\\$, \\d+, (${I})\\) \\? ${I}\\(\\$, \\d+, ${I}, \\{ top: ${I} \\}\\)`), ['binding', 'top']],
  ['popupCollisionTop', '$H', new RegExp(`(${I}) = (${I}) \\? (\\d+) : 0;`), ['binding', 'flag', 'top']],
  ['alignDefault', '$H', new RegExp(`${I} = ${I} === void 0 \\? ${STR} : ${I},\\s*${I} = ${I} !== void 0 && ${I},\\s*${I} = ${I} !== void 0 && ${I},\\s*${I} = ${I} !== void 0 && ${I},\\s*${I} = ${I} !== void 0 && ${I},\\s*${I} = ${I}\\(\\)`), ['value']],
  ['emptyClass', '$H', new RegExp(`: ${I}\\("span", \\{ className: ${STR}, children: ${I} \\}\\)`), ['value']],
  // Both dn branches (with and without the cowork effort surface) pass the same compact trigger props.
  ['caller', 'dn', new RegExp(`${I}\\(${I}, \\{\\s*placement: "compact",\\s*compact: !0,[^}]*?isNewConversation: !0,\\s*enableModelNotices: !0,\\s*triggerClassName: ${STR},`), ['triggerClassName'], 2],
  ['messages.loadingModels', '$H', descriptor('D90Mq4jCm6'), ['value']],
  ['messages.defaultModel', '$H', descriptor('bV+YmcFCEb'), ['value']],
  ['messages.modelName', '$H', descriptor('0ZMx/tNv6m'), ['value']],
  ['messages.selectModel', '$H', descriptor('S8zsaQvAaA'), ['value']],
  ['ariaNameJoin', '$H', new RegExp(`\\{ name: \\[${I}\\(${I}, \\{ serverName: ${I}\\(${I}\\.model\\) \\}\\), ${I}, ${I}, ${I}\\]\\.filter\\(Boolean\\)\\.join\\(${STR}\\) \\}`), ['value']],
  ['label.root', 'NH', new RegExp('`(inline-flex min-w-0) \\$\\{' + `${I} === "inherit" \\? "" : ${I} === "footnote" \\? ${STR} : ${I} \\? ${STR} : ${STR}` + '\\} (leading-none items-baseline)`'), ['prefix', 'footnote', 'compact', 'regular', 'suffix']],
  // 4.16336.0: the left-to-right name div holds the tail span inline (`children: [p, _ && g("span", …)]`).
  ['label.name', 'NH', new RegExp(`${I}\\("div", \\{\\s*className: ${STR},\\s*children: \\[${I}, ${I} && ${I}\\("span", \\{ className: "[^"]*", children: \` \\$\\{${I}\\}\` \\}\\)\\],\\s*\\}\\)`), ['value']],
  ['label.rtl.when', 'NH', new RegExp(`${I} = ${I}\\(\\) === "rtl",`), []],
  ['label.rtl.wrapper', 'NH', new RegExp(`\\? ${I}\\("div", \\{\\s*className: ${STR},\\s*children: \\[\\s*${I}\\("span", \\{\\s*dir: "auto",`), ['value']],
  ['label.rtl.base', 'NH', new RegExp(`dir: "auto",\\s*className: \`([^\`$]*)\\$\\{(${I})\\}\`,\\s*children: ${I},`), ['prefix', 'binding']],
  ['label.rtl.tail', 'NH', new RegExp(`${I} &&\\s*${I}\\("span", \\{\\s*className: ${STR},\\s*children: \\[" ", ${I}\\.map\\((${I})\\)\\],`), ['className', 'segment']],
  ['label.rtl.segment', 'OU', new RegExp(`${I} > 0 && ${STR}, ${I}\\("bdi", \\{ className: (${I}), children: ${I} \\}\\)`), ['separator', 'binding']],
  ['label.tail', 'NH', new RegExp(`${I} && ${I}\\("span", \\{ className: ${STR}, children: \` \\$\\{${I}\\}\` \\}\\)`), ['value']],
  ['label.join', 'NH', new RegExp(`\\.join\\(${STR}\\)`), ['value']],
  ['menu.moreModelsTestId', 'KH', new RegExp(`"data-testid": ${STR},\\s*children: ${I}\\("span", \\{`), ['value']],
  ['menu.noMatchesClass', 'KH', new RegExp(`className: ${STR},\\s*children: ${I}\\(${I}, \\{ defaultMessage: "No matches", id: "96GJ5wSQam" \\}\\)`), ['value']],
  ['messages.moreModels', 'KH', new RegExp(`${I}\\(${I}\\.Header, \\{ children: ${I}\\(${I}, ${descriptor('9yxvA9+l6B').source}\\) \\}\\)`), ['value']],
  ['messages.searchModels', 'KH', descriptor('4mzlmbbRYe'), ['value']],
  ['messages.noMatches', 'KH', descriptor('96GJ5wSQam'), ['value']],
  // w13-close-chat-composer (composer-shell-02): lD's second placeholder and dD's fade branch, with oD's interval.
  ['messages.typeForSkills', 'lD', descriptor('uSmGqlwE3c'), ['value']],
  ['rotation.interval', 'oD', /fade: (\d+(?:e\d+)?),\s*typewriter: \d+/, ['fadeMs']],
  ['rotation.itemClass', 'dD', new RegExp(`${I} = ${I}\\(\\s*${STR},\\s*${I} && "truncate",?\\s*\\),`), ['value']],
  ['rotation.frame', 'dD', new RegExp(`${I}\\(\\s*${STR},\\s*!${I} &&\\s*${I}\\(\\s*${STR},\\s*${STR},`), ['grid', 'overlay', 'fontSize']],
  ['rotation.fadeOutClass', 'dD', new RegExp(`"aria-hidden": !0,\\s*className: ${I}\\(${I}, ${STR}\\),`), ['value']],
  ['rotation.fadeInClass', 'dD', new RegExp(`className: ${I}\\(${I}, ${I} !== null && ${STR}\\),`), ['value']],
  // rl-composer verify: eO's `bare` and `inline` props — `h = bare !== void 0 && bare` drops the whole absolute frame
  // (`i(grid, !h && i(absolute…, font, …))`), `p = inline !== void 0 && inline` adds "truncate" to each placeholder span.
  ['rotation.bareGate', 'dD', new RegExp(`bare: (${I}),[\\s\\S]*?(${I}) = \\1 !== void 0 && \\1,[\\s\\S]*?${I}\\(\\s*${STR},\\s*!\\2 &&`), ['prop', 'flag', 'grid']],
  ['rotation.inlineGate', 'dD', new RegExp(`inline: (${I}),[\\s\\S]*?(${I}) = \\1 !== void 0 && \\1,[\\s\\S]*?${I} = ${I}\\(\\s*${STR},\\s*\\2 && ${STR},?\\s*\\),`), ['prop', 'flag', 'base', 'value']],
  // gO's inlineLayout arm (the one that renders fO → gD, the card): its placeholders go into ro.Overlay together with the
  // preview / suggestion, and the rotation is called there with `inline: <arm>, bare: !0` (the Overlay supplies the
  // editor row's inset, padding and type size); the classic arm keeps the absolute frame.
  ['rotation.overlayArm', 'gO', new RegExp(`if \\(\\(\\((${I}) = null\\), (${I})\\)\\) \\{[\\s\\S]*?${I}\\(${I}, \\{\\s*children: ${I}\\(${I}, \\{\\s*placeholders: ${I},\\s*isVisible: !0,\\s*animation: ${I},\\s*inline: (${I}),\\s*inlineMultiline: ${I},\\s*bare: (!0),\\s*markComposerTiming: !0,\\s*\\}\\),\\s*\\}\\),[\\s\\S]*?\\1 = ${I}\\(${I}\\.Overlay, \\{ children: \\[`), ['overlay', 'arm', 'inline', 'bare']],
  ['rotation.inlineLayout', 'gO', new RegExp(`inlineLayout: (${I}),\\s*renderBannerSlot: ${I},`), ['prop']],
  // w13-close-chat-composer (composer-shell-01 / K4): KH's menu (the legacy header, the More models trigger row), WH's
  // row (testid, radio check, name wrapper, catalog badge) and jH's muted version tail.
  ['messages.legacyModel', 'KH', /(defaultMessage:\s*"\{legacyModel\} is no longer available\. New replies will use \{defaultModel\}\.",\s*id: "6gdsBMsCpe")/, ['descriptor']],
  ['menu.moreModelsRowClass', 'KH', new RegExp(`"data-testid": "model-selector-more-models",\\s*children: ${I}\\("span", \\{\\s*className: ${STR},`), ['value']],
  ['menu.row', 'WH', new RegExp(`"data-testid": ${STR},\\s*onClick: ${I},\\s*disabled: ${I},\\s*checked: ${I},\\s*checkedRole: ${STR},`), ['testId', 'checkedRole']],
  ['menu.rowNameClass', 'WH', new RegExp(`${I}\\("span", \\{ className: ${STR}, children: \\[${I}, ${I}\\] \\}\\)`), ['value']],
  ['menu.badge', 'WH', new RegExp(`variant: ${I},\\s*size: ${STR},\\s*truncate: !0,\\s*"data-testid": ${STR},\\s*children: ${I}\\.message,`), ['size', 'testId']],
  ['menu.mutedTailClass', 'jH', new RegExp(`${I}\\.mutedClassName \\?\\? ${STR}`), ['value']],
  // shared-28 wE / TE / hE: the Effort submenu (trigger, header, levels popup) and the thinking-mode toggle row.
  ['effortMessages.effort', 'wE', descriptor('VKZ/U8vAsk'), ['value']],
  ['effortMessages.header', 'wE', /(defaultMessage:\s*"Higher effort means more thorough responses, but takes longer and uses your limits faster\.",\s*id: "Fb3qrhlDSI")/, ['descriptor']],
  ['effortMenu.trigger', 'wE', new RegExp(`"data-testid": ${STR},\\s*children: ${I}\\("span", \\{ className: ${STR}, children: \\[${I}, ${I}\\] \\}\\),`), ['testId', 'rowClass']],
  ['effortMenu.labelClass', 'wE', new RegExp(`${I}\\(\\$, \\d+, ${I}, ${I}\\("span", \\{ className: ${STR}, children: \\[${I}, ${I}\\] \\}\\)\\)`), ['value']],
  ['effortMenu.labelTextClass', 'wE', new RegExp(`${I}\\("span", \\{ className: ${STR}, children: ${I}\\(${I}, \\{ defaultMessage: "Effort"`), ['value']],
  ['effortMenu.hintClass', 'wE', new RegExp(`className: ${STR},\\s*children: \\[\\s*${I}\\.name,`), ['value']],
  ['effortMenu.headerClass', 'wE', new RegExp(`${I}\\(${I}\\.Header, \\{ className: ${STR}, children: ${I} \\}\\)`), ['value']],
  ['effortMenu.popupAlign', 'wE', new RegExp(`${I}\\(${I}\\.Popup, \\{ "data-size": ${I}, align: ${STR}, collisionAvoidance: ${I}, children:`), ['value']],
  ['effortMenu.optionTestIdPrefix', 'TE', new RegExp(`${I} = \`(effort-option-)\\$\\{${I}\\.id\\}\``), ['value']],
  ['effortMenu.optionNameClass', 'TE', new RegExp(`${I}\\("span", \\{ className: ${STR}, children: \\[${I}\\.name, ${I}, ${I}\\] \\}\\)`), ['value']],
  ['effortMenu.defaultBadge', 'TE', new RegExp(`variant: ${STR},\\s*size: ${STR},\\s*children: ${I}\\(${I}, \\{ defaultMessage: "Default", id: "7Aqe2/LqFL" \\}\\),`), ['variant', 'size']],
  ['effortMessages.default', 'TE', descriptor('7Aqe2/LqFL'), ['value']],
  // integration-3 review-0 P1: the chin-end call (shared-19 → FQ → AK → qU / DU), see the FQ / AK / chinEnd roots.
  ['chin.caller', 'chinEnd', new RegExp(`${I}\\((${I}), \\{ placement: ${STR}, beforeRing: ${I}, noLeadingControls: ${I} === null \\}\\)`), ['callee', 'placement']],
  ['chin.call', 'FQ', new RegExp(`${I}\\(${I}, \\{ placement: ${I}, disabled: ${I}, showChevron: (!0|!1), textSize: ${STR} \\}\\)`), ['showChevron', 'textSize']],
  ['chin.compactPlacement', 'AK', new RegExp(`compact: ${I} === ${STR},`), ['value'], 2],
  ['chin.triggerClass', 'AK', new RegExp(`${I} = ${I} \\|\\| ${I} !== void 0 \\? ${STR} : ${STR}`), ['sized', 'plain']],
  ['typeClassRule', '$H', new RegExp(`${I} = ${I} !== ${STR} && \\(${I} \\|\\| ${I} === ${STR}\\) && ${I},`), ['inherit', 'footnote']],
  ['thinkingRow.testId', 'hE', new RegExp(`"data-testid": ${STR},\\s*keepOpen: !0,`), ['value']],
  ['thinkingRow.copyClass', 'hE', new RegExp(`${I}\\("span", \\{ className: ${STR}, children: \\[${I}, ${I}\\] \\}\\)`), ['value']],
  ['thinkingRow.titleClass', 'hE', new RegExp(`${I}\\("span", \\{ className: ${STR}, children: ${I}\\.title \\}\\)`), ['value']],
  ['thinkingRow.descriptionClass', 'hE', new RegExp(`${I}\\("span", \\{ className: ${STR}, children: ${I}\\.description \\}\\)`), ['value']],
  // relink C2 S1: gO's holder and the two props it computes for fO (structural pins, the host reads their outcome).
  ['card.holder', 'gO', new RegExp(`${I}\\("div", \\{\\s*className: ${STR},\\s*"data-composer-card-holder": "",\\s*"data-dictating": ${I},\\s*"data-send-interceptor": ${I},\\s*children: \\[`), ['value']],
  ['card.forceMultiline', 'gO', new RegExp(`forceMultiline: !${I} \\|\\| ${I} \\|\\| ${I} === !0,`), []],
  ['card.twoLineNewWhen', 'gO', new RegExp(`(${I}) = ${I} && ${I} === !0 && ${I},\\s*(${I}) = ${I} && !\\1,`), ['peek', 'binding']],
  ['card.twoLineNewProp', 'gO', new RegExp(`twoLineNew: (${I}),`), ['binding']],
  // fO: the literals it hands gD, and the bindings they flow through.
  ['card.className', 'fO', new RegExp(`className: ${STR},\\s*multiline: ${I},\\s*busy: ${I},`), ['value']],
  ['card.branches', 'fO', new RegExp(`${I} = ${I} \\? ${STR} : ${STR},\\s*${I} = ${I} \\? ${STR} : void 0,\\s*${I} = ${I} \\? ${STR} : ${STR},\\s*${I} = ${I} \\? ${STR} : void 0,`), ['dropPage', 'dropCard', 'variant', 'formNew', 'formReply', 'size']],
  ['card.cardFontClass', 'fO', new RegExp(`(${I}) = !${I} && ${STR},`), ['binding', 'value']],
  ['card.twoLineNew', 'fO', new RegExp(`twoLineNew: (${I}),`), ['binding']],
  ['card.minLines', 'fO', new RegExp(`(${I}) = (${I}) \\? (\\d+) : void 0,`), ['binding', 'when', 'lines']],
  ['card.gap', 'fO', new RegExp(`gap: (${I}),`), ['binding']],
  ['card.passed', 'fO', new RegExp(`dropScope: (${I}),\\s*variant: (${I}),\\s*form: (${I}),\\s*size: (${I}),\\s*cardClassName: (${I}),`), ['dropScope', 'variant', 'form', 'size', 'cardClassName']],
  ['card.passedLines', 'fO', new RegExp(`editorMinLines: (${I}),`), ['binding']],
  // chat-home-r3-05: BD's editor root attributes and its default aria-label.
  ['editor.ariaLabel', 'BD', new RegExp(`${I}\\?\\.ariaLabel \\?\\?\\s*${I}\\.formatMessage\\(\\{\\s*(defaultMessage: "Write your prompt to Claude",\\s*id: "uxkiTeN6WU")`), ['descriptor']],
  ['editor.attributes', 'BD', new RegExp(`\\{\\s*role: ${STR},\\s*"data-testid": (${I}),\\s*\\[(${I})\\]: ${STR},\\s*\\[${I}\\]: ${I},\\s*\\[${I}\\]: ${I},\\s*"aria-label": ${I},\\s*"aria-multiline": ${STR},\\s*"aria-required": ${STR},\\s*"aria-invalid": ${STR},\\s*"aria-describedby": ${STR},\\s*\\}`),
    ['role', 'testIdBinding', 'kindAttributeBinding', 'kind', 'ariaMultiline', 'ariaRequired', 'ariaInvalid', 'ariaDescribedby']],
  // chat-home r1 (send action): VR's idle arm (GR > WR > tz, tz skipping its entry animation) and stop arm (HR keyed
  // "stop"), GR / WR / tz's classes and props, JR's stop copy and states.
  ['send.idleArm', 'VR', new RegExp(`${I}\\((${I}), \\{\\s*isSending: ${I},\\s*isDisabled: ${I},\\s*disabledReason: ${I},\\s*onSend: ${I},\\s*skipInitialAnimation: (!0),\\s*isNewAgentModeChat: ${I},\\s*replyLook: ${I},\\s*\\}\\),[\\s\\S]{0,400}?${I}\\((${I}), \\{ shown: ${I}, sendDisabled: ${I}, children: ${I} \\}\\)[\\s\\S]{0,400}?${I}\\((${I}), \\{ frozen: ${I}, skipEnter: ${I}, children: \\[${I}, ${I}\\] \\}, ${I}\\)`), ['tz', 'skip', 'wr', 'gr']],
  ['send.idleKey', 'VR', new RegExp(`${I} = ${I} \\?\\? ${STR},\\s*${I} = ${I} \\|\\| ${I},\\s*${I} = ${I} && \\(${I} \\|\\| ${I}\\);`), ['value']],
  ['send.stopArm', 'VR', new RegExp(`(${I}) = ${I} \\?\\? ${STR};\\s*${I} = ${I}\\(\\$, \\d+, ${I}, \\1\\) \\? ${I}\\(\\$, \\d+, ${I}, \\1, ${I}\\((${I}), \\{ children: ${I} \\}, \\1\\)\\)`), ['binding', 'key', 'hr']],
  ['send.gr', 'GR', new RegExp(`${I} = ${I}\\((${I}), ${I}\\),[\\s\\S]*?${I}\\(\\$, \\d+, ${I}\\((${I}), ${I}\\.className\\), ${I}\\.className\\)[\\s\\S]*?${I}\\(${I}\\.div, \\{ \\.\\.\\.${I}, className: ${I}, \\.\\.\\.(${I}), children: ${I} \\}\\)`), ['enter', 'frame', 'motion']],
  ['send.wr', 'WR', new RegExp(`${I} = !${I} \\|\\| void 0,\\s*${I} = ${I} \\? (${I}) : (${I});`), ['shown', 'hidden']],
  ['send.tzEnter', 'tz', new RegExp(`${I} = ${I}\\((${I}), ${I}\\),\\s*\\{ sendShortcut: ${I}, sendSecondaryHint: ${I} \\} = `), ['value']],
  ['send.look', 'tz', new RegExp(`${I} = ${I} \\? ${STR} : ${I} && ${I} \\? ${STR} : ${STR},\\s*${I} = ${I} \\? ${STR} : ${STR},`), ['replyVariant', 'agentDisabledVariant', 'variant', 'replyIcon', 'icon']],
  ['send.button', 'tz', new RegExp(`${I}\\("div", \\{\\s*className: ${STR},\\s*children: ${I}\\(${I}, \\{\\s*variant: ${I},\\s*iconOnly: !0,\\s*icon: ${I},\\s*busy: ${I},\\s*disabled: ${I},\\s*onClick: ${I},\\s*"aria-label": ${I},\\s*"aria-keyshortcuts": ${I},\\s*"data-testid": (${I}),\\s*\\}\\),\\s*\\}\\)`), ['frameClass', 'testIdBinding']],
  ['send.tooltip', 'tz', new RegExp(`${I}\\(${I}, \\{ multiline: ${I}, content: ${I}, shortcut: ${I}, secondaryHint: ${I}, side: ${STR}, children: ${I} \\}\\)`), ['side']],
  ['send.messages.sendMessage', 'tz', descriptor('Xx0WZVz8QS'), ['value']],
  ['send.motionStyle', 'kR', new RegExp(`style: (${I}) \\}`), ['binding']],
  ['stop.messages.stopResponse', 'JR', descriptor('9PawskFnw4'), ['value']],
  ['stop.states', 'JR', new RegExp(`${I} = ${I} \\? ${STR} : ${I} \\? ${STR} : ${STR},\\s*${I} = ${I} \\? \\(${I} \\|\\| ${I} \\? ${STR} : ${STR}\\) : ${STR},`), ['starting', 'stopping', 'busy', 'parked', 'collapsible', 'hidden']],
  ['stop.escapeHint', 'JR', new RegExp(`${I} = ${I} && ${I} \\? "([^"\\n]*)" : void 0,\\s*${I} = ${I} \\? "secondary" : "brand",`), ['value']],
  // marlin-chin: KQ's leading / trailing / trail / centred arms, HQ's fade, GQ's centred source, mC's band, FQ's end
  // cluster, fO's relocated controls, tO's relocation rule and PT's placeholder (see the GQ … tO roots).
  ['marlin.leading', 'KQ', new RegExp(`ref: ${I} \\? ${I} : void 0,\\s*className: ${I}\\(${STR}, ${I}\\),\\s*children: \\[\\s*${I} && ${I}\\(${I}, \\{ value: ${I}, children: ${I}\\(${I}, \\{\\}\\) \\}\\),`), ['value']],
  ['marlin.trailing', 'KQ', new RegExp(`\\? ${I}\\("div", \\{ ref: ${I} \\? ${I} : void 0, className: ${I}\\(${STR}, ${I}\\), children: ${I} \\}\\)\\s*: void 0\\)`), ['value']],
  ['marlin.trail', 'KQ', new RegExp(`className: ${I}\\(${STR}, ${I} && ${STR}, ${I}\\),\\s*children: ${I},`), ['className', 'flexClass']],
  ['marlin.centredArm', 'KQ', new RegExp(`\\? ${I}\\((${I}), \\{ leading: ${I} \\? ${I} : null, trailing: ${I} \\? ${I} : null, className: ${I}, children: ${I} \\}\\)`), ['callee']],
  ['marlin.part', 'KQ', new RegExp(`\\(${I} = ${I}\\.(Chin)\\),`), ['part']],
  ['marlin.fade', 'HQ', new RegExp(`return ${I} \\? ${STR} : void 0;`), ['value']],
  ['marlin.centredSource', 'GQ', new RegExp(`(${I}) = (${I})\\(\\),\\s*${I} = ${I}\\(${I}\\),\\s*${I} = !${I} && ${I}\\?\\.permissionModeComingSoon === !0,`), ['binding', 'callee']],
  ['marlin.band.frame', 'mC', new RegExp(`${I} = J1\\(\\$, \\d+, ${I}\\)\\s*\\? K1\\(\\$, \\d+, ${I}, ${I}\\(${STR}, ${I}\\)\\)\\s*: \\$\\[\\d+\\],\\s*${I} = !${I} \\|\\| void 0,`), ['value']],
  ['marlin.band.text', 'mC', new RegExp(`${I} = ${I} \\? ${STR} : ${STR},\\s*${I} = J1\\(\\$, \\d+, ${I}\\) \\? K1\\(\\$, \\d+, ${I}, ${I}\\(${STR}, ${I}\\)\\)`), ['shown', 'hidden', 'className']],
  ['marlin.band.gap', 'mC', new RegExp(`${I} = ${I} \\? ${I}\\.right \\+ (${I}) : ${I}\\.left,`), ['binding']],
  ['marlin.band.placement', 'mC', new RegExp(`${I}\\?\\.\\(${I} \\? ${STR} : ${STR}\\)`), ['fits', 'above']],
  ['marlin.end', 'FQ', new RegExp(`(${I}) = ${I}\\(${I}\\)\\.unifiedComposerSpacing === !0,[\\s\\S]*?${I} = \\1 \\? ${STR} : ${STR},\\s*${I} = J1\\(\\$, 0, ${I}\\) \\? K1\\(\\$, 0, ${I}, ${I}\\(${STR}, ${I}\\)\\)`), ['spacing', 'tightGap', 'gap', 'className']],
  ['marlin.ring', 'FQ', new RegExp(`${I} = ${I} \\? ${STR} : ${STR},\\s*${I} = ${I} \\|\\| ${I},`), ['moved', 'rest']],
  ['marlin.relocated', 'fO', new RegExp(`\\? ${I}\\("div", \\{\\s*className: ${STR},\\s*children: \\[\\s*${I}\\("div", \\{\\s*ref: ${I},\\s*className: ${STR},\\s*children: ${I}\\(${I}, \\{\\s*chatInputPlacement:`), ['wrapper', 'addMenu']],
  ['marlin.relocateRule', 'tO', new RegExp(`(${I}) = (${I}) && !${I} && !${I},[\\s\\S]*?let (${I}) = \\1 && !${I};`), ['eligible', 'hub', 'relocate']],
  ['marlin.hubSource', 'gO', new RegExp(`hubChinControls: (${I}),`), ['binding']],
  ['marlin.hubRule', 'lC', new RegExp(`let \\{ isLocalAgentRoute: (${I}) \\} = ${I}\\(\\),\\s*(${I}) = ${I}\\(\\);\\s*return !\\1 && \\2;`), []],
  ['marlin.placeholderGate', 'PT', new RegExp(`isExternalConversation: (${I}) = !1,[\\s\\S]*?: (${I})\\s*\\? \\["reply", `), ['external', 'gate']],
  ['marlin.messages.reply', 'PT', descriptor('9HU8vwHwVV'), ['value']],
  ['marlin.messages.writeMessage', 'PT', descriptor('CI9xffp7fP'), ['value']],
  ['marlin.mic.rule', 't_', new RegExp(`let \\{ hideAddMenu: (${I}), stableDictationAvailable: (${I}), stableVoiceAvailable: (${I}) \\} = ${I};\\s*return \\1 && \\(\\2 \\|\\| \\3\\);`), []],
  ['marlin.mic.frame', 'n_', new RegExp(`${I}\\(${STR}, ${I}, ${I}\\)\\)`), ['className']],
  ['marlin.mic.testId', 'n_', new RegExp(`"data-testid": ${STR}`), ['value']],
  // fix2: n_'s frame states — `d ? "invisible" : p && "opacity-40"` (d: tap recording / voice / mid-turn hide; p: d, the
  // caller's disabled or $g's send-in-flight), `moved && "order-last"`, and `p ? { inert: !0 } : {}` on the same frame.
  ['marlin.mic.states', 'n_', new RegExp(`${I} = ${I} \\? ${STR} : ${I} && ${STR},\\s*${I} = ${I} && ${STR},`), ['hidden', 'dimmed', 'moved']],
  ['marlin.mic.inert', 'n_', new RegExp(`${I} \\? \\{ inert: !0 \\} : \\{\\}`), []],
  ['marlin.mic.split', 'k_', new RegExp(`${I}\\(${STR}, ${I}\\)\\)`), ['className']],
];

async function readSource(name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  // printWidth 120, as analysis tools/fmt.mjs (the readable copies the picks were written against).
  const code = await format(bytes.toString(), { parser: 'babel', printWidth: 120 });
  const ast = parsers.babel.parse(code, {});
  let program;
  babel.traverse(ast, { Program(p) { program = p; } });
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration' && !n.source)
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  // local -> { imported, from } for every named import (the RTL label's class constants are resolved through them).
  const imported = new Map(ast.program.body.filter(n => n.type === 'ImportDeclaration')
    .flatMap(n => n.specifiers.filter(s => s.type === 'ImportSpecifier').map(s => [s.local.name, { imported: s.imported.name, from: n.source.value.replace(/^\.\//, '') }])));
  const record = { name, bytes, code, program, exported, imported };
  cache.set(name, record);
  return record;
}
const textOf = (src, p) => src.code.slice(p.node.start, p.node.end);
function findRoot(src, key, { features, exportAlias }) {
  const tests = features.map(f => looseFeature(f));
  const hits = Object.entries(src.program.scope.bindings).filter(([, b]) =>
    (b.path.isFunctionDeclaration() || b.path.isVariableDeclarator()) && tests.every(t => t.test(textOf(src, b.path))));
  if (hits.length !== 1) throw Error(`${src.name}: root ${key} matched ${hits.length} declarations (${hits.map(([n]) => n).join(', ')})`);
  const [local, binding] = hits[0];
  if (exportAlias && src.exported.get(exportAlias) !== local) throw Error(`${src.name}: ${exportAlias} no longer exports root ${key} (${local})`);
  return { local, path: binding.path, text: textOf(src, binding.path) };
}
const unescape = value => JSON.parse(`"${value}"`);
function setPath(target, dotted, value) {
  const keys = dotted.split('.');
  let at = target;
  for (const key of keys.slice(0, -1)) at = at[key] ??= {};
  at[keys.at(-1)] = value;
}

export async function extractChatComposer({ check = false } = {}) {
  const cache = new Map();
  const found = {};
  for (const [key, spec] of Object.entries(roots)) {
    const src = await readSource(spec.source, cache);
    found[key] = { ...findRoot(src, key, spec), source: spec.source, src };
  }
  // Sliced declarations must be closed (no free bindings): kH, ZH, QH read nothing outside themselves.
  for (const key of ['kH', 'ZH', 'QH']) {
    const { src, path: p } = found[key];
    const free = Object.entries(src.program.scope.bindings).filter(([name, b]) => name !== found[key].local
      && b.referencePaths.some(q => q.node.start >= p.node.start && q.node.end <= p.node.end));
    if (free.length) throw Error(`${key} is no longer closed (reads ${free.map(([n]) => n).join(', ')})`);
  }
  const data = {}, pickRecords = [];
  for (const [name, rootKey, pattern, groups, count = 1] of picks) {
    const text = found[rootKey].text;
    const all = [...text.matchAll(new RegExp(pattern.source, `${pattern.flags}g`))];
    if (all.length !== count) throw Error(`pick ${name}: ${all.length} matches in ${rootKey} (${found[rootKey].source}), expected ${count}`);
    if (new Set(all.map(m => JSON.stringify(m.slice(1)))).size !== 1) throw Error(`pick ${name}: the ${count} matches differ`);
    const match = all[0];
    pickRecords.push({ name, root: rootKey, source: found[rootKey].source, sha256: sha(match[0]) });
    if (!groups.length) continue;
    if (groups.length === 1 && groups[0] === 'value') {
      const raw = match[1];
      setPath(data, name, raw.startsWith('{') ? raw : unescape(raw));
      continue;
    }
    // A descriptor prettier split over lines (`defaultMessage:\n "…",\n id: "…"`): re-joined into the one-line literal.
    if (groups.length === 1 && groups[0] === 'descriptor') {
      setPath(data, name, `{ ${match[1].replace(/^defaultMessage:\s+/, 'defaultMessage: ').replace(/",\s+id: /, '", id: ')} }`);
      continue;
    }
    setPath(data, name, Object.fromEntries(groups.map((group, i) => [group, /^\d+(?:e\d+)?$/.test(match[i + 1]) ? Number(match[i + 1]) : unescape(match[i + 1])])));
  }
  // E5: the popup picks name the sliced ZH, and KH's submenu popups use QH.
  if (data.popup.classBinding !== found.ZH.local) throw Error(`$H popup class is ${data.popup.classBinding}, not the sliced ${found.ZH.local}`);
  const esc = name => name.replace(/[$]/g, '\\$&');
  if (!new RegExp(`"data-size": ${I}, className: ${esc(found.QH.local)}, children: ${I}\\(""\\)`).test(found.KH.text)) throw Error('KH submenu popup no longer uses the sliced QH');
  delete data.popup.classBinding;
  if (data.popup.collisionBinding !== data.popupCollision.binding || data.popupCollision.top !== data.popupCollisionTop.binding)
    throw Error(`$H popup collisionPadding ${data.popup.collisionBinding} is no longer { top: ${data.popupCollisionTop.binding} }`);
  delete data.popup.collisionBinding;
  // E5 (chin end): shared-19's chin-end callee is the import of shared-8's FQ export, and FQ's call is AK.
  const chinFrom = found.chinEnd.src.imported.get(data.chin.caller.callee);
  if (!chinFrom || chinFrom.from !== SHARED8 || found.FQ.src.exported.get(chinFrom.imported) !== found.FQ.local)
    throw Error(`${SHARED19} chin end calls ${data.chin.caller.callee}, not ${SHARED8} ${found.FQ.local}`);
  if (!new RegExp(`${I}\\(${esc(found.AK.local)}, \\{ placement: ${I}, disabled: ${I}, showChevron:`).test(found.FQ.text))
    throw Error(`FQ no longer renders the located AK (${found.AK.local})`);
  if (data.typeClassRule.inherit !== data.chin.call.textSize) throw Error(`qU's type-class rule tests ${data.typeClassRule.inherit}, not FQ's textSize ${data.chin.call.textSize}`);
  const chin = { placement: data.chin.caller.placement, compact: data.chin.caller.placement === data.chin.compactPlacement,
    showChevron: data.chin.call.showChevron === '!0', textSize: data.chin.call.textSize, triggerClassName: data.chin.triggerClass.sized };
  // E5 (4.16336.0 RTL label): the tail parts map through the sliced OU, and the two class bindings are string constants
  // another chunk exports; each is read from its declaration through the import, not guessed.
  if (data.label.rtl.tail.segment !== found.OU.local) throw Error(`NH rtl tail maps ${data.label.rtl.tail.segment}, not the located ${found.OU.local}`);
  const resolved = {};
  const resolveString = async (src, binding, label) => {
    const from = src.imported.get(binding);
    if (!from) throw Error(`${label}: ${binding} is not an import of ${src.name}`);
    const target = await readSource(from.from, cache);
    const local = target.exported.get(from.imported);
    const init = local && target.program.scope.bindings[local]?.path.isVariableDeclarator() ? target.program.scope.bindings[local].path.node.init : null;
    if (init?.type !== 'StringLiteral') throw Error(`${label}: ${from.from} ${from.imported} (${local}) is no longer a string constant`);
    resolved[label] = { source: from.from, export: from.imported, local, sourceSha256: sha(target.bytes), value: init.value };
    return init.value;
  };
  data.label.rtl = {
    wrapperClass: data.label.rtl.wrapper,
    baseClass: data.label.rtl.base.prefix + await resolveString(found.NH.src, data.label.rtl.base.binding, 'labelRtlBaseAlign'),
    tailClass: data.label.rtl.tail.className,
    partSeparator: data.label.rtl.segment.separator,
    partClass: await resolveString(found.OU.src, data.label.rtl.segment.binding, 'labelRtlPartBidi'),
  };

  // E5 (relink C2 S1): gO hands fO its twoLineNew binding (cn = isNewConversation && !sn); fO's editorMinLines and Actions
  // gap both branch on that prop; the gap is shared-3 Lp (imported as ds) read through the import; fO renders the located gD
  // and passes it the picked branches.
  const card = data.card;
  if (card.twoLineNewWhen.binding !== card.twoLineNewProp.binding) throw Error(`gO twoLineNew is ${card.twoLineNewProp.binding}, not the located ${card.twoLineNewWhen.binding}`);
  if (card.minLines.when !== card.twoLineNew.binding) throw Error(`fO editorMinLines branches on ${card.minLines.when}, not twoLineNew (${card.twoLineNew.binding})`);
  // fO's cardClassName is clsx(containerClassName, <the heading class binding>), handed to gD as cardClassName.
  const fontJoin = new RegExp(`(${I}) = ${I}\\(\\$, \\d+, ${I}, ${esc(card.cardFontClass.binding)}\\)`).exec(found.fO.text);
  if (!fontJoin || fontJoin[1] !== card.passed.cardClassName) throw Error('fO cardClassName no longer joins the heading font-size class');
  if (card.passedLines.binding !== card.minLines.binding) throw Error(`fO passes editorMinLines ${card.passedLines.binding}, not ${card.minLines.binding}`);
  const gapDecl = new RegExp(`${esc(card.gap.binding)} = ${esc(card.twoLineNew.binding)} \\? (${I}) : void 0,`).exec(found.fO.text);
  if (!gapDecl) throw Error(`fO Actions gap ${card.gap.binding} no longer branches on twoLineNew (${card.twoLineNew.binding})`);
  if (!new RegExp(`${I}\\(\\s*${esc(found.gD.local)},\\s*\\{\\s*cedarChuteEligible:`).test(found.fO.text)) throw Error(`fO no longer renders the located gD (${found.gD.local})`);
  // rl-composer verify: the card's placeholder rotation is gO's inlineLayout arm call — bare (no absolute frame) and
  // inline (truncate), inside ro.Overlay — and that arm is the one rendering fO.
  const rot = data.rotation;
  if (rot.bareGate.grid !== rot.frame.grid) throw Error(`eO bare gate guards ${rot.bareGate.grid}, not the picked frame grid`);
  if (rot.inlineGate.base !== rot.itemClass) throw Error('eO inline gate no longer extends the picked item class');
  if (rot.overlayArm.inline !== rot.overlayArm.arm || rot.overlayArm.bare !== '!0') throw Error(`gO overlay rotation call is not inline/bare on its arm (${rot.overlayArm.arm})`);
  if (!new RegExp(`${esc(rot.overlayArm.arm)} = ${esc(rot.inlineLayout.prop)} !== void 0 && ${esc(rot.inlineLayout.prop)}`).test(found.gO.text)) throw Error(`gO overlay arm ${rot.overlayArm.arm} is not inlineLayout (${rot.inlineLayout.prop})`);
  if (!new RegExp(`${esc(rot.overlayArm.arm)}\\s*\\?\\s*${I}\\(${I}, \\{\\s*args: \\{[\\s\\S]{0,900}?children: \\(${I}, ${I}\\) =>\\s*${I}\\(${esc(found.fO.local)}, \\{`).test(found.gO.text)) throw Error(`gO no longer renders fO (${found.fO.local}) on the overlay arm ${rot.overlayArm.arm}`);
  const chatComposerCard = { holderClass: card.holder, className: card.className, cardFontClass: card.cardFontClass.value,
    dropScope: { page: card.branches.dropPage, card: card.branches.dropCard }, variant: card.branches.variant,
    form: { new: card.branches.formNew, reply: card.branches.formReply }, size: card.branches.size,
    editorMinLines: Number(card.minLines.lines), actionsGap: await resolveString(found.fO.src, gapDecl[1], 'cardActionsGap') };
  // chat-home-r3-05: BD's classic editor attributes; the testid and the kind attribute's name are shared-1 constants read
  // through BD's imports (E5).
  const ed = data.editor.attributes;
  const chatComposerEditor = { role: unescape(ed.role), testId: await resolveString(found.BD.src, ed.testIdBinding, 'editorTestId'),
    kindAttribute: await resolveString(found.BD.src, ed.kindAttributeBinding, 'editorKindAttribute'), kind: unescape(ed.kind),
    ariaLabel: data.editor.ariaLabel, ariaMultiline: unescape(ed.ariaMultiline), ariaRequired: unescape(ed.ariaRequired),
    ariaInvalid: unescape(ed.ariaInvalid), ariaDescribedby: unescape(ed.ariaDescribedby) };
  // chat-home r1 (send action) E5: VR's idle arm renders the located tz / WR / GR (tz skipping its entry animation), its stop
  // arm the HR keyed "stop"; GR's entering class and tz's are OR, GR's frame MR, WR's shown / hidden NR / PR; GR spreads kR,
  // whose style is a shared-36 constant read through the import; tz's testid is the shared-1 constant read the same way.
  const send = data.send, stop = data.stop;
  for (const [got, key] of [[send.idleArm.tz, 'tz'], [send.idleArm.wr, 'WR'], [send.idleArm.gr, 'GR'], [send.gr.enter, 'OR'], [send.tzEnter, 'OR'],
    [send.gr.frame, 'MR'], [send.wr.shown, 'NR'], [send.wr.hidden, 'PR'], [send.gr.motion, 'kR']])
    if (got !== found[key].local) throw Error(`send action reads ${got}, not the located ${key} (${found[key].local})`);
  const hrBinding = found.VR.src.program.scope.bindings[send.stopArm.hr];
  const hrText = hrBinding?.path.isFunctionDeclaration() ? textOf(found.VR.src, hrBinding.path) : '';
  const hrClass = new RegExp(`${I}\\("div", \\{ ref: ${I}, className: ${STR}, children: ${I} \\}\\)`).exec(hrText);
  if (!hrClass || send.stopArm.key !== 'stop') throw Error(`VR stop arm ${send.stopArm.hr} is no longer the keyed "flex items-center" wrapper`);
  const styleFrom = found.kR.src.imported.get(send.motionStyle.binding);
  const styleSrc = styleFrom && await readSource(styleFrom.from, cache);
  const styleLocal = styleSrc?.exported.get(styleFrom.imported);
  const styleInit = styleLocal && styleSrc.program.scope.bindings[styleLocal]?.path.node.init;
  if (styleInit?.type !== 'ObjectExpression' || !styleInit.properties.every(p => p.type === 'ObjectProperty' && p.key.type === 'Identifier' && p.value.type === 'NumericLiteral'))
    throw Error(`kR style ${send.motionStyle.binding} is no longer a numeric style object`);
  resolved.sendMotionStyle = { source: styleFrom.from, export: styleFrom.imported, local: styleLocal, sourceSha256: sha(styleSrc.bytes) };
  const motionStyle = Object.fromEntries(styleInit.properties.map(p => [p.key.name, p.value.value]));
  const chatSendAction = {
    slotClass: found.MR.text.replace(/^[\w$]+\s*=\s*/, ''), enteringClass: found.OR.text.replace(/^[\w$]+\s*=\s*/, ''),
    shownClass: found.NR.text.replace(/^[\w$]+\s*=\s*/, ''), hiddenClass: found.PR.text.replace(/^[\w$]+\s*=\s*/, ''),
    motionStyle, idleKey: send.idleKey, sendSkipsEntry: send.idleArm.skip === '!0',
    button: { frameClass: send.button.frameClass, testId: await resolveString(found.tz.src, send.button.testIdBinding, 'sendTestId'),
      variant: send.look.variant, replyVariant: send.look.replyVariant, agentDisabledVariant: send.look.agentDisabledVariant,
      icon: send.look.icon, replyIcon: send.look.replyIcon },
    tooltip: { side: send.tooltip.side },
    stop: { wrapperClass: hrClass[1].replace(/\\"/g, '"'), key: send.stopArm.key, escapeHint: stop.escapeHint, states: stop.states },
  };
  for (const k of ['slotClass', 'enteringClass', 'shownClass', 'hiddenClass']) chatSendAction[k] = unescape(chatSendAction[k].slice(1, -1));
  const sendMessages = { sendMessage: send.messages.sendMessage, stopResponse: stop.messages.stopResponse };
  const literal = value => typeof value === 'string' && value.startsWith('{ defaultMessage') ? value : JSON.stringify(value);
  const objectText = obj => `{ ${Object.entries(obj).map(([k, v]) => `${JSON.stringify(k)}: ${v && typeof v === 'object' ? objectText(v) : literal(v)}`).join(', ')} }`;
  const header = (sources) => `// Original Claude Desktop ${referenceVersion} copy and literals from ${sources}; generated by extract-chat-composer.mjs.\n// Edit the extractor, never this file.\n`;
  // Header names: 3.6556.2 key → the real 4.16336.0 local.
  const L = keys => keys.map(key => (found[key].local === key ? key : `${key}→${found[key].local}`));
  const messagesText = await format(`${header(`${SHARED8} ${L(['XI'])} (replyToClaude) and ${SHARED9} ${L(['lD', 'oD', 'dD']).join(' / ')}`)}` +
    `export const chatComposerMessages = Object.freeze(${objectText({ replyToClaude: data.messages.replyToClaude, howCanIHelpYouToday: data.messages.howCanIHelpYouToday, typeForSkills: data.messages.typeForSkills })});\n` +
    `// ${SHARED9} dD's fade branch (oD.fade between placeholders): the frame (grid, the absolute overlay, the entry font\n// size), each placeholder span's class, and the leaving / entering animations. gO's inlineLayout arm (the card) calls it\n// bare inside ro.Overlay (grid only: no absolute frame, no font size) and inline (inlineItemClass on each span).\n` +
    `export const chatPlaceholderRotation = Object.freeze(${objectText({ intervalMs: data.rotation.interval.fadeMs, ...data.rotation.frame, itemClass: data.rotation.itemClass, inlineItemClass: rot.inlineGate.value, fadeOutClass: data.rotation.fadeOutClass, fadeInClass: data.rotation.fadeInClass })});\n`, { parser: 'babel' });
  const modelMessages = Object.fromEntries(['loadingModels', 'defaultModel', 'modelName', 'selectModel', 'moreModels', 'searchModels', 'noMatches', 'legacyModel'].map(k => [k, data.messages[k]]));
  const selector = { trigger: { ...data.trigger, baseClass: data.baseClass, typeClass: data.typeClass, compactClass: data.compactClass,
    emptyClass: data.emptyClass, callerClass: data.caller.triggerClassName, tooltipWrapperClass: data.tooltipWrapperClass, alignDefault: data.alignDefault, ariaNameJoin: data.ariaNameJoin, popupSideOffset: data.popup.sideOffset, popupCollisionTop: data.popupCollisionTop.top,
    typeClassRule: data.typeClassRule },
  chin, caret: data.caret, loading: data.loading, label: data.label, menu: data.menu, effortMenu: data.effortMenu, thinkingRow: data.thinkingRow };
  const modelText = await format(`${header(`${SHARED8} ${L(['kH', 'ZH', 'QH']).join(', ')} (sliced), ${L(['$H', 'NH', 'OU', 'KH', 'WH', 'jH']).join(' / ')}, ${SHARED28} ${L(['wE', 'TE', 'hE']).join(' / ')}, ${L(['FQ', 'AK']).join(' / ')}, ${SHARED19} chinEnd→${found.chinEnd.local} and ${MINI} ${L(['dn'])} (picked literals)`)}` +
    `${found.kH.text}\nvar ${found.ZH.text};\nvar ${found.QH.text};\n` +
    `const modelSelectorMessages = Object.freeze(${objectText(modelMessages)});\n` +
    `const modelSelector = Object.freeze(${objectText(selector)});\n` +
    `const effortMenuMessages = Object.freeze(${objectText(data.effortMessages)});\n` +
    `export { ${found.kH.local} as splitModelName, ${found.ZH.local} as modelSelectorPopupClass, ${found.QH.local} as modelSelectorSubmenuPopupClass, modelSelectorMessages, modelSelector, effortMenuMessages };\n`, { parser: 'babel' });
  const cardText = await format(`${header(`${SHARED9} ${L(['gO', 'fO', 'gD']).join(' → ')} (literals, relink C2 S1)`)}` +
    `// gO's holder class; fO's className, heading font-size cardClassName (\`!xe &&\`), dropScope (enableScreenDrop ? page : card),\n` +
    `// variant (incognitoModeEnabled), form (isNewConversation ? new : reply), size (vf() ? lg), editorMinLines and Actions gap\n` +
    `// (twoLineNew ? … : void 0; the gap is ${resolved.cardActionsGap.source} ${resolved.cardActionsGap.local}).\n` +
    `export const chatComposerCard = Object.freeze(${objectText(chatComposerCard)});\n` +
    `// ${SHARED9} ${L(['BD']).join('')} (the classic editor): its root attributes and default aria-label (Ce?.ariaLabel ?? …); the testid and the\n` +
    `// kind attribute are ${resolved.editorTestId.source} ${resolved.editorTestId.local} / ${resolved.editorKindAttribute.local}.\n` +
    `export const chatComposerEditor = Object.freeze(${objectText(chatComposerEditor)});\n`, { parser: 'babel' });
  const sendText = await format(`${header(`${SHARED8} ${L(['VR', 'GR', 'WR', 'tz', 'JR']).join(' / ')} with ${L(['OR', 'MR', 'NR', 'PR', 'kR']).join(', ')} (picked literals; chat-home r1)`)}` +
    `// VR's idle arm: GR (slotClass; enteringClass while it animates in, from Gh / shared-36 NT; kR's motionStyle) > WR\n` +
    `// (shownClass / hiddenClass) > tz (enteringClass unless sendSkipsEntry) > Tooltip {side} > div frameClass > Button. The\n` +
    `// stop arm: JR → the shell's PrimaryAction inside HR (stop.wrapperClass, keyed stop.key); its states and the Esc hint.\n` +
    `export const chatSendAction = Object.freeze(${objectText(chatSendAction)});\n` +
    `export const chatSendMessages = Object.freeze(${objectText(sendMessages)});\n`, { parser: 'babel' });
  // marlin-chin E5: KQ's centred arm is shared-36 mC and GQ's centred source is shared-36 lC (read through the imports);
  // GQ renders KQ; fO's relocated cluster is the one gO's tO turns on, whose hub flag is the same lC; PT's "Reply" arm is
  // its isExternalConversation; mC's gap is a numeric constant of its chunk.
  const m = data.marlin;
  const importedLocal = async (src, binding, label) => {
    const from = src.imported.get(binding);
    if (!from) throw Error(`${label}: ${binding} is not an import of ${src.name}`);
    const target = await readSource(from.from, cache);
    return { source: from.from, export: from.imported, local: target.exported.get(from.imported) };
  };
  const centredCallee = await importedLocal(found.KQ.src, m.centredArm.callee, 'marlin centred arm');
  if (centredCallee.source !== SHARED36 || centredCallee.local !== found.mC.local) throw Error(`KQ centred arm is ${centredCallee.source} ${centredCallee.local}, not ${SHARED36} ${found.mC.local}`);
  const centredSource = await importedLocal(found.GQ.src, m.centredSource.callee, 'marlin centred source');
  if (centredSource.source !== SHARED36 || centredSource.local !== found.lC.local) throw Error(`GQ centred is ${centredSource.source} ${centredSource.local}, not ${SHARED36} ${found.lC.local}`);
  if (!new RegExp(`centred: ${esc(m.centredSource.binding)},`).test(found.GQ.text) || !new RegExp(`${I}\\(${esc(found.KQ.local)}, \\{`).test(found.GQ.text))
    throw Error('GQ no longer renders KQ with its centred flag');
  const hubCall = new RegExp(`${esc(m.hubSource.binding)} = (${I})\\(\\),`).exec(found.gO.text);
  const hubSource = hubCall && await importedLocal(found.gO.src, hubCall[1], 'marlin hub source');
  if (!hubSource || hubSource.source !== SHARED36 || hubSource.local !== found.lC.local) throw Error(`gO hubChinControls is not ${SHARED36} ${found.lC.local}`);
  if (!new RegExp(`relocateControlsToChin: ${esc(m.relocateRule.relocate)}, chinControlsInCard:`).test(found.tO.text)) throw Error('tO no longer returns its relocation rule');
  // The relocated cluster's last control is n_ (the chin-mic slot), and n_ bails out unless t_ holds.
  if (!new RegExp(`${I}\\(${esc(found.n_.local)}, \\{ state: ${I}, sawSamplingThisSend: ${I}, disabled: ${I} \\}\\)`).test(found.fO.text)) throw Error('fO no longer renders n_ in its relocated cluster');
  if (!new RegExp(`!${esc(found.t_.local)}\\(${I}\\)\\)\\) \\{\\s*${I} = null;`).test(found.n_.text)) throw Error('n_ no longer gates on t_');
  if (!new RegExp(`${I}\\(${esc(found.k_.local)}, \\{`).test(found.n_.text)) throw Error('n_ no longer renders k_');
  if (m.placeholderGate.external !== m.placeholderGate.gate) throw Error(`PT "Reply" arm reads ${m.placeholderGate.gate}, not isExternalConversation (${m.placeholderGate.external})`);
  const gapBinding = found.mC.src.program.scope.bindings[m.band.gap.binding];
  const gapInit = gapBinding?.path.isVariableDeclarator() ? gapBinding.path.node.init : null;
  if (gapInit?.type !== 'NumericLiteral') throw Error(`mC gap ${m.band.gap.binding} is no longer a numeric constant`);
  resolved.marlinBandGap = { source: SHARED36, local: m.band.gap.binding, value: gapInit.value };
  const chatComposerChin = {
    part: m.part.part, leadingClass: m.leading, trailingClass: m.trailing, fadeClass: m.fade,
    trail: { className: m.trail.className, flexClass: m.trail.flexClass },
    band: { frameClass: m.band.frame, textClass: m.band.text.className, shownClass: m.band.text.shown, hiddenClass: m.band.text.hidden,
      gapPx: gapInit.value, placement: { fits: m.band.placement.fits, above: m.band.placement.above } },
    end: { className: m.end.className, gap: m.end.gap, tightGap: m.end.tightGap, ring: { moved: m.ring.moved, rest: m.ring.rest } },
    relocated: { wrapperClass: m.relocated.wrapper, addMenuClass: m.relocated.addMenu },
    mic: { frameClass: m.mic.frame.className, testId: m.mic.testId, splitClass: m.mic.split.className,
      hiddenClass: m.mic.states.hidden, dimmedClass: m.mic.states.dimmed, movedClass: m.mic.states.moved },
  };
  const chinMessages = { reply: m.messages.reply, writeMessage: m.messages.writeMessage };
  const chinText = await format(`${header(`${SHARED8} ${L(['GQ', 'KQ', 'HQ']).join(' / ')}, ${L(['FQ']).join('')}, ${SHARED36} ${L(['mC', 'lC', 'PT']).join(' / ')} and ${SHARED9} ${L(['fO', 'tO']).join(' / ')} (picked literals; marlin-chin U-MARLIN)`)}` +
    `// KQ (centred: GQ's ${found.lC.local} = !isLocalAgentRoute && isExternalConversation) draws the shell's Chin {leading: div leadingClass\n` +
    `// (+ fadeClass on a handoff) around the controls fO relocated (relocated.wrapperClass > div addMenuClass > the + menu, …),\n` +
    `// trailing: div trailingClass around FQ (end.className + gap / tightGap under unifiedComposerSpacing; its usage ring in a\n` +
    `// ring.rest / ring.moved div), children: mC's band (frameClass; the text div textClass + shownClass while it fits between\n` +
    `// the leading and trailing clusters with gapPx to spare, hiddenClass otherwise; placement fits / above to the dC context)}.\n` +
    `// Without centred and with model controls in the chin the trail is a div trail.className + trail.flexClass.\n` +
    `// mic: the relocated cluster's last slot, ${SHARED9} ${L(['n_'])} (div frameClass, data-testid testId) around ${L(['k_'])} (div splitClass\n` +
    `// around shared-8 BL, Dictate + caret; voice only with voiceModeEnabled), rendered only when ${L(['t_'])}: dictation or voice is available.\n` +
    `// The frame adds hiddenClass while dictation / voice owns the send cell, else dimmedClass (and inert) while the caller's\n` +
    `// disabled or a send in flight before sampling ($g) holds; movedClass after voice returns.\n` +
    `export const chatComposerChin = Object.freeze(${objectText(chatComposerChin)});\n` +
    `// ${SHARED36} PT: an external conversation's reply placeholder, otherwise "Write a message…".\n` +
    `export const chatComposerChinMessages = Object.freeze(${objectText(chinMessages)});\n`, { parser: 'babel' });
  const files = { 'card.mjs': cardText, 'chin.mjs': chinText, 'messages.mjs': messagesText, 'model-selector.mjs': modelText, 'send-action.mjs': sendText };
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-chat-composer.mjs', hostModule: 'src/source-chat-composer.jsx',
    roots: Object.fromEntries(Object.entries(found).map(([key, f]) => [key, { source: f.source, local: f.local, sourceSha256: sha(f.src.bytes), sha256: sha(f.text), features: roots[key].features }])),
    modules: [
      { target: 'card.mjs', sources: [SHARED9, resolved.cardActionsGap.source, resolved.editorTestId.source], sha256: sha(cardText), exports: ['chatComposerCard', 'chatComposerEditor'] },
      { target: 'chin.mjs', sources: [SHARED8, SHARED36, SHARED9], sha256: sha(chinText), exports: ['chatComposerChin', 'chatComposerChinMessages'] },
      { target: 'messages.mjs', sources: [SHARED8, SHARED9], sha256: sha(messagesText), exports: ['chatComposerMessages', 'chatPlaceholderRotation'] },
      { target: 'model-selector.mjs', sources: [SHARED8, MINI, SHARED28, SHARED19], sha256: sha(modelText), sliced: ['kH', 'ZH', 'QH'],
        exports: ['splitModelName', 'modelSelectorPopupClass', 'modelSelectorSubmenuPopupClass', 'modelSelectorMessages', 'modelSelector', 'effortMenuMessages'] },
      { target: 'send-action.mjs', sources: [SHARED8, resolved.sendTestId.source, resolved.sendMotionStyle.source], sha256: sha(sendText), exports: ['chatSendAction', 'chatSendMessages'] },
    ],
    resolved,
    picks: pickRecords };
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`chat composer output set changed: ${present.join(',')}. Run scripts/extract-chat-composer.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`chat composer source mismatch: ${name}. Run scripts/extract-chat-composer.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  console.log(`${check ? 'Verified' : 'Extracted'} chat composer (${Object.keys(roots).length} original ${referenceVersion} roots, ${pickRecords.length} picks).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await extractChatComposer({ check: process.argv.includes('--check') });
