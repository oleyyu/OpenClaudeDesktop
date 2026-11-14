/**
 * Codex UserInput ↔ Harness user message content, both directions in one
 * module so the encoder and the decoder cannot drift.
 *
 *   text          text block
 *   localImage    image block {type:'image', attachment} when the attachment
 *                 store is mounted (and the route takes images); without a
 *                 store `[Attached image: P — use read_image to view it]`
 *   image (URL)   `[Attached image URL: U]`
 *   mention       `[Referenced: P]`
 *   skill         `/name`, dsh-tool-skill's gesture (the skill body is
 *                 injected for the step); a name outside the gesture grammar
 *                 is `[Use the N skill (P)]`
 *
 * Decoding (toCodexInputs) maps a text block whose whole text is one of the
 * bracket forms back to its part; a `/name` gesture stays text, as typed.
 */

import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { isImageAdmissionError } from '@deepseek-ai/dsh-attachment'
import { RpcError, INVALID_PARAMS, invalidParams } from './transport.js'

// dsh-tool-skill SKILL_GESTURE's name grammar (the public skill-name grammar).
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const LOCAL_IMAGE = /^\[Attached image: ([^\n]+) — use read_image to view it\]$/u
const IMAGE_URL = /^\[Attached image URL: ([^\n]+)\]$/u
const MENTION = /^\[Referenced: ([^\n]+)\]$/u
const SKILL = /^\[Use the ([^\n]+?) skill \(([^\n]+)\)\]$/u

export const UNSUPPORTED_IMAGE = 'Only PNG, JPEG, GIF, and WebP images are supported.'

/**
 * The canonical text form of a non-text Codex input part.
 * @returns {string | undefined} undefined for a part with no text form.
 */
export function encodeTextPart(part) {
  if (part?.type === 'localImage' && typeof part.path === 'string') return `[Attached image: ${part.path} — use read_image to view it]`
  if (part?.type === 'image' && typeof part.url === 'string') return `[Attached image URL: ${part.url}]`
  if (part?.type === 'mention' && typeof part.path === 'string') return `[Referenced: ${part.path}]`
  if (part?.type === 'skill' && typeof part.name === 'string' && part.name) {
    if (SKILL_NAME.test(part.name)) return `/${part.name}`
    return `[Use the ${part.name} skill${part.path ? ` (${part.path})` : ''}]`
  }
  return undefined
}

/** The image media type from the file's magic bytes (the attachment store re-verifies it). */
export function imageMediaType(bytes) {
  const at = (index) => bytes[index]
  const ascii = (start, text) => [...text].every((char, index) => at(start + index) === char.charCodeAt(0))
  if (at(0) === 0x89 && ascii(1, 'PNG\r\n\x1a\n')) return 'image/png'
  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return 'image/jpeg'
  if (ascii(0, 'GIF87a') || ascii(0, 'GIF89a')) return 'image/gif'
  if (ascii(0, 'RIFF') && ascii(8, 'WEBP')) return 'image/webp'
  return undefined
}

/**
 * Codex input → Harness user content, in order. With an attachment store
 * every localImage becomes an image block: the files are read, typed from
 * their bytes and saved as ONE ordered batch (`attachments.saveImages`).
 * @param {unknown} input - Codex UserInput[] from turn/start, turn/steer or thread/queue/*.
 * @param {{ imageAllowed?: boolean, attachments?: { saveImages: Function }, modelName?: string, read?: (path: string) => Promise<Uint8Array> }} [options]
 *   imageAllowed: the route declares image input; attachments: ctx.attachments when mounted.
 * @returns {Promise<Array<object>>} text and image blocks.
 * @throws RpcError INVALID_PARAMS for an empty input, an image the route
 *   cannot take, an unreadable or unsupported image, or a refused batch.
 */
export async function toHarnessContent(input, { imageAllowed = false, attachments, modelName = 'the selected model', read = readFile } = {}) {
  if (!Array.isArray(input) || input.length === 0) throw invalidParams('input must be a non-empty array')
  const content = []
  const images = []
  for (const part of input) {
    if (part?.type === 'text' && typeof part.text === 'string') content.push({ type: 'text', text: part.text })
    else if (part?.type === 'localImage' && typeof part.path === 'string' && attachments) {
      if (!imageAllowed) throw new RpcError(INVALID_PARAMS, `Model "${modelName}" does not support image input.`)
      images.push({ slot: content.length, path: part.path })
      content.push(null)
    } else {
      const text = encodeTextPart(part)
      if (text !== undefined) content.push({ type: 'text', text })
    }
  }
  if (images.length > 0) {
    const batch = await Promise.all(images.map(async ({ path }) => {
      let bytes
      try {
        bytes = await read(path)
      } catch (error) {
        throw invalidParams(`Could not read the attached image ${basename(path)}: ${error?.code ?? error?.message ?? error}`)
      }
      const data = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      const mediaType = imageMediaType(data)
      if (!mediaType) throw invalidParams(`${basename(path)}: ${UNSUPPORTED_IMAGE}`)
      return { data, mediaType, name: basename(path) }
    }))
    let refs
    try {
      refs = await attachments.saveImages(batch)
    } catch (error) {
      // Size, pixel and count limits are the caller's to fix; storage faults are not.
      if (isImageAdmissionError(error)) throw invalidParams(error.message)
      throw error
    }
    images.forEach(({ slot }, index) => { content[slot] = { type: 'image', attachment: refs[index] } })
  }
  if (content.length === 0) throw invalidParams('input has no supported content')
  return content
}

/** One text block → the Codex part its bracket form encodes, else a text part. */
function decodeText(text) {
  let match = LOCAL_IMAGE.exec(text)
  if (match) return { type: 'localImage', path: match[1] }
  if ((match = IMAGE_URL.exec(text))) return { type: 'image', url: match[1] }
  if ((match = MENTION.exec(text))) return { type: 'mention', name: basename(match[1]), path: match[1] }
  if ((match = SKILL.exec(text))) return { type: 'skill', name: match[1], path: match[2] }
  return { type: 'text', text, text_elements: [] }
}

/**
 * Harness user content → Codex UserInput[] (live items, replays, the queue
 * after a restart). An image block is a localImage at the attachment's host
 * path when `imagePath` knows it, else the text '[image]'.
 * @param {Array<object> | undefined} content
 * @param {{ imagePath?: (ref: object) => string | undefined }} [options]
 */
export function toCodexInputs(content, { imagePath } = {}) {
  const inputs = []
  for (const block of Array.isArray(content) ? content : []) {
    if (block?.type === 'text' && block.text) inputs.push(decodeText(block.text))
    else if (block?.type === 'image') {
      let path
      try { path = imagePath?.(block.attachment) } catch {}
      inputs.push(typeof path === 'string' && path ? { type: 'localImage', path } : { type: 'text', text: '[image]', text_elements: [] })
    }
  }
  return inputs
}

/** The typed prompt text (thread preview): text blocks that are not bracket forms. */
export function promptText(content) {
  return (Array.isArray(content) ? content : [])
    .filter((block) => block?.type === 'text' && block.text && decodeText(block.text).type === 'text')
    .map((block) => block.text)
    .join('\n')
}
