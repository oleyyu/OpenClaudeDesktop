const MAX_PATCH_CHARS = 4 * 1024 * 1024;
const MAX_PATCH_LINES = 50000;
const NO_NEWLINE = "\\ No newline at end of file";
const utf8 = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

// Git core.quotePath uses C escapes and UTF-8 bytes encoded as octal. Never
// evaluate path strings or use them as filesystem paths from this renderer.
export function decodeGitPath(value) {
  if (!value.startsWith('"')) return value || null;
  if (!value.endsWith('"') || value.length < 2) return null;
  const bytes = [];
  const escapes = { a: 7, b: 8, t: 9, n: 10, v: 11, f: 12, r: 13, '"': 34, "\\": 92 };
  for (let i = 1; i < value.length - 1; i++) {
    const character = value[i];
    if (character === '"') return null;
    if (character !== "\\") {
      const point = value.codePointAt(i);
      bytes.push(...utf8.encode(String.fromCodePoint(point)));
      if (point > 0xffff) i++;
      continue;
    }
    const next = value[++i];
    if (i >= value.length - 1) return null;
    if (/[0-7]/.test(next)) {
      let octal = next;
      while (octal.length < 3 && /[0-7]/.test(value[i + 1] || "x")) octal += value[++i];
      const byte = parseInt(octal, 8);
      if (byte > 255) return null;
      bytes.push(byte);
    } else if (Object.hasOwn(escapes, next)) bytes.push(escapes[next]);
    else return null;
  }
  try { return decoder.decode(new Uint8Array(bytes)); } catch { return null; }
}

function quotedToken(value) {
  if (!value.startsWith('"')) return null;
  for (let i = 1; i < value.length; i++) {
    if (value[i] === "\\") { i++; continue; }
    if (value[i] === '"') return { token: value.slice(0, i + 1), rest: value.slice(i + 1) };
  }
  return null;
}

