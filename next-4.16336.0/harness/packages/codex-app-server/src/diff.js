/**
 * Headerless unified diff (`@@ -a,b +c,d @@` hunks) between two texts, the
 * format Codex puts in FileUpdateChange.diff for an update. Line diff uses
 * Myers' O((N+M)·D) algorithm with a hard edit budget so a pathological
 * rewrite degrades to one replace hunk instead of stalling the bridge.
 */

const CONTEXT = 3
const MAX_EDIT_DISTANCE = 4000

function splitLines(text) {
  if (!text) return []
  const lines = text.split('\n')
  if (lines.at(-1) === '') lines.pop()
  return lines
}

/** Myers shortest edit script → list of ['=', '-', '+'] ops with line text. */
function diffLines(a, b) {
  const n = a.length
  const m = b.length
  let prefix = 0
  while (prefix < n && prefix < m && a[prefix] === b[prefix]) prefix++
  let suffix = 0
  while (suffix < n - prefix && suffix < m - prefix && a[n - 1 - suffix] === b[m - 1 - suffix]) suffix++
  const A = a.slice(prefix, n - suffix)
  const B = b.slice(prefix, m - suffix)
  const middle = myers(A, B) ?? [...A.map((line) => ['-', line]), ...B.map((line) => ['+', line])]
  return [
    ...a.slice(0, prefix).map((line) => ['=', line]),
    ...middle,
    ...a.slice(n - suffix).map((line) => ['=', line]),
  ]
}

function myers(a, b) {
  const n = a.length
  const m = b.length
  if (n === 0) return b.map((line) => ['+', line])
  if (m === 0) return a.map((line) => ['-', line])
  const max = Math.min(n + m, MAX_EDIT_DISTANCE)
  const offset = max + 1
  const v = new Int32Array(2 * max + 3)
  const trace = []
  for (let d = 0; d <= max; d++) {
    trace.push(v.slice())
    for (let k = -d; k <= d; k += 2) {
      let x
      if (k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1])) x = v[offset + k + 1]
      else x = v[offset + k - 1] + 1
      let y = x - k
      while (x < n && y < m && a[x] === b[y]) { x++; y++ }
      v[offset + k] = x
      if (x >= n && y >= m) return backtrack(trace, a, b, offset, d)
    }
  }
  return null
}

function backtrack(trace, a, b, offset, depth) {
  const ops = []
  let x = a.length
  let y = b.length
  for (let d = depth; d > 0; d--) {
    const v = trace[d]
    const k = x - y
    const prevK = k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1]) ? k + 1 : k - 1
    const prevX = v[offset + prevK]
    const prevY = prevX - prevK
    while (x > prevX && y > prevY) { ops.push(['=', a[--x]]); y-- }
    if (x === prevX) ops.push(['+', b[--y]])
    else ops.push(['-', a[--x]])
  }
  while (x > 0 && y > 0) { ops.push(['=', a[--x]]); y-- }
  return ops.reverse()
}

/**
 * @param {string | null} oldText - previous contents (null for a new file).
 * @param {string} newText - new contents.
 * @param {{ oldStart?: number, newStart?: number }} [origin] - 1-based line numbers of the excerpt start.
 * @returns {string} headerless unified diff, or '' when nothing changed.
 */
export function unifiedDiff(oldText, newText, origin = {}) {
  const ops = diffLines(splitLines(oldText ?? ''), splitLines(newText ?? ''))
  const oldBase = (origin.oldStart ?? 1) - 1
  const newBase = (origin.newStart ?? origin.oldStart ?? 1) - 1
  // Annotate with positions, then cut hunks around changes with CONTEXT lines.
  let oldLine = 0
  let newLine = 0
  const rows = ops.map(([op, text]) => {
    const row = { op, text, old: oldLine, new: newLine }
    if (op !== '+') oldLine++
    if (op !== '-') newLine++
    return row
  })
  const changed = rows.map((row, index) => (row.op === '=' ? -1 : index)).filter((index) => index >= 0)
  if (changed.length === 0) return ''
  const hunks = []
  let start = Math.max(0, changed[0] - CONTEXT)
  let end = Math.min(rows.length, changed[0] + CONTEXT + 1)
  for (const index of changed.slice(1)) {
    if (index - CONTEXT <= end) end = Math.min(rows.length, index + CONTEXT + 1)
    else {
      hunks.push([start, end])
      start = Math.max(0, index - CONTEXT)
      end = Math.min(rows.length, index + CONTEXT + 1)
    }
  }
  hunks.push([start, end])
  const out = []
  for (const [from, to] of hunks) {
    const slice = rows.slice(from, to)
    const oldCount = slice.filter((row) => row.op !== '+').length
    const newCount = slice.filter((row) => row.op !== '-').length
    const oldStart = oldBase + slice[0].old + (oldCount ? 1 : 0)
    const newStart = newBase + slice[0].new + (newCount ? 1 : 0)
    out.push(`@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`)
    for (const row of slice) out.push(`${row.op === '=' ? ' ' : row.op}${row.text}`)
  }
  return out.join('\n') + '\n'
}

/** Count added/removed lines of a headerless unified diff. */
export function diffStats(diff) {
  let added = 0
  let removed = 0
  for (const line of diff.split('\n')) {
    if (line.startsWith('+')) added++
    else if (line.startsWith('-')) removed++
  }
  return { added, removed }
}
