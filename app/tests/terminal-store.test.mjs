import test from 'node:test';
import assert from 'node:assert/strict';
import { createTerminalStore, ownerKeyOf } from '../src/terminal-store.mjs';
import { MAX_CACHED_TERMINALS } from '../src/terminal-pane-model.mjs';
import { inlineCommandDone, keptRunVisible } from '../src/code-block-run-model.mjs';

// The renderer's terminal store over a fake preload bridge: owners keyed per session (two sessions at once), output
// routed to kept-alive views, attach replay without duplicates, and agent-opened tabs announced.
function fakeBridge() {
  const calls = [], writes = [];
  let emit = null, attachOutput = '', attachEnd = 0, nextId = 1;
  const pendingAttach = [];
  const bridge = {
    calls, writes,
    onEvent(handler) { emit = handler; return () => { emit = null; }; },
    write(id, data) { writes.push([id, data]); },
    async call(op, params) {
      calls.push([op, params]);
      if (op === 'hello') return { backend: 'pty' };
      if (op === 'list') return [];
      if (op === 'create') {
        const owner = params.sessionId ?? `home:${params.homeWorkspace}`;
        return { id: `term-${String(nextId++).padStart(6, '0')}`, owner, sessionId: params.sessionId, number: nextId - 1, title: null, status: 'running', generation: 1, busy: false };
      }
      if (op === 'attach') return new Promise((resolve) => pendingAttach.push(() => resolve({ output: attachOutput, end: attachEnd })));
      if (op === 'probe') return bridge.probe ?? { live: [], busy: [], unknown: [] };
      if (op === 'ready') return { at: bridge.readyAt ?? 0 };
      if (op === 'run') return { id: `term-${String(nextId++).padStart(6, '0')}`, owner: params.sessionId, sessionId: params.sessionId, number: nextId - 1, title: params.command, status: 'running', generation: 1 };
      if (op === 'close' || op === 'resize') return true;
      if (op === 'rename') return { id: params.id, owner: params.sessionId, title: params.title, number: 1, status: 'running', generation: 1 };
      if (op === 'restart') return { id: params.id, owner: params.sessionId, title: null, number: 1, status: 'running', generation: 2 };
      throw new Error('unexpected');
    },
    emit: (event) => emit?.(event),
    setAttach(output, end) { attachOutput = output; attachEnd = end; },
    releaseAttach() { while (pendingAttach.length) pendingAttach.shift()(); },
  };
  return bridge;
}
const fakeView = () => { const view = { written: '', resets: 0, disposed: false, write(data) { view.written += data; }, reset() { view.resets += 1; view.written = ''; }, dispose() { view.disposed = true; } }; return view; };
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test('owners are per session; the New session page is keyed by its folder', () => {
  assert.equal(ownerKeyOf('s1', '/x'), 's1');
  assert.equal(ownerKeyOf(null, '/Users/u/p'), 'home:/Users/u/p');
  assert.equal(ownerKeyOf(null, null), null);
});

test('load, create, select, move and close keep each owner’s tabs apart', async () => {
  const bridge = fakeBridge();
  const store = createTerminalStore({ bridge });
  assert.equal(store.available, true);
  assert.deepEqual(await store.backend(), { backend: 'pty' });
  let notified = 0;
  store.subscribe(() => { notified += 1; });
  await store.load('s1', 's1', null);
  await store.load('s1', 's1', null);
  assert.equal(bridge.calls.filter(([op]) => op === 'list').length, 1, 'listed once');
  const a = await store.create('s1', 's1', null, { cols: 90, rows: 20 });
  const b = await store.create('s1', 's1', null);
  const c = await store.create('s2', 's2', null);
  assert.deepEqual(bridge.calls.find(([op]) => op === 'create')[1], { sessionId: 's1', cols: 90, rows: 20 });
  assert.deepEqual(store.get('s1').tabs.map((tab) => tab.id), [a.id, b.id]);
  assert.equal(store.get('s1').active, b.id, 'a new tab becomes active');
  assert.deepEqual(store.get('s2').tabs.map((tab) => tab.id), [c.id]);
  store.select('s1', a.id);
  assert.equal(store.get('s1').active, a.id);
  store.move('s1', a.id, 1);
  assert.deepEqual(store.get('s1').tabs.map((tab) => tab.id), [b.id, a.id]);
  await store.close('s1', 's1', null, a.id);
  assert.deepEqual(store.get('s1').tabs.map((tab) => tab.id), [b.id]);
  assert.equal(store.get('s1').active, b.id);
  assert.ok(notified > 0);
  // Home owner passes its folder, never a session id.
  await store.create('home:/p', null, '/p');
  assert.deepEqual(bridge.calls.filter(([op]) => op === 'create').at(-1)[1], { sessionId: null, homeWorkspace: '/p', cols: undefined, rows: undefined });
});

