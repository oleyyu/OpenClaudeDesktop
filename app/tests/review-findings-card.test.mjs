import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// R4e-findings (toolcards-18): a finished ReportFindings call in the transcript is the 2.42304.0 findings card — the
// generated c96d752d0 X$ / h0e (src/generated/r4e-findings/findings-card.mjs, scripts/extract-r4e-findings.mjs) over the
// host services of src/source-review-findings-adapters.jsx, mounted by src/source-findings-card.jsx. SSR for the
// structure and class strings; a small fake DOM driven by React's own props (controlled events) for the expansion and the
// actions. No browser, no Electron, no network, no real send.
const app = path.resolve(import.meta.dirname, '..');
const directory = path.join(app, 'src/generated/r4e-findings');
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
const reference = path.resolve(app, '../reference', manifest.referenceSnapshot, 'ion-dist/assets/v1');
const raw = file => fs.readFileSync(path.join(reference, file), 'utf8');
const occurrences = (text, needle) => text.split(needle).length - 1;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

let server, Card, Adapters, Session, Reveal, Generated, FixText;
before(async () => {
  // ws: false — no WebSocket server, so the test listens on no port.
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Card = await server.ssrLoadModule('/src/source-findings-card.jsx');
  Adapters = await server.ssrLoadModule('/src/source-review-findings-adapters.jsx');
  Session = await server.ssrLoadModule('/src/source-session.jsx');
  Reveal = await server.ssrLoadModule('/src/diff-reveal.mjs');
  Generated = await server.ssrLoadModule('/src/generated/r4e-findings/findings-card.mjs');
  FixText = await server.ssrLoadModule('/src/generated/r4e-findings/fix-findings-text.mjs');
});
after(async () => { await server?.close(); });

const call = (args, { id = 'rf1', status = 'completed', ...rest } = {}) => ({ id, turnId: 't1', type: 'mcpToolCall', server: 'code_desktop', tool: 'ReportFindings', status,
  arguments: args, result: status === 'completed' ? { content: [{ type: 'text', text: 'Reported.' }] } : null, error: null, ...rest });
const FINDINGS = [
  { file: 'src/a.js', line: 12, summary: 'Off by one in the loop bound.', failure_scenario: 'n = 0 reads past the end', category: 'off_by_one_in_a_long_category_name' },
  { file: 'src/a.js', summary: 'The handle leaks on every retry of the upload when the server answers with a redirect loop', failure_scenario: 'many opens',
    verdict: 'CONFIRMED' },
  { file: 'lib/b.js', line: 3, summary: 'Race', short_summary: 'Race on close', failure_scenario: '-' },
];
const review = (id = 'rf1', extra = {}) => call({ level: 'high', findings: FINDINGS, ...extra }, { id });
function hostRecorder(sessionKey, overrides = {}) {
  const calls = [];
  return { calls, host: { sessionKey, running: false, canViewChanges: true, fileInChanges: () => true,
    openChanges: () => calls.push(['changes']), send: async text => { calls.push(['send', text]); return true; },
    queue: async text => { calls.push(['queue', text]); return true; }, rerun: text => calls.push(['rerun', text]),
    prefill: text => calls.push(['prefill', text]), ...overrides } };
}
const mount = (host, props) => React.createElement(Card.FindingsCardHost.Provider, { value: host }, React.createElement(Card.SourceFindingsCard, props));

test('generator: the card and every original it reads are the installed 2.42304.0 bindings (generator --check)', async () => {
  const { extractR4eFindings } = await import('../scripts/extract-r4e-findings.mjs');
  const checked = await extractR4eFindings({ check: true });
  assert.deepEqual(checked, manifest);
  for (const entry of manifest.modules) {
    assert.equal(entry.sourceSha256, sha(fs.readFileSync(path.join(reference, entry.source))), entry.source);
    assert.equal(entry.sha256, sha(fs.readFileSync(path.join(directory, entry.target))), entry.target);
  }
  const card = manifest.modules.find(m => m.target === 'findings-card.mjs');
  assert.equal(card.source, 'c96d752d0-BOCqU7c2.js');
  assert.deepEqual(card.bindings.map(b => b.name), ['V$', 'H$', 'U$', 'd0e', 'W$', 'G$', 'K$', 'q$', 'f0e', 'J$', 'p0e', 'm0e', 'Y$', 'h0e', 'X$']);
  // Jw (the fix message) is a plain sibling module the card and the review model (the Changes pane's Fix) both import.
  const fix = manifest.modules.find(m => m.target === 'fix-findings-text.mjs');
  assert.equal(fix.source, 'c96d752d0-BOCqU7c2.js');
  assert.deepEqual(fix.bindings.map(b => b.name), ['qw', 'nEe', 'Jw']);
  assert.deepEqual(fix.imports.map(i => `${i.name}<-${i.from}`), ['neutralizeMentions<-./text-sanitize.mjs']);
  assert.ok(card.imports.some(i => i.local === 'Jw' && i.from === './fix-findings-text.mjs' && i.name === 'fixFindingsText'));
  const byKind = kind => card.imports.filter(i => i.kind === kind).map(i => `${i.name}<-${i.via}`).sort();
  // D1/D24: the CDS components come from the shared view-tabs graph by semantic name; CdsOverflowTooltip is the original.
  assert.deepEqual(byKind('view-tabs'), ['CdsBadge<-shared-frame-BfjMqbuN.js:Vl', 'CdsButton<-shared-frame-BfjMqbuN.js:cl', 'CdsOverflowTooltip<-shared-frame-BfjMqbuN.js:Dc',
    'CdsTooltipProvider<-shared-frame-BfjMqbuN.js:kc', 'clsx<-vendor-frame-DfPJ1QmD.js:za']);
  assert.deepEqual(byKind('adapter'), [
    'FilePathMenu<-c856385e2-DVsjb2QL.js:i', 'FormattedMessage<-vendor-intl-Db7hDWRO.js:l', 'logFindingExpanded<-c68c4283d-CPuRD0vx.js:xt',
    'logFindingsCardRendered<-c68c4283d-CPuRD0vx.js:St', 'logFixApplied<-c68c4283d-CPuRD0vx.js:Ct', 'logRerunReview<-c68c4283d-CPuRD0vx.js:wt',
    'logWalkthroughOpened<-c68c4283d-CPuRD0vx.js:Et', 'reviewFindingsActions<-cc8941b7b-CZT9QwXr.js:A', 'reviewFindingsStore<-cc8941b7b-CZT9QwXr.js:V',
    'useErrors<-shared-52-DGviI8xb.js:Ya', 'useFindingStatuses<-cc8941b7b-CZT9QwXr.js:nt', 'useIntl<-vendor-intl-Db7hDWRO.js:p',
    'useLatestSettledAtActivation<-cc8941b7b-CZT9QwXr.js:$', 'usePaneStore<-c03935b01-CyJKQj4N.js:pt', 'usePaneStoreContext<-c03935b01-CyJKQj4N.js:mt',
    'usePaneStoreState<-c03935b01-CyJKQj4N.js:ft', 'useSeededFindingsToolIds<-cc8941b7b-CZT9QwXr.js:ot', 'useSendWithOutcome<-c6b8adeaf-C5Aww7gq.js:g',
    'useSessionDiffEntries<-c5da7eb42-B8cTG8SI.js:St', 'useSessionTurnRunning<-c06cf64bb-BE5q2vSr.js:on', 'useSurfaceHidden<-shared-1-CAAiD7E3.js:ic',
    'useUnanchoredFindingIds<-cc8941b7b-CZT9QwXr.js:ft']);
  // Each adapter is an export of the adapter module.
  for (const entry of manifest.modules.flatMap(m => m.imports).filter(i => i.kind === 'adapter')) assert.ok(entry.name in Adapters, entry.name);
  assert.deepEqual(manifest.callSites.map(site => site.binding ?? `${site.source} (raw)`), ['m2e', 'e0', 'A5', 'uat', 'c8a3f7430-DosKuJ6G.js (raw)', 'cc43287c9-DAfOi8yP.js (raw)']);
  assert.ok(fs.readdirSync(path.join(app, 'scripts')).includes('verify-gen-r4e-findings.mjs'));
});

