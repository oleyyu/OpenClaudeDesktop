// Chat side chat, 4.16336.0 source contract (claude-4.16336.0-migrate-20261104 round 2, unit chat-side-chat): the same
// semantic roots scripts/extract-chat-side-chat.mjs cuts from 3.6556.2 into src/generated/chat-side-chat (the claude.ai
// "btw" panel a Chat conversation mounts beside its transcript), cut from the frozen 4.16336.0 snapshot into the isolated
// graph src/generated/chat-side-chat-v4. The 3.6556.2 generator, output and tests are untouched (staged double output; no
// production switch this round: src/source-chat-side-chat.jsx and main.jsx keep reading src/generated/chat-side-chat,
// region-plan cutover.productionSwitchNotBeforeBatch 8; the host patch is round2/chat-side-chat/patches/). The Code side
// chat (cccc2cf0a, source-side-chat.jsx, code-editor-v4 side-chat unit) is a different panel and shares nothing here.
//
//   ca2ef848d-DA54buzo  b0  ChatSideChat           (3.6556.2 T1; chunk-internal, the Chat page renders
//                                                     `u(b0,{organizationUuid,conversationUuid,parentMessageUuid,inheritedMessageCount})`)
//                       h0  ChatSideChatMessages   (3.6556.2 b1; chunk-internal: the Q&A list, Copy answer, Branch to new chat)
//   shared-2-CsjIBQD8   h0  chatSideChatStore (export Gn; 3.6556.2 i2/hn)   v0 useChatSideChatOpen (Vn; 3.6556.2 dn)
//                       y0  useChatSideChatMessages (Hn; fn)   b0 useChatSideChatStatus (Wn; mn)
//                       x0  useChatSideChatPendingQuestion (Un; pn)
//   The store is held by no other 4.16336.0 graph (13 v4 graphs and cds-core touch shared-2, none slices h0): this graph
//   holds it and exports it, so a later consumer links it here (D1). The two `cs("btw-side-chat…")` reload blockers next
//   to it are top-level calls, not declarations, and are not emitted (pinned as raw call sites).
//
// Machinery: the shared runSlicer engine (scripts/extract-working-line.mjs, not changed here):
//   - sourceContract scripts/official-4.16336.0.mjs (vendor-frame React aliases checked against their declarators);
//   - sharedGraph 'cds-core' (CDS names are cds-core publicNames: CdsButton, CdsIcon, CdsShortcut, CdsLayerProvider,
//     useCdsLayerAwareZIndex, asElementNode and ownerWindow; cds-core module state without a publicName stops
//     generation, D46); the reviewed cds-core manifest sha256 is pinned (CDS_CORE_MANIFEST_SHA256);
//   - linkedAreas (D1, round2/plan.json chat-side-chat): code-composer-v4 (shared-25 ownerDocument), routines-shared-v4
//     (shared-2 Tv router context, the compiler's I4, preload-helper), session-rail-kit-v4 (zustand create, the compiler
//     helpers, clipboard), cowork-progress-v4 (the other graph that cuts ca2ef848d: any binding it holds is imported from
//     it, never cut again);
//   - host boundaries as localAdapters (file#local), answered by src/source-chat-side-chat-v4-adapters.jsx: the same
//     official services the 3.6556.2 graph adapts (now in their 4.16336.0 chunks/locals), re-exported unchanged from the
//     host adapter that documents each, plus c0 (3.6556.2 p1, the open / close / toggle hook) answered over this graph's
//     own store. Each original is pinned by features and by its raw declaration sha256 (ADAPTER_PINS).
// Roots are located on the official AST: each root is the only top-level declaration of its chunk whose raw text has
// the probe and whose prettier form carries every feature, under the reviewed local, with its export alias as reviewed
// and its raw declaration sha256 pinned (ROOT_PINS). No pin is ever refreshed by a script.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as official from './official-4.16336.0.mjs';
import { runSlicer, readSource, featureText, assertFeatures } from './extract-working-line.mjs';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
export const CHAT_SIDE_CHAT_V4_OUTPUT = 'src/generated/chat-side-chat-v4';
const ADAPTER_FILE = 'src/source-chat-side-chat-v4-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The cds-core graph this area was reviewed against (cds-core wave 6, cds-integrate/wave6/apply-real.json).
export const CDS_CORE_MANIFEST_SHA256 = '06d2026939e5c8992713c2a0dda1b1abc9adffe7a0c223fe3c1e79eecd08d62c';

