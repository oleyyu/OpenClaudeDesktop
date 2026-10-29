import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { withMemoCache } from './support/react-memo-cache.mjs';
import { ionSource } from '../scripts/official-3.6556.2.mjs';

// w13-chatfn-memory: Settings › Memory after 3.6556.2 c6bba3086 (Sn, En, yt, kn), c274117ff O and cffc9ea71 (w, E, D, O).
// Official chunks are read as text only. SSR through Vite middleware mode; no browser, Electron or core.
const app = path.resolve(import.meta.dirname, '..');
const chunk = prefix => fs.readFileSync(path.join(ionSource, fs.readdirSync(ionSource).find(name => name.startsWith(prefix) && name.endsWith('.js'))), 'utf8');
const official = text => text.replaceAll('’', '\\u2019');
let server, Memory;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Memory = await server.ssrLoadModule('/src/source-settings-memory.jsx');
});
after(() => server?.close());

test('every string is the 3.6556.2 original, word for word, and has zh-CN', async () => {
  const settings = chunk('c6bba3086-'), preview = chunk('c274117ff-'), content = chunk('cffc9ea71-');
  const C = Memory.MEMORY_COPY;
  const where = {
    [C.title]: settings, [C.referenceLabel]: settings, [C.generateLabel]: settings, [C.chatMemory]: settings, [C.noMemory]: settings,
    [C.viewAndManage]: settings, [C.updated]: settings, [C.turnOff]: settings, [C.pause]: settings, [C.pauseDescription]: settings,
    [C.reset]: settings, [C.resetDescription]: settings, [C.cancel]: settings, [C.settingError]: settings,
    [C.manage]: preview, [C.manageDescription]: preview, [C.manageEdits]: content,
    [C.updating]: content, [C.editLabel]: content, [C.editPlaceholder]: content, [C.maxEdits]: content, [C.submit]: content,
    [C.backToMemory]: content, [C.saveChanges]: content, [C.clearEdits]: content, [C.removeEdit]: content, [C.allEditsCleared]: content,
  };
  for (const [text, source] of Object.entries(where)) assert.ok(source.includes(`defaultMessage:"${official(text)}"`), text);
  // Sentences whose official copy ends in a claude.ai help link: the same words, the link left out.
  assert.ok(settings.includes(`defaultMessage:"${official(C.referenceDescription)} <a>Learn more</a>"`));
  for (const sentence of [C.generateFirst, C.generateFirstCowork, C.generateChosen, C.generateChosenCowork])
    assert.ok(settings.includes(`defaultMessage:"${official(sentence.replace(/\.$/, ''))}. <a>Learn more</a>."`), sentence);
  assert.ok(chunk('shared-182-').includes(`"${official(C.regenerateError)}"`));
  const zh = {};
  for (const file of fs.readdirSync(path.join(app, 'electron/i18n/zh-CN')).filter(name => name !== 'index.mjs'))
    Object.assign(zh, (await import(path.join(app, 'electron/i18n/zh-CN', file))).default);
  for (const text of Object.values(C)) assert.equal(typeof zh[text], 'string', `zh-CN: ${text}`);
  // yt's classes and the kn radio card.
  for (const className of ['flex w-full items-center justify-between rounded-lg bg-surface-1 px-md py-sm text-start cursor-default',
    'cds-reset flex w-full items-center justify-between rounded-lg bg-alpha-1 px-md py-sm text-start transition-colors hover:bg-alpha-2 focus-visible:shadow-focus',
    'rounded-2xl bg-surface-0 p-4 flex flex-col gap-4']) assert.ok(settings.includes(`"${className}"`), className);
});

const STATE = (settings, memory = { memory: '', controls: [], updated_at: null }) => ({ settings: { enabled: false, paused: false, referenceChats: true, threads: {}, ...settings }, memory, synthesizing: false });
const render = (props) => renderToStaticMarkup(React.createElement(Memory.SourceSettingsMemory, { desktopCall: async () => null, ...props }));

