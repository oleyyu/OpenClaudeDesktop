import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { crc32, deflateSync } from 'node:zlib'
import { encodeTextPart, imageMediaType, promptText, toCodexInputs, toHarnessContent } from '../packages/codex-app-server/src/input.js'

const text = (value) => ({ type: 'text', text: value, text_elements: [] })

// A real 1×1 RGBA PNG (signature, IHDR, IDAT, IEND).
function onePixelPng() {
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const length = Buffer.alloc(4); length.writeUInt32BE(data.length)
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body) >>> 0)
    return Buffer.concat([length, body, crc])
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(1, 0); header.writeUInt32BE(1, 4); header[8] = 8; header[9] = 6
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', deflateSync(Buffer.from([0, 255, 0, 0, 255]))), chunk('IEND', Buffer.alloc(0))])
}

async function tempFiles() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'bridge-input-'))
  const png = path.join(dir, 'shot.png')
  await fs.writeFile(png, onePixelPng())
  const bmp = path.join(dir, 'old.bmp')
  await fs.writeFile(bmp, Buffer.from('BM not an accepted raster'))
  return { dir, png, bmp }
}

// attachments.saveImages stand-in: records each batch, returns one ref per image in order.
function fakeAttachments() {
  const batches = []
  return {
    batches,
    async saveImages(inputs) {
      batches.push(inputs)
      return inputs.map((input, index) => ({ attachmentId: `att${batches.length}-${index}`, mediaType: input.mediaType, bytes: input.data.byteLength, width: 1, height: 1, name: input.name }))
    },
  }
}

