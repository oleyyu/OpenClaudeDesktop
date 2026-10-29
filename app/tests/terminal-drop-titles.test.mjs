import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DROP_ERRORS, isAutomountPath, isPowerShell, normalizePosixPath, quoteShellPath, renameDraft, terminalDropText,
} from '../src/terminal-pane-model.mjs';
import { createTerminalTitleTracker } from '../src/terminal-titles.mjs';
import { dictionary } from '../electron/i18n/index.mjs';

// B19: paths dropped on the terminal (cccc2cf0a lg/og/sg/cg, c73f45bc3 Fo, shared-28 ek/lk) and the running command
// on terminal tabs (3.6556.2 cf718f694 ge/W/ue, 2.42304.0 ge/ue/de, through the generated adapter).

test('dropped paths are single-quoted for the shell, joined with a trailing space', () => {
  assert.equal(terminalDropText(['/Users/me/My Project'], '/bin/zsh'), "'/Users/me/My Project' ");
  assert.equal(terminalDropText(['/a/b', '/c d/e.txt'], '/bin/bash'), "'/a/b' '/c d/e.txt' ");
  assert.equal(terminalDropText(['/a//b/./c/../d'], '/bin/zsh'), "'/a/b/d' ", 'lk normalizes an absolute path');
  // A quote or a csh history designator: only shells known to keep them literal in single quotes get the path.
  assert.equal(terminalDropText(["/tmp/it's"], '/bin/zsh'), "'/tmp/it'\\''s' ");
  assert.equal(terminalDropText(['/tmp/wow!'], '/opt/homebrew/bin/fish'), "'/tmp/wow!' ");
  assert.equal(terminalDropText(["/tmp/it's"], '/bin/tcsh'), null);
  assert.equal(terminalDropText(["/tmp/it's"], null, { skipShellCheck: true }), "'/tmp/it'\\''s' ");
  assert.equal(terminalDropText(['/tmp/plain'], '/bin/tcsh'), "'/tmp/plain' ");
  assert.equal(terminalDropText([], '/bin/zsh'), ' ');
});

test('a path the terminal cannot be given safely refuses the whole drop', () => {
  assert.equal(terminalDropText(['/ok', '/bad\nline'], '/bin/zsh'), null, 'control characters');
  assert.equal(terminalDropText(['/tmp/a\u202eb'], '/bin/zsh'), null, 'format characters (Td)');
  assert.equal(terminalDropText(['/tmp/a\u2028b'], '/bin/zsh'), null, 'line separator');
  assert.equal(terminalDropText(['/tmp/back\\slash'], '/bin/zsh'), null, 'POSIX path with a backslash');
  assert.equal(terminalDropText(['/net/server/share'], '/bin/zsh'), null, 'automounter');
  assert.equal(terminalDropText(['/Volumes/Disk/.vol/1/2'], '/bin/zsh'), null);
  assert.equal(quoteShellPath('/Users/me/x', 'pwsh.exe'), null, 'PowerShell takes only a drive path');
  assert.equal(quoteShellPath('C:\\Users\\me', 'pwsh.exe'), "'C:/Users/me'");
  assert.equal(quoteShellPath("C:\\it's", 'cmd.exe', { windows: true }), "'C:\\it''s'");
  assert.equal(quoteShellPath('/x', 'cmd.exe', { windows: true }), null);
});

test('automount and normalization helpers follow shared-28 ek/lk', () => {
  assert.equal(isAutomountPath('/net'), true);
  assert.equal(isAutomountPath('/System/Volumes/Data/net/x'), true);
  assert.equal(isAutomountPath('/Volumes/USB/.file/id'), true);
  assert.equal(isAutomountPath('/Users/me/net'), false);
  assert.equal(isAutomountPath('/a/../net/x'), true, '".." is resolved before the check');
  assert.equal(isAutomountPath('relative/net'), false);
  assert.equal(normalizePosixPath('/a/b/../../..'), '/');
  assert.equal(normalizePosixPath('rel/../x'), 'rel/../x');
  assert.equal(isPowerShell('C:\\Program Files\\PowerShell\\7\\pwsh.exe'), true);
  assert.equal(isPowerShell('/bin/zsh'), false);
});

