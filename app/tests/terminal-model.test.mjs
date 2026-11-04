import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampSize, cleanTitle, commandProblem, isBusyProcess, isInput, isSessionId, isTerminalId, lastLines, nextNumber, ownerKey, stripAnsi,
  terminalLines, trimOutput,
} from '../electron/terminal-model.mjs';
import {
  CLAUDE_DARK, CLAUDE_LIGHT, findLinks, isTerminalToggle, opaqueColor, safeWebUrl, shouldAutoClose, tabLabel, terminalError,
  terminalFont, terminalFontSize, terminalKeyAction, terminalTheme, unseenData,
} from '../src/terminal-pane-model.mjs';
import { PANE_KINDS, openPane, sanitizeLayout, tileIds, CHAT_TILE_ID } from '../src/tile-layout-model.mjs';
import { sanitizeSessionEntry } from '../src/tile-layout-store.mjs';
import { setLocale } from '../electron/i18n/index.mjs';

test('ids, sessions, sizes, input and titles are validated before they reach a PTY', () => {
  assert.equal(isTerminalId('term-abc123'), true);
  for (const bad of ['term-ABC123', 'term-a', '../term-abc123', 'term-abc123/..', 42, null, 'term-' + 'a'.repeat(33)]) assert.equal(isTerminalId(bad), false, String(bad));
  assert.equal(isSessionId('019a-thread'), true);
  for (const bad of ['', 'a\u0000b', 'x'.repeat(201), 7, null]) assert.equal(isSessionId(bad), false);
  assert.equal(ownerKey('s1', '/x'), 's1');
  assert.equal(ownerKey(null, '/Users/u/proj'), 'home:/Users/u/proj');
  assert.deepEqual(clampSize(120.6, 40.2), { cols: 121, rows: 40 });
  assert.deepEqual(clampSize('x', -5), { cols: 80, rows: 1 });
  assert.deepEqual(clampSize(1e9, 1e9), { cols: 1000, rows: 500 });
  assert.equal(isInput('\u0003'), true);
  assert.equal(isInput(''), false);
  assert.equal(isInput({}), false);
  assert.equal(cleanTitle('  dev\tserver\n '), 'dev server');
  assert.equal(cleanTitle(''), null);
  assert.equal(cleanTitle(null), null);
  assert.equal([...cleanTitle('界'.repeat(100))].length, 64);
  assert.throws(() => cleanTitle(5), /Invalid terminal name/);
  assert.equal(nextNumber([1, 2, 4]), 3);
  assert.equal(nextNumber([]), 1);
});

test('screen text: escape sequences stripped, carriage returns and backspaces applied, last lines', () => {
  const raw = '\u001b]0;title\u0007\u001b[1;32muser\u001b[0m$ ls\r\nfile-a  file-b\r\n50%\r100%\r\nab\bc\r\n\u001b[?2004h\u001b(B$ ';
  assert.equal(stripAnsi('\u001b[31mred\u001b[0m'), 'red');
  assert.deepEqual(terminalLines(raw), ['user$ ls', 'file-a  file-b', '100%', 'ac', '$']);
  assert.equal(lastLines(raw, 2), 'ac\n$');
  assert.equal(lastLines(raw, 'x').split('\n').length, 5);
  assert.equal(lastLines('a\tb'), 'a       b');
  const long = `${'x'.repeat(100)}\n${'y'.repeat(50)}`;
  assert.equal(trimOutput(long, 60), 'y'.repeat(50));
  assert.equal(trimOutput('short', 60), 'short');
});

test('busy: the foreground program is neither the shell nor the program seen at its first prompt', () => {
  assert.equal(isBusyProcess('zsh', '/bin/zsh'), false);
  assert.equal(isBusyProcess('-zsh', '/bin/zsh'), false);
  assert.equal(isBusyProcess('node', '/bin/zsh'), true);
  assert.equal(isBusyProcess('bash', '/bin/sh', 'bash'), false);
  assert.equal(isBusyProcess('', '/bin/zsh'), null);
  // The idle program caught while a login profile ran path_helper: the shell back at its prompt is still idle.
  assert.equal(isBusyProcess('bash', '/bin/sh', 'path_helper'), false);
  assert.equal(isBusyProcess('path_helper', '/bin/zsh', 'zsh'), true);
});