test('views attach to the kept output, then take live output once, without duplicates; restart resets the view', async () => {
  const bridge = fakeBridge();
  const store = createTerminalStore({ bridge });
  const info = await store.create('s1', 's1', null);
  const view = fakeView();
  bridge.setAttach('hello ', 6);
  assert.equal(store.view(info.id, 's1', null, () => view), view);
  // Output arriving while the attach is pending is queued, then trimmed against the attach's end.
  bridge.emit({ kind: 'data', id: info.id, data: 'lo world', end: 11 });
  bridge.emit({ kind: 'data', id: info.id, data: '!', end: 12 });
  assert.equal(view.written, '');
  bridge.releaseAttach();
  await tick();
  assert.equal(view.written, 'hello world!');
  bridge.emit({ kind: 'data', id: info.id, data: '!', end: 12 });
  bridge.emit({ kind: 'data', id: info.id, data: '?', end: 13 });
  assert.equal(view.written, 'hello world!?');
  assert.equal(store.view(info.id, 's1', null, () => assert.fail('a kept view is reused')), view);
  // A state event with a new generation resets the view.
  bridge.emit({ kind: 'state', info: { ...info, generation: 2 } });
  assert.equal(view.resets, 1);
  // Keystrokes go fire-and-forget; Enter is remembered for auto-close.
  store.input(info.id, 'exit\r');
  assert.deepEqual(bridge.writes, [[info.id, 'exit\r']]);
  assert.ok(store.lastEnter(info.id) > 0);
  // Removal disposes the view.
  bridge.emit({ kind: 'removed', id: info.id, owner: 's1', reason: 'folder-gone' });
  assert.equal(view.disposed, true);
  assert.equal(store.get('s1').tabs.length, 0);
  assert.equal(store.hasView(info.id), false);
});

