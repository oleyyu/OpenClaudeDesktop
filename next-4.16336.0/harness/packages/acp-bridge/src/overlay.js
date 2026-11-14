/**
 * A per-thread overlay of an agent's home folder. Kimi Code, Gemini CLI and
 * MiniMax Code read their system-prompt and tool settings from files in their
 * home (KIMI_CODE_HOME, GEMINI_CLI_HOME, MINIMAX_DATA_DIR) with no per-session
 * or per-process override, so a thread with its own settings runs on an
 * overlay: every entry of the real home is symlinked (sessions, credentials,
 * plugins, skills — shared and written through), except the files the thread
 * replaces, which are real files in the overlay, and the `keep` entries (the
 * overlay's own, e.g. MiniMax's session database, which it refuses to follow
 * through a link).
 *
 *   createOverlay(realHome, overlayDir, { files: {'SYSTEM.md': text, 'agents/mavis/x.md': text}, ensureDirs, ensureFiles })
 *
 * With `settle`, what the agent writes at the overlay's top level reaches the
 * real home when the thread's process stops (settleOverlay; createOverlay
 * settles a previous overlay itself before rebuilding it, for a process that
 * died): a new entry (a first run's logs/, workspaces.json) moves there, and a
 * file the agent rewrote in place of its link (an atomic write: Kimi's
 * workspaces.json) is merged into (JSON objects) or copied over the real one.
 */

import fs from 'node:fs'
import path from 'node:path'

function linkChildren(realDir, overlayDir, skip) {
  let entries = []
  try { entries = fs.readdirSync(realDir) } catch { return }
  for (const name of entries) {
    if (skip.has(name)) continue
    const target = path.join(overlayDir, name)
    try { fs.lstatSync(target); continue } catch {}
    try { fs.symlinkSync(path.join(realDir, name), target) } catch {}
  }
}

/**
 * @param {string} realHome
 * @param {string} overlayDir
 * @param {{ files?: Record<string, string>, ensureDirs?: string[], ensureFiles?: string[] }} options
 */
export function createOverlay(realHome, overlayDir, { files = {}, ensureDirs = [], ensureFiles = [], keep = [], settle = false } = {}) {
  // The previous overlay's own writes reach the real home before it is rebuilt (its process is gone by now).
  if (settle) settleOverlay(realHome, overlayDir)
  fs.mkdirSync(realHome, { recursive: true })
  for (const dir of ensureDirs) fs.mkdirSync(path.join(realHome, dir), { recursive: true })
  for (const file of ensureFiles) {
    const full = path.join(realHome, file)
    fs.mkdirSync(path.dirname(full), { recursive: true })
    try { fs.closeSync(fs.openSync(full, 'a')) } catch {}
  }
  // `keep`: the overlay's own entries (its session database) survive a rebuild and are never linked.
  const kept = (name) => keep.some((pattern) => (pattern instanceof RegExp ? pattern.test(name) : pattern === name))
  if (keep.length && fs.existsSync(overlayDir)) {
    for (const name of fs.readdirSync(overlayDir)) if (!kept(name)) fs.rmSync(path.join(overlayDir, name), { recursive: true, force: true })
  } else fs.rmSync(overlayDir, { recursive: true, force: true })
  fs.mkdirSync(overlayDir, { recursive: true })
  // Replaced paths: their parent folders become real folders whose other children are linked.
  const replaced = Object.keys(files).map((file) => file.split('/'))
  const build = (realDir, outDir, depth) => {
    const here = replaced.filter((parts) => parts.length > depth)
    const names = new Set(here.map((parts) => parts[depth]))
    if (depth === 0) {
      let entries = []
      try { entries = fs.readdirSync(realDir) } catch {}
      for (const name of entries) if (kept(name)) names.add(name)
    }
    linkChildren(realDir, outDir, names)
    for (const name of names) {
      const deeper = here.filter((parts) => parts[depth] === name)
      if (!deeper.length) continue
      if (deeper.some((parts) => parts.length === depth + 1)) {
        fs.writeFileSync(path.join(outDir, name), files[deeper.find((parts) => parts.length === depth + 1).join('/')])
      } else {
        fs.mkdirSync(path.join(outDir, name), { recursive: true })
        build(path.join(realDir, name), path.join(outDir, name), depth + 1)
      }
    }
  }
  build(realHome, overlayDir, 0)
  // The bridge's own top-level entries (replaced files and their folders, `keep`): never settled into the real home.
  if (settle) {
    const own = [...new Set([...replaced.map((parts) => parts[0]), ...fs.readdirSync(overlayDir).filter(kept)])]
    try { fs.writeFileSync(overlayMarker(overlayDir), JSON.stringify({ realHome, own })) } catch {}
  }
  return overlayDir
}

