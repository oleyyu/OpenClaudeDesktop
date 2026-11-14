import test from 'node:test';
import assert from 'node:assert/strict';
import { localizeBridgeText, localizeBridgeNote } from '../src/bridge-text-model.mjs';
import { setLocale } from '../electron/i18n/index.mjs';

test('known bridge sentences read in the UI language, placeholders kept; anything else unchanged', (context) => {
  context.after(() => setLocale('en-US'));
  const loop = 'Gemini CLI stopped this turn: it detected a possible loop, or the session reached its turn limit (model.maxSessionTurns).';
  assert.equal(localizeBridgeText(loop), loop);
  setLocale('zh-CN');
  assert.match(localizeBridgeText(loop), /^Gemini CLI 停止了本轮/);
  assert.equal(localizeBridgeNote(`_${loop}_`).startsWith('_Gemini CLI 停止了本轮'), true);
  assert.match(localizeBridgeText('This project already has a GEMINI.md file (/w/GEMINI.md), so /init left it unchanged. Edit it directly, or delete it and run /init again to have Gemini write a new one.'), /（\/w\/GEMINI\.md）/);
  assert.match(localizeBridgeText('Sign in to linear in Gemini CLI: run /mcp auth linear in a gemini terminal, then check again.'), /登录 linear/);
  assert.equal(localizeBridgeText('Something else.'), 'Something else.');
  assert.equal(localizeBridgeNote('_Not known._'), '_Not known._');
  assert.equal(localizeBridgeNote('plain'), 'plain');
});

test('bridge warnings with the core or file names filled in read in the UI language', (context) => {
  context.after(() => setLocale('en-US'));
  setLocale('zh-CN');
  assert.equal(localizeBridgeText('Kimi Code keeps its current settings while its background work runs (scheduled tasks). Your change applies once that work has ended.'),
    'Kimi Code 的后台任务（定时任务）仍在运行，因此暂时保留当前设置。这些任务结束后，你的更改才会生效。');
  assert.match(localizeBridgeText('Qwen Code restarted to apply the stricter permission mode, which stopped its background work (npm test).'), /^Qwen Code 已重启.*（npm test）/);
  assert.equal(localizeBridgeText('Qwen Code could not restore some files: a.js, b.js'), 'Qwen Code 未能恢复部分文件：a.js, b.js');
  assert.match(localizeBridgeText('Gemini CLI ignores this folder’s GEMINI.md, .gemini settings, hooks, skills and connectors until you trust the folder.'), /^在你信任此文件夹之前/);
  assert.match(localizeBridgeText('Gemini CLI starts no connectors here, including OpenClaude Desktop’s preview, terminal, Workflow, question and file tools, until you trust the folder.'), /^在你信任此文件夹之前.*终端/);
  assert.match(localizeBridgeText('Gemini CLI ignores this folder’s GEMINI.md, .gemini settings, hooks and skills, and starts no connectors (OpenClaude Desktop’s preview, terminal, Workflow, question and file tools included), until you trust the folder.'), /^在你信任此文件夹之前.*钩子和技能/);
});