test('at most 16 views stay alive; the least recently shown is disposed first', async () => {
  const bridge = fakeBridge();
  const store = createTerminalStore({ bridge });
  const views = [];
  for (let index = 0; index <= MAX_CACHED_TERMINALS; index++) {
    const info = await store.create('s1', 's1', null);
    const view = fakeView();
    views.push([info.id, view]);
    store.view(info.id, 's1', null, () => view);
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
  assert.equal(views[0][1].disposed, true);
  assert.equal(store.hasView(views[0][0]), false);
  assert.equal(views.slice(1).every(([, view]) => !view.disposed), true);
});

test('busy state and agent-opened tabs', async () => {
  const bridge = fakeBridge();
  const store = createTerminalStore({ bridge });
  const opened = [];
  store.onOpened((event) => opened.push(event));
  bridge.emit({ kind: 'state', info: { id: 'term-agent1', owner: 's9', sessionId: 's9', number: 1, status: 'running', busy: true, generation: 1 } });
  bridge.emit({ kind: 'opened', id: 'term-agent1', owner: 's9', sessionId: 's9', openedBy: 'agent' });
  assert.deepEqual(opened.map((event) => event.sessionId), ['s9']);
  assert.equal(store.get('s9').active, 'term-agent1');
  assert.equal(store.busy('s9'), true);
  assert.equal(store.busy('s1'), false);
  bridge.emit({ kind: 'state', info: { id: 'term-agent1', owner: 's9', sessionId: 's9', number: 1, status: 'exited', busy: false, generation: 1 } });
  assert.equal(store.busy('s9'), false);
});

test('without a preload bridge the store reports unavailable and does nothing', async () => {
  const store = createTerminalStore({ bridge: null });
  assert.equal(store.available, false);
  assert.equal(await store.load('s1', 's1', null), null);
  assert.equal(store.get('s1'), null);
});

test('view preferences update cached terminals across owners without restarting or clearing output', async () => {
 const bridge=fakeBridge(),store=createTerminalStore({bridge});
 const a=await store.create('s1','s1',null),b=await store.create('s2','s2',null);
 const factory=()=>Object.assign(fakeView(),{term:{options:{cursorStyle:'block',scrollback:10000,cursorBlink:true}}});
 const av=store.view(a.id,'s1',null,factory),bv=store.view(b.id,'s2',null,factory);
 av.write('retained');bv.write('background');
 store.updateViewOptions({cursorStyle:'underline',scrollback:1000,cursorBlink:false});
 assert.deepEqual(av.term.options,bv.term.options);assert.equal(bv.term.options.cursorStyle,'underline');
 assert.equal(av.written,'retained');assert.equal(bv.written,'background');assert.equal(av.disposed,false);
 assert.equal(bridge.calls.filter(([op])=>op==='restart').length,0);store.dispose();
});

// B20 (ca41b3815 inline run, c11959232 run/cancel, c03935b01 It): a code block's command typed at an idle prompt, its
// output read from that tab's stream from the offset where the command was typed, settling on OSC 133 D, on quiet
// output (no integration), on cancel (^C) or when the shell ends.
test('inline run: a new tab when none is idle, output from the ready offset, OSC 133 D settles with the exit code', async () => {
  const bridge = fakeBridge();
  const store = createTerminalStore({ bridge });
  let changes = 0;
  store.subscribeInline(() => { changes += 1; });
  bridge.readyAt = 10;
  const opened = [];
  const started = await store.runInline({ id: 'block:s1:m:ls', sessionId: 's1', command: 'ls', onTab: (info) => opened.push(info.id) });
  assert.equal(started.fresh, true);
  assert.deepEqual(opened, [started.ptyKey]);
  assert.ok(bridge.calls.some(([op]) => op === 'probe'));
  assert.deepEqual(bridge.writes.at(-1), [started.ptyKey, 'ls\r']);
  assert.equal(store.get('s1').active, started.ptyKey);
  let run = store.inlineRun();
  assert.equal(run.dispatched, true);
  assert.equal(run.settled, false);
  // Output before the offset (the new shell's prompt) is not the command's.
  bridge.emit({ kind: 'data', id: started.ptyKey, data: 'PROMPT %  ', end: 10 });
  bridge.emit({ kind: 'data', id: started.ptyKey, data: 'ls\r\n\x1b]133;C\x07a.txt\r\n', end: 32 });
  run = store.inlineRun();
  assert.equal(run.output, 'a.txt');
  assert.equal(run.hasVisibleOutput, true);
  bridge.emit({ kind: 'data', id: started.ptyKey, data: '\x1b]133;D;1\x07% ', end: 45 });
  run = store.inlineRun();
  assert.equal(run.settled, true);
  assert.equal(run.endedBy, 'idle');
  assert.equal(run.exitCode, 1);
  assert.ok(changes > 3);
  assert.deepEqual(store.inlineTab('block:s1:m:ls'), { owner: 's1', id: started.ptyKey });
  assert.equal(store.inlineTab('block:s1:m:other'), null);
  store.dispose();
});

test('inline run: the idle active tab is reused unless its prompt holds unsent input; quiet output settles a plain shell', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const bridge = fakeBridge();
  const store = createTerminalStore({ bridge });
  const tab = await store.create('s1', 's1', null);
  bridge.probe = { live: [tab.id], busy: [], unknown: [] };
  store.input(tab.id, 'half-typed');
  let started = await store.runInline({ id: 'r1', sessionId: 's1', command: 'pwd' });
  assert.notEqual(started.ptyKey, tab.id, 'a prompt with unsent input is never typed into');
  store.input(tab.id, '\r');
  store.select('s1', tab.id);
  started = await store.runInline({ id: 'r2', sessionId: 's1', command: 'pwd' });
  assert.equal(started.ptyKey, tab.id);
  assert.equal(started.fresh, false);
  bridge.emit({ kind: 'data', id: tab.id, data: '$ pwd\r\n/work\r\n$ ', end: 20 });
  assert.equal(store.inlineRun().output, '/work');
  assert.equal(store.inlineRun().settled, false);
  context.mock.timers.tick(800);
  assert.equal(store.inlineRun().settled, true);
  assert.equal(store.inlineRun().endedBy, 'silence');
  store.dispose();
});