/** Where an overlay built with `settle` records its own entries (beside it: the agent never sees the file). */
export const overlayMarker = (overlayDir) => `${overlayDir.replace(/[\\/]+$/, '')}.overlay.json`

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

/** `real` with `ours` merged in (objects key by key, anything else: ours). */
function mergeJson(real, ours) {
  if (!isPlainObject(real) || !isPlainObject(ours)) return ours
  const out = { ...real }
  for (const [key, value] of Object.entries(ours)) out[key] = key in real ? mergeJson(real[key], value) : value
  return out
}

/**
 * Brings what the agent wrote at an overlay's top level into the real home (see the header): a new entry moves there
 * (when the real home still has none), a regular file where the overlay had a link (an atomic rewrite) is merged into
 * the real file (JSON objects, so another session's entries stay) or copied over it when newer, and then becomes a
 * link again. Replaced files (`replacedTop`, else the overlay's marker) and links are left alone. Idempotent.
 */
export function settleOverlay(realHome, overlayDir, replacedTop = null) {
  // realHome null: the one the overlay's marker names.
  let own = replacedTop
  if (!Array.isArray(own)) {
    let marker = null
    try { marker = JSON.parse(fs.readFileSync(overlayMarker(overlayDir), 'utf8')) } catch {}
    // An overlay without a marker was not built to settle (or by another home): nothing is moved.
    if (!marker || !Array.isArray(marker.own) || typeof marker.realHome !== 'string' || (realHome && path.resolve(marker.realHome) !== path.resolve(realHome))) return
    own = marker.own
    realHome = marker.realHome
  }
  if (!realHome) return
  let entries = []
  try { entries = fs.readdirSync(overlayDir, { withFileTypes: true }) } catch { return }
  for (const entry of entries) {
    if (own.includes(entry.name) || entry.isSymbolicLink()) continue
    const source = path.join(overlayDir, entry.name)
    const target = path.join(realHome, entry.name)
    let real = null
    try { real = fs.lstatSync(target) } catch {}
    if (!real) {
      try { fs.renameSync(source, target) } catch { continue }
      try { fs.symlinkSync(target, source) } catch {}
      continue
    }
    if (!entry.isFile() || !real.isFile()) continue
    try {
      const ours = fs.readFileSync(source, 'utf8')
      let next = null
      if (/\.json$/i.test(entry.name)) {
        try { next = JSON.stringify(mergeJson(JSON.parse(fs.readFileSync(target, 'utf8')), JSON.parse(ours)), null, 2) } catch {}
      }
      if (next === null && fs.statSync(source).mtimeMs > real.mtimeMs) next = ours
      if (next !== null && next !== fs.readFileSync(target, 'utf8')) {
        const temp = `${target}.code-desktop-${process.pid}.tmp`
        fs.writeFileSync(temp, next, { mode: real.mode & 0o777 })
        fs.renameSync(temp, target)
      }
      fs.rmSync(source, { force: true })
      fs.symlinkSync(target, source)
    } catch {}
  }
}

// ------------------------------------------------------------ TOML: the [tools] lists, edited in place
//
// Kimi Code's config.toml is strict TOML (one bad line and the whole file is ignored, so Kimi falls back to "no
// provider" and asks for a sign-in). The bridge edits only the span of `tools.disabled`, wherever the file puts it:
// a [tools] table key, a top-level dotted `tools.disabled = …`, or a key of an inline `tools = { … }`; the value may
// be a multi-line array with comments and a trailing comma. A file it cannot read for certain is left alone (null).

const isSpace = (ch) => ch === ' ' || ch === '\t'
const TRIPLE_BASIC = '"""'
const TRIPLE_LITERAL = "'''"

/** The index just past a string starting at `i` (basic, literal, or their multi-line forms), or -1 when unterminated. */
function stringEnd(text, i) {
  const quote = text[i]
  const triple = quote === '"' ? TRIPLE_BASIC : TRIPLE_LITERAL
  if (text.startsWith(triple, i)) {
    for (let j = i + 3; j < text.length; j++) {
      if (quote === '"' && text[j] === '\\') { j++; continue }
      if (text.startsWith(triple, j)) {
        // Up to two more quotes may close the string (""""" is a quote, then the delimiter).
        let end = j + 3
        while (text[end] === quote && end - j < 5) end++
        return end
      }
    }
    return -1
  }
  for (let j = i + 1; j < text.length; j++) {
    if (text[j] === '\n') return -1
    if (quote === '"' && text[j] === '\\') { j++; continue }
    if (text[j] === quote) return j + 1
  }
  return -1
}

