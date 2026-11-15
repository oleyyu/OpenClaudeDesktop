// Composer dictation: the pure model (src/composer-dictation-model.mjs) and the main-process service
// (electron/dictation.cjs) over a fake native module and systemPreferences.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dictationLocale, unspacedLocale, readDictationPrefs, writeDictationPrefs, guidanceFor, disablesDictation, dictationButtonLabel, microphoneRows, DICTATION_PREFS_KEY } from '../src/composer-dictation-model.mjs';

const require = createRequire(import.meta.url);
const { createDictation } = require('../electron/dictation.cjs');
const { createFixture } = require('./fixtures/dictation-native-fixture.cjs');

test('dictation locale: a pick wins, Auto follows the app language', () => {
  assert.equal(dictationLocale('en-US', 'zh-CN'), 'en-US');
  assert.equal(dictationLocale(null, 'zh-CN'), 'zh-CN');
  assert.equal(dictationLocale(null, 'en-US'), 'en-US');
  assert.equal(dictationLocale(null, 'ja'), 'ja-JP');
  assert.equal(dictationLocale('xx-YY', 'zh-CN'), 'zh-CN');
  assert.equal(dictationLocale(null, 'pt-BR'), 'en-US');
  assert.equal(unspacedLocale('zh-CN'), true);
  assert.equal(unspacedLocale('en-US'), false);
});

test('dictation prefs: defaults, round trip and junk', () => {
  const store = new Map();
  const storage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  assert.deepEqual(readDictationPrefs(storage), { language: null, deviceUid: null, holdToRecord: true });
  writeDictationPrefs(storage, { language: 'zh-CN', deviceUid: 'usb-mic', holdToRecord: false });
  assert.deepEqual(readDictationPrefs(storage), { language: 'zh-CN', deviceUid: 'usb-mic', holdToRecord: false });
  store.set(DICTATION_PREFS_KEY, '{nope');
  assert.deepEqual(readDictationPrefs(storage), { language: null, deviceUid: null, holdToRecord: true });
  assert.deepEqual(readDictationPrefs(null), { language: null, deviceUid: null, holdToRecord: true });
});

test('dictation copy: label, guidance and which refusals disable the button', () => {
  assert.equal(dictationButtonLabel({ status: 'idle', holdToRecord: true }), 'Press and hold to record');
  assert.equal(dictationButtonLabel({ status: 'idle', holdToRecord: false }), 'Dictate');
  assert.equal(dictationButtonLabel({ status: 'recording', holdToRecord: true }), 'Stop dictation');
  assert.equal(dictationButtonLabel({ status: 'finishing', holdToRecord: true }), 'Finishing dictation…');
  assert.equal(guidanceFor('microphone_denied').settings, 'microphone');
  assert.equal(guidanceFor('speech_recognition_denied').settings, 'speech');
  assert.equal(guidanceFor('no_input_device').title, 'No microphone found');
  assert.equal(guidanceFor('dictation_disabled').settings, 'dictation');
  assert.match(guidanceFor('no_on_device_recognition', { languageLabel: 'Deutsch' }).title, /^Deutsch /);
  assert.equal(guidanceFor('whatever').title, 'Dictation couldn’t start');
  assert.equal(disablesDictation('no_speech_usage_description'), true);
  assert.equal(disablesDictation('microphone_denied'), false);
  assert.deepEqual(microphoneRows([{ uid: 'a', name: 'A' }, { uid: 'b', name: 'B' }, { uid: '' }], 'b').map((row) => [row.uid, row.checked]), [['a', false], ['b', true]]);
  assert.equal(microphoneRows([{ uid: 'a', name: 'A' }], 'gone')[0].checked, true);
});

const prefs = (status, granted = true) => {
  const asked = [];
  return { asked, getMediaAccessStatus: () => status.value, askForMediaAccess: async (kind) => { asked.push(kind); status.value = granted ? 'granted' : 'denied'; return granted; } };
};
const sender = () => {
  const listeners = new Map();
  return { once: (event, fn) => listeners.set(event, fn), removeListener: (event) => listeners.delete(event), destroy: () => listeners.get('destroyed')?.() };
};