export const PANEL = 'ca2ef848d-DA54buzo.js';
export const STORE = 'shared-2-CsjIBQD8.js';
const TARGETS = { [PANEL]: 'side-chat-panel.mjs', [STORE]: 'side-chat-store.mjs' };

// ── Roots: file -> local -> { name, export (the chunk's own alias, null: chunk-internal), probe (raw), features } ──────
export const ROOTS = {
  [STORE]: {
    h0: { name: 'chatSideChatStore', export: 'Gn', probe: 'openByConversation:{},messagesByConversation:{},statusByConversation:{},errorByConversation:{}',
      features: ['openByConversation: {},', 'messagesByConversation: {},', 'statusByConversation: {},', 'errorByConversation: {},',
        'pendingQuestionByConversation: {},', 'openWith: (t, n) =>', 'clearPendingQuestion: (t) =>', 'popLastIfUser: (t) =>',
        'appendAssistantDelta: (t, n) =>', ': [...r, { role: "assistant", text: n }];', 'setError: (t, n) =>', 'clear: (t) =>'] },
    v0: { name: 'useChatSideChatOpen', export: 'Vn', probe: 't.openByConversation[e]??!1', features: ['(t.openByConversation[e] ?? !1)'] },
    y0: { name: 'useChatSideChatMessages', export: 'Hn', probe: 't.messagesByConversation[e]??_0', features: ['(t.messagesByConversation[e] ?? _0)'] },
    b0: { name: 'useChatSideChatStatus', export: 'Wn', probe: 't.statusByConversation[e]??"idle"', features: ['(t.statusByConversation[e] ?? "idle")'] },
    x0: { name: 'useChatSideChatPendingQuestion', export: 'Un', probe: 't.pendingQuestionByConversation[e]:void 0', features: ['t.pendingQuestionByConversation[e]'] },
  },
  [PANEL]: {
    b0: { name: 'ChatSideChat', export: null, probe: 'inheritedMessageCount:i}=e',
      features: ['organizationUuid: t,', 'conversationUuid: n,', 'parentMessageUuid: r,', 'inheritedMessageCount: i,', 's = Nm() ?? o,',
        '{ enabled: c, isOpen: l, close: d } = c0(n),', '{ shortcutString: p } = zr("btw_side_chat"),', 'm = B(40),', 'if (!c) return null;',
        'a.formatMessage({ defaultMessage: "Side chat", id: "0MBP0bdWwx" }),', 'defaultMessage: "Clear side chat",', 'id: "1vPf0BAKqe",',
        'defaultMessage: "Close side chat",', 'id: "fyPrl4HbZ6",', 'defaultMessage: "Follow up\\u2026",', 'id: "P2c8olBBMP",',
        'defaultMessage: "Ask a quick question\\u2026",', 'id: "SUYgJ2XuFk",', 'id: "UAw9rsyXsu",', 's.push(`/new?q=${encodeURIComponent(r)}`);',
        'u(h0, { messages: h, status: g, onBranch: L }, se),', 'u(m0, { ref: T, disabled: ue, placeholder: z, onSubmit: Y }),',
        'u("aside", {', '"data-surface": "popover",', 'onKeyDownCapture: V,',
        '"fixed bottom-4 end-4 flex w-[400px] max-w-[calc(100vw-2rem)] max-h-[min(560px,calc(100dvh-6rem))] flex-col overflow-hidden rounded-2xl border-0.5 border-strong bg-surface-popover shadow-[0_24px_60px_color-mix(in_srgb,var(--cds-black)_18%,transparent),0_4px_16px_color-mix(in_srgb,var(--cds-black)_8%,transparent)] transition-[opacity,transform] duration-200 ease-out origin-bottom-right [&:where(:root[dir=rtl]_:dir(rtl))]:origin-bottom-left opacity-0 scale-95 pointer-events-none data-[open]:opacity-100 data-[open]:scale-100 data-[open]:pointer-events-auto",',
        '"flex shrink-0 items-center gap-1 border-b-0.5 px-3 py-2",'] },
    h0: { name: 'ChatSideChatMessages', export: null, probe: '{messages:t,status:n,onBranch:r,renderUrlsAsText:i}=e',
      features: ['{ messages: t, status: n, onBranch: r, renderUrlsAsText: i } = e,',
        '"Ask on the side without touching the main chat. Claude sees the full context, and nothing here is added to it.",', 'id: "ctWkktQM0M",',
        'defaultMessage: "Copy answer",', 'id: "9Kp4ZgNuBk",', 'icon: "GitBranch",', 'onClick: () => r(i),', 'defaultMessage: "Branch to new chat",',
        'id: "9904KlI+jU",', 'defaultMessage: "Thinking\\u2026",', 'id: "P1QHV0AhYD",',
        '"flex gap-0.5 px-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100",',
        '"max-w-[85%] rounded-xl bg-neutral-30 px-3 py-2 text-body-regular font-sans text-primary whitespace-pre-wrap break-words",',
        '"flex-1 min-h-0 overflow-y-auto px-3 py-3 flex flex-col gap-3",'] },
  },
};
// Reviewed pins: raw declaration sha256 (official bytes) of every root (`--locate` prints them; never refreshed by a script).
export const ROOT_PINS = {
  'shared-2-CsjIBQD8.js#h0': '1d15cc15bfb23bc3bf3f5e600cf45a74b362fcde3f3e2511058bdc42380a545d',
  'shared-2-CsjIBQD8.js#v0': '52a07edf2c70758a2189e68dfe687e0c27f1134a87802d7916ba2ecfa1481dd0',
  'shared-2-CsjIBQD8.js#y0': '25e707635b5d4b7a2fb8ee056d73520805561eb16a83eb58126950e411e37223',
  'shared-2-CsjIBQD8.js#b0': '291214f53bc3f192a77e015fd8d7b8b157a67e20ff05d94376ff0c8939bd6ae1',
  'shared-2-CsjIBQD8.js#x0': 'e515fe1459731297d5cbdc99821b63d1f7b7c4041aa02e2684e992181b9cff56',
  'ca2ef848d-DA54buzo.js#b0': '62c9a3b97f2db956c5c632543278c917a98aa433cf41b267bc8cddc95068de54',
  'ca2ef848d-DA54buzo.js#h0': '12f04bdf7feae5981069cd2b8cac23fbdf16c5ed4e0378c1524aee8875f9b23e',
};
// Feature checks on the panel's own parts the roots reach (a reused minified name cannot pass): file#local -> features.
export const INNER = {
  // g0 (3.6556.2 x1): the read-only line.
  'ca2ef848d-DA54buzo.js#g0': ['"Sees {count, plural, one {# message} other {# messages}} from main chat",', 'id: "3XI+xKIxnt",',
    'u(Q, { defaultMessage: "read-only", id: "GX8+SGUXDd" }),', 'name: "Eye",', '"flex w-full items-center gap-1.5 px-3 py-2 border-b-0.5 bg-bg-100/60",'],
  // m0 (3.6556.2 y1): the composer.
  'ca2ef848d-DA54buzo.js#m0': ['"flex-1 resize-none bg-transparent outline-none text-body-regular font-sans py-1.5 placeholder:text-muted min-h-[20px] max-h-[120px]",',
    's.formatMessage({ defaultMessage: "Send", id: "9WRlF4R2gm" }),', 'icon: "ArrowUp",', 'e.key === "Enter" &&', '!e.nativeEvent.isComposing &&'],
  // f0 (3.6556.2 _1): one question with the earlier Q&A pairs as btwHistory, through c9451a5b2 o.
  'ca2ef848d-DA54buzo.js#f0': ['btwHistory: l,', 's.popLastIfUser(t),', '{ source: "btw_side_question_stream" },', 'defaultMessage: "Something went wrong",',
    'id: "JqiqNj0Ooi",', '(d || n.popLastIfUser(t), n.setStatus(t, "idle"));'],
  // p0 (3.6556.2 v1): { send, abort }.
  'ca2ef848d-DA54buzo.js#p0': ['{ organizationUuid: t, conversationUuid: n, parentMessageUuid: r } = e,', '{ send: l, abort: c }'],
  // y0 / v0 (3.6556.2 w1): an outside press closes the panel unless it lands in a portal / dialog / menu.
  'ca2ef848d-DA54buzo.js#y0': ['let n = t.closest(_0);'],
  'ca2ef848d-DA54buzo.js#_0': ['\'[data-cds-portal], [data-radix-popper-content-wrapper], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]\';'],
};