test('the Memory group: Search and reference chats, then Generate memory from chat history (off: no summary row)', () => {
  const html = render({ initialState: STATE({}), boot: { coworkEnabled: false, config: {} } });
  assert.match(html, /<h3[^>]*>Memory<\/h3>/);
  const order = ['Search and reference chats', 'Allow Claude to search for relevant details in past chats.', 'Generate memory from chat history',
    'Allow Claude to remember relevant context from your chats. Memory includes your entire chat history with Claude.'];
  let at = -1;
  for (const text of order) { const next = html.indexOf(text); assert.ok(next > at, text); at = next; }
  assert.match(html, /role="switch" aria-label="Search and reference chats" aria-checked="true"/);
  assert.match(html, /role="switch" aria-label="Generate memory from chat history" aria-checked="false"/);
  assert.doesNotMatch(html, /data-memory-summary/);
  assert.doesNotMatch(html, /Learn more/);
});

test('descriptions follow En: never chosen / chosen, with Cowork', () => {
  assert.match(render({ initialState: STATE({}), boot: { coworkEnabled: true, config: {} } }), /from your chats and Cowork sessions\. Memory includes your entire chat history with Claude\./);
  // G5 (memory-04): chosen is chat-memory's userSetting (c6bba3086 `C.userSetting===void 0`), not "enabled was ever written".
  assert.match(render({ initialState: STATE({ enabled: true, userSetting: true }), boot: { coworkEnabled: true, config: { chatMemory: { enabled: true } } } }), /from your chats and Cowork sessions\. This setting also applies to projects\./);
  assert.match(render({ initialState: STATE({ enabled: true, userSetting: true }), boot: { coworkEnabled: false, config: { chatMemory: { enabled: true } } } }), /This setting controls memory for both chats and projects\./);
  assert.match(render({ initialState: STATE({ paused: true, userSetting: false }), boot: { coworkEnabled: false, config: {} } }), /This setting controls memory for both chats and projects\./, 'Turn off is a choice');
  assert.match(render({ initialState: STATE({ enabled: false, referenceChats: false }), boot: { coworkEnabled: false, config: { chatMemory: { enabled: false, referenceChats: false } } } }),
    /Memory includes your entire chat history with Claude\./, 'switching Search and reference chats is no choice about generating');
});

test('yt: "Chat memory · No memory yet", or the "View and manage memory · Updated {time}" button', () => {
  const empty = render({ initialState: STATE({ enabled: true }), boot: { config: { chatMemory: { enabled: true } } } });
  assert.match(empty, /aria-label="Generate memory from chat history" aria-checked="true"/);
  assert.match(empty, /<div class="flex w-full items-center justify-between rounded-lg bg-surface-1 px-md py-sm text-start cursor-default" data-memory-summary="empty"><span class="min-w-0 truncate"><span class="text-body text-primary">Chat memory<\/span><span class="text-footnote text-muted-as-secondary"> · No memory yet<\/span><\/span><\/div>/);
  const full = render({ initialState: STATE({ enabled: true }, { memory: 'Likes tea', controls: [], updated_at: '2026-10-20T08:00:00.000Z' }), boot: { config: { chatMemory: { enabled: true } } } });
  assert.match(full, /<button type="button" data-memory-summary="" class="cds-reset flex w-full items-center justify-between rounded-lg bg-alpha-1 px-md py-sm text-start transition-colors hover:bg-alpha-2 focus-visible:shadow-focus"><span class="min-w-0 truncate"><span class="text-body text-primary">View and manage memory<\/span><span class="text-footnote text-muted-as-secondary"> · Updated [^<]*2026[^<]*<\/span><\/span>/);
  assert.equal(Memory.memoryUpdatedLabel('2026-10-20T08:00:00.000Z', 'en-US'), 'Updated Oct 20, 2026');
  assert.equal(Memory.memoryUpdatedLabel(null), null);
  // Paused: the switch is off and the summary row is gone (yt returns null while memory isn't available).
  assert.doesNotMatch(render({ initialState: STATE({ enabled: false, paused: true }, { memory: 'Likes tea', controls: [], updated_at: null }), boot: { config: {} } }), /data-memory-summary/);
});

