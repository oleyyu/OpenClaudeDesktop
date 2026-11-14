// Official command summary for the Bash / Run-a-command row meta.
//
// Source chain (reference/current-2.2553.1/readable/approval-current.js):
//   Soe            :6213-6255   the summary itself
//   noe/roe/ioe    :6028-6030   8192 cap, leading `cd ... &&` chain, line continuation
//   ooe/soe/gO     :6032-6034   directory verbs, path length cap, tilde-home shape
//   coe/loe        :6035-6047   allowed command names, timing prefixes
//   uoe/doe        :6049-6050   safe word shape, at most four words
//   _O/foe/poe/moe :6051-6064   host-like word, percent-encoding, credential names
//   goe/_oe/voe    :6082-6098   @-shape, long alphanumeric token, credential file name
//   vO/xoe         :6100-6210   trailing-space trim, shell shape allow-list
//   caller         :4118-4160   meta = description ?? summary ?? "a command",
//                               metaIsCode is true only for the summary
//
// Written from that reading; no official code is copied. The tables (allowed
// command names, character classes) are the contract itself and are reproduced
// as data, because a different table would render a different string.

const MAX_LENGTH = 8192;
const MAX_WORDS = 4;
const MAX_PATH = 512;

// roe :6029 - one or more leading `cd <dir> &&` / `cd <dir>;` hops.
const CD_CHAIN =
  /^(?:cd +(?:'[^']*'|"[^"$`\\]*"|[\w./~:+,%-]+) *(?:&&|;) *)+(?=\S)/;
// ioe :6030 - the line ends with an odd number of backslashes (bash continuation).
const LINE_CONTINUATION = /(?:^|[^\\])(?:\\\\)*\\$/;
// uoe :6049 - a word that may appear in the summary.
const SAFE_WORD = /^(?!-)[A-Za-z0-9._/~:+,@%-]+$/;
// gO :6034 - `name~1.ext/` style short paths, a Windows home-directory shape.
const TILDE_HOME = /[^\s/:~]~\d+(?:\.[^\s/:]*)?\/+[^\s/]/;
// moe :6064 - a bare word that names a credential.
const CREDENTIAL_WORD = /^(?:tokens?|passwords?|passwd|secrets?|apikeys?|credentials?)$/i;
// poe :6063 - percent-encoding.
const PERCENT_ENCODED = /%[0-9A-F]{2}/i;
// _O/foe :6051-6062 - the word looks like a host, an authority or a bare path.
const HOST =
  "(?:[\\w-]+(?:\\.[\\w-]+)*\\.[a-z]{2,}|\\d{1,3}(?:\\.\\d{1,3}){3}|localhost)\\.?";
const HOST_LIKE = new RegExp(
  [
    `^${HOST}(?::[^/]*)?/`,
    `^${HOST}:\\d+$`,
    "^[\\w-]+(?:\\.[\\w-]+)+\\.:",
    "^[\\w-]+(?:\\.[\\w-]+)*\\.?:\\d+\\/",
    "^//",
  ].join("|"),
  "i",
);
// ooe :6032 - verbs that move the working directory.
const DIRECTORY_VERBS = new Set(["cd", "pushd", "sl", "set-location", "push-location"]);
// loe :6048 - prefixes that wrap the real command.
const TIMING_PREFIXES = new Set(["time", "nice"]);
// coe :6035-6047 - the only command names whose line may be summarised.
const ALLOWED_COMMANDS = new Set(
  [
    "bun bunx node npm npx pnpm pnpx yarn deno tsc tsx vitest jest eslint oxlint prettier oxfmt turbo vite next",
    "playwright python python3 pip pip3 uv uvx poetry pytest ruff mypy black go cargo rustc rustup make cmake",
    "bazel gradle mvn swift xcodebuild dotnet git gh docker docker-compose kubectl helm ls cat head tail wc find",
    "fd rg grep sed awk jq tree du stat file diff sort uniq cut tr date sleep which mkdir rm mv cp touch chmod",
    "ln pwd cd get-childitem get-content select-string set-location push-location test-path new-item",
    "remove-item copy-item move-item dir",
  ]
    .join(" ")
    .split(" "),
);

// shared-2-C6aD8DvJ.js gP/xP :13042-13052 - drop lone surrogates, then every
// control, format, separator and invisible code point except ZWJ / ZWNJ.
const INVISIBLE =
  /(?![\u200c\u200d])[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\u2060-\u2069\u115f\u1160\u3164\uffa0\u2800\u{e0000}-\u{e007f}]/gu;
const LONE_SURROGATE = /[\uD800-\uDFFF]/u;
// The bidi control set the official text pipeline removes before display.
const BIDI = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/;

function wellFormed(text) {
  return typeof text.isWellFormed === "function" && !text.isWellFormed()
    ? text.replace(/\p{Cs}/gu, "")
    : text;
}
function stripInvisible(text) {
  return wellFormed(text).replace(INVISIBLE, "");
}
// vO :6100 - trailing spaces and carriage returns only; tabs were already
// folded to spaces by the caller.
function trimTrailing(text) {
  let end = text.length;
  while (end > 0 && (text[end - 1] === " " || text[end - 1] === "\r")) end -= 1;
  return text.slice(0, end);
}
function basename(word) {
  return word.split(/[\\/]/).at(-1) || word;
}

// goe :6082 - an `@` is only acceptable in a scoped package path or a
// user@host shape without a port.
function atShapeIsSafe(word) {
  if (!word.includes("@")) return true;
  if (word.includes(":")) return false;
  const scoped = word.replace(/(?:^|\/)@[\w-]+\//g, "/");
  return !scoped.includes("@") || /^[^@]+@(?:\d[\w.+~-]*|[A-Za-z][\w-]*)$/.test(scoped);
}
// _oe :6088 - a long mixed alphanumeric run reads like a key.
function hasOpaqueToken(word) {
  return (word.match(/[A-Za-z0-9]{20,}/g) ?? []).some(
    (run) => /[A-Za-z]/.test(run) && /\d/.test(run),
  );
}
// voe :6093 - the file name itself names a credential (`api-key`, `token.txt`).
function namesCredential(word) {
  const parts = word.slice(word.lastIndexOf("/") + 1).split(/[-._]/);
  return parts.some(
    (part, index) =>
      CREDENTIAL_WORD.test(part) ||
      (/^api$/i.test(part) && /^keys?$/i.test(parts[index + 1] ?? "")),
  );
}

function wordIsSummarisable(word) {
  return (
    SAFE_WORD.test(word) &&
    !word.includes("://") &&
    !HOST_LIKE.test(word) &&
    !PERCENT_ENCODED.test(word) &&
    atShapeIsSafe(word) &&
    !hasOpaqueToken(word) &&
    !namesCredential(word)
  );
}

// xoe :6165-6210 - the line is split into pipeline segments; every segment's
// head word (after `VAR=value` assignments and `time`/`nice`) must be an
// allowed command name, and no segment may contain a substitution.
export function shellShapeIsSummarisable(line) {
  if (/\$\(|`|[<>]\(/.test(line)) return false;
  const segments = [[]];
  let word = "";
  let quote;
  const flush = () => {
    if (word !== "") {
      segments[segments.length - 1].push(word);
      word = "";
    }
  };
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const next = line[index + 1];
    if (quote !== undefined) {
      word += char;
      if (char === quote) quote = undefined;
      else if (char === "\\" && quote === '"' && next !== undefined) {
        word += next;
        index += 1;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      word += char;
    } else if (char === "\\" && (next === "'" || next === '"')) {
      word += char + next;
      index += 1;
    } else if (char === " ") flush();
    else if (char === "(" && (word === "" || word === "@")) return false;
    else if (
      char === ";" ||
      char === "|" ||
      (char === "&" && line[index - 1] !== ">" && line[index - 1] !== "<" && next !== ">")
    ) {
      flush();
      segments.push([]);
      if ((char === "&" && next === "&") || (char === "|" && (next === "|" || next === "&")))
        index += 1;
    } else word += char;
  }
  flush();
  return segments.every((segment) => {
    const head = segment.find(
      (candidate) =>
        !/^[A-Za-z_]\w*=/.test(candidate) && !TIMING_PREFIXES.has(candidate.toLowerCase()),
    );
    return (
      head === undefined ||
      ALLOWED_COMMANDS.has(basename(head).toLowerCase().replace(/\.exe$/, ""))
    );
  });
}

// boe :6136-6163, reduced. The official predicate resolves every `cd` hop
// against the real home directory and the app's own project store before
// deciding a command reaches sensitive ground. This build has no such
// resolver, so only the two shape rules that need no resolution are applied:
// the `.claude/projects|agent-memory` path and the tilde-home form. Commands
// that reach a sensitive directory by another route therefore still produce a
// summary here where the official row would fall back to "a command"; the
// deliberate gap is recorded in analysis/run-command-ui-20260921.
export function touchesSensitivePath(command) {
  const lower = command.toLowerCase();
  for (const variant of new Set([lower.replace(/\\/g, "/"), lower.replace(/["'`\\]/g, "")])) {
    if (/\.claude[. ]*(?:\/\.?)*\/(?:projects[. ]*\/[^/\s]|agent-memory)/.test(variant)) return true;
    if (TILDE_HOME.test(variant)) return true;
    // soe :6033 - an over-long accumulated `cd` path is refused outright.
    const words = variant.split(/[\s;&|()<>]/).filter(Boolean);
    for (let index = 0; index < words.length; index++) {
      if (!DIRECTORY_VERBS.has(words[index])) continue;
      while (index + 1 < words.length && /^-./.test(words[index + 1])) index += 1;
      const target = words[index + 1];
      if (target === undefined) break;
      index += 1;
      if (target.length > MAX_PATH) return true;
    }
  }
  return false;
}

