import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { decodeFileBytes, detectTextEncoding, detectionSampleBytes } from '../electron/generated/file-text-decoder.mjs';
const require = createRequire(import.meta.url);
const { readFile } = require('../electron/files.cjs');
const { readEditableFile } = require('../electron/file-editor.cjs');

test('BOM and alternating-byte inference decode both UTF-16 byte orders', () => {
  const text = 'Hello, 世界!\r\nAnother line';
  const le = Buffer.from(text, 'utf16le'), be = Buffer.from(le).swap16();
  for (const [bytes, encoding] of [[Buffer.concat([Buffer.from([255, 254]), le]), 'utf-16le'], [Buffer.concat([Buffer.from([254, 255]), be]), 'utf-16be'], [le, 'utf-16le'], [be, 'utf-16be']]) {
    assert.deepEqual(decodeFileBytes(bytes), { contents: text, fileSize: bytes.length, encoding });
  }
  const utf8 = Buffer.from('\uFEFFHello 世界');
  assert.equal(decodeFileBytes(utf8).contents, 'Hello 世界');
});

test('isolated legacy characters decode as Windows-1252; mixed corrupt UTF-8 stays rejected', () => {
  const bytes = Buffer.concat([Buffer.from('A long sentence with a caf'), Buffer.from([0xe9]), Buffer.from(' in the middle and enough ASCII around it.')]);
  assert.equal(decodeFileBytes(bytes).encoding, 'windows-1252');
  assert.match(decodeFileBytes(bytes).contents, /café/);
  assert.equal(decodeFileBytes(Buffer.from([0, 1, 65])).reason, 'not_text');
  const mixed = Buffer.concat([Buffer.from('中文'), Buffer.from([0xff, 0xff, 0xff])]);
  assert.deepEqual(detectTextEncoding(mixed), { reject: 'utf8_mixed' });
  assert.equal(decodeFileBytes(Buffer.from([0xff, 0xfe, 1, 0, 2, 0])).reason, 'not_text');
});

test('UTF-8 sampling does not reject a multibyte character across the sample boundary', () => {
  const bytes = Buffer.from('a'.repeat(detectionSampleBytes - 1) + '中文');
  assert.equal(decodeFileBytes(bytes).contents, bytes.toString());
  assert.equal(decodeFileBytes(Buffer.concat([bytes, Buffer.from([0])])).reason, 'not_text');
});

test('scoped preview retains legacy encoding and never makes that content UTF-8 editable', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'openclaude-decoder-'));
  try {
    const text = 'Hello from a UTF-16 document';
    const bytes = Buffer.from('\uFEFF' + text, 'utf16le');
    await fs.writeFile(path.join(root, 'utf16.txt'), bytes);
    assert.deepEqual(await readFile(root, 'utf16.txt'), { path: 'utf16.txt', text, size: bytes.length, encoding: 'utf-16le' });
    assert.equal(await readEditableFile(root, 'utf16.txt'), null);
    assert.equal((await readFile(root, 'utf16.txt', { force: true })).text, bytes.toString('utf8'));
    assert.deepEqual(await fs.readFile(path.join(root, 'utf16.txt')), bytes);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
