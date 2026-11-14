/**
 * OpenClaude Desktop's instructions (Settings › Instructions: global and project text, sent as Codex
 * `developerInstructions`) on a ZCode install the provider proxy cannot front (no zcode-builtin.json catalog next to
 * the agent, e.g. a bare `zcode` on PATH). ZCode's protocol has no instructions parameter, so the bridge inlines them
 * into the prompt it sends, once per session and again whenever they change or a compaction / rewind may have
 * dropped them. The block is wrapped in a tag so the transcript can hide it again: what the user typed stays what
 * the thread shows.
 */

import { createHash } from 'node:crypto'

const OPEN = '<code-desktop-instructions>'
const CLOSE = '</code-desktop-instructions>'
const BLOCK = new RegExp(`^\\s*${OPEN}[\\s\\S]*?${CLOSE}\\s*`)

/** A stable key for an instructions text (null when there is nothing to send). */
export function instructionsKey(text) {
  const value = typeof text === 'string' ? text.trim() : ''
  return value ? createHash('sha256').update(value).digest('hex').slice(0, 16) : null
}

/** The block to put before a prompt, or '' when the instructions are empty. */
export function instructionsBlock(text) {
  const value = typeof text === 'string' ? text.trim() : ''
  return value ? `${OPEN}\nThe user's standing instructions for this session (from OpenClaude Desktop). Follow them.\n\n${value}\n${CLOSE}\n\n` : ''
}

// Of ZCode's own slash commands (its parseSlashCommand), these hand free text to a model prompt as typed: `/skill
// <name> <task>`, `/init [focus]` and `/workflow <request>`. The rest (/mode, /model, /help, /rewind …) take
// arguments a block would break and start no turn of their own; a /goal objective carries it (goalObjective).
// Custom commands carry none either: their arguments may be positional ($1, $2 …), which a block would shift.
const PROMPT_COMMANDS = new Set(['init', 'workflow'])
const ANYWHERE = new RegExp(`${OPEN}[\\s\\S]*?${CLOSE}\\s*`)

/**
 * The prompt with the instructions block where ZCode still reads the prompt as typed: before a plain prompt; inside
 * the arguments of a command that hands its text to the model (after `/skill <name>`, after `/init`). Null when the
 * prompt is a command that has no such place, so the block waits for the next prompt that has one.
 */
export function placeInstructions(content, block) {
  if (!block) return content
  const command = /^\s*\/(\S+)(?:\s+([\s\S]*))?$/.exec(content)
  if (!command) return `${block}${content}`
  const name = command[1].toLowerCase()
  const args = (command[2] ?? '').trim()
  if (name === 'skill') {
    const skill = /^(\S+)(?:\s+([\s\S]*))?$/.exec(args)
    return skill ? `/${command[1]} ${skill[1]} ${block}${skill[2] ?? ''}` : null
  }
  if (PROMPT_COMMANDS.has(name)) return `/${command[1]} ${block}${args}`
  if (name === 'goal' || name === 'target') {
    // Typed `/goal <objective>` (the slash-menu row goes through session/goal instead): only setting one has text.
    const [first = '', ...rest] = args.split(/\s+/)
    const word = first.toLowerCase()
    if (!args || (['show', 'pause', 'resume', 'clear'].includes(word) && !rest.length)) return null
    if (word === 'replace') return rest.length ? `/${command[1]} ${first} ${goalObjective(rest.join(' '), block)}` : null
    return `/${command[1]} ${goalObjective(args, block)}`
  }
  return null
}

/** A /goal objective carrying the instructions (ZCode repeats the objective in every turn the goal drives). */
export function goalObjective(objective, block) {
  return block && objective ? `${block}${objective}` : objective
}

/** A prompt text (or a ZCode reply quoting one, such as a goal) without the instructions block. */
export function stripInstructions(text) {
  if (typeof text !== 'string') return text
  const leading = text.replace(BLOCK, '')
  if (leading !== text) return leading
  // Placed after a command token (`/skill name <block>task`) or quoted in a reply (`Goal: <block>objective`).
  const stripped = text.replace(ANYWHERE, '')
  return stripped === text ? text : stripped.trimEnd()
}