// ── Host boundaries: file#local -> { name (export of the adapter module), from, features, why } ─────────────────────────
// `from` names the existing host adapter the v4 adapter module re-exports (its semantics are documented there); null:
// defined in the v4 adapter module itself.
const OWN = 'src/source-chat-side-chat-adapters.jsx', RS = 'src/source-routines-shared-adapters.jsx', RC = 'src/source-routine-cowork-adapters.jsx',
  CK = 'src/source-chat-knowledge-adapters.jsx';
export const HOST_ADAPTERS = {
  // 3.6556.2 ca2ef848d p1: the open / close / toggle hook. Every leaf but the store is a claude.ai host fact: GrowthBook
  // claudified_btw_side_chat (shared-25 ko), the router store's Code routes (shared-25 bu over /epitaxy, /code, shared-123
  // wS), a Cowork local agent context (shared-6 XD, shared-123 IV). The host answers `enabled` for a Chat conversation
  // (ChatSideChatHost, the same context the 3.6556.2 adapter reads) over this graph's store and owner window.
  'ca2ef848d-DA54buzo.js#c0': { name: 'useChatSideChatToggle', from: null,
    features: ['t = on("claudified_btw_side_chat"),', '{ matchShortcut: n } = zr("btw_side_chat"),', '(e.startsWith("/epitaxy") || e.startsWith("/code")),',
      '(o && zc() === "cowork") ||', 'let r = ve(m)?.document;', 'r.addEventListener("keydown", i, !0),', 'enabled: t,', 'isOpen: s,', 'toggle: p,'] },
  // 3.6556.2 shared-1 WV (useShortcut): the platform's bindings of a shortcut table command; the panel asks only for
  // btw_side_chat (⌘; on mac, Ctrl+; elsewhere).
  'shared-1-D1bGaTaN.js#C6': { name: 'useShortcut', from: OWN, features: ['c = h6[e],', 'd = n ? "mac" : "non-mac",', 'description: _,', 'shortcutString: g,', 'matchShortcut: h,', 'bindings: v,'] },
  // 3.6556.2 c9451a5b2 o: POST …/chat_conversations/{id}/side_question as an event stream of text deltas; locally the
  // conversation's own core through codeDesktop/sideQuestion (E59).
  'c9451a5b2-CKJkvosR.js#o': { name: 'streamChatSideQuestion', from: OWN,
    features: ['v = `/api/organizations/${o}/chat_conversations/${s}/side_question`,', 'btw_history: l,', 'parent_message_uuid: u ?? null,',
      'btwHistory: l = [],', 'onDelta: m,', 'Accept: "text/event-stream",'] },
  // 3.6556.2 shared-25 Jd (useRouter): b0's `Nm() ?? Wn()` push of `/new?q=…` goes to RoutinesSharedHost's navigate.
  'shared-25-D-aF0gt9.js#$u': { name: 'useRouter', from: RS, features: ['push: a,', 'replace: o,', 'back: s,', 'forward: c,', 'refresh: l,'] },
  // 3.6556.2 shared-0 bN: the error reporter f0 calls when the stream fails (console only, D17).
  'shared-0-CnnWnVrT.js#qB': { name: 'reportError', from: RC, features: ['var qB = P(JB, N.O11Y_INTERNALS);'] },
  // 3.6556.2 c89efce1a rc (StandardMarkdown, h0's answer text): the host Chat Markdown, as the memory and knowledge views draw it.
  'c89efce1a-CleBUUAy.js#Mu': { name: 'ChatMemoryMarkdown', from: CK, features: ['blockCitations: i,', 'normalizationMode: o,', 'renderUrlsAsText: C,', 'rubyAnnotations: l,'] },
  'vendor-intl-BJgYK7RA.js#q': { name: 'useIntl', from: RS, features: ['return (Mt(e), e);'] },
  'vendor-intl-BJgYK7RA.js#Gt': { name: 'FormattedMessage', from: RS, features: ['var Gt = a(Wt, Ut);'] },
};
// Reviewed pins: raw declaration sha256 of every adapted original.
export const ADAPTER_PINS = {
  'ca2ef848d-DA54buzo.js#c0': '8c65b9da69fbeee22cbcdf3934f1a3ab5c509c205393cfc0984894995b54efb6',
  'shared-1-D1bGaTaN.js#C6': '05f2fc55fbc616ba5c8434c63158dd329eee83cd9b7a8c9782bd1ea3328131d4',
  'c9451a5b2-CKJkvosR.js#o': '71f32b953dec2e187dbd64622da53e3e52fd4560a13788beb664e49190a95575',
  'shared-25-D-aF0gt9.js#$u': 'bca1b5a89e27f3817348b46b7fa0b6a3c14e1c60511c35cab275c6c0bfd2d2f7',
  'shared-0-CnnWnVrT.js#qB': '9786ddc2b863b95c734f9b0cf48201ae2302e49d990a43e9c6ffba102914843f',
  'c89efce1a-CleBUUAy.js#Mu': '5ecd5b925fb6e7537506abd250cb08d47fa423c3a8524f99eb15af104ebdc6b4',
  'vendor-intl-BJgYK7RA.js#q': 'edf793bc7b87ae9a38cea39d25d752a5bcfef1d492e06a2219e120311feaaec0',
  'vendor-intl-BJgYK7RA.js#Gt': 'bde2ec1630e0a679fa4135cf75389568e77fa98fdcb08519af8104d5306ff5b5',
};
for (const key of Object.keys(HOST_ADAPTERS)) if (!Object.hasOwn(ADAPTER_PINS, key)) throw Error(`adapter ${key}: no reviewed pin`);