const stripPrefix = (path) => path === "/dev/null" ? null : path?.replace(/^[ab]\//, "") ?? null;
function headerPath(value) {
  if (value.startsWith('"')) {
    const token = quotedToken(value);
    if (!token || (token.rest && !token.rest.startsWith("\t"))) return { valid: false };
    const path = decodeGitPath(token.token);
    return { valid: path !== null, path: stripPrefix(path) };
  }
  // Standard unified headers separate timestamps with a tab; spaces may be
  // part of an unquoted filename and must not be trimmed or split.
  const path = value.split("\t")[0];
  return { valid: !!path, path: stripPrefix(path) };
}

function gitHeaderPaths(value) {
  if (value.startsWith('"')) {
    const first = quotedToken(value);
    if (!first || !first.rest.startsWith(" ")) return {};
    const second = first.rest.slice(1);
    const oldPath = decodeGitPath(first.token), newPath = decodeGitPath(second);
    return oldPath !== null && newPath !== null ? { oldPath: stripPrefix(oldPath), newPath: stripPrefix(newPath) } : {};
  }
  const candidates = [];
  for (let i = value.indexOf(" b/"); i !== -1; i = value.indexOf(" b/", i + 1)) {
    const oldPath = value.slice(0, i), newPath = value.slice(i + 1);
    if (oldPath.startsWith("a/")) candidates.push({ oldPath: stripPrefix(oldPath), newPath: stripPrefix(newPath) });
  }
  if (candidates.length === 1) return candidates[0];
  const same = candidates.filter((candidate) => candidate.oldPath === candidate.newPath);
  if (same.length === 1) return same[0];
  // A quoted second name can follow an unquoted first name after a rename.
  const split = value.indexOf(' "');
  if (split >= 0) {
    const newPath = decodeGitPath(value.slice(split + 1));
    if (newPath !== null) return { oldPath: stripPrefix(value.slice(0, split)), newPath: stripPrefix(newPath) };
  }
  return {};
}

function readHunk(lines, start) {
  const match = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/.exec(lines[start].text);
  if (!match) return { error: "Unsupported or malformed hunk header", end: start + 1 };
  const [oldStart, oldCount, newStart, newCount] = [Number(match[1]), Number(match[2] ?? 1), Number(match[3]), Number(match[4] ?? 1)];
  if (![oldStart, oldCount, newStart, newCount].every(Number.isSafeInteger)
    || (oldCount > 0 && oldStart === 0) || (newCount > 0 && newStart === 0)
    || !Number.isSafeInteger(oldStart + oldCount) || !Number.isSafeInteger(newStart + newCount))
    return { error: "Invalid hunk line range", end: start + 1 };
  const rows = [];
  let oldUsed = 0, newUsed = 0, at = start + 1;
  while (oldUsed < oldCount || newUsed < newCount) {
    const line = lines[at]?.text;
    if (line === NO_NEWLINE && rows.length && rows.at(-1).type !== "note") {
      rows.push({ type: "note", text: line, raw: line, oldLine: null, newLine: null }); at++; continue;
    }
    const type = line?.[0] === "+" ? "added" : line?.[0] === "-" ? "removed" : line?.[0] === " " ? "context" : null;
    if (!type) return { error: "Incomplete or truncated hunk", end: at };
    const usesOld = type !== "added", usesNew = type !== "removed";
    if ((usesOld && oldUsed >= oldCount) || (usesNew && newUsed >= newCount))
      return { error: "Hunk contents exceed the declared line range", end: at };
    rows.push({ type, text: line.slice(1), raw: line,
      oldLine: usesOld ? oldStart + oldUsed++ : null,
      newLine: usesNew ? newStart + newUsed++ : null });
    at++;
  }
  if (lines[at]?.text === NO_NEWLINE && rows.length && rows.at(-1).type !== "note") {
    rows.push({ type: "note", text: NO_NEWLINE, raw: NO_NEWLINE, oldLine: null, newLine: null }); at++;
  }
  return { end: at, hunk: { header: lines[start].text, oldStart, oldCount, newStart, newCount, context: match[5].trim(), rows } };
}

const startsGit = (line) => line?.startsWith("diff --git ");
const startsPair = (lines, at) => lines[at]?.text.startsWith("--- ") && lines[at + 1]?.text.startsWith("+++ ");
function readFile(lines, start, raw) {
  const first = lines[start].text;
  const file = { type: "file", id: `file-${start}`, oldPath: null, newPath: null, hunks: [], binary: false,
    added: 0, removed: 0, oldMode: null, newMode: null, renamedFrom: null, copiedFrom: null, status: "modified", fallbackReason: null };
  let at = start, pathsRead = false, opaqueBinary = false, renameTo = false, copyTo = false;
  if (startsGit(first)) { Object.assign(file, gitHeaderPaths(first.slice(11))); at++; }
  while (at < lines.length) {
    const line = lines[at].text;
    if (startsGit(line) || (pathsRead && file.hunks.length && startsPair(lines, at))) break;
    if (file.fallbackReason || opaqueBinary) { at++; continue; }
    if (startsPair(lines, at)) {
      const old = headerPath(line.slice(4)), next = headerPath(lines[at + 1].text.slice(4));
      if (!old.valid || !next.valid) file.fallbackReason = "Unrecognized file path quoting";
      else { file.oldPath = old.path; file.newPath = next.path; pathsRead = true; }
      at += 2; continue;
    }
    if (line.startsWith("@@")) {
      const parsed = readHunk(lines, at);
      if (parsed.error) { file.fallbackReason = parsed.error; at = Math.max(at + 1, parsed.end); continue; }
      const last = file.hunks.at(-1);
      if (last && (parsed.hunk.oldStart < last.oldStart + last.oldCount || parsed.hunk.newStart < last.newStart + last.newCount)) {
        file.fallbackReason = "Overlapping or out-of-order hunks"; at = parsed.end; continue;
      }
      file.hunks.push(parsed.hunk); at = parsed.end; continue;
    }
    const mode = /^(old mode|new mode|new file mode|deleted file mode) (\d{6})$/.exec(line);
    if (mode) {
      if (mode[1] === "old mode" || mode[1] === "deleted file mode") file.oldMode = mode[2]; else file.newMode = mode[2];
      if (mode[1] === "new file mode") file.status = "added";
      if (mode[1] === "deleted file mode") file.status = "deleted";
    } else if (line.startsWith("rename from ") || line.startsWith("copy from ")) {
      const copy = line.startsWith("copy "), value = decodeGitPath(line.slice(copy ? 10 : 12));
      if (value === null) file.fallbackReason = "Unrecognized file path quoting";
      else { file[copy ? "copiedFrom" : "renamedFrom"] = value; file.oldPath = value; file.status = copy ? "copied" : "renamed"; }
    } else if (line.startsWith("rename to ") || line.startsWith("copy to ")) {
      const copy = line.startsWith("copy "), value = decodeGitPath(line.slice(copy ? 8 : 10));
      if (value === null) file.fallbackReason = "Unrecognized file path quoting";
      else { file.newPath = value; if (copy) copyTo = true; else renameTo = true; }
    } else if (/^Binary files .+ differ$/.test(line) || line === "GIT binary patch") {
      file.binary = true; opaqueBinary = true;
    } else if (!line || /^index [0-9a-f]+\.\.[0-9a-f]+(?: \d{6})?$/.test(line) || /^(?:dis)?similarity index \d+%$/.test(line)) {
      // Header metadata is preserved in file.raw even when it has no UI field.
    } else file.fallbackReason = "Unsupported patch content";
    at++;
  }
  file.path = file.newPath || file.oldPath;
  if (!file.path) file.fallbackReason ||= "File path is unavailable";
  if (pathsRead && !file.oldPath) file.status = "added";
  if (pathsRead && !file.newPath) file.status = "deleted";
  if ((file.renamedFrom && !renameTo) || (renameTo && !file.renamedFrom)
    || (file.copiedFrom && !copyTo) || (copyTo && !file.copiedFrom))
    file.fallbackReason ||= "Incomplete rename or copy metadata";
  const metadataChange = (file.oldMode && file.newMode && file.oldMode !== file.newMode)
    || (file.status === "added" && file.newMode) || (file.status === "deleted" && file.oldMode)
    || (file.renamedFrom && renameTo) || (file.copiedFrom && copyTo);
  if (!file.hunks.length && !file.binary && !metadataChange)
    file.fallbackReason ||= "No complete text hunks or change metadata";
  if (file.fallbackReason) { file.hunks = []; file.added = null; file.removed = null; }
  else for (const hunk of file.hunks) for (const row of hunk.rows) {
    if (row.type === "added") file.added++;
    if (row.type === "removed") file.removed++;
  }
  file.raw = raw.slice(lines[start].offset, at < lines.length ? lines[at].offset : raw.length);
  return { file, end: at };
}

/** Parse only verified unified hunks. All unsupported/truncated text survives
 * exactly in raw sections, with no inferred counts or line numbers. */
export function parseUnifiedDiff(value = "") {
  const raw = String(value ?? "");
  const result = { raw, files: [], sections: [] };
  const fallback = (reason) => ({ ...result, sections: raw ? [{ type: "raw", id: "raw-0", raw, reason }] : [] });
  if (raw.length > MAX_PATCH_CHARS) return fallback("Large patch");
  const chunks = raw.match(/[^\n]*\n|[^\n]+$/g) || [];
  if (chunks.length > MAX_PATCH_LINES) return fallback("Large patch");
  let offset = 0;
  const lines = chunks.map((chunk) => { const line = { text: chunk.replace(/\n$/, "").replace(/\r$/, ""), offset }; offset += chunk.length; return line; });
  let at = 0;
  while (at < lines.length) {
    if (startsGit(lines[at].text) || startsPair(lines, at)) {
      const parsed = readFile(lines, at, raw);
      result.files.push(parsed.file); result.sections.push(parsed.file); at = parsed.end;
    } else {
      const start = at++;
      while (at < lines.length && !startsGit(lines[at].text) && !startsPair(lines, at)) at++;
      result.sections.push({ type: "raw", id: `raw-${start}`, reason: null,
        raw: raw.slice(lines[start].offset, at < lines.length ? lines[at].offset : raw.length) });
    }
  }
  return result;
}