test('inline run: Cancel sends ^C and ends the run; a re-run keeps the previous output until new output arrives', async () => {
  const bridge = fakeBridge();
  const store = createTerminalStore({ bridge });
  const first = await store.runInline({ id: 'r', sessionId: 's1', command: 'sleep 9' });
  bridge.emit({ kind: 'data', id: first.ptyKey, data: '\x1b]133;C\x07working\r\n', end: 30 });
  store.cancelInlineRun();
  assert.deepEqual(bridge.writes.at(-1), [first.ptyKey, '\x03']);
  assert.equal(store.inlineRun().endedBy, 'cancel');
  assert.equal(store.inlineRun().output, 'working');
  bridge.emit({ kind: 'data', id: first.ptyKey, data: 'late\r\n', end: 40 });
  assert.equal(store.inlineRun().output, 'working', 'a settled run takes no more output');
  const again = store.runInline({ id: 'r', sessionId: 's1', command: 'sleep 9' });
  assert.equal(store.inlineRun().prev.output, 'working');
  await again;
  store.dismissInlineRun();
  assert.equal(store.inlineRun(), null);
  store.dispose();
});

test('inline run: a shell that ends before any output says so; a dedicated run (output to the model) is kept as a record', async () => {
  const bridge = fakeBridge();
  const store = createTerminalStore({ bridge });
  const started = await store.runInline({ id: 'r', sessionId: 's1', command: 'exit' });
  bridge.emit({ kind: 'removed', id: started.ptyKey, owner: 's1', reason: 'closed' });
  assert.equal(store.inlineRun().settled, true);
  assert.equal(store.inlineRun().errorKind, 'shell-exited');
  const info = await store.runDedicated({ id: 'turn', sessionId: 's1', command: 'git status' });
  assert.deepEqual(bridge.calls.find(([op]) => op === 'run')[1], { sessionId: 's1', command: 'git status', quiet: true });
  assert.equal(store.inlineRun().mode, 'dedicated');
  bridge.emit({ kind: 'data', id: info.id, data: 'On branch main\r\n', end: 16 });
  bridge.emit({ kind: 'state', info: { ...info, status: 'exited', exitCode: 0 } });
  assert.equal(store.inlineRun().endedBy, 'exit');
  store.recordRun('turn');
  assert.deepEqual(store.runRecord('turn'), { output: 'On branch main', error: null, exitCode: 0 });
  // A new run of the same block replaces its record.
  await store.runInline({ id: 'turn', sessionId: 's1', command: 'git status' });
  assert.equal(store.runRecord('turn'), undefined);
  store.dispose();
});