export const LINKED_AREAS = ['code-composer-v4', 'routines-shared-v4', 'session-rail-kit-v4', 'cowork-progress-v4'];
const modules = Object.entries(ROOTS).map(([file, roots]) => ({
  source: file, target: TARGETS[file], internal: Object.values(roots).some(r => r.export === null),
  exports: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.name])),
  features: Object.fromEntries(Object.entries(roots).map(([local, r]) => [local, r.features])),
}));

// Pinned on the minified bytes (each exactly once): where the official app mounts and toggles the panel, and the two
// reload blockers next to the store (top-level calls this graph does not emit).
const rawCallSites = [
  { source: PANEL, role: 'The Chat conversation page renders b0 with the conversation, its organization and parent message, and the inherited count',
    features: ['u(b0,{organizationUuid:Td,conversationUuid:s,parentMessageUuid:La,inheritedMessageCount:gd})'] },
  { source: PANEL, role: 'b0 reads the open / close state through c0 (the toggle hook the host answers) and the btw_side_chat shortcut string',
    features: ['{enabled:c,isOpen:l,close:d}=c0(n),{shortcutString:p}=zr("btw_side_chat")'] },
  { source: STORE, role: 'Reload blockers over the store (not emitted): a pending question or a thinking answer, and an open panel on /chat/<id>',
    features: ['cs("btw-side-chat",()=>{let e=h0.getState();', 'cs("btw-side-chat-open",()=>{', 'h0 as Gn,', 'v0 as Vn,', 'y0 as Hn,', 'b0 as Wn,', 'x0 as Un,'] },
];