test('run_in_terminal command checks refuse lines the prompt would wait on or that reach into shell hooks', () => {
  for (const ok of ['npm run dev', 'ls -la | grep "a b" && echo done', 'cd src; make', 'NODE_ENV=production node server.js', "echo 'it''s'", 'python3 -m http.server 8000', 'false || true', 'echo $(date)'])
    assert.equal(commandProblem(ok), null, ok);
  const refused = {
    '': /empty/, 'ls\nrm -rf /': /single line/, 'echo é': /ASCII/, 'echo \u0007': /ASCII/, 'ls \\': /continuation/, 'ls |': /operator/,
    'cat <<EOF': /Here-documents/, "echo 'open": /unclosed quote/, 'echo (a': /parentheses/, 'trap "rm x" EXIT': /Trap/,
    'PROMPT_COMMAND=evil': /startup or prompt/, 'export ZDOTDIR=/tmp': /startup or prompt/, 'precmd() { x; }': /startup or prompt/,
    'if true; then echo x': /operator|unfinished/, 'for f in *; do echo $f; done; while true': /unfinished/, 'exec 3< /etc/passwd': /exec/,
  };
  for (const [command, pattern] of Object.entries(refused)) assert.match(String(commandProblem(command)), pattern, JSON.stringify(command));
  assert.match(commandProblem('x'.repeat(2001)), /too long/);
  assert.match(commandProblem(42), /empty/);
});

test('run_in_terminal refuses history expansion, so what runs is exactly the approved line', () => {
  // Checked against interactive /bin/zsh and /bin/bash (3.2) with a seeded history: these expand, or (zsh "Done!")
  // leave a quote open.
  for (const command of ['echo !?TOKEN?', 'git status; echo !?ssh?', '!!', '!-2', '!?deploy?', 'echo !$', 'echo "Done!"', 'echo "a!b"', 'ls [!a]*', 'echo !(x)', 'echo ${!HOME}'])
    assert.match(String(commandProblem(command)), /History expansion/, command);
  assert.match(String(commandProblem('^staging^prod')), /History substitution/);
  // Never expanded: a "!" before a blank, "=" or the end of the line, in single quotes, or escaped.
  for (const command of ['[ ! -f x ] && echo y', 'test a != b', "echo 'hi!there'", 'echo \\!x', 'git log --format=%h!', 'echo "x" !', '! true', 'echo a^b'])
    assert.equal(commandProblem(command), null, command);
});