/** The index just past the value starting at `i` (array, inline table, string or scalar), or -1 when it is malformed. */
function valueEnd(text, i, { inline = false } = {}) {
  const ch = text[i]
  if (ch === '"' || ch === "'") return stringEnd(text, i)
  if (ch === '[' || ch === '{') {
    const stack = [ch]
    let j = i + 1
    while (j < text.length && stack.length) {
      const c = text[j]
      if (c === '"' || c === "'") { const end = stringEnd(text, j); if (end < 0) return -1; j = end; continue }
      if (c === '#') { while (j < text.length && text[j] !== '\n') j++; continue }
      if (c === '[' || c === '{') stack.push(c)
      else if ((c === ']' || c === '}') && stack.pop() !== (c === ']' ? '[' : '{')) return -1
      j++
    }
    return stack.length ? -1 : j
  }
  let j = i
  while (j < text.length && text[j] !== '\n' && text[j] !== '#' && !(inline && (text[j] === ',' || text[j] === '}' || text[j] === ']'))) j++
  while (j > i && (isSpace(text[j - 1]) || text[j - 1] === '\r')) j--
  return j > i ? j : -1
}

/** A TOML basic string's body with its escapes resolved, or null when one is invalid. */
function unescapeBasic(body) {
  let out = ''
  for (let i = 0; i < body.length; i++) {
    if (body[i] !== '\\') { out += body[i]; continue }
    const next = body[++i]
    const simple = { b: '\b', t: '\t', n: '\n', f: '\f', r: '\r', e: '\x1b', '"': '"', '\\': '\\' }[next]
    if (simple !== undefined) { out += simple; continue }
    const width = next === 'u' ? 4 : next === 'U' ? 8 : next === 'x' ? 2 : 0
    if (width && /^[0-9A-Fa-f]+$/.test(body.slice(i + 1, i + 1 + width)) && body.length >= i + 1 + width) {
      try { out += String.fromCodePoint(parseInt(body.slice(i + 1, i + 1 + width), 16)) } catch { return null }
      i += width
      continue
    }
    return null
  }
  return out
}

/** The string value of a whole TOML string token, or null. */
function stringValue(raw) {
  if (raw.startsWith(TRIPLE_BASIC)) return unescapeBasic(raw.slice(3, -3).replace(/^\r?\n/, '').replace(/\\[ \t]*\r?\n\s*/g, ''))
  if (raw.startsWith(TRIPLE_LITERAL)) return raw.slice(3, -3).replace(/^\r?\n/, '')
  if (raw[0] === '"') return unescapeBasic(raw.slice(1, -1))
  return raw.slice(1, -1)
}

/** A dotted key read from `i` up to `stop` ('=' for a pair, ']' for a header): {parts, end} or null. */
function readKey(text, i, stop) {
  const parts = []
  let j = i
  for (;;) {
    while (isSpace(text[j])) j++
    if (text[j] === '"' || text[j] === "'") {
      if (text.startsWith(text[j] === '"' ? TRIPLE_BASIC : TRIPLE_LITERAL, j)) return null
      const end = stringEnd(text, j)
      if (end < 0) return null
      const value = stringValue(text.slice(j, end))
      if (value === null) return null
      parts.push(value)
      j = end
    } else {
      const bare = /^[A-Za-z0-9_-]+/.exec(text.slice(j, j + 256))
      if (!bare) return null
      parts.push(bare[0])
      j += bare[0].length
    }
    while (isSpace(text[j])) j++
    if (text[j] === '.') { j++; continue }
    if (text.startsWith(stop, j)) return { parts, end: j + stop.length }
    return null
  }
}

/**
 * The statements of a TOML text: {kind: 'table' | 'arrayTable', parts, start, end} and {kind: 'pair', table, arrayTable,
 * parts, start, valueStart, valueEnd, end}, with offsets into the text (end: the statement line's newline, after any
 * trailing comment). null when the text is not TOML the bridge can read for certain.
 */