test('toolcards-18 evidence: the category badge, its tooltip and the ungated card request occur once in 2.42304.0', () => {
  const pins = [
    ['c96d752d0-BOCqU7c2.js', 'className:"max-w-[7rem]"'],
    ['c96d752d0-BOCqU7c2.js', 'b(ds,{variant:"neutral",size:"xs",truncate:!0,className:"max-w-[7rem]",children:b($o,{lazy:!0,hoverable:!1,children:e.category})})'],
    ['c96d752d0-BOCqU7c2.js', 'p(Ts,{closeDelay:0,children:[b(rb,{}),'],
    ['c96d752d0-BOCqU7c2.js', 'if(a&&H$(e.tools[0]))return b(X$,{tool:e.tools[0],sessionRef:t,onPrefillComposer:n,fallback:c})'],
    ['c8a3f7430-DosKuJ6G.js', 'reportFindingsCard:!0'],
    // R4h-findings (Y1-R4e-findings-1, Y1-R4e-findings-2): Apply fixes is not disabled by running, sendWithOutcome
    // queues mid-turn sends, and hasSidePanes defaults to true while ae (useSessionDiffEntries) gates Walk through.
    ['c96d752d0-BOCqU7c2.js', 'disabled:z!=="actionable"||!q'],
    ['c96d752d0-BOCqU7c2.js', 'v=Yh(e=>e.hasSidePanes)&&_!==null'],
    ['c96d752d0-BOCqU7c2.js', 'w=t!==void 0&&v&&S>0'],
    ['c96d752d0-BOCqU7c2.js', 'ae=k!=="local"||(K??[]).some(e=>!e.stackParent)'],
    ['c03935b01-CyJKQj4N.js', 'hasSidePanes:e?.hasSidePanes??!0'],
    ['c6b8adeaf-C5Aww7gq.js', 'let b=R(n.id),x=Hi(t,b),S=x!==null&&L.getState().hasEchoedUuid(n.id,s);S||m(n.id,s,Ui(t,b)),x&&!S&&p(n.id,x)'],
  ];
  for (const [name, needle] of pins) assert.equal(occurrences(raw(name), needle), 1, `${name}: ${needle}`);
  // The generated card carries the badge as shipped.
  const text = fs.readFileSync(path.join(directory, 'findings-card.mjs'), 'utf8');
  assert.match(text, /b\(ds, \{\s*variant: "neutral",\s*size: "xs",\s*truncate: !0,\s*className: "max-w-\[7rem\]",\s*children: b\(\$o, \{\s*lazy: !0,\s*hoverable: !1,\s*children: e\.category,\s*\}\),\s*\}\)/);
  assert.match(text, /import \{\s*CdsButton as Ss,\s*CdsTooltipProvider as Ts,\s*CdsBadge as ds,\s*CdsOverflowTooltip as \$o,\s*\} from "\.\.\/view-tabs\/shared-frame-BfjMqbuN\.js";/);
});