const declarations = src => [...new Set([...src.top.values()].filter(entry => entry.kind !== 'import'))];
const rawText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
async function carries(src, entry, features) {
  try { assertFeatures('', await featureText(src, entry), features); return true; } catch { return false; }
}

// AST location of every root (unique declaration carrying its features, under the reviewed local, export alias as
// reviewed, raw declaration sha256 as pinned).
export async function locateRoots(cache = new Map()) {
  const found = [];
  for (const [file, roots] of Object.entries(ROOTS)) {
    const src = await readSource(file, cache, official.ionSource);
    for (const [local, spec] of Object.entries(roots)) {
      const hits = [];
      for (const entry of declarations(src)) if (rawText(src, entry).includes(spec.probe) && await carries(src, entry, spec.features)) hits.push(entry);
      if (hits.length !== 1) throw Error(`${file} ${local} (${spec.name}): ${hits.length} top-level declarations carry its features, expected 1`);
      const names = [...src.top].filter(([, entry]) => entry === hits[0]).map(([name]) => name);
      if (!names.includes(local)) throw Error(`${file}: the declaration carrying ${spec.name}'s features is ${names.join(', ')}, not ${local}`);
      const alias = [...src.exported].find(([, l]) => l === local)?.[0] ?? null;
      if (alias !== spec.export) throw Error(`${file}#${local}: export alias ${alias}, reviewed ${spec.export}`);
      const declarationSha256 = sha(rawText(src, hits[0]));
      const pin = ROOT_PINS[`${file}#${local}`];
      if (pin === undefined) throw Error(`${file}#${local}: no reviewed pin`);
      if (pin !== null && pin !== declarationSha256) throw Error(`${file}#${local}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
      found.push({ file, local, name: spec.name, export: alias, declarationSha256, pinned: pin !== null });
    }
  }
  return found;
}

// The panel's own parts: each a declaration of its chunk carrying its features.
async function checkInner(cache) {
  const out = [];
  for (const [key, features] of Object.entries(INNER)) {
    const [file, local] = key.split('#');
    const src = await readSource(file, cache, official.ionSource);
    const entry = src.top.get(local);
    if (!entry || entry.kind === 'import') throw Error(`inner ${key} is not a declaration`);
    assertFeatures(`inner ${key}`, await featureText(src, entry), features);
    out.push({ key, sha256: sha(rawText(src, entry)) });
  }
  return out;
}

// Every adapted original: a declaration of its chunk carrying its features, its raw sha256 as pinned.
export async function pinAdapters(cache = new Map()) {
  const out = [];
  for (const [key, spec] of Object.entries(HOST_ADAPTERS)) {
    const [file, local] = key.split('#');
    const src = await readSource(file, cache, official.ionSource);
    const entry = src.top.get(local);
    if (!entry || entry.kind === 'import') throw Error(`adapter ${key} is not a declaration`);
    assertFeatures(`adapter ${key}`, await featureText(src, entry), spec.features);
    const declarationSha256 = sha(rawText(src, entry));
    const pin = ADAPTER_PINS[key];
    if (pin !== null && pin !== declarationSha256) throw Error(`adapter ${key}: declaration ${declarationSha256} differs from the reviewed pin ${pin}`);
    out.push({ original: key, name: spec.name, hostAdapter: spec.from ?? ADAPTER_FILE, declarationSha256, pinned: pin !== null });
  }
  return out;
}

// The host adapter module answers exactly the adapted names: each re-exported from the host adapter that documents it,
// or (from: null) defined in the module itself.
async function assertAdapterModule() {
  const text = await fs.readFile(path.join(root, ADAPTER_FILE), 'utf8');
  const exported = new Map();
  for (const m of text.matchAll(/export \{([^}]*)\} from "\.\/([\w.-]+)";/g))
    for (const name of m[1].split(',').map(s => s.trim()).filter(Boolean)) exported.set(name, `src/${m[2]}`);
  for (const m of text.matchAll(/^export function (\w+)/gm)) exported.set(m[1], null);
  const wanted = new Map(Object.values(HOST_ADAPTERS).map(a => [a.name, a.from]));
  for (const [name, from] of wanted) if (!exported.has(name) || exported.get(name) !== from)
    throw Error(`${ADAPTER_FILE}: ${name} is not ${from ? `re-exported from ${from}` : 'defined here'}`);
  for (const name of exported.keys()) if (!wanted.has(name)) throw Error(`${ADAPTER_FILE}: ${name} is not an adapter of this graph`);
  for (const [name, from] of wanted) {
    if (!from) continue;
    const host = await fs.readFile(path.join(root, from), 'utf8');
    if (!new RegExp(`export (?:const|function|async function) ${name}\\b|export \\{[^}]*\\b${name}\\b[^}]*\\}`).test(host)) throw Error(`${from} does not export ${name}`);
  }
}

async function cdsCorePin() {
  const now = sha(await fs.readFile(path.join(generatedRoot, 'cds-core/manifest.json')));
  if (now !== CDS_CORE_MANIFEST_SHA256)
    throw Error(`cds-core manifest is ${now}, not the reviewed ${CDS_CORE_MANIFEST_SHA256}: re-run, review the chat-side-chat-v4 closure and update CDS_CORE_MANIFEST_SHA256`);
  return now;
}

export function chatSideChatV4Config() {
  return {
    name: 'chat side chat (4.16336.0)', generator: 'extract-chat-side-chat-v4.mjs', output: path.join(root, CHAT_SIDE_CHAT_V4_OUTPUT),
    adapterModule: '../../source-chat-side-chat-v4-adapters.jsx', adapterFile: ADAPTER_FILE, adapters: {},
    localAdapters: Object.fromEntries(Object.entries(HOST_ADAPTERS).map(([key, a]) => [key, { name: a.name, features: a.features }])),
    modules, rawCallSites, sharedGraph: 'cds-core', generatedRoot, sourceContract: official, linkedAreas: LINKED_AREAS,
    referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, source: official.ionSource,
    vendor: { [official.vendorFrame]: official.reactAliases },
  };
}
export const probeConfig = chatSideChatV4Config;

export async function extractChatSideChatV4({ check = false, dryRun = false } = {}) {
  const cdsCore = await cdsCorePin();
  const cache = new Map();
  const roots = await locateRoots(cache);
  const inner = await checkInner(cache);
  const adapters = await pinAdapters(cache);
  await assertAdapterModule();
  const linked = {};
  for (const area of LINKED_AREAS) linked[area] = sha(await fs.readFile(path.join(generatedRoot, area, 'manifest.json')));
  const cfg = {
    ...chatSideChatV4Config(),
    async artifacts(m) {
      for (const key of Object.keys(INNER)) {
        const [file, local] = key.split('#');
        if (!m.modules.some(mod => mod.source === file && mod.bindings.some(b => b.name === local))) throw Error(`inner ${key} is no longer reached`);
      }
      return {
        'index.mjs': `// Semantic names for the chat side chat roots (${official.referenceVersion}); generated by extract-chat-side-chat-v4.mjs.\n`
          + Object.entries(ROOTS).map(([file, rs]) => `export { ${Object.values(rs).map(r => r.name).join(', ')} } from "./${TARGETS[file]}";`).join('\n') + '\n',
        'provenance.json': JSON.stringify({
          referenceVersion: official.referenceVersion, referenceSnapshot: official.referenceSnapshot, generator: 'scripts/extract-chat-side-chat-v4.mjs',
          previous: { generator: 'scripts/extract-chat-side-chat.mjs', output: 'src/generated/chat-side-chat', referenceVersion: official.previousVersion },
          sharedGraph: { area: 'cds-core', manifestSha256: cdsCore }, linkedAreas: linked,
          roots, inner, adapters,
          imports: m.modules.flatMap(mod => mod.imports.filter(i => i.kind !== 'generated').map(i => ({ module: mod.target, local: i.local, kind: i.kind, from: i.from, name: i.name, via: i.via }))),
        }, null, 2) + '\n',
      };
    },
  };
  return runSlicer(cfg, { check, dryRun });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--locate')) {
    const cache = new Map();
    for (const f of await locateRoots(cache)) console.log('root', `${f.file}#${f.local}`, f.declarationSha256, f.pinned ? 'pinned' : 'UNPINNED');
    for (const a of await pinAdapters(cache)) console.log('adapter', a.original, a.declarationSha256, a.pinned ? 'pinned' : 'UNPINNED');
  } else await extractChatSideChatV4({ check: process.argv.includes('--check'), dryRun: process.argv.includes('--dry-run') });
}