export function scanToml(text) {
  const out = []
  let table = []
  let arrayTable = false
  let i = 0
  // The rest of a statement's line: blanks and a comment only. The index of its newline (or the text's end), or -1.
  const lineEnd = (j) => {
    while (isSpace(text[j])) j++
    if (text[j] === '#') while (j < text.length && text[j] !== '\n') j++
    if (text[j] === '\r' && text[j + 1] === '\n') return j + 1
    return j >= text.length || text[j] === '\n' ? j : -1
  }
  while (i < text.length) {
    const ch = text[i]
    if (isSpace(ch) || ch === '\n' || ch === '\r' || ch === '﻿') { i++; continue }
    if (ch === '#') { while (i < text.length && text[i] !== '\n') i++; continue }
    const start = i
    if (ch === '[') {
      const double = text[i + 1] === '['
      const key = readKey(text, i + (double ? 2 : 1), double ? ']]' : ']')
      if (!key) return null
      const end = lineEnd(key.end)
      if (end < 0) return null
      table = key.parts
      arrayTable = double
      out.push({ kind: double ? 'arrayTable' : 'table', parts: key.parts, start, end })
      i = end
      continue
    }
    const key = readKey(text, i, '=')
    if (!key) return null
    let valueStart = key.end
    while (isSpace(text[valueStart])) valueStart++
    const stop = valueEnd(text, valueStart)
    if (stop < 0) return null
    const end = lineEnd(stop)
    if (end < 0) return null
    out.push({ kind: 'pair', table, arrayTable, parts: key.parts, start, valueStart, valueEnd: stop, end })
    i = end
  }
  return out
}

/** A TOML array of strings (comments, newlines and a trailing comma allowed) as a JS array, or null when it is anything else. */
export function parseTomlStringArray(raw) {
  const text = String(raw ?? '').trim()
  if (!text.startsWith('[') || valueEnd(text, 0) !== text.length) return null
  const out = []
  let i = 1
  let expectValue = true
  for (;;) {
    while (i < text.length && (/\s/.test(text[i]) || text[i] === '#')) {
      if (text[i] === '#') while (i < text.length && text[i] !== '\n') i++
      else i++
    }
    if (text[i] === ']') return i === text.length - 1 ? out : null
    if (text[i] === ',') { if (expectValue) return null; expectValue = true; i++; continue }
    if (!expectValue || (text[i] !== '"' && text[i] !== "'")) return null
    const end = stringEnd(text, i)
    if (end < 0) return null
    const value = stringValue(text.slice(i, end))
    if (value === null) return null
    out.push(value)
    expectValue = false
    i = end
  }
}

const tomlList = (names) => `[${names.map((name) => JSON.stringify(name)).join(', ')}]`

/** The pairs of an inline table `{ … }` between `start` ('{') and `end` (past '}'): {parts, valueStart, valueEnd}[], or null. */
function inlinePairs(text, start, end) {
  const pairs = []
  let i = start + 1
  for (;;) {
    while (i < end && /\s/.test(text[i])) i++
    if (text[i] === '}') return pairs
    const key = readKey(text, i, '=')
    if (!key) return null
    let valueStart = key.end
    while (isSpace(text[valueStart])) valueStart++
    const stop = valueEnd(text, valueStart, { inline: true })
    if (stop < 0) return null
    pairs.push({ parts: key.parts, valueStart, valueEnd: stop })
    i = stop
    while (i < end && /\s/.test(text[i])) i++
    if (text[i] === ',') { i++; continue }
    if (text[i] === '}') return pairs
    return null
  }
}

/** Where a TOML text keeps `tools.enabled` / `tools.disabled` and the [tools] table, or null when it cannot be read. */
function locateToolsLists(text) {
  const statements = scanToml(text)
  if (!statements) return null
  const found = { enabled: null, disabled: null, toolsTable: null, inline: null, dotted: null }
  for (const statement of statements) {
    if (statement.kind === 'table' && statement.parts.length === 1 && statement.parts[0] === 'tools') found.toolsTable = statement
    if (statement.kind !== 'pair' || statement.arrayTable) continue
    const full = [...statement.table, ...statement.parts]
    if (full[0] !== 'tools') continue
    if (full.length === 2 && (full[1] === 'enabled' || full[1] === 'disabled')) found[full[1]] = statement
    else if (full.length === 1) {
      // `tools = { … }`: an inline table (anything else under that name is not a tools table Kimi would read).
      if (text[statement.valueStart] !== '{') return null
      const pairs = inlinePairs(text, statement.valueStart, statement.valueEnd)
      if (!pairs) return null
      found.inline = statement
      for (const pair of pairs) if (pair.parts.length === 1 && (pair.parts[0] === 'enabled' || pair.parts[0] === 'disabled')) found[pair.parts[0]] = pair
    }
    // A top-level dotted `tools.<key> = …`: no [tools] table may be added then (it would define the table twice).
    if (!statement.table.length && statement.parts.length >= 2) found.dotted = statement
  }
  return found
}