test('inline run (B20 review): a dedicated run whose output and exit come before the "run" reply still gets both', async () => {
  const bridge = fakeBridge();
  const store = createTerminalStore({ bridge });
  const call = bridge.call;
  // The main process sends the tab's output and its exit before the run request resolves.
  bridge.call = async (op, params) => {
    const result = await call(op, params);
    if (op === 'run') {
      bridge.emit({ kind: 'data', id: 'term-other', data: 'noise\r\n', end: 7 });
      bridge.emit({ kind: 'data', id: result.id, data: 'hi\r\n', end: 4 });
      bridge.emit({ kind: 'state', info: { ...result, status: 'exited', exitCode: 0 } });
    }
    return result;
  };
  await store.runDedicated({ id: 'turn', sessionId: 's1', command: 'echo hi' });
  assert.equal(store.inlineRun().output, 'hi');
  assert.equal(store.inlineRun().settled, true);
  assert.equal(store.inlineRun().endedBy, 'exit');
  assert.equal(store.inlineRun().exitCode, 0);
  store.dispose();
});

// TT-10 / FT-13 (2.42304.0 c19e90103 Ng commandDone = endedBy === "idle", Bg me = (!tracked || commandDone) && showsRun):
// what the store's endings mean for a block's kept box. Only an idle prompt (OSC 133 D) is "done"; the local dedicated
// tab's "exit" is not (the source has no such ending), so its record shows once another run takes the tracking.
test('inline run → kept box: an idle-settled tracked run is commandDone; a dedicated run that exits is not', async () => {
  const bridge = fakeBridge();
  const store = createTerminalStore({ bridge });
  const typed = await store.runInline({ id: 'block:s1:m:true', sessionId: 's1', command: 'true' });
  bridge.emit({ kind: 'data', id: typed.ptyKey, data: 'true\r\n\x1b]133;C\x07\x1b]133;D;0\x07% ', end: 30 });
  let run = store.inlineRun();
  assert.equal(run.endedBy, 'idle');
  assert.equal(run.output, '');
  assert.equal(inlineCommandDone(run), true);
  // Synthetic: production never records a typed inline run. The only recordRun caller is main.jsx runCodeBlockTurn,
  // i.e. the dedicated bash-turn tab, whose ending is always "exit" (D20: commandDone stays "idle"-only, no adapter for
  // "exit"). Recording this idle-settled typed run here only exercises the source's tracked + idle path of the kept box,
  // which the host cannot reach today (see R1/R2-transcript reports).
  store.recordRun('block:s1:m:true');
  assert.deepEqual(store.runRecord('block:s1:m:true'), { output: '', error: null, exitCode: 0 });
  assert.equal(keptRunVisible({ tracked: true, commandDone: inlineCommandDone(run), showsRun: true }), true,
    'tracked, done at the prompt, no live output: the kept box ("(no output)") with Open in terminal');

  const info = await store.runDedicated({ id: 'turn', sessionId: 's1', command: 'true' });
  bridge.emit({ kind: 'state', info: { ...info, status: 'exited', exitCode: 0 } });
  run = store.inlineRun();
  assert.equal(run.endedBy, 'exit');
  assert.equal(inlineCommandDone(run), false, 'the source only counts "idle"');
  store.recordRun('turn');
  assert.equal(keptRunVisible({ tracked: true, commandDone: inlineCommandDone(run), showsRun: true }), false);
  // Another run takes the tracking: the dedicated run's block is no longer tracked and shows its record.
  await store.runInline({ id: 'block:s1:m:other', sessionId: 's1', command: 'ls' });
  assert.notEqual(store.inlineRun().id, 'turn');
  assert.equal(keptRunVisible({ tracked: false, commandDone: false, showsRun: true }), true);
  assert.deepEqual(store.runRecord('turn'), { output: '', error: null, exitCode: 0 });
  // Cancel and silence endings are not "done" either.
  store.cancelInlineRun();
  assert.equal(store.inlineRun().endedBy, 'cancel');
  assert.equal(inlineCommandDone(store.inlineRun()), false);
  store.dispose();
});