function shallow(component, props) {
  const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
  let id = 0;
  internal.H = withMemoCache({
    useId: () => `:r${id++}:`, useRef: value => ({ current: value }), useMemo: create => create(), useCallback: fn => fn,
    useState: value => [typeof value === 'function' ? value() : value, () => {}],
    useEffect() {}, useLayoutEffect() {}, useContext: context => context._currentValue, useSyncExternalStore: (subscribe, get) => get(),
  });
  try { return component(props); } finally { internal.H = old; }
}
function findAll(node, predicate, out = []) {
  if (Array.isArray(node)) { for (const child of node) findAll(child, predicate, out); return out; }
  if (!node || typeof node !== 'object') return out;
  if (predicate(node)) out.push(node);
  if (node.props) for (const value of Object.values(node.props)) if (value && typeof value === 'object') findAll(value, predicate, out);
  return out;
}
const text = node => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join('') : node?.props?.children !== undefined ? text(node.props.children) : '';

test('kn "Turn off memory": Pause memory / Reset memory with their descriptions; Reset is the danger button', async () => {
  const confirmed = [];
  const dialog = shallow(Memory.MemoryTurnOffDialog, { open: true, onClose() {}, onConfirm: async choice => { confirmed.push(choice); } });
  assert.equal(dialog.props.title, 'Turn off memory');
  const [radio] = findAll(dialog, node => Array.isArray(node.props?.options));
  assert.deepEqual(radio.props.options, [
    { value: 'pause', label: 'Pause memory', description: 'Claude keeps its existing memory but won’t use memory or make new memories.' },
    { value: 'reset', label: 'Reset memory', description: 'This will permanently delete all memories, including project memories. This can’t be undone.' }]);
  assert.equal(radio.props.value, 'pause');
  const buttons = findAll(dialog, node => typeof node.props?.variant === 'string' && typeof node.props?.onClick === 'function');
  assert.deepEqual(buttons.map(node => [node.props.variant, text(node)]), [['secondary', 'Cancel'], ['primary', 'Pause memory']]);
  await buttons[1].props.onClick();
  assert.deepEqual(confirmed, ['pause']);
});