test('labels, auto-close, the toggle keys and the terminal key actions', () => {
  setLocale('en-US');
  assert.equal(tabLabel({ number: 2 }, 1), 'Terminal');
  assert.equal(tabLabel({ number: 2 }, 3), 'Terminal 2');
  assert.equal(tabLabel({ number: 2, title: 'dev server' }, 3), 'dev server');
  setLocale('zh-CN');
  assert.equal(tabLabel({ number: 2 }, 3), '终端 2');
  assert.equal(tabLabel({ number: 1 }, 1), '终端');
  assert.equal(terminalError(new Error("Error invoking remote method 'terminal:call': Error: Unknown terminal."), 'x'), '未知的终端。');
  setLocale('en-US');
  assert.equal(terminalError(null, 'fallback'), 'fallback');
  // cccc2cf0a r_: only a shell the user typed into closes its tab (terminal-service userTyped, reset by a restart).
  assert.equal(shouldAutoClose({ status: 'exited', exitCode: 0, userTyped: true }), true);
  assert.equal(shouldAutoClose({ status: 'exited', exitCode: 0 }), false, 'an agent-opened tab nobody typed in stays open');
  assert.equal(shouldAutoClose({ status: 'exited', exitCode: 0, userTyped: false }, 1000, 1500), false);
  assert.equal(shouldAutoClose({ status: 'exited', exitCode: 1, userTyped: true }, 0), false);
  assert.equal(shouldAutoClose({ status: 'exited', exitCode: 1, userTyped: true }, 1000, 2500), true, 'exit typed within 2s');
  assert.equal(shouldAutoClose({ status: 'exited', exitCode: 1, userTyped: true }, 1000, 3500), false);
  assert.equal(shouldAutoClose({ status: 'exited', exitCode: 0, signal: 'SIGHUP', userTyped: true }, 0), false);
  assert.equal(shouldAutoClose({ status: 'running', exitCode: 0, userTyped: true }), false);
  const key = (init) => ({ type: 'keydown', key: '', code: '', ...init });
  assert.equal(isTerminalToggle(key({ ctrlKey: true, code: 'Backquote', key: '`' })), true);
  assert.equal(isTerminalToggle(key({ metaKey: true, code: 'KeyJ', key: 'j' })), true);
  assert.equal(isTerminalToggle(key({ metaKey: true, shiftKey: true, code: 'KeyJ' })), false);
  assert.equal(isTerminalToggle(key({ ctrlKey: true, code: 'Backquote', isComposing: true })), false);
  assert.equal(terminalKeyAction(key({ ctrlKey: true, code: 'Backquote' })), 'toggle');
  assert.equal(terminalKeyAction(key({ metaKey: true, code: 'KeyK', key: 'k' })), 'clear');
  assert.equal(terminalKeyAction(key({ metaKey: true, code: 'KeyF', key: 'f' })), 'find');
  assert.equal(terminalKeyAction(key({ metaKey: true, code: 'KeyA', key: 'a' })), 'select-all');
  assert.equal(terminalKeyAction(key({ metaKey: true, code: 'KeyG', key: 'g' })), 'find-next');
  assert.equal(terminalKeyAction(key({ metaKey: true, shiftKey: true, code: 'KeyG', key: 'G' })), 'find-previous');
  assert.equal(terminalKeyAction(key({ metaKey: true, key: 'ArrowLeft' })), 'line-start');
  assert.equal(terminalKeyAction(key({ altKey: true, key: 'ArrowRight' })), 'word-right');
  // Shell keys stay with xterm: ⌃C, ⌃K (kill line), ⌃N; other ⌘ chords stay with the app.
  for (const init of [{ ctrlKey: true, code: 'KeyC', key: 'c' }, { ctrlKey: true, code: 'KeyK', key: 'k' }, { ctrlKey: true, code: 'KeyN', key: 'n' }, { metaKey: true, code: 'KeyB', key: 'b' }])
    assert.equal(terminalKeyAction(key(init)), null, JSON.stringify(init));
  assert.equal(terminalKeyAction({ ...key({ metaKey: true, code: 'KeyK' }), type: 'keyup' }), null);
});

test('theme: Claude palettes over the pane surface, a code theme’s terminal colours, editor colours as fallback', () => {
  assert.deepEqual(terminalTheme({ themeId: 'claude-dark', mode: 'dark' }), CLAUDE_DARK);
  const light = terminalTheme({ themeId: 'claude-light', mode: 'light', surface: 'rgb(250, 249, 245)' });
  assert.equal(light.background, 'rgb(250, 249, 245)');
  assert.equal(light.cursorAccent, 'rgb(250, 249, 245)');
  assert.equal(light.red, CLAUDE_LIGHT.red);
  assert.equal(terminalTheme({ mode: 'light', surface: 'rgba(0, 0, 0, 0)' }).background, CLAUDE_LIGHT.background, 'a transparent surface falls back');
  const dracula = terminalTheme({ themeId: 'dracula', mode: 'dark', colors: { 'terminal.background': '#282A36', 'terminal.foreground': '#F8F8F2', 'terminal.ansiRed': '#FF5555',
    'terminal.ansiBrightRed': '#FF6E6E', 'terminalCursor.foreground': '#F8F8F0', 'terminal.selectionBackground': '#44475A' } });
  assert.deepEqual([dracula.background, dracula.foreground, dracula.red, dracula.brightRed, dracula.cursor, dracula.selectionBackground],
    ['#282A36', '#F8F8F2', '#FF5555', '#FF6E6E', '#F8F8F0', '#44475A']);
  assert.equal(dracula.green, CLAUDE_DARK.green, 'missing ANSI colours come from the Claude palette');
  const editorOnly = terminalTheme({ themeId: 'min-light', mode: 'light', colors: { 'editor.background': '#ffffff', 'editor.foreground': '#212121', 'terminal.ansiRed': 'not-a-colour' } });
  assert.deepEqual([editorOnly.background, editorOnly.foreground, editorOnly.red], ['#ffffff', '#212121', CLAUDE_LIGHT.red]);
  assert.equal(opaqueColor('transparent'), null);
  assert.equal(opaqueColor('rgb(1 2 3 / 0)'), null);
  assert.equal(opaqueColor('#fff'), '#fff');
  assert.match(terminalFont('"JetBrains Mono", anthropic-mono, monospace'), /^"JetBrains Mono".*ui-monospace/);
  assert.match(terminalFont(''), /anthropic-mono/);
  assert.equal(terminalFontSize(16), 12);
  assert.equal(terminalFontSize(20), 15);
  assert.equal(terminalFontSize('x'), 12);
});

