/**
 * Codex user input → ACP prompt content blocks.
 *
 *   text          text block
 *   localImage    image block (base64) when the agent takes images; a resource_link to the file when it reads
 *                 images from disk instead (imageLinks: MiniMax); else a note
 *   image (url)   data: URLs become image blocks (or, with imageLinks, a file in imageLinks.dir and a link to it);
 *                 other URLs a resource_link
 *   mention       resource_link {uri: file://…} (embedded resource when the
 *                 agent takes embedded context and the file is small text)
 *   skill         the agent's own invocation: "/name" for an ACP command,
 *                 agents/*.js skillPrompt() for a skill file
 */

import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' }
const EMBED_MAX = 256 * 1024
export const COMMAND_PATH = 'acp-command:'

/**
 * @param {unknown[]} input - Codex UserInput[]
 * @param {{ prompt?: {image?: boolean, embeddedContext?: boolean}, skillPrompt?: (skill: object) => string, accepts?: Set<string> }} options
 *   accepts: the block types the agent takes besides text (from promptCapabilities).
 */
export async function toAcpPrompt(input, { prompt = {}, skillPrompt, imageLinks = null } = {}) {
  const blocks = []
  const notes = []
  let leading = ''
  for (const part of Array.isArray(input) ? input : []) {
    if (!part || typeof part !== 'object') continue
    switch (part.type) {
      case 'text':
        if (typeof part.text === 'string' && part.text) blocks.push({ type: 'text', text: part.text })
        break
      case 'skill': {
        if (typeof part.name !== 'string' || !part.name) break
        if (typeof part.path === 'string' && part.path.startsWith(COMMAND_PATH)) leading = `/${part.path.slice(COMMAND_PATH.length) || part.name}`
        else leading = skillPrompt ? skillPrompt(part) : `/${part.name}`
        break
      }
      case 'localImage': {
        const file = part.path
        if (typeof file !== 'string') break
        if (!prompt.image && imageLinks) { blocks.push({ type: 'resource_link', uri: pathToFileURL(file).href, name: path.basename(file), mimeType: MIME[path.extname(file).slice(1).toLowerCase()] ?? 'image/png' }); break }
        if (!prompt.image) { notes.push(`[Attached image: ${file}]`); break }
        try {
          const data = await fs.promises.readFile(file)
          const mimeType = MIME[path.extname(file).slice(1).toLowerCase()] ?? 'image/png'
          blocks.push({ type: 'image', data: data.toString('base64'), mimeType, uri: pathToFileURL(file).href })
        } catch {
          notes.push(`[Attached image could not be read: ${file}]`)
        }
        break
      }
      case 'image': {
        const url = typeof part.url === 'string' ? part.url : part.image_url
        const match = typeof url === 'string' ? /^data:([^;]+);base64,(.*)$/s.exec(url) : null
        if (match && prompt.image) blocks.push({ type: 'image', mimeType: match[1], data: match[2] })
        else if (match && imageLinks?.dir) {
          // A pasted image has no file: saved to the thread's folder, then linked like any image file.
          try {
            const extension = Object.entries(MIME).find(([, type]) => type === match[1])?.[0] ?? 'png'
            await fs.promises.mkdir(imageLinks.dir, { recursive: true })
            const file = path.join(imageLinks.dir, `pasted-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`)
            await fs.promises.writeFile(file, Buffer.from(match[2], 'base64'))
            blocks.push({ type: 'resource_link', uri: pathToFileURL(file).href, name: path.basename(file), mimeType: match[1] })
          } catch { notes.push('[Attached image could not be saved]') }
        } else if (typeof url === 'string' && !match) blocks.push({ type: 'resource_link', uri: url, name: url })
        else notes.push('[Attached image]')
        break
      }
      case 'mention': {
        const file = part.path
        if (typeof file !== 'string' || !file) break
        const name = part.name || path.basename(file)
        let embedded = null
        if (prompt.embeddedContext) {
          try {
            const stat = await fs.promises.stat(file)
            if (stat.isFile() && stat.size <= EMBED_MAX) {
              const text = await fs.promises.readFile(file, 'utf8')
              if (!text.includes('\u0000')) embedded = text
            }
          } catch {}
        }
        if (embedded !== null) blocks.push({ type: 'resource', resource: { uri: pathToFileURL(file).href, text: embedded, mimeType: 'text/plain' } })
        else blocks.push({ type: 'resource_link', uri: pathToFileURL(file).href, name })
        break
      }
      default:
        break
    }
  }
  if (leading) {
    const first = blocks.findIndex((block) => block.type === 'text')
    if (first >= 0) blocks[first] = { type: 'text', text: `${leading} ${blocks[first].text}`.trim() }
    else blocks.unshift({ type: 'text', text: leading })
  }
  if (notes.length) blocks.push({ type: 'text', text: notes.join('\n') })
  if (!blocks.length) blocks.push({ type: 'text', text: '' })
  return blocks
}

/** Only the block types an agent accepts (MiniMax takes text and resource_link only). */
export function restrictBlocks(blocks, { image, embeddedContext, resourceLink = true }) {
  return blocks.flatMap((block) => {
    if (block.type === 'image' && !image) return [{ type: 'text', text: '[image omitted: this agent does not accept images]' }]
    if (block.type === 'resource' && !embeddedContext) return resourceLink ? [{ type: 'resource_link', uri: block.resource.uri, name: path.basename(new URL(block.resource.uri).pathname) }] : [{ type: 'text', text: `@${new URL(block.resource.uri).pathname}` }]
    if (block.type === 'resource_link' && !resourceLink) return [{ type: 'text', text: `@${block.uri.startsWith('file:') ? new URL(block.uri).pathname : block.uri}` }]
    return [block]
  })
}

/** The plain text of Codex input (previews, side questions). */
export function inputText(input) {
  return (Array.isArray(input) ? input : []).map((part) => (part?.type === 'text' ? part.text : part?.type === 'mention' ? `@${part.name ?? part.path}` : part?.type === 'skill' ? `/${part.name}` : part?.type === 'localImage' || part?.type === 'image' ? '[image]' : '')).filter(Boolean).join(' ').trim()
}