test('Manage memory: header description, the summary, the edit field and Manage edits; the edits view', () => {
  const memory = { memory: '## You\n- Like tea', controls: ['Forget my job'], updated_at: '2026-10-20T08:00:00.000Z' };
  const submitted = [];
  const dialog = shallow(Memory.MemoryManageDialog, { open: true, onClose() {}, memory, busy: false, onControls: next => submitted.push(next) });
  assert.equal(dialog.props.title, 'Manage memory');
  assert.equal(dialog.props.description, 'Here’s what Claude remembers about you! This summary is regenerated each night and does not include projects, which have their own specific memory.');
  assert.equal(dialog.props.size, 'lg');
  // G5 (chatfn-memory-02 / 03): the body is the sliced cffc9ea71 w — the memory as Chat Markdown, the clay gradient, the
  // E edit field with the c6bd2cd90 rotating placeholder, D's "Manage edits" row — over ChatMemoryHostContext.
  const html = renderToStaticMarkup(dialog.props.children);
  assert.match(html, /<div class="h-full px-5 py-4 pb-24 font-claude-response text-sm overflow-y-auto rounded-t-lg bg-bg-200\/20 h-full">/);
  // w13 closeout: G8 put the official c89efce1a renderer under it; its vs() headings take the context headingLevelOffset
  // (_s[Math.min(e + c, 6) - 1]), so the summary's "## You" renders one level down, with dir="ltr".
  assert.match(html, /<h3 dir="ltr">You<\/h3>\s*<ul dir="ltr">\s*<li>Like tea<\/li>/, 'Markdown, not plain text');
  assert.match(html, /radial-gradient\(at 90% 90%,color-mix\(in srgb, var\(--cds-clay\) 10%, transparent\) 0%, transparent 90%\)/);
  assert.match(html, /aria-label="Tell Claude what to remember or forget"/);
  assert.match(html, /<div aria-hidden="false" class="absolute inset-0 w-full h-full p-3 pointer-events-none[^"]*"><p class="break-words absolute"[^>]*>Tell Claude what to remember or forget\.\.\.<\/p>/);
  assert.match(html, /<button class="rounded-lg border-0\.5 hover:bg-surface-0 flex flex-row items-center justify-between text-start mt-4 h-9 px-3"><span class="font-base text-secondary">Manage edits<\/span>/);
  assert.match(html, />1<\/div>/);
  // Updating: the official status line replaces the summary (and the edit field is gone).
  const busy = renderToStaticMarkup(shallow(Memory.MemoryManageDialog, { open: true, onClose() {}, memory, busy: true, onControls() {} }).props.children);
  assert.match(busy, /Updating memory\.\.\./);
  assert.doesNotMatch(busy, /aria-label="Tell Claude what to remember or forget"/);
  // No memory: no dialog (c274117ff O returns null without `memory`).
  assert.equal(shallow(Memory.MemoryManageDialog, { open: true, onClose() {}, memory: { memory: '' }, onControls() {} }), null);
  // The edits view.
  const edits = shallow(Memory.MemoryManageDialog, { open: true, onClose() {}, memory, busy: false, onControls() {}, initialView: 'edits' });
  assert.equal(edits.props.title, 'Manage edits');
  const editsHtml = renderToStaticMarkup(edits.props.children);
  assert.match(editsHtml, /Back to memory/);
  assert.match(editsHtml, /Clear edits/);
  assert.match(editsHtml, /<li class="flex flex-row items-center justify-between gap-3 ps-3 py-2\.5 last:border-b-0 border-b-0\.5 text-primary font-base"><p>Forget my job<\/p>/);
  assert.match(editsHtml, /aria-label="Remove edit"/);
  // A project's dialog (c274117ff O with a project): its own title and description.
  const project = shallow(Memory.MemoryManageDialog, { open: true, onClose() {}, memory, busy: false, onControls() {}, projectId: 'p1' });
  assert.equal(project.props.title, 'Manage project memory');
  assert.match(project.props.description, /^Claude regenerates project memory every evening/);
  assert.ok(chunk('c274117ff-').includes('defaultMessage:"Manage project memory",id:"PG2tpcuuml"'));
  // An edit reaches onControls with the new list (cffc9ea71 E: `c({controls:[...h, y], project_uuid: i})`).
  const sent = [];
  const live = shallow(Memory.MemoryManageDialog, { open: true, onClose() {}, memory, busy: false, onControls: next => sent.push(next) });
  live.props.children.props.value.update({ controls: ['Forget my job', 'Use metric'], project_uuid: undefined });
  assert.deepEqual(sent, [['Forget my job', 'Use metric']]);
});

test('hosting: a Settings section after Usage, and the + menu Memory checkbox in Chat', () => {
  const settings = fs.readFileSync(path.join(app, 'src/source-settings.jsx'), 'utf8');
  assert.match(settings, /\{id:'usage',label:'Usage',icon:'UsageGaugeMiddle',group:'Settings'\},\n  \/\/ w13-chatfn-memory:[^\n]*\n  \{id:'memory',label:'Memory',icon:'Memory',group:'Settings',[^\n]*page:SourceSettingsMemory\},/);
  assert.match(settings, /import \{ SourceSettingsMemory \} from '\.\/source-settings-memory\.jsx';/);
  const shared46 = chunk('shared-46-');
  assert.ok(shared46.includes('e.push({id:"memory",href:"/customize/memory",label:t,name:a.formatMessage({defaultMessage:"Memory",id:"JxlSRWr2J/"}),icon:Op,testId:"memory-settings"})'));
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  // w13-chatfn-tools: the checkbox is now Js's `memory` slot of the Chat + menu (modes group, after separator-modes).
  const at = main.indexOf('// w13-chatfn-memory: c752b32f8 ns');
  const block = main.slice(at, main.indexOf('case "titlebar":'));
  const add = main.indexOf('case "add": {');
  assert.ok(add > 0 && at > main.indexOf('if (mode === "chat") {', add), 'in the Chat branch of the + menu');
  assert.match(block, /memory: \{ type: "checkbox", label: t\("Memory"\), icon: "Memory", checked: memoryOn, closeOnClick: true, onAction:/);
  assert.match(block, /call\("chat-memory", \{ op: "thread", threadId: current \|\| null, enabled: !memoryOn \}\)/);
});