test('SSR: header, file groups, rows and badges carry the original structure and classes', () => {
  const { host } = hostRecorder('s-ssr');
  const item = review();
  const html = renderToStaticMarkup(mount(host, { item, sessionKey: 's-ssr', items: [item] }));
  assert.match(html, /^<div class="source-message" data-transcript-item-id="rf1" data-cds="FindingsCard"><div tabindex="-1" class="my-\[6px\] flex w-full select-text flex-col gap-1 rounded-lg px-md py-xs shadow-\[inset_0_0_0_1px_var\(--cds-border\)\] focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus"><span role="status" class="sr-only"><\/span>/);
  assert.match(html, /<div class="-me-0\.5 flex min-w-0 items-center gap-1 flex-wrap"><span class="shrink-0 text-body text-primary">Code review<\/span><span class="min-w-0 truncate text-body text-secondary">high · 3 findings<\/span><span class="grow"><\/span>/);
  // Actionable: Apply fixes (ghost, muted) and Walk through in diff (secondary); Re-run review only once terminal.
  assert.ok(html.indexOf('>Apply fixes<') > 0 && html.indexOf('>Apply fixes<') < html.indexOf('>Walk through in diff<'));
  assert.doesNotMatch(html, /Re-run review/);
  assert.match(html, /text-muted hover:text-secondary text-footnote shrink-0"/, 'Yb muted action class on the ghost button');
  assert.match(html, /<div aria-hidden="true" class="-mx-\[calc\(var\(--cds-pad-md\)-1px\)\] h-px shrink-0 bg-alpha-2"><\/div><div class="grid w-full min-w-0 grid-cols-\[minmax\(0,max-content\)_1fr\] gap-y-0\.75">/);
  // f0e: one group per file in first-seen order, its basename labelling the list, the path on the file menu trigger.
  assert.match(html, /<div id="rf1-file-0" class="col-span-full truncate pt-0\.75 text-body font-semibold text-secondary" title="src\/a\.js" data-file-ref="src\/a\.js">a\.js<\/div><ul role="list" aria-labelledby="rf1-file-0" class="col-span-full grid min-w-0 grid-cols-subgrid ps-\[calc\(var\(--cds-pad-lg\)\+var\(--cds-pad-xs\)\)\]">/);
  assert.match(html, /id="rf1-file-1"[^>]*title="lib\/b\.js"[^>]*>b\.js</);
  assert.equal(occurrences(html, '<li class="col-span-full grid min-w-0 grid-cols-subgrid">'), 3);
  assert.equal(occurrences(html, 'aria-expanded="false" class="-mx-pad-xs flex min-w-0 grow items-center gap-md rounded-[5px] px-xs py-xs text-start focus-visible:outline-hidden hover:bg-fill-ghost-hover hide-focus-ring focus-visible:shadow-focus col-span-full grid grid-cols-subgrid"'), 3);
  // toolcards-18: the category badge truncates (CdsBadge truncate → min-w-0 + an ellipsis span) at 7rem, its text inside
  // a lazy CdsOverflowTooltip trigger (no tooltip mounted until it overflows and is hovered).
  assert.match(html, /<span data-cds="Badge" data-size="xs" class="[^"]*min-w-0 bg-neutral text-secondary max-w-\[7rem\]"><span class="pb-\[0\.05em\] min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap"><span data-cds="OverflowTooltip" class="block min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap" id="[^"]+" data-base-ui-tooltip-trigger="">Off by one in a long category name<\/span><\/span><\/span>/);
  assert.doesNotMatch(html, /role="tooltip"|data-popup/);
  assert.match(html, /<span data-cds="Badge" data-size="xs" class="[^"]*shrink-0 bg-tint-red text-danger"><span class="pb-\[0\.05em\]">Confirmed<\/span><\/span>/);
  assert.match(html, />Unverified</);
  // p0e: trailing punctuation dropped, at most 72 characters cut at a word with an ellipsis, short_summary first; q$ in sr-only.
  assert.match(html, /<span class="sr-only">src\/a\.js:12\. <\/span>Off by one in the loop bound<\/span>/);
  assert.match(html, /<span class="sr-only">src\/a\.js\. <\/span>The handle leaks on every retry of the upload when the server answers…<\/span>/);
  assert.match(html, /<span class="sr-only">lib\/b\.js:3\. <\/span>Race on close<\/span>/);
  assert.equal(occurrences(html, 'data-cds="Icon"'), 3, 'one disclosure caret per row');
});

test('SSR: a re-report with outcomes is the one-line summary; an unreadable outcome reads "Outcomes reported"', () => {
  const outcomes = call({ findings: [{ file: 'a', summary: 'x', failure_scenario: 'y', outcome: 'fixed' }, { file: 'b', summary: 'z', failure_scenario: 'w', outcome: 'skipped' },
    { file: 'c', summary: 'v', failure_scenario: 'u', outcome: 'no_change_needed' }, { file: 'd', summary: 't', failure_scenario: 's', outcome: 'fixed' }] }, { id: 'rf2' });
  const html = renderToStaticMarkup(React.createElement(Card.SourceFindingsCard, { item: outcomes, sessionKey: 's-out' }));
  assert.equal(html, '<div class="source-message" data-transcript-item-id="rf2" data-cds="FindingsCard"><div class="flex w-full flex-col ps-[var(--cds-assistant-message-text-inset,0px)]"><div class="flex max-w-full items-center gap-0.75 self-start text-start"><span class="shrink-0 text-body text-secondary">Code review</span><span class="min-w-0 truncate text-body text-secondary">2 fixed · 1 skipped · 1 needed no change</span></div></div></div>');
  const unread = call({ findings: [{ file: 'a', summary: 'x', failure_scenario: 'y', outcome: 'later' }] }, { id: 'rf3' });
  assert.match(renderToStaticMarkup(React.createElement(Card.SourceFindingsCard, { item: unread, sessionKey: 's-out' })), />Outcomes reported<\/span>/);
});

test('which items are cards: finished, readable ReportFindings calls; anything else stays the tool row', () => {
  assert.equal(Card.reportFindingsCardTool(review()).id, 'rf1');
  assert.deepEqual(Card.reportFindingsCardTool(call({ findings: [] })).input, { findings: [] }, 'an empty report is the card with 0 findings');
  assert.equal(Card.reportFindingsCardTool(call({ findings: FINDINGS }, { status: 'inProgress' })), null);
  assert.equal(Card.reportFindingsCardTool(call({ findings: FINDINGS }, { result: { content: [], isError: true } })), null);
  assert.equal(Card.reportFindingsCardTool(call({ findings: 'none' })), null, 'Nle: no findings list');
  assert.equal(Card.reportFindingsCardTool(call({ findings: [{ file: 1 }] })), null, 'Nle: no readable finding');
  assert.equal(Card.reportFindingsCardTool({ ...review(), tool: 'SendUserFile' }), null);
  // In the transcript (source-session.jsx SourceMessage).
  const html = renderToStaticMarkup(React.createElement(Session.SourceMessage, { item: review(), sessionKey: 's-msg', cwd: '/w' }));
  assert.match(html, /data-cds="FindingsCard"/);
  assert.match(html, />Code review<\/span><span class="min-w-0 truncate text-body text-secondary">high · 3 findings</);
  assert.doesNotMatch(html, /Review result/);
  assert.match(renderToStaticMarkup(React.createElement(Session.SourceMessage, { item: call({ findings: 'none' }), sessionKey: 's-msg' })), /Reported review findings/);
  const empty = renderToStaticMarkup(React.createElement(Session.SourceMessage, { item: call({ findings: [] }), sessionKey: 's-msg' }));
  assert.match(empty, />0 findings<\/span>/);
  assert.doesNotMatch(empty, /role="list"/);
});

test('without the host (the side chat, another session) the card has no actions and rows no diff link', () => {
  const { host } = hostRecorder('main');
  const item = review();
  for (const html of [renderToStaticMarkup(React.createElement(Card.SourceFindingsCard, { item, sessionKey: 'side' })),
    renderToStaticMarkup(mount(host, { item, sessionKey: 'side', items: [item] }))]) {
    assert.doesNotMatch(html, /Apply fixes|Walk through in diff|Re-run review/);
    assert.match(html, /high · 3 findings/);
  }
  // Explicit hasSidePanes: false (as in a popout/side-chat store): no header actions either.
  assert.doesNotMatch(renderToStaticMarkup(mount(hostRecorder('s-np-off', { hasSidePanes: false }).host, { item, sessionKey: 's-np-off', items: [item] })), /Apply fixes|Walk through/);
  // Y1-R4e-findings-2: on the main pane host (hasSidePanes defaults to true) without a diff yet (canViewChanges: false →
  // ae === false), w is still true: Apply fixes is shown and enabled, while Walk through in diff is shown and disabled.
  const noDiffHtml = renderToStaticMarkup(mount(hostRecorder('s-np', { canViewChanges: false }).host, { item, sessionKey: 's-np', items: [item] }));
  assert.match(noDiffHtml, /<button type="button" data-cds="Button"[^>]*>[\s\S]*?>Apply fixes<\/span><\/button>/);
  assert.doesNotMatch(noDiffHtml, /<button[^>]*disabled=""[^>]*>[\s\S]*?>Apply fixes<\/span><\/button>/);
  assert.match(noDiffHtml, /<button type="button" disabled="" data-cds="Button"[^>]*>[\s\S]*?>Walk through in diff<\/span><\/button>/);
  // Only the session's latest review (K$ = G$(items)) has actions.
  const later = review('rf9');
  const older = renderToStaticMarkup(mount(hostRecorder('s-two').host, { item, sessionKey: 's-two', items: [item, later] }));
  assert.doesNotMatch(older, /Apply fixes|Walk through/);
  assert.match(renderToStaticMarkup(mount(hostRecorder('s-two').host, { item: later, sessionKey: 's-two', items: [item, later] })), /Walk through in diff/);
});

// A small fake DOM (as tests/r3b-transcript-turn-edits.test.mjs), with what these components read.
function createDom() {
  const events = {
    addEventListener(type, fn) { (this.__l ??= new Map()).set(type, [...(this.__l.get(type) ?? []), fn]); },
    removeEventListener(type, fn) { const list = this.__l?.get(type); if (list) this.__l.set(type, list.filter(entry => entry !== fn)); },
    dispatchEvent(event) { for (const fn of [...(this.__l?.get(event.type) ?? [])]) fn.call(this, event); return true; },
  };
  const document = Object.assign(Object.create(events), { nodeType: 9, nodeName: '#document', activeElement: null });
  const style = () => {
    const values = new Map();
    return new Proxy({ setProperty(name, value) { values.set(name, String(value)); }, removeProperty(name) { values.delete(name); },
      getPropertyValue(name) { return values.get(name) ?? ''; } }, {
      get(target, key) { return key in target ? target[key] : values.get(key) ?? ''; },
      set(target, key, value) { if (value === '' || value == null) values.delete(key); else values.set(key, String(value)); return true; },
    });
  };
  class Element {
    constructor(tag) {
      Object.assign(this, { tagName: tag.toUpperCase(), nodeName: tag.toUpperCase(), localName: tag, nodeType: 1, namespaceURI: 'http://www.w3.org/1999/xhtml',
        ownerDocument: document, childNodes: [], parentNode: null, attributes: new Map() });
      this.style = style();
    }
    get parentElement() { return this.parentNode?.nodeType === 1 ? this.parentNode : null; }
    get children() { return this.childNodes.filter(node => node.nodeType === 1); }
    get firstChild() { return this.childNodes[0] ?? null; }
    get nextSibling() { const siblings = this.parentNode?.childNodes; return siblings ? siblings[siblings.indexOf(this) + 1] ?? null : null; }
    get isConnected() { for (let at = this; at; at = at.parentNode) if (at === document) return true; return false; }
    set textContent(value) { this.childNodes = value ? [document.createTextNode(value)] : []; }
    get textContent() { return this.childNodes.map(node => (node.nodeType === 3 ? node.nodeValue : node.textContent) ?? '').join(''); }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
    hasAttribute(name) { return this.attributes.has(name); }
    removeAttribute(name) { this.attributes.delete(name); }
    appendChild(child) { child.parentNode?.removeChild?.(child); this.childNodes.push(child); child.parentNode = this; return child; }
    insertBefore(child, ref) { child.parentNode?.removeChild?.(child); const index = ref ? this.childNodes.indexOf(ref) : -1; if (index < 0) this.childNodes.push(child); else this.childNodes.splice(index, 0, child); child.parentNode = this; return child; }
    removeChild(child) { const index = this.childNodes.indexOf(child); if (index >= 0) this.childNodes.splice(index, 1); child.parentNode = null; return child; }
    contains(node) { for (let at = node; at; at = at.parentNode) if (at === this) return true; return false; }
    matches() { return false; }
    getBoundingClientRect() { return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }; }
    focus() { document.activeElement = this; }
    blur() { if (document.activeElement === this) document.activeElement = document.body; }
    find(predicate) {
      if (predicate(this)) return this;
      for (const child of this.childNodes) { const hit = child.nodeType === 1 ? child.find(predicate) : null; if (hit) return hit; }
      return null;
    }
    findAll(predicate, out = []) {
      if (predicate(this)) out.push(this);
      for (const child of this.childNodes) if (child.nodeType === 1) child.findAll(predicate, out);
      return out;
    }
  }
  Object.assign(Element.prototype, events);
  Object.assign(document, {
    createElement: tag => new Element(tag),
    createElementNS: (ns, tag) => Object.assign(new Element(tag), { namespaceURI: ns }),
    createTextNode: text => ({ nodeType: 3, nodeName: '#text', textContent: text, nodeValue: text, ownerDocument: document, parentNode: null }),
    querySelectorAll: () => [],
  });
  document.documentElement = new Element('html');
  document.documentElement.parentNode = document;
  document.body = document.documentElement.appendChild(new Element('body'));
  class ResizeObserver { observe() {} unobserve() {} disconnect() {} }
  // ce574895a g measures text only where Range has getBoundingClientRect; this DOM does not lay out text.
  class Range {}
  const window = Object.assign(Object.create(events), { document, ResizeObserver, Range, location: { pathname: '/' }, HTMLIFrameElement: class {},
    getComputedStyle: () => ({ lineHeight: '20px', direction: 'ltr', width: '0px' }),
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    requestAnimationFrame: fn => setTimeout(fn, 0), cancelAnimationFrame: id => clearTimeout(id) });
  document.defaultView = window;
  return { window, document, Element };
}
async function withDom(run) {
  const dom = createDom();
  const names = ['window', 'document', 'ResizeObserver', 'getComputedStyle', 'Element', 'HTMLElement', 'Node'];
  const saved = names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  Object.assign(dom.window, { Element: dom.Element, HTMLElement: dom.Element, Node: dom.Element, setTimeout, clearTimeout });
  for (const [name, value] of [['window', dom.window], ['document', dom.document], ['ResizeObserver', dom.window.ResizeObserver], ['getComputedStyle', dom.window.getComputedStyle],
    ['Element', dom.Element], ['HTMLElement', dom.Element], ['Node', dom.Element]])
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  const container = dom.document.body.appendChild(new dom.Element('div'));
  const root = createRoot(container);
  const error = console.error;
  const logged = [];
  console.error = (...args) => { logged.push(args); };
  try { return await run({ dom, container, root, logged }); }
  finally {
    act(() => root.unmount());
    console.error = error;
    for (const [name, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; }
  }
}
const reactProps = element => element[Object.keys(element).find(key => key.startsWith('__reactProps$'))];
// CdsIcon draws its glyph as a private-use character of the icon font.
const visible = node => node.textContent.replace(/[-]/g, '');
const press = element => ({ preventDefault() {}, stopPropagation() {}, isDefaultPrevented: () => false, isPropagationStopped: () => false, currentTarget: element,
  target: element, button: 0, detail: 1, nativeEvent: {} });
const buttons = container => container.findAll(node => node.tagName === 'BUTTON');
const buttonNamed = (container, label) => buttons(container).find(node => visible(node) === label);
const rowButtons = container => buttons(container).filter(node => node.hasAttribute('aria-expanded'));
const click = element => act(() => reactProps(element).onClick(press(element)));
const settle = () => act(() => new Promise(resolve => setTimeout(resolve, 0)));
const badges = container => container.findAll(node => node.getAttribute?.('data-cds') === 'Badge').map(visible);
const statuses = sessionKey => Adapters.reviewFindingsStore.getState().findingStatusBySession[sessionKey] ?? {};

test('expansion: a row opens to its summary, scenario, path and line, and remembers that across a remount', async () => {
  await withDom(async ({ container, root }) => {
    const { host } = hostRecorder('s-exp');
    const item = review('rf-exp');
    act(() => root.render(mount(host, { item, sessionKey: 's-exp', items: [item] })));
    const [first, second, third] = rowButtons(container);
    assert.equal(first.getAttribute('aria-expanded'), 'false');
    click(first);
    assert.equal(rowButtons(container)[0].getAttribute('aria-expanded'), 'true');
    const body = rowButtons(container)[0].parentNode.childNodes[1];
    assert.equal(body.getAttribute('class'), 'col-span-full flex min-w-0 flex-col gap-0.75 ps-md');
    assert.deepEqual(body.children.slice(0, 2).map(node => [node.getAttribute('class'), visible(node)]), [
      ['break-words text-body text-primary', 'Off by one in the loop bound.'], ['break-words text-body text-secondary', 'n = 0 reads past the end']]);
    const where = body.children[2];
    assert.equal(where.getAttribute('class'), 'flex min-w-0 flex-wrap items-center gap-x-1.25 gap-y-0.5');
    const trigger = where.children[0];
    assert.equal(trigger.getAttribute('data-file-ref'), 'src/a.js');
    assert.equal(trigger.getAttribute('data-file-line'), '12');
    assert.equal(trigger.getAttribute('class'), 'flex min-w-0 text-footnote text-secondary');
    const truncated = trigger.children[0];
    assert.deepEqual([truncated.getAttribute('dir'), truncated.getAttribute('title'), truncated.getAttribute('aria-label')], ['ltr', 'src/a.js:12', 'src/a.js']);
    assert.equal(visible(truncated), 'src/a.js');
    assert.deepEqual([trigger.children[1].getAttribute('class'), visible(trigger.children[1])], ['shrink-0 font-medium text-primary', ':12']);
    assert.ok(buttonNamed(where, 'View in diff'), 'anchored: the row links into the diff');
    // m0e: "-" is no scenario; a row without a line has no ":N".
    click(third);
    const thirdBody = rowButtons(container)[2].parentNode.childNodes[1];
    assert.deepEqual(thirdBody.children.map(node => visible(node).replace('View in diff', '')), ['Race', 'lib/b.js:3']);
    click(second);
    assert.doesNotMatch(visible(rowButtons(container)[1].parentNode.childNodes[1]), /:\d/);
    // Collapse, then remount: Y$ keeps the open rows of this card by `${session}:${tool}:${index}`.
    click(rowButtons(container)[1]);
    act(() => root.render(null));
    act(() => root.render(mount(host, { item, sessionKey: 's-exp', items: [item] })));
    assert.deepEqual(rowButtons(container).map(node => node.getAttribute('aria-expanded')), ['true', 'false', 'true']);
  });
});

test('View in diff and Walk through in diff seed the session review and reveal the file in the Changes pane', async () => {
  await withDom(async ({ container, root }) => {
    const { host, calls } = hostRecorder('s-walk');
    const item = review('rf-walk');
    act(() => root.render(mount(host, { item, sessionKey: 's-walk', items: [item] })));
    click(rowButtons(container)[2]);
    click(buttonNamed(container, 'View in diff'));
    const state = Adapters.reviewFindingsStore.getState();
    assert.deepEqual(state.findingsBySession['s-walk'].map(f => [f.id, f.filePath, f.startLine, f.endLine, f.line, f.body, f.category, f.verdict]), [
      ['finding-rf-walk-0', 'src/a.js', 12, 12, 12, 'Off by one in the loop bound.', 'Off by one in a long category name', undefined],
      ['finding-rf-walk-1', 'src/a.js', 1, 1, undefined, FINDINGS[1].summary, undefined, 'CONFIRMED'],
      ['finding-rf-walk-2', 'lib/b.js', 3, 3, 3, 'Race', undefined, undefined]]);
    assert.equal(state.currentFindingBySession['s-walk'], 'finding-rf-walk-2', 'the row\'s own finding');
    assert.deepEqual(state.seededFindingsToolIdsBySession['s-walk'], ['rf-walk']);
    assert.equal(state.reviewLevelBySession['s-walk'], 'high');
    assert.deepEqual(state.scrollTargetBySession['s-walk'], { filePath: 'lib/b.js', nonce: 1, fuzzy: true, tileId: 'diff', anchor: { side: 'additions', line: 3 } });
    assert.equal(Reveal.takeDiffReveal(['src/a.js', 'lib/b.js']), 'lib/b.js', 'the Changes diff reveals the file');
    assert.deepEqual(calls, [['changes']]);
    click(buttonNamed(container, 'Walk through in diff'));
    assert.equal(Adapters.reviewFindingsStore.getState().currentFindingBySession['s-walk'], 'finding-rf-walk-0', 'the walkthrough starts at the first finding');
    assert.equal(Reveal.takeDiffReveal(['src/a.js']), 'src/a.js');
    assert.deepEqual(calls, [['changes'], ['changes']]);
    // After seeding, a finding whose file the loaded Changes diff does not list reads "Not in the current diff".
    act(() => root.render(mount({ ...host, fileInChanges: file => file !== 'lib/b.js' }, { item, sessionKey: 's-walk', items: [item] })));
    const third = rowButtons(container)[2].parentNode.childNodes[1];
    assert.equal(buttonNamed(third, 'View in diff'), undefined);
    assert.match(visible(third), /Not in the current diff$/);
  });
});

test('Apply fixes sends the original fix message, marks the findings fixing, and settles them when the fix turn ends', async () => {
  await withDom(async ({ container, root }) => {
    const { host, calls } = hostRecorder('s-fix');
    const item = review('rf-fix');
    let items = [{ id: 'u0', type: 'userMessage', turnId: 't0' }, item];
    const render = (extra = {}) => act(() => root.render(mount({ ...host, ...extra }, { item, sessionKey: 's-fix', items })));
    render();
    click(buttonNamed(container, 'Apply fixes'));
    await settle();
    const [kind, text] = calls.find(entry => entry[0] === 'send');
    assert.equal(kind, 'send');
    assert.equal(text, FixText.fixFindingsText(FINDINGS.map(f => ({ file: f.file, line: f.line, summary: f.summary, detail: f.failure_scenario }))));
    assert.match(text, /^Apply these 3 code-review findings with the minimal edits\. Don't re-run the review\./);
    assert.match(text, /\n1\. `src\/a\.js:12`\nSummary:\n> Off by one in the loop bound\.\nFailure scenario:\n> n = 0 reads past the end\n2\. `src\/a\.js`\n/);
    assert.match(text, /When you're done, call the ReportFindings tool once with these same findings\./);
    assert.deepEqual(statuses('s-fix'), { 'finding-rf-fix-0': 'fixing', 'finding-rf-fix-1': 'fixing', 'finding-rf-fix-2': 'fixing' });
    assert.equal(Adapters.reviewFindingsStore.getState().fixingWatermarkBySession['s-fix'], 'rf-fix', 'the watermark is the last item when fixing began');
    assert.deepEqual(badges(container), ['Fixing…', 'Fixing…', 'Fixing…']);
    assert.ok(container.findAll(node => node.tagName === 'LI').every(node => node.getAttribute('class').endsWith('opacity-70')));
    assert.equal(buttonNamed(container, 'Apply fixes').disabled ?? reactProps(buttonNamed(container, 'Apply fixes')).disabled, true, 'applying: nothing left to apply');
    await act(() => new Promise(resolve => setTimeout(resolve, 80)));
    assert.equal(visible(container.find(node => node.getAttribute?.('role') === 'status')), '3 fixes in progress');
    // R4e review: the fix prompt is echoed before its turn is running (no reply, running false): still fixing (Zte needs
    // the turn's end after the prompt, EA).
    items = [...items, { id: 'u1', type: 'userMessage', turnId: 't2' }];
    render({ running: false });
    assert.deepEqual(badges(container), ['Fixing…', 'Fixing…', 'Fixing…']);
    // The fix turn runs (its prompt after the watermark): still fixing. Then it ends: fixing → addressed (Fixed).
    items = [...items, { id: 'a1', type: 'agentMessage', turnId: 't2', text: 'Done.' }];
    render({ running: true });
    assert.deepEqual(badges(container), ['Fixing…', 'Fixing…', 'Fixing…']);
    render({ running: false });
    assert.deepEqual(statuses('s-fix'), { 'finding-rf-fix-0': 'addressed', 'finding-rf-fix-1': 'addressed', 'finding-rf-fix-2': 'addressed' });
    assert.deepEqual(badges(container), ['Fixed', 'Fixed', 'Fixed']);
    // Terminal: Re-run review replaces Apply fixes and runs the host's review command; Walk through is disabled.
    assert.equal(buttonNamed(container, 'Apply fixes'), undefined);
    click(buttonNamed(container, 'Re-run review'));
    await settle();
    assert.deepEqual(calls.at(-1), ['rerun', '/code-review high']);
    // The review dialog took the send over: the Re-run latch is released, so a cancelled dialog leaves it usable.
    click(buttonNamed(container, 'Re-run review'));
    await settle();
    assert.equal(calls.filter(entry => entry[0] === 'rerun').length, 2);
    assert.equal(reactProps(buttonNamed(container, 'Walk through in diff')).disabled, true);
  });
});

test('a re-report applies its outcomes: skipped reopens, the rest are addressed; a send the host did not make reopens', async () => {
  await withDom(async ({ container, root }) => {
    const { host } = hostRecorder('s-out2');
    const item = review('rf-o');
    let items = [item];
    const render = (extra = {}) => act(() => root.render(mount({ ...host, ...extra }, { item, sessionKey: 's-out2', items })));
    render();
    click(buttonNamed(container, 'Apply fixes'));
    await settle();
    const echo = call({ findings: [
      { file: 'src/a.js', line: 12, summary: 'Off by one in the loop bound.', failure_scenario: 'n = 0 reads past the end', outcome: 'fixed' },
      { file: 'src/a.js', summary: FINDINGS[1].summary, failure_scenario: 'many opens', outcome: 'skipped' },
      { file: 'lib/b.js', line: 3, summary: 'Race', failure_scenario: '-', outcome: 'no_change_needed' }] }, { id: 'rf-echo', turnId: 't2' });
    items = [item, { id: 'u1', type: 'userMessage', turnId: 't2' }, echo];
    render({ running: false });
    assert.deepEqual(statuses('s-out2'), { 'finding-rf-o-0': 'addressed', 'finding-rf-o-1': 'open', 'finding-rf-o-2': 'addressed' });
    assert.deepEqual(badges(container), ['Fixed', 'Confirmed', 'Fixed']);
    assert.ok(buttonNamed(container, 'Apply fixes'), 'one finding is open again');
    // The host refused the send (busy or offline: it toasted, resolved false): only the open finding was sent, it was
    // fixing meanwhile, and it reopens.
    const sent = [], seen = [];
    act(() => root.render(mount({ ...host, send: async text => { sent.push(text); seen.push(statuses('s-out2')['finding-rf-o-1']); return false; } },
      { item, sessionKey: 's-out2', items })));
    click(buttonNamed(container, 'Apply fixes'));
    await settle();
    assert.equal(sent.length, 1);
    assert.match(sent[0], /^Apply this code-review finding with the minimal edit\. Don't re-run the review\.[^\n]*\n1\. `src\/a\.js`\nSummary:\n> The handle leaks/);
    assert.deepEqual(seen, ['fixing']);
    assert.equal(statuses('s-out2')['finding-rf-o-1'], 'open');
    // Another action holds the session (main.jsx sendFixedTurn answers false without a toast, and the host's send throws
    // for it): a send failure as well, the finding reopens.
    sent.length = 0;
    act(() => root.render(mount({ ...host, send: async text => { sent.push(text); throw new Error('The session is busy with another action.'); } }, { item, sessionKey: 's-out2', items })));
    click(buttonNamed(container, 'Apply fixes'));
    await settle();
    assert.equal(sent.length, 1);
    assert.equal(statuses('s-out2')['finding-rf-o-1'], 'open');
    // Y1-R4e-findings-1: while a turn runs, Apply fixes is not disabled and queues via host.queue (thread/queue/add);
    // the finding stays Fixing… without an error toast, and reopens only if queueing fails.
    const queued = [];
    act(() => root.render(mount({ ...host, running: true, queue: async text => { queued.push(text); return false; } }, { item, sessionKey: 's-out2', items })));
    click(buttonNamed(container, 'Apply fixes'));
    await settle();
    assert.equal(queued.length, 1);
    assert.equal(statuses('s-out2')['finding-rf-o-1'], 'open');
    queued.length = 0;
    act(() => root.render(mount({ ...host, running: true, queue: async text => { queued.push(text); return true; } }, { item, sessionKey: 's-out2', items })));
    click(buttonNamed(container, 'Apply fixes'));
    await settle();
    assert.equal(queued.length, 1);
    assert.equal(statuses('s-out2')['finding-rf-o-1'], 'fixing');
    assert.deepEqual(badges(container), ['Fixed', 'Fixing…', 'Fixed']);
    // A running turn disables Re-run review once the review is terminal (Ab).
    act(() => Adapters.reviewFindingsStore.settleFixingReviewFindings('s-out2'));
    act(() => Adapters.reviewFindingsStore.markReviewFindingsFixing('s-out2', ['finding-rf-o-1']));
    act(() => Adapters.reviewFindingsStore.settleFixingReviewFindings('s-out2'));
    render({ running: true });
    assert.equal(reactProps(buttonNamed(container, 'Re-run review')).disabled, true);
    render({ running: false });
    assert.equal(reactProps(buttonNamed(container, 'Re-run review')).disabled, false);
  });
});

test('host review store and session watcher keep the original action semantics', async () => {
  const Model = await import('../src/review-findings-model.mjs');
  const store = Model.createReviewFindingsStore();
  const annotation = (index, extra = {}) => ({ id: `finding-r-${index}`, filePath: `f${index}.js`, side: 'additions', startLine: index + 1, endLine: index + 1, body: `s${index}`, ...extra });
  const list = [annotation(0), annotation(1), annotation(2)];
  store.setReviewFindings('s', list, { level: 'low', toolId: 'r', latestSettledToolId: 'r' });
  assert.equal(store.getState().currentFindingBySession.s, 'finding-r-0');
  assert.deepEqual(store.getState().seededFindingsToolIdsBySession.s, ['r']);
  // A dismissed finding stays out of a later seeding and is never reopened.
  store.getState().findingStatusBySession.s = { 'finding-r-0': 'dismissed' };
  store.setReviewFindings('s', list, { toolId: 'r' });
  assert.deepEqual(store.getState().findingsBySession.s.map(f => f.id), ['finding-r-1', 'finding-r-2']);
  assert.equal(store.getState().reviewLevelBySession.s, undefined, 'options without a level drop the level');
  store.markReviewFindingsFixing('s', ['finding-r-1', 'finding-r-2']);
  store.reopenReviewFindings('s', ['finding-r-0', 'finding-r-1', 'finding-unknown']);
  assert.deepEqual(store.getState().findingStatusBySession.s, { 'finding-r-0': 'dismissed', 'finding-r-1': 'open', 'finding-r-2': 'fixing' });
  // Outcomes: exact match on file + line + summary, else a unique summary (in the file first); touchFixing:false leaves
  // what is not open.
  store.applyReviewFindingOutcomes('s', [{ file: 'f2.js', line: 3, summary: 's2', outcome: 'fixed' }, { file: 'moved.js', summary: 's1', outcome: 'skipped' }],
    { touchFixing: false });
  assert.deepEqual(store.getState().findingStatusBySession.s, { 'finding-r-0': 'dismissed', 'finding-r-1': 'open', 'finding-r-2': 'fixing' });
  store.applyReviewFindingOutcomes('s', [{ file: 'f2.js', line: 3, summary: 's2', outcome: 'fixed' }, { file: 'moved.js', summary: 's1', outcome: 'no_change_needed' }]);
  assert.deepEqual(store.getState().findingStatusBySession.s, { 'finding-r-0': 'dismissed', 'finding-r-1': 'addressed', 'finding-r-2': 'addressed' });
  // The watcher: fixing after the watermark settles when the fix turn has run and the session is idle; a failed turn
  // reopens instead.
  const watched = Model.createReviewFindingsStore();
  const report = { id: 'rv', type: 'mcpToolCall', server: 'code_desktop', tool: 'ReportFindings', status: 'completed', turnId: 't1',
    arguments: { findings: [{ file: 'a.js', line: 1, summary: 'one', failure_scenario: 'x' }, { file: 'b.js', summary: 'two', failure_scenario: 'y' }] } };
  const seeded = [{ id: 'finding-rv-0', filePath: 'a.js', endLine: 1, body: 'one' }, { id: 'finding-rv-1', filePath: 'b.js', endLine: 1, body: 'two' }];
  watched.setReviewFindings('w', seeded, { toolId: 'rv' });
  watched.markReviewFindingsFixing('w', ['finding-rv-0', 'finding-rv-1']);
  watched.setReviewFixingWatermark('w', 'rv');
  const fixTurn = [report, { id: 'u2', type: 'userMessage', turnId: 't2' }, { id: 'a2', type: 'agentMessage', turnId: 't2' }];
  Model.settleReviewFixes(watched, 'w', fixTurn, { running: true });
  assert.deepEqual(Object.values(watched.getState().findingStatusBySession.w), ['fixing', 'fixing']);
  Model.settleReviewFixes(watched, 'w', fixTurn, { running: false, turnErrors: { t2: { message: 'boom' } } });
  assert.deepEqual(Object.values(watched.getState().findingStatusBySession.w), ['open', 'open'], 'a failed fix turn reopens');
  watched.markReviewFindingsFixing('w', ['finding-rv-0', 'finding-rv-1']);
  // R4e review (Zte `m && EA(n)`): the fix prompt echoed before its turn runs (no reply yet, running still false) is not
  // the end of the fix turn; a reply after it, or the prompt's turn completing, is.
  const echoedOnly = fixTurn.slice(0, 2);
  Model.settleReviewFixes(watched, 'w', echoedOnly, { running: false });
  assert.deepEqual(Object.values(watched.getState().findingStatusBySession.w), ['fixing', 'fixing'], 'a prompt with no reply settles nothing');
  Model.settleReviewFixes(watched, 'w', echoedOnly, { running: false, turnTimes: { t2: { startedAt: 5, completedAt: null } } });
  assert.deepEqual(Object.values(watched.getState().findingStatusBySession.w), ['fixing', 'fixing'], 'a started turn has not ended');
  Model.settleReviewFixes(watched, 'w', echoedOnly, { running: false, turnTimes: { t1: { startedAt: 1, completedAt: 2 } } });
  assert.deepEqual(Object.values(watched.getState().findingStatusBySession.w), ['fixing', 'fixing'], 'only the prompt\'s own turn counts');
  Model.settleReviewFixes(watched, 'w', echoedOnly, { running: false, turnTimes: { t2: { startedAt: 5, completedAt: 9 } } });
  assert.deepEqual(Object.values(watched.getState().findingStatusBySession.w), ['addressed', 'addressed'], 'the prompt\'s turn completed with no reply');
  watched.markReviewFindingsFixing('w', ['finding-rv-0', 'finding-rv-1']);
  Model.settleReviewFixes(watched, 'w', echoedOnly, { running: false, turnErrors: { t2: { message: 'boom' } } });
  assert.deepEqual(Object.values(watched.getState().findingStatusBySession.w), ['open', 'open'], 'the prompt\'s turn failed before any reply');
  watched.markReviewFindingsFixing('w', ['finding-rv-0', 'finding-rv-1']);
  Model.settleReviewFixes(watched, 'w', fixTurn, { running: false });
  assert.deepEqual(Object.values(watched.getState().findingStatusBySession.w), ['addressed', 'addressed']);
  // Zte's start: fixing with no watermark reopens; with one (even null: an empty transcript) it stays.
  const unwatched = Model.createReviewFindingsStore();
  unwatched.setReviewFindings('u', seeded, { toolId: 'rv' });
  unwatched.markReviewFindingsFixing('u', ['finding-rv-0']);
  Model.reopenUnwatchedFixes(unwatched, 'u');
  assert.deepEqual(unwatched.getState().findingStatusBySession.u, { 'finding-rv-0': 'open' });
  unwatched.markReviewFindingsFixing('u', ['finding-rv-0']);
  unwatched.setReviewFixingWatermark('u', null);
  Model.reopenUnwatchedFixes(unwatched, 'u');
  assert.deepEqual(unwatched.getState().findingStatusBySession.u, { 'finding-rv-0': 'fixing' });
  // Without a watermark nothing settles, and a re-report's outcomes still apply to open findings (Jte: the base report's
  // annotations when the store holds another review; the echoed ＠ reads as @).
  const fresh = Model.createReviewFindingsStore();
  const echo = { ...report, id: 'echo', arguments: { findings: [{ file: 'a.js', line: 1, summary: 'one', outcome: 'fixed' }, { file: 'b.js', summary: 'two', outcome: 'bogus' }] } };
  Model.settleReviewFixes(fresh, 'f', [report, echo], { running: false });
  assert.deepEqual(fresh.getState().findingStatusBySession.f, { 'finding-rv-0': 'addressed', 'finding-rv-1': 'open' }, 'an unknown outcome reads as skipped');
  const mention = { ...report, id: 'rm', arguments: { findings: [{ file: 'a.js', line: 4, summary: 'Ask @dev first', failure_scenario: 'x' }] } };
  const echoed = { ...report, id: 'em', arguments: { findings: [{ file: 'a.js', line: 4, summary: 'Ask ＠dev first', outcome: 'fixed' }] } };
  assert.match(FixText.fixFindingsText([{ file: 'a.js', line: 4, summary: 'Ask @dev first' }]), /> Ask ＠dev first/, 'Jw quotes the mention neutralised');
  Model.settleReviewFixes(fresh, 'm', [mention, echoed], { running: false });
  assert.deepEqual(fresh.getState().findingStatusBySession.m, { 'finding-rm-0': 'addressed' });
  assert.equal(Model.fixingCount({ findingStatusBySession: { x: { a: 'fixing', b: 'open', c: 'fixing' } } }, 'x'), 2);
  assert.deepEqual(Model.findingsCardTool(report), { id: 'rv', name: 'ReportFindings', status: 'completed', isError: false, input: report.arguments });
  assert.equal(Model.findingsCardTool({ ...report, tool: 'screenshot' }), null);
});

test('R4h-findings (Y1-R4e-findings-2): canViewChanges: false keeps Apply fixes and Re-run review active, disables Walk through, and omits View in diff', async () => {
  await withDom(async ({ container, root }) => {
    const { calls, host } = hostRecorder('s-nodiff', { canViewChanges: false });
    const item = review('rf-nd');
    const items = [item];
    const render = (extra = {}) => act(() => root.render(mount({ ...host, ...extra }, { item, sessionKey: 's-nodiff', items })));
    render();
    assert.equal(reactProps(buttonNamed(container, 'Apply fixes')).disabled, false);
    assert.equal(reactProps(buttonNamed(container, 'Walk through in diff')).disabled, true);
    // Expanding a row when ae === false (J = w && ae && ee is false) does not offer "View in diff".
    click(rowButtons(container)[0]);
    assert.equal(buttonNamed(container, 'View in diff'), undefined);
    // Apply fixes when ae === false sends Jw without opening the diff pane or seeding/marking the review store, and
    // latches le.current until the turn finishes (pe: true → false).
    click(buttonNamed(container, 'Apply fixes'));
    await settle();
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], 'send');
    assert.match(calls[0][1], /^Apply these 3 code-review findings with the minimal edits\./);
    assert.equal(Adapters.reviewFindingsStore.getState().findingsBySession['s-nodiff'], undefined);
    assert.deepEqual(statuses('s-nodiff'), {});
    click(buttonNamed(container, 'Apply fixes'));
    await settle();
    assert.equal(calls.length, 1, 'le.current latches duplicate clicks until the turn finishes');
    render({ running: true });
    render({ running: false });
    click(buttonNamed(container, 'Apply fixes'));
    await settle();
    assert.equal(calls.length, 2, 'latch resets after running true → false');
    // Terminal state with canViewChanges: false still renders Re-run review and invokes host.rerun.
    act(() => {
      Adapters.reviewFindingsStore.setReviewFindings('s-nodiff', [
        { id: 'finding-rf-nd-0', filePath: 'src/a.js', side: 'additions', startLine: 12, endLine: 12, body: 'a' },
        { id: 'finding-rf-nd-1', filePath: 'src/a.js', side: 'additions', startLine: 1, endLine: 1, body: 'b' },
        { id: 'finding-rf-nd-2', filePath: 'lib/b.js', side: 'additions', startLine: 3, endLine: 3, body: 'c' },
      ]);
      Adapters.reviewFindingsStore.markReviewFindingsFixing('s-nodiff', ['finding-rf-nd-0', 'finding-rf-nd-1', 'finding-rf-nd-2']);
      Adapters.reviewFindingsStore.settleFixingReviewFindings('s-nodiff');
    });
    render({ running: false });
    assert.equal(reactProps(buttonNamed(container, 'Re-run review')).disabled, false);
    assert.equal(reactProps(buttonNamed(container, 'Walk through in diff')).disabled, true);
    click(buttonNamed(container, 'Re-run review'));
    await settle();
    assert.deepEqual(calls.at(-1), ['rerun', '/code-review high']);
  });
});

test('R4h-findings (Y1-R4e-findings-1 & L2): FindingsCardHost.value and sendTurn queue on thread/queue/add while running and handle busy/offline errors', async () => {
  await withDom(async ({ container, root }) => {
    const rpcCalls = [], queueLoads = [], failedToasts = [], requested = [], panelOpens = [], drafts = [], reViews = [];
    const commitLock = { current: false };
    let state = { current: 's-q', running: true, canViewChanges: true, connected: true, archived: false, loading: false, sending: false, actionPending: false };
    let rpcError = null;
    const sendFixedTurn = (text, extraInput = [], options) => Card.FindingsCardHost.sendTurn(text, extraInput, {
      ...options, id: state.current, loading: state.loading, sending: state.sending, running: state.running,
      actionPending: state.actionPending, commitLock, connected: state.connected, archived: state.archived,
      ensureResumed: async () => {}, isActive: () => state.running,
      rpc: async (method, payload) => { if (rpcError) throw rpcError; rpcCalls.push([method, payload]); },
      loadQueue: id => queueLoads.push(id), setTurnRequested: v => requested.push(typeof v === 'function' ? v('s-q') : v),
      turnOptions: () => ({ cwd: '/repo' }), onFailed: () => failedToasts.push('COMMIT_SEND_FAILED'), onWarn: () => {},
      createMessageId: () => 'msg-queued-1',
    });
    // Ordinary callers of sendFixedTurn (Commit, Create PR: queueWhileRunning defaults to false) still refuse while running.
    assert.equal(await sendFixedTurn('commit'), false);
    assert.equal(rpcCalls.length, 0);
    // No current session (Home): FindingsCardHost.value returns null.
    assert.equal(Card.FindingsCardHost.value({ ...state, current: null, sendFixedTurn }), null);

    const item = review('rf-q');
    let items = [item];
    const makeHost = () => Card.FindingsCardHost.value({
      current: state.current, running: state.running, canViewChanges: state.canViewChanges,
      fileInChanges: () => true, connected: state.connected, archived: state.archived,
      openChanges: () => panelOpens.push('changes'), sendFixedTurn,
      rerun: () => reViews.push('review'), prefill: text => drafts.push(text),
    });
    const render = () => act(() => root.render(mount(makeHost(), { item, sessionKey: 's-q', items })));
    render();
    // 1. Running session: Apply fixes queues on thread/queue/add, refreshes the queue, shows no error toast, and keeps
    // findings in Fixing… across the end of the already-running turn until the queued fix turn itself runs and finishes.
    click(buttonNamed(container, 'Apply fixes'));
    await settle();
    assert.equal(rpcCalls.length, 1);
    assert.equal(rpcCalls[0][0], 'thread/queue/add');
    assert.equal(rpcCalls[0][1].threadId, 's-q');
    assert.equal(rpcCalls[0][1].clientUserMessageId, 'msg-queued-1');
    assert.match(rpcCalls[0][1].input[0].text, /^Apply these 3 code-review findings with the minimal edits\./);
    assert.deepEqual(queueLoads, ['s-q']);
    assert.deepEqual(panelOpens, ['changes']);
    assert.equal(failedToasts.length, 0);
    assert.deepEqual(badges(container), ['Fixing…', 'Fixing…', 'Fixing…']);
    // The earlier turn finishes before the queued userMessage is dispatched: findings stay Fixing… (not settled early).
    state = { ...state, running: false };
    render();
    assert.deepEqual(badges(container), ['Fixing…', 'Fixing…', 'Fixing…']);
    // Now the queued fix turn runs and finishes: findings settle to Fixed.
    items = [item, { id: 'u-q', type: 'userMessage', turnId: 't-q' }, { id: 'a-q', type: 'agentMessage', turnId: 't-q', text: 'Fixed all.' }];
    state = { ...state, running: true };
    render();
    state = { ...state, running: false };
    render();
    assert.deepEqual(badges(container), ['Fixed', 'Fixed', 'Fixed']);

    // 2. Idle session: Apply fixes starts a turn via turn/start; busy / offline / RPC failure reopen with a single toast.
    act(() => Adapters.reviewFindingsStore.reopenReviewFindings('s-q', ['finding-rf-q-0']));
    render();
    // Busy (sending: true while connected and unarchived): sendTurn returns false without onFailed; host.send throws
    // "The session is busy with another action." so X$ shows its send-failed toast and reopens the finding.
    state = { ...state, sending: true };
    await assert.rejects(() => makeHost().send('fix'), { message: 'The session is busy with another action.' });
    assert.equal(failedToasts.length, 0);
    render();
    click(buttonNamed(container, 'Apply fixes'));
    await settle();
    assert.equal(failedToasts.length, 0);
    assert.equal(statuses('s-q')['finding-rf-q-0'], 'open');
    // Offline (connected: false): sendTurn calls onFailed once and returns false; host.send resolves false (handled as
    // SendStoppedByPromptError) without throwing a duplicate X$ error.
    state = { ...state, sending: false, connected: false };
    assert.equal(await makeHost().send('fix'), false);
    assert.equal(failedToasts.length, 1);
    render();
    click(buttonNamed(container, 'Apply fixes'));
    await settle();
    assert.equal(failedToasts.length, 2);
    assert.equal(statuses('s-q')['finding-rf-q-0'], 'open');
    // RPC failure during turn/start: clears turnRequested, calls onFailed once, resolves false without throwing.
    state = { ...state, connected: true, running: false };
    rpcError = new Error('rpc failed');
    assert.equal(await makeHost().send('fix'), false);
    assert.deepEqual(requested, ['s-q', null]);
    assert.equal(failedToasts.length, 3);
    // Connected and idle with working RPC: dispatches turn/start.
    rpcError = null;
    rpcCalls.length = 0;
    requested.length = 0;
    render();
    click(buttonNamed(container, 'Apply fixes'));
    await settle();
    assert.equal(rpcCalls.length, 1);
    assert.equal(rpcCalls[0][0], 'turn/start');
    assert.equal(rpcCalls[0][1].threadId, 's-q');
    assert.equal(rpcCalls[0][1].cwd, '/repo');
    assert.deepEqual(requested, ['s-q']);
    assert.equal(statuses('s-q')['finding-rf-q-0'], 'fixing');
  });
});
