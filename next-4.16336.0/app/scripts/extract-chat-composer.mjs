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
  ['popup', '$H', new RegExp(`${I}\\(${I}\\.Popup, \\{\\s*side: ${I},\\s*sideOffset: (\\d+),\\s*align: ${I},\\s*collisionPadding: ${I},\\s*"data-size": ${I},\\s*className: (${I}),\\s*children: ${I},\\s*\\}\\)`), ['sideOffset', 'classBinding']],
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
    emptyClass: data.emptyClass, callerClass: data.caller.triggerClassName, tooltipWrapperClass: data.tooltipWrapperClass, alignDefault: data.alignDefault, ariaNameJoin: data.ariaNameJoin, popupSideOffset: data.popup.sideOffset,
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
    `export const chatComposerCard = Object.freeze(${objectText(chatComposerCard)});\n`, { parser: 'babel' });
  const files = { 'card.mjs': cardText, 'messages.mjs': messagesText, 'model-selector.mjs': modelText };
  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-chat-composer.mjs', hostModule: 'src/source-chat-composer.jsx',
    roots: Object.fromEntries(Object.entries(found).map(([key, f]) => [key, { source: f.source, local: f.local, sourceSha256: sha(f.src.bytes), sha256: sha(f.text), features: roots[key].features }])),
    modules: [
      { target: 'card.mjs', sources: [SHARED9, resolved.cardActionsGap.source], sha256: sha(cardText), exports: ['chatComposerCard'] },
      { target: 'messages.mjs', sources: [SHARED8, SHARED9], sha256: sha(messagesText), exports: ['chatComposerMessages', 'chatPlaceholderRotation'] },
      { target: 'model-selector.mjs', sources: [SHARED8, MINI, SHARED28, SHARED19], sha256: sha(modelText), sliced: ['kH', 'ZH', 'QH'],
        exports: ['splitModelName', 'modelSelectorPopupClass', 'modelSelectorSubmenuPopupClass', 'modelSelectorMessages', 'modelSelector', 'effortMenuMessages'] },
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