test('[text, localImage] becomes [text, image block] in order, saved as one batch', async () => {
  const { dir, png } = await tempFiles()
  try {
    const attachments = fakeAttachments()
    const content = await toHarnessContent([text('what is this?'), { type: 'localImage', path: png }, { type: 'mention', name: 'a.js', path: '/w/a.js' }, { type: 'localImage', path: png }], { imageAllowed: true, attachments, modelName: 'DeepSeek-V41-Flash' })
    assert.equal(attachments.batches.length, 1, 'one saveImages call per message')
    assert.deepEqual(attachments.batches[0].map((input) => [input.mediaType, input.name, input.data instanceof Uint8Array, input.data.byteLength]), [['image/png', 'shot.png', true, onePixelPng().length], ['image/png', 'shot.png', true, onePixelPng().length]])
    assert.deepEqual(content.map((block) => block.type), ['text', 'image', 'text', 'image'])
    assert.equal(content[1].attachment.attachmentId, 'att1-0')
    assert.equal(content[3].attachment.attachmentId, 'att1-1')
    assert.equal(content[2].text, '[Referenced: /w/a.js]')
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
})

test('a route without image input refuses an image; no store keeps the text fallback', async () => {
  const { dir, png, bmp } = await tempFiles()
  try {
    const attachments = fakeAttachments()
    await assert.rejects(toHarnessContent([text('see'), { type: 'localImage', path: png }], { imageAllowed: false, attachments, modelName: 'DeepSeek-V4-Pro' }),
      (error) => error.code === -32602 && error.message === 'Model "DeepSeek-V4-Pro" does not support image input.')
    assert.equal(attachments.batches.length, 0)
    const fallback = await toHarnessContent([text('see'), { type: 'localImage', path: png }], { imageAllowed: true })
    assert.deepEqual(fallback, [{ type: 'text', text: 'see' }, { type: 'text', text: `[Attached image: ${png} — use read_image to view it]` }])
    // Unreadable or unsupported bytes are the caller's to fix.
    await assert.rejects(toHarnessContent([{ type: 'localImage', path: bmp }], { imageAllowed: true, attachments }), (error) => error.code === -32602 && /PNG, JPEG, GIF, and WebP/.test(error.message))
    await assert.rejects(toHarnessContent([{ type: 'localImage', path: path.join(dir, 'gone.png') }], { imageAllowed: true, attachments }), (error) => error.code === -32602 && /gone\.png/.test(error.message))
    // An admission refusal from the store (size, pixels, count) is INVALID_PARAMS too.
    const refusing = { saveImages: async () => { throw Object.assign(new Error('Image exceeds the configured byte limit.'), { code: 'IMAGE_TOO_LARGE' }) } }
    await assert.rejects(toHarnessContent([{ type: 'localImage', path: png }], { imageAllowed: true, attachments: refusing }), (error) => error.code === -32602 && error.message === 'Image exceeds the configured byte limit.')
    await assert.rejects(toHarnessContent([], {}), (error) => error.code === -32602)
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
})

test('mention and bracket-form skill parts round-trip; a gesture-shaped skill is /name', () => {
  for (const part of [{ type: 'mention', name: 'b.ts', path: '/w/src/b.ts' }, { type: 'skill', name: 'Release Notes', path: '/s/release/SKILL.md' }, { type: 'localImage', path: '/tmp/x.png' }, { type: 'image', url: 'https://example.com/a.png' }]) {
    const encoded = encodeTextPart(part)
    assert.deepEqual(toCodexInputs([{ type: 'text', text: encoded }]), [part], encoded)
  }
  assert.equal(encodeTextPart({ type: 'skill', name: 'pdf', path: '/s/pdf/SKILL.md' }), '/pdf')
  assert.equal(encodeTextPart({ type: 'skill', name: 'code-review', path: '/s/cr' }), '/code-review')
  assert.deepEqual(toCodexInputs([{ type: 'text', text: '/pdf' }]), [text('/pdf')], 'the gesture stays text, as typed')
  // A sentence that merely contains a bracket form is text.
  assert.deepEqual(toCodexInputs([{ type: 'text', text: 'see [Referenced: x] for details' }]), [text('see [Referenced: x] for details')])
  assert.deepEqual(toCodexInputs([{ type: 'text', text: '[Referenced: /a]\n[Referenced: /b]' }]), [text('[Referenced: /a]\n[Referenced: /b]')])
})

test('image blocks become localImage at the host path, else [image]; the preview drops every marker', () => {
  const ref = { attachmentId: 'a1', mediaType: 'image/png', bytes: 1, width: 1, height: 1 }
  const content = [{ type: 'text', text: '@src/a.js fix' }, { type: 'text', text: '[Referenced: /w/src/a.js]' }, { type: 'image', attachment: ref }, { type: 'text', text: '/pdf' }]
  assert.deepEqual(toCodexInputs(content, { imagePath: (attachment) => (attachment === ref ? '/stub/a.png' : undefined) }), [text('@src/a.js fix'), { type: 'mention', name: 'a.js', path: '/w/src/a.js' }, { type: 'localImage', path: '/stub/a.png' }, text('/pdf')])
  assert.deepEqual(toCodexInputs(content).map((part) => part.type === 'text' ? part.text : part.type), ['@src/a.js fix', 'mention', '[image]', '/pdf'])
  assert.deepEqual(toCodexInputs(content, { imagePath: () => { throw new Error('invalid ref') } })[2], text('[image]'))
  assert.equal(promptText(content), '@src/a.js fix\n/pdf')
})

test('image media types come from the magic bytes', () => {
  const bytes = (...values) => Uint8Array.from(values.flatMap((value) => typeof value === 'string' ? [...value].map((char) => char.charCodeAt(0)) : [value]))
  assert.equal(imageMediaType(onePixelPng()), 'image/png')
  assert.equal(imageMediaType(bytes(0xff, 0xd8, 0xff, 0xe0)), 'image/jpeg')
  assert.equal(imageMediaType(bytes('GIF89a')), 'image/gif')
  assert.equal(imageMediaType(bytes('RIFF', 0, 0, 0, 0, 'WEBPVP8 ')), 'image/webp')
  assert.equal(imageMediaType(bytes('BM')), undefined)
  assert.equal(imageMediaType(new Uint8Array()), undefined)
})