/**
 * The [tools] lists of a TOML text: {enabled, disabled} (each an array, or null when absent), or null when the text or
 * one of those values cannot be read for certain. Read under [tools], as top-level dotted keys and in `tools = { … }`.
 */
export function tomlToolsLists(text) {
  const source = String(text ?? '')
  const located = locateToolsLists(source)
  if (!located) return null
  const out = { enabled: null, disabled: null }
  for (const key of ['enabled', 'disabled']) {
    const spot = located[key]
    if (!spot) continue
    const list = parseTomlStringArray(source.slice(spot.valueStart, spot.valueEnd))
    if (!list) return null
    out[key] = list
  }
  return out
}

/**
 * A TOML text whose `tools.disabled` holds the user's own entries plus `disabled`: that value rewritten in place, or the
 * key added where the file keeps its tools settings ([tools], dotted keys, an inline table), else a new [tools] table.
 * null when the text or that value cannot be read for certain: the caller must not write it then (an invalid
 * config.toml makes Kimi ignore the whole file).
 */
/**
 * A TOML text with `tools.<key>` (enabled or disabled) set to `list`, replacing its value, else added where the file
 * keeps its tools settings. null when the text cannot be read for certain (never write it then).
 */
export function tomlWithToolsList(text, key, list) {
  if (key !== 'enabled' && key !== 'disabled') return null
  const source = String(text ?? '')
  const located = locateToolsLists(source)
  if (!located) return null
  const spot = located[key]
  const value = tomlList([...new Set(list)])
  if (spot) return `${source.slice(0, spot.valueStart)}${value}${source.slice(spot.valueEnd)}`
  if (located.inline) {
    const close = located.inline.valueEnd - 1
    let before = close
    while (before > located.inline.valueStart && /\s/.test(source[before - 1])) before--
    const separator = source[before - 1] === '{' ? ' ' : source[before - 1] === ',' ? ' ' : ', '
    return `${source.slice(0, before)}${separator}${key} = ${value} ${source.slice(close)}`
  }
  if (located.toolsTable) return `${source.slice(0, located.toolsTable.end)}\n${key} = ${value}${source.slice(located.toolsTable.end)}`
  if (located.dotted) return `${source.slice(0, located.dotted.end)}\ntools.${key} = ${value}${source.slice(located.dotted.end)}`
  return `${source}${source && !source.endsWith('\n') ? '\n' : ''}\n[tools]\n${key} = ${value}\n`
}

export function tomlWithDisabledTools(text, disabled) {
  const source = String(text ?? '')
  const located = locateToolsLists(source)
  if (!located) return null
  const spot = located.disabled
  if (spot) {
    const own = parseTomlStringArray(source.slice(spot.valueStart, spot.valueEnd))
    if (!own) return null
    return `${source.slice(0, spot.valueStart)}${tomlList([...new Set([...own, ...disabled])])}${source.slice(spot.valueEnd)}`
  }
  const list = tomlList([...new Set(disabled)])
  if (located.inline) {
    // An inline table stays on its line: the key goes in before its closing brace.
    const close = located.inline.valueEnd - 1
    let before = close
    while (before > located.inline.valueStart && /\s/.test(source[before - 1])) before--
    const separator = source[before - 1] === '{' ? ' ' : source[before - 1] === ',' ? ' ' : ', '
    return `${source.slice(0, before)}${separator}disabled = ${list} ${source.slice(close)}`
  }
  if (located.toolsTable) {
    const at = located.toolsTable.end
    return `${source.slice(0, at)}\ndisabled = ${list}${source.slice(at)}`
  }
  if (located.dotted) {
    const at = located.dotted.end
    return `${source.slice(0, at)}\ntools.disabled = ${list}${source.slice(at)}`
  }
  return `${source}${source && !source.endsWith('\n') ? '\n' : ''}\n[tools]\ndisabled = ${list}\n`
}

/** Settles every overlay built with `settle` directly inside `dir` (before the folder is deleted). */
export function settleOverlaysIn(dir) {
  let names = []
  try { names = fs.readdirSync(dir) } catch { return }
  for (const name of names) if (name.endsWith('.overlay.json')) settleOverlay(null, path.join(dir, name.slice(0, -'.overlay.json'.length)))
}
