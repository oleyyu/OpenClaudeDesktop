// Opt-in (it starts Electron, hidden windows only): PREVIEW_ELECTRON=1 node --test tests/preview-service-electron.test.mjs
// The real preview service with a .claude/launch.json dev server, driven through the preview tools over the MCP
// stdio server and the agent tools socket (fixtures/preview-service-electron.cjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const app = new URL('..', import.meta.url).pathname;
const electron = path.join(app, 'node_modules/.bin/electron');
const skip = process.env.PREVIEW_ELECTRON !== '1' ? 'set PREVIEW_ELECTRON=1 to run the Electron preview check' : !fs.existsSync(electron) ? 'electron is not installed' : false;

test('preview tools drive a dev server page in the real preview service', { skip, timeout: 180000 }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'preview-electron-test-'));
  try {
    const run = spawnSync(electron, [path.join(app, 'tests/fixtures/preview-service-electron.cjs')], {
      cwd: app, encoding: 'utf8', timeout: 170000,
      env: { ...process.env, PREVIEW_TEST_TMP: tmp, PREVIEW_TEST_NODE: process.execPath, ELECTRON_RUN_AS_NODE: '' },
    });
    const line = run.stdout.split('\n').find((text) => text.startsWith('{'));
    assert.ok(line, `no result from Electron: ${run.stderr.slice(-2000)}`);
    const { ok, results, error } = JSON.parse(line);
    assert.ok(ok, error);
    for (const name of ['preview_start', 'preview_stop', 'preview_list', 'preview_logs', 'navigate', 'screenshot', 'read_page', 'get_page_text', 'click', 'type', 'press', 'read_console_messages', 'read_network_requests', 'resize_window'])
      assert.ok(results.tools.includes(name), `${name} is listed`);
    assert.match(results.listBefore, /- web: stopped/);
    assert.equal(results.start.isError, false, results.start.text);
    assert.match(results.start.text, /Server started on port \d+\./); // R4e-preview: 2.42304.0 preview_start wording
    assert.equal(results.state.title, 'Fixture app');
    assert.equal(results.state.servers[0].status, 'running');
    assert.match(results.readPage, /textbox "Name" value="" \[ref_1\]/);
    assert.match(results.readPage, /button "Greet" \[ref_2\]/);
    assert.match(results.pageText, /Nobody yet/);
    assert.match(results.afterClick, /Hello Ada/);
    assert.match(results.afterSubmit, /Hello Bob/);
    assert.equal(results.screenshot[0].type, 'image');
    assert.equal(results.screenshot[0].mimeType, 'image/jpeg');
    assert.ok(results.screenshot[0].bytes > 1000);
    assert.match(results.console, /\[log\] fixture ready/);
    assert.match(results.console, /\[error\] fixture error line/);
    assert.match(results.networkFailed, /missing\.json → 404/);
    assert.match(results.resize, /mobile 375×812; color scheme: dark/);
    assert.equal(results.mobileWidth, 'true true', 'dark scheme and the mobile user agent are emulated');
    assert.match(results.logs, /listening on/);
    assert.equal(results.outside.isError, true, 'an outside site needs the user’s approval');
    assert.equal(results.approvals.length, 2, JSON.stringify(results.approvals));
    assert.equal(results.approvals[0].kind, 'preview-server', 'a launch.json server runs only after the user approves it');
    assert.equal(results.approvals[0].name, 'web');
    assert.deepEqual(results.approvals[0].args, ['server.js']);
    assert.deepEqual(results.approvals[1], { kind: 'preview-site', host: 'example.com', url: 'https://example.com/' });
    assert.equal(results.fileOutside.isError, true);
    assert.match(results.fileOutside.content[0].text, /session’s folder only/);
    assert.match(results.navigateAbout, /\/about/);
    assert.match(results.stop, /Stopped/);
    assert.equal(results.stateAfterStop[0].status, 'stopped');
    // A confirm() never shows in the preview: the click result and the console name it and what it returned.
    assert.match(results.dialogClick, /The page opened a confirm\(\) dialog \("Delete it\?"\), which the preview doesn’t show: confirm\(\) returned false to the page\./);
    assert.match(results.dialogTitle, /Page: no/);
    assert.match(results.dialogConsole, /Page dialog suppressed \(confirm\): "Delete it\?" — native JavaScript dialogs are disabled in this browser; confirm\(\) returned false to the page\./);
    // A dev server that ignores SIGTERM is gone once dispose (the app's quit) resolves.
    assert.match(results.stubbornStart, /Server started on port \d+\./);
    assert.equal(results.stubbornAfterQuit, 'closed');
    assert.ok(results.disposeMs < 2900, `dispose took ${results.disposeMs} ms`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
