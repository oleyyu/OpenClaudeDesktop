// "Hide whitespace changes", ported client-side from 2.2553.1
// readable/panes-diff-view-current.js:216-315 (ln/un, dn/fn trim, pn, mn run reader,
// hn, gn filter) and :377-401 (Tn applies gn per file when hideWhitespace is on).
// Pure: one file's unified patch text in, a filtered patch out.

const MAX_RUN_LINES = 2000; // ln: dels + adds above this are kept as they are
const MAX_EDIT_LENGTH = 400; // un: jsdiff maxEditLength for the line diff of one run
export const NO_NEWLINE_MARKER = "\\ No newline at end of file"; // pn

// dn/fn: only space, tab and CR count as whitespace at the ends of a line.
const blank = (code) => code === 32 || code === 9 || code === 13;
export function trimWhitespace(line) {
  let start = 0, end = line.length;
  while (start < end && blank(line.charCodeAt(start))) start++;
  while (end > start && blank(line.charCodeAt(end - 1))) end--;
  return line.slice(start, end);
}

// mn: one -/+ run from `at`; a "\" note after deletions only marks the old side,
// after any addition the new side.
function readRun(lines, at) {
  const dels = [], adds = [];
  let delNoEol = false, addNoEol = false, end = at;
  for (; end < lines.length; end++) {
    const line = lines[end];
    if (line.startsWith("-")) dels.push(line.slice(1));
    else if (line.startsWith("+")) adds.push(line.slice(1));
    else if (line.startsWith("\\")) { if (adds.length === 0) delNoEol = true; else addNoEol = true; }
    else break;
  }
  return { end, dels, adds, delNoEol, addNoEol };
}

// hn: equal after trimming each line's ends.
const sameIgnoringWhitespace = (left, right) => left.length === right.length && left.every((line, index) => trimWhitespace(line) === trimWhitespace(right[index]));

/** The jsdiff diffArrays contract `it(a, b, {maxEditLength})` gn relies on: an
 * ordered list of {count, added?, removed?} runs (removals before additions in
 * a change), or undefined once the edit distance exceeds maxEditLength. Myers
 * shortest edit script over strict equality. */
export function diffLineArrays(before, after, { maxEditLength = Infinity } = {}) {
  const n = before.length, m = after.length, max = Math.min(n + m, maxEditLength);
  const offset = n + m + 1, frontier = new Array(2 * offset + 1).fill(-1), trace = [];
  frontier[offset + 1] = 0;
  let found = -1;
  for (let d = 0; d <= max && found < 0; d++) {
    trace.push(frontier.slice());
    for (let k = -d; k <= d; k += 2) {
      const down = k === -d || (k !== d && frontier[offset + k - 1] < frontier[offset + k + 1]);
      let x = down ? frontier[offset + k + 1] : frontier[offset + k - 1] + 1, y = x - k;
      while (x < n && y < m && before[x] === after[y]) { x++; y++; }
      frontier[offset + k] = x;
      if (x >= n && y >= m) { found = d; break; }
    }
  }
  if (found < 0) return undefined;
  const steps = [];
  let x = n, y = m;
  for (let d = found; d >= 0; d--) {
    const v = trace[d], k = x - y;
    const down = k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1]);
    const previous = down ? k + 1 : k - 1, px = v[offset + previous], py = px - previous;
    while (x > px && y > py) { steps.push("same"); x--; y--; }
    if (d > 0) { steps.push(down ? "added" : "removed"); if (down) y--; else x--; }
  }
  steps.reverse();
  // Group into runs; inside one change (between two "same" runs) removals come first.
  const runs = [];
  let removed = 0, added = 0;
  const flush = () => {
    if (removed) runs.push({ count: removed, removed: true });
    if (added) runs.push({ count: added, added: true });
    removed = 0; added = 0;
  };
  for (const step of steps) {
    if (step === "removed") removed++;
    else if (step === "added") added++;
    else { flush(); if (runs.at(-1)?.same) runs.at(-1).count++; else runs.push({ count: 1, same: true }); }
  }
  flush();
  return runs;
}

/** gn: whitespace-only -/+ runs become context (the new side's text), a run with
 * real changes keeps them (paired lines that differ only in whitespace become
 * context), hunks left without changes are dropped, header lines before the
 * first @@ are kept, and the no-EOL marker follows its line. whitespaceOnly is
 * true when the patch had changes and every hunk was dropped. */
export function hideWhitespaceChanges(patch) {
  const text = String(patch ?? "");
  const trailingNewline = text.endsWith("\n");
  const lines = (trailingNewline ? text.slice(0, -1) : text).split("\n");
  const out = [];
  let hadChanges = false, keptHunk = false, at = 0;
  while (at < lines.length && !lines[at].startsWith("@@")) out.push(lines[at++]);
  while (at < lines.length) {
    const header = lines[at++];
    const body = [];
    let changed = false;
    while (at < lines.length && !lines[at].startsWith("@@")) {
      const first = lines[at][0];
      if (first !== "-" && first !== "+") { body.push(lines[at++]); continue; }
      hadChanges = true;
      const run = readRun(lines, at);
      if (run.delNoEol === run.addNoEol && sameIgnoringWhitespace(run.dels, run.adds)) {
        for (const line of run.adds) body.push(` ${line}`);
        if (run.addNoEol) body.push(NO_NEWLINE_MARKER);
        at = run.end;
        continue;
      }
      const runs = !run.delNoEol && !run.addNoEol && run.dels.length > 0 && run.adds.length > 0 && run.dels.length + run.adds.length <= MAX_RUN_LINES
        ? diffLineArrays(run.dels.map(trimWhitespace), run.adds.map(trimWhitespace), { maxEditLength: MAX_EDIT_LENGTH })
        : undefined;
      if (runs === undefined) {
        for (let index = at; index < run.end; index++) body.push(lines[index]);
        changed = true;
      } else {
        let del = 0, add = 0;
        for (const part of runs) {
          if (part.removed) {
            changed = true;
            for (let count = 0; count < part.count; count++) body.push(`-${run.dels[del++]}`);
          } else {
            changed ||= !!part.added;
            const marker = part.added ? "+" : " ";
            for (let count = 0; count < part.count; count++) body.push(marker + run.adds[add++]);
            if (!part.added) del += part.count;
          }
        }
      }
      at = run.end;
    }
    if (changed) {
      keptHunk = true;
      out.push(header, ...body);
    }
  }
  return { patch: out.join("\n") + (trailingNewline ? "\n" : ""), whitespaceOnly: hadChanges && !keptHunk };
}