test('drop errors and the reload button have zh-CN copy', () => {
  const zh = dictionary('zh-CN');
  for (const message of [...Object.values(DROP_ERRORS), 'Reload', 'More terminals', 'press right arrow to close',
    'Press Delete or Backspace to close the terminal', 'Close terminal']) assert.ok(zh[message], message);
});

test('rename starts from the tab’s own name (empty for a numbered tab)', () => {
  assert.equal(renameDraft({ number: 2, title: null }), '');
  assert.equal(renameDraft({ number: 2, title: 'dev server' }), 'dev server');
  assert.equal(renameDraft(null), '');
});

// w10-ccres-e31-terminal: "More terminals" is ViewTabBar's own overflow menu (cfe7c4b3b ae, as cccc2cf0a Zx passes
// labels.moreTabs), so the host's hiddenTerminalTabs (the scrolled-out tabs of the old strip) is gone.

function fakeTerm() {
  const handlers = {};
  let title = null;
  return {
    onTitleChange(handler) { title = handler; return { dispose() {} }; },
    parser: { registerOscHandler(code, handler) { (handlers[code] ??= []).push(handler); return { dispose() {} }; } },
    osc(code, data) { return handlers[code].map((handler) => handler(data)); },
    title(text) { title(text); },
  };
}

test('running command: OSC 133 C after 500ms, cleared by D; the title otherwise; a custom name hides both', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const titles = createTerminalTitleTracker();
  const term = fakeTerm();
  titles.install(term, 'term-1');
  const tab = { id: 'term-1', title: null };
  let changes = 0;
  titles.subscribe(() => { changes += 1; });
  assert.deepEqual(term.osc(133, 'C;nonce=abc;cmdline_url=npm%20run%20dev'), [false], 'other OSC 133 handlers still run');
  assert.equal(titles.value(null, tab), undefined, 'not before 500ms (quick commands never flash)');
  context.mock.timers.tick(500);
  assert.equal(titles.value(null, tab), 'npm run dev');
  assert.equal(titles.description('npm run dev'), 'npm run dev');
  assert.equal(titles.value(null, { ...tab, title: 'mine' }), undefined, 'a tab with its own name shows no description');
  term.osc(133, 'D;0;nonce=abc');
  assert.equal(titles.value(null, tab), undefined);
  // A quick command (D within 500ms) never shows.
  term.osc(133, 'C;nonce=abc;cmdline_url=ls');
  context.mock.timers.tick(100);
  term.osc(133, 'D;0;nonce=abc');
  context.mock.timers.tick(1000);
  assert.equal(titles.value(null, tab), undefined);
  // The shell's own title (OSC 0/2): the last path segment as the description, the whole text as the detail.
  term.title('me@host: ~/work/project');
  assert.equal(titles.value(null, tab), 'me@host: ~/work/project');
  assert.equal(titles.description(titles.value(null, tab)), 'project');
  term.title('powershell.exe');
  assert.equal(titles.value(null, tab), undefined, 'a bare executable title is dropped (pe)');
  term.title('a\u0007b\u202e  c');
  assert.equal(titles.value(null, tab), 'ab c', 'control and format characters removed, whitespace collapsed');
  // UTF-8 percent-encoding decodes.
  term.osc(133, 'C;cmdline_url=echo%20%E4%BD%A0%E5%A5%BD');
  context.mock.timers.tick(500);
  assert.equal(titles.value(null, tab), 'echo 你好');
  assert.ok(changes > 0);
  titles.forget('term-1');
  assert.equal(titles.value(null, tab), undefined);
});