// yoe :6105-6135 with hoe :6065-6081, reduced. The official predicate also
// re-runs a secret scanner over the de-quoted line (Ree); that scanner is not
// reachable from this chain, so only its regular-expression half is applied.
const CREDENTIAL_ANYWHERE = [
  /:\/\/[^\s/?#@]+@/,
  /(?<![\w-])(?:-[a-z]*u|--(?:proxy-)?user)(?:=| *)["']?(?!\d+:\d+(?:[\s"']|$))(?=[\w.])[^\s"':]{1,256}:(?!\/\/)/i,
  /\b(?:authorization|bearer|sshpass)\b/i,
  /\b(?:mysql|mariadb)\w*\b.{0,512}\s-p\S/,
  /(?<![\w-])(?:npm_[A-Za-z0-9]{36}|hf_[A-Za-z0-9]{30,}|sntry[su]_[A-Za-z0-9+/=]{20}|glpat-[\w-]{20}|pypi-AgE[\w-]{50})/,
  /(?:^|[ :])(?:login|auth)(?=[ :]|$)/im,
  /(?<![\w-])-{1,2}[\w-]{0,64}(?:passw(?:or)?d|token|secret|credential)/i,
  /\bsudo +(?:-[A-Za-z]{1,16} +){0,16}-[A-Za-z]{0,16}S/,
  /(?<![\w-])-pass(?:in|out)(?![\w-])|(?<![\w$-])(?:pass|env):/i,
  /\bConvertTo-SecureString\b|\bidentified +by\b/i,
];
const NAMED_VALUE = /(?<![\w$-])(\$?[\w-]+)(["']? *[:=] *| +)(?=\S)/g;
const CREDENTIAL_NAME =
  /token|secret|passw(?:or)?d|passphrase|pass$|pwd|key|auth(?!ors?(?:\b|_))|credential|cookie|session/i;

export function carriesCredentials(command) {
  const spaced = command.replace(/\t/g, " ");
  const bare = spaced.replace(/["'`\\]/g, "");
  for (const variant of new Set([spaced, bare])) {
    if (CREDENTIAL_ANYWHERE.some((pattern) => pattern.test(variant))) return true;
    for (const [, name, separator] of variant.matchAll(NAMED_VALUE)) {
      const assigned = name.startsWith("$")
        ? separator.includes("=")
        : separator.trim() !== "" ||
          /^-|_|^passw(?:or)?d$/i.test(name) ||
          /[a-z][A-Z]/.test(name);
      if (CREDENTIAL_NAME.test(name) && assigned) return true;
    }
  }
  return false;
}

/**
 * Soe :6213-6255. Returns the code meta for a command, or null when the
 * official row falls back to the plain "a command" meta.
 */
export function summarizeCommand(command) {
  if (typeof command !== "string") return null;
  // A cut that lands inside a surrogate pair moves back one unit.
  const limit = (command.charCodeAt(MAX_LENGTH - 1) & 0xfc00) === 0xd800 ? MAX_LENGTH - 1 : MAX_LENGTH;
  const head = wellFormed(command.slice(0, limit));
  const start = head.search(/[^ \t\r\n]/);
  if (start === -1) return null;
  if (touchesSensitivePath(head) || carriesCredentials(head)) return null;
  const breakAt = head.indexOf("\n", start);
  let line = trimTrailing(
    head.slice(start, breakAt === -1 ? undefined : breakAt).replace(/\t/g, " "),
  );
  const truncated =
    command.length > limit || (breakAt !== -1 && /[^ \t\r\n]/.test(head.slice(breakAt)));
  // A continued line that was cut loses its dangling backslash.
  if (truncated && LINE_CONTINUATION.test(line) && line.at(-2) === " ")
    line = trimTrailing(line.slice(0, -1));
  if (
    line === "" ||
    /[^\S ]/.test(line) ||
    LONE_SURROGATE.test(line) ||
    stripInvisible(line) !== line ||
    BIDI.test(line) ||
    !shellShapeIsSummarisable(line)
  )
    return null;
  const words = line.replace(CD_CHAIN, "").split(/ +/);
  // No newline and a hard cut: the last word is a fragment.
  if (breakAt === -1 && command.length > limit) words.pop();
  const kept = [];
  for (const word of words) {
    if (kept.length === MAX_WORDS || !wordIsSummarisable(word)) break;
    kept.push(word);
  }
  if (kept.length === 0) return null;
  const summary = kept.join(" ");
  return truncated || kept.length < words.length ? `${summary}…` : summary;
}