test('links: http(s) URLs only and without credentials; path tokens with line and column; folder-relative paths', () => {
  assert.deepEqual(findLinks('see https://example.com/a?b=1, then').map((link) => [link.kind, link.url]), [['web', 'https://example.com/a?b=1']]);
  assert.deepEqual(findLinks('  at src/main.jsx:12:3 and foo.ts(4,5)').map((link) => [link.path, link.line, link.column]), [['src/main.jsx', 12, 3], ['foo.ts', 4, 5]]);
  assert.deepEqual(findLinks('/Users/u/proj/a.js:10').map((link) => link.path), ['/Users/u/proj/a.js']);
  assert.deepEqual(findLinks('version 1.2.3 ok'), []);
  assert.deepEqual(findLinks('https://user:pw@example.com/x').filter((link) => link.kind === 'web'), []);
  assert.equal(safeWebUrl('javascript:alert(1)'), null);
  assert.equal(safeWebUrl('file:///etc/passwd'), null);
  assert.equal(safeWebUrl('https://a.b/c\\d'), null);
  assert.equal(safeWebUrl('http://localhost:5173/'), 'http://localhost:5173/');
});

test('replay: output an attach already covered is skipped, a straddling chunk trimmed', () => {
  assert.equal(unseenData({ data: 'abc', end: 10 }, 10), '');
  assert.equal(unseenData({ data: 'abcdef', end: 12 }, 9), 'def');
  assert.equal(unseenData({ data: 'abc', end: 13 }, 9), 'abc');
  assert.equal(unseenData({ data: 'abc', end: 3 }, -1), 'abc');
  assert.equal(unseenData({ data: 5, end: 3 }, 0), '');
});

test('terminal is a pane kind: it opens beside the chat, survives persistence and keeps its tab state', () => {
  assert.ok(PANE_KINDS.includes('terminal'));
  const layout = openPane(null, 'terminal');
  assert.deepEqual([...tileIds(layout)], [CHAT_TILE_ID, 'terminal']);
  const both = openPane(openPane(null, 'changes'), 'terminal');
  assert.ok(tileIds(both).has('terminal') && tileIds(both).has('changes'));
  assert.ok(sanitizeLayout(JSON.parse(JSON.stringify(both)), new Set([CHAT_TILE_ID, ...PANE_KINDS])));
  const entry = sanitizeSessionEntry({ tileLayout: layout, expandedTile: 'terminal', baseLayout: layout });
  assert.equal(entry.expandedTile, 'terminal');
});

test('screen text wraps at the terminal width: a long command line that readline wraps reads back whole', () => {
  // zsh at 41 columns: the prompt plus the typed command reach the last column, then " \r" moves to the next line.
  const prompt = 'oleyyu@MacBook-Air:ws oleyyu$ ';
  const command = 'echo AGENT-RAN-$((2+3))';
  const line = prompt + command;
  const raw = `${line.slice(0, 41)} \r${line.slice(41)}\r\nAGENT-RAN-5\r\n`;
  assert.deepEqual(terminalLines(raw, 41), [line.slice(0, 41), line.slice(41), 'AGENT-RAN-5']);
  assert.equal(lastLines(raw, 200, 41), `${line.slice(0, 41)}\n${line.slice(41)}\nAGENT-RAN-5`);
  // Output that runs past the width wraps too; without a width nothing wraps (the earlier behaviour).
  assert.deepEqual(terminalLines('abcdefgh', 3), ['abc', 'def', 'gh']);
  assert.deepEqual(terminalLines('abcdefgh'), ['abcdefgh']);
  // Exactly the width: the pending wrap never adds an empty line; a backspace there steps back from the last column.
  assert.deepEqual(terminalLines('abc\r\n', 3), ['abc']);
  assert.deepEqual(terminalLines('abc\bX', 3), ['aXc']);
});
