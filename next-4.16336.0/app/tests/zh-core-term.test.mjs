import test from 'node:test';
import assert from 'node:assert/strict';
import zh from '../electron/i18n/zh-CN/index.mjs';

// zh-CN calls an agent core 内核 everywhere (Settings › 内核, onboarding), never 核心: a beginner told to check
// Settings › 内核 in one message and 重启核心 in another can't tell they are the same thing.
test('zh-CN: an agent core is always 内核', () => {
  const stray = Object.entries(zh).filter(([, value]) => typeof value === 'string' && value.includes('核心')).map(([key]) => key);
  assert.deepEqual(stray, [], 'use 内核 for "core"');
  const missing = Object.entries(zh).filter(([key, value]) => /\bcores?\b/i.test(key.replace(/\{\w+\}/g, '')) && !String(value).includes('内核')).map(([key]) => key);
  assert.deepEqual(missing, [], 'a string about the core names it 内核');
});