test('dictation service: availability, start, live text, stop, idle', async () => {
  const native = createFixture({ step: 20, reason: null });
  const status = { value: 'not-determined' };
  const system = prefs(status);
  const service = createDictation({ native, systemPreferences: system, platform: 'darwin' });
  const available = await service.call({ op: 'availability', locale: 'zh-CN' });
  assert.equal(available.available, true);
  assert.equal(available.devices.length, 2);
  const started = await service.call({ op: 'start', locale: 'zh-CN', uid: 'usb-mic' }, sender());
  assert.deepEqual(system.asked, ['microphone']);
  assert.equal(started.session, 1);
  assert.deepEqual(native.calls.find((c) => c.method === 'dictationStart').params, { locale: 'zh-CN', uid: 'usb-mic' });
  await new Promise((resolve) => setTimeout(resolve, 70));
  const live = await service.call({ op: 'state' });
  assert.equal(live.state, 'recording');
  assert.ok(live.text.startsWith('今天'));
  await service.call({ op: 'stop' });
  assert.equal((await service.call({ op: 'state' })).state, 'finishing');
  await new Promise((resolve) => setTimeout(resolve, 350));
  const done = await service.call({ op: 'state' });
  assert.equal(done.state, 'idle');
  assert.ok(done.text.length >= 2);
});

test('dictation service: a denied microphone refuses before native start', async () => {
  const native = createFixture({ reason: null });
  const service = createDictation({ native, systemPreferences: prefs({ value: 'denied' }), platform: 'darwin' });
  await assert.rejects(service.call({ op: 'start', locale: 'zh-CN' }), (error) => error.code === 'microphone_denied');
  assert.equal(native.calls.some((c) => c.method === 'dictationStart'), false);
  const available = await service.call({ op: 'availability' });
  assert.equal(available.available, false);
  assert.equal(available.reason, 'microphone_denied');
});

test('dictation service: native refusals keep their code; bad params are dropped', async () => {
  const native = createFixture({ reason: 'no_speech_usage_description' });
  const service = createDictation({ native, systemPreferences: prefs({ value: 'granted' }), platform: 'darwin' });
  const available = await service.call({ op: 'availability', locale: 'zh-CN' });
  assert.equal(available.reason, 'no_speech_usage_description');
  await assert.rejects(service.call({ op: 'start', locale: '../../etc' }), (error) => error.code === 'no_speech_usage_description');
  assert.equal(native.calls.find((c) => c.method === 'dictationStart').params.locale, undefined);
});

test('dictation service: the owner going away cancels the session', async () => {
  const native = createFixture({ reason: null });
  const service = createDictation({ native, systemPreferences: prefs({ value: 'granted' }), platform: 'darwin' });
  const owner = sender();
  await service.call({ op: 'start', locale: 'zh-CN' }, owner);
  owner.destroy();
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(native.calls.some((c) => c.method === 'dictationCancel'));
  assert.equal((await service.call({ op: 'state' })).state, 'idle');
});

test('dictation service: not on macOS', async () => {
  const service = createDictation({ native: createFixture(), systemPreferences: prefs({ value: 'granted' }), platform: 'win32' });
  assert.equal((await service.call({ op: 'availability' })).reason, 'unsupported_platform');
  await assert.rejects(service.call({ op: 'start' }), (error) => error.code === 'unsupported_platform');
  await assert.rejects(service.call({ op: 'nope' }), /Unknown dictation op/);
});

test('dictation service: open-settings goes to the named privacy pane only', async () => {
  const opened = [];
  const service = createDictation({ native: createFixture(), systemPreferences: prefs({ value: 'granted' }), platform: 'darwin', openExternal: async (url) => opened.push(url) });
  await service.call({ op: 'open-settings', pane: 'speech' });
  await service.call({ op: 'open-settings', pane: 'dictation' });
  await service.call({ op: 'open-settings', pane: 'https://example.com' });
  assert.deepEqual(opened, ['x-apple.systempreferences:com.apple.preference.security?Privacy_SpeechRecognition', 'x-apple.systempreferences:com.apple.Keyboard-Settings.extension', 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone']);
});
