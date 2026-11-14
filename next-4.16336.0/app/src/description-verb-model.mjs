// Tense for a model-written command description, the Bash row label:
// "List files in current directory" reads "Listing files in current
// directory" while running, "Listed files in current directory" when done and
// "Failed to list files in current directory" on failure. A description that
// does not open with a known verb ("Git status check") has no tenses (null).
//
// Source chain (reference/current-2.2553.1/readable/approval-current.js):
//   Aae/BD          :3551-3552   a vowel; consonant-vowel-consonant ending
//   VD              :3553-3631   irregular past forms
//   HD              :3632-3659   irregular -ing forms
//   UD              :3660-3688   past forms and participles that never open a command
//   WD/GD/KD/qD     :3689-3724   vowel count, -ing, -ed, keep the leading capital
//   JD              :3725-3743   the word is shaped like a bare verb
//   jae/YD          :3744-3749   the known verbs
//   Mae/Nae         :3750-3755   verbs left alone after "and"/"then" (output, read, set …)
//   Pae/Fae/XD      :3756-3764   "… and|then <verb> …" later in the text follows the tense
//   Iae/ZD          :3765-3792   hyphenated prefixes (re-run, un-stage), {running, done, infinitive}
//   caller          :4142-4160   runningLabel/doneLabel = ZD(description) ?? description,
//                                failedLabel = hO :6022 "Failed to {infinitive}"
//
// Written from that reading; no official code is copied. The word tables are
// the contract and are reproduced as data, because a different table would
// conjugate a different description.

const VOWEL = /[aeiou]/i;
// A short word ending consonant-vowel-consonant doubles its last letter (stop -> stopping).
const CVC_END = /[^aeiou][aeiou][bcdfghjklmnpqrstvz]$/i;

// VD: irregular simple past.
const PAST = Object.freeze({
  begin: "began", bind: "bound", bring: "brought", build: "built", buy: "bought",
  catch: "caught", choose: "chose", come: "came", cut: "cut", debug: "debugged",
  dig: "dug", do: "did", draw: "drew", feed: "fed", feel: "felt",
  fight: "fought", find: "found", fly: "flew", forget: "forgot", freeze: "froze",
  get: "got", give: "gave", go: "went", have: "had", hide: "hid",
  hit: "hit", hold: "held", input: "input", keep: "kept", know: "knew",
  lead: "led", leave: "left", let: "let", lose: "lost", make: "made",
  mean: "meant", meet: "met", override: "overrode", overwrite: "overwrote", pay: "paid",
  put: "put", quit: "quit", read: "read", rebuild: "rebuilt", redo: "redid",
  rerun: "reran", reset: "reset", rewrite: "rewrote", run: "ran", see: "saw",
  seek: "sought", send: "sent", set: "set", show: "showed", shut: "shut",
  sit: "sat", sleep: "slept", spend: "spent", spin: "spun", split: "split",
  spread: "spread", stand: "stood", sweep: "swept", sync: "synced", take: "took",
  teach: "taught", tear: "tore", tell: "told", think: "thought", throw: "threw",
  understand: "understood", undo: "undid", unset: "unset", win: "won", unwrap: "unwrapped",
  unzip: "unzipped", write: "wrote",
});

// HD: irregular present participle.
const PARTICIPLE = Object.freeze({
  begin: "beginning", commit: "committing", control: "controlling", debug: "debugging",
  emit: "emitting", equip: "equipping", forget: "forgetting", format: "formatting",
  input: "inputting", occur: "occurring", omit: "omitting", output: "outputting",
  permit: "permitting", prefer: "preferring", quit: "quitting", refer: "referring",
  rerun: "rerunning", reset: "resetting", screenshot: "screenshotting", snapshot: "snapshotting",
  submit: "submitting", sync: "syncing", transfer: "transferring", unset: "unsetting",
  unwrap: "unwrapping", unzip: "unzipping",
});

// UD: already past or a participle, so not a command verb.
const NOT_A_VERB = new Set([
  ...Object.entries(PAST).filter(([verb, past]) => verb !== past).map(([, past]) => past),
  "been", "broken", "chosen", "done", "drawn", "driven", "eaten", "fallen", "forgotten",
  "given", "gone", "grown", "hidden", "known", "ridden", "risen", "seen", "shown",
  "spoken", "taken", "thrown", "torn", "worn", "written",
]);

// jae: regular verbs a description may open with.
const REGULAR_VERBS = [
  "add", "analyze", "append", "apply", "archive", "assert", "attempt", "audit", "autofix", "await",
  "benchmark", "bisect", "call", "capture", "check", "click", "clone", "collect", "compare", "compile",
  "compute", "confirm", "connect", "convert", "copy", "count", "create", "curl", "decode", "delete",
  "deploy", "detect", "disable", "discard", "dismiss", "display", "download", "dump", "edit", "emit",
  "enable", "encode", "ensure", "enumerate", "evaluate", "execute", "expand", "expect", "export", "extract",
  "fetch", "fill", "filter", "fix", "flush", "focus", "follow", "generate", "grep", "identify",
  "ignore", "import", "include", "inject", "insert", "inspect", "install", "invoke", "kill", "launch",
  "lint", "list", "load", "locate", "loop", "measure", "merge", "monitor", "move", "navigate",
  "normalize", "parse", "patch", "pick", "ping", "pipe", "poll", "post", "prepare", "preview",
  "print", "probe", "profile", "prune", "publish", "pull", "push", "queue", "rebase", "recheck",
  "record", "recover", "redirect", "reduce", "refresh", "regenerate", "reinstall", "relaunch", "reload", "remove",
  "rename", "render", "reopen", "repeat", "replay", "reply", "report", "request", "resolve", "restart",
  "restore", "retry", "revert", "save", "scan", "screenshot", "scroll", "search", "select", "serialize",
  "serve", "settle", "skip", "snapshot", "sort", "spawn", "squash", "stage", "start", "stash",
  "stop", "strip", "summarize", "switch", "sync", "tail", "tally", "test", "toggle", "touch",
  "trace", "track", "trigger", "trim", "truncate", "try", "typecheck", "unblock", "uninstall", "unlink",
  "unmount", "unpack", "update", "upgrade", "upload", "validate", "verify", "visit", "wait", "walk",
  "warn", "wipe",
];
// YD: every verb a description may open with.
const VERBS = new Set([...Object.keys(PAST), ...Object.keys(PARTICIPLE), ...REGULAR_VERBS]);
// Mae: also common nouns/adjectives ("and output", "then set"), so never
// conjugated after "and"/"then".
const AMBIGUOUS = new Set([
  "output", "input", "lead", "feed", "spread", "set", "cut", "split", "hit", "let", "put", "quit",
  "shut", "read", "go", "make", "dig", "tear", "win", "fly", "spin", "control", "permit", "have",
  "hold", "keep", "mean", "feel", "do", "see", "know", "think", "understand",
]);
const CHAINED_VERBS = new Set([...VERBS].filter((verb) => !AMBIGUOUS.has(verb)));
// Pae: "and"/"then" (repeatable) before a lowercase verb that ends a clause or word.
const CHAINED = /(?<![\w-])((?:(?:[Aa]nd|[Tt]hen)\s+)+)([a-z]{2,16})(?=$|[\s,;!?]|\.(?:\s|$))/g;
// Fae: the word is a noun after all ("… and test results are …", "then check if …").
const PREDICATE_AHEAD = /^(?:\s+\w+){0,2}\s+(?:is|are|was|were|has|have|do|does|did|will|would|should|can|could|passes|passed|fails|failed|exists|works|worked|succeeds|succeeded|stays|remains|looks|runs|ran|not|if|when|unless|whether)(?:n['’]t)?\b/;
// Iae: a hyphenated prefix whose stem is the verb.
const PREFIXED = /^(re|un|de|pre|co|sub|over|out|mis|auto|post)-(.+)$/i;

const own = (table, key) => Object.prototype.hasOwnProperty.call(table, key);
const vowelCount = (word) => (word.match(/[aeiou]/gi) ?? []).length;

// GD
function participle(word) {
  const lower = word.toLowerCase();
  if (own(PARTICIPLE, lower)) return PARTICIPLE[lower];
  if (/ie$/i.test(word)) return word.slice(0, -2) + "ying";
  if (/[^eoy]e$/i.test(word)) return word.slice(0, -1) + "ing";
  if (CVC_END.test(word) && vowelCount(word) === 1) return word + word.slice(-1) + "ing";
  if (/c$/i.test(word)) return word + "king";
  return word + "ing";
}

// KD
function past(word) {
  const lower = word.toLowerCase();
  if (own(PAST, lower)) return PAST[lower];
  if (/e$/i.test(word)) return word + "d";
  if (/[^aeiou]y$/i.test(word)) return word.slice(0, -1) + "ied";
  if (CVC_END.test(word) && vowelCount(word) === 1) return word + word.slice(-1) + "ed";
  if (/c$/i.test(word)) return word + "ked";
  if (own(PARTICIPLE, lower)) return PARTICIPLE[lower].slice(0, -3) + "ed";
  return word + "ed";
}

// qD: the form keeps the original word's leading capital.
const keepCase = (original, form) => /^[A-Z]/.test(original) ? form.charAt(0).toUpperCase() + form.slice(1) : form;

// JD: a plain word that could be a bare verb (not a past form, -ing, plural or acronym).
function verbShaped(word) {
  if (word.length < 2 || word.length > 16 || !/^[A-Za-z]+$/.test(word) || word === word.toUpperCase()) return false;
  const lower = word.toLowerCase();
  if (NOT_A_VERB.has(lower)) return false;
  if (own(PAST, lower)) return true;
  if ((/ing$/i.test(word) && word.length > 4) || (/ed$/i.test(word) && !/eed$/i.test(word) && word.length > 3)
    || (/s$/i.test(word) && !/(ss|us)$/i.test(word) && word.length > 3)) return false;
  return VOWEL.test(word) || /y/i.test(word);
}

// XD: chained verbs later in the description take the same tense.
function conjugateChained(text, form) {
  return text.replace(CHAINED, (match, lead, verb, offset) =>
    CHAINED_VERBS.has(verb) && !PREDICATE_AHEAD.test(text.slice(offset + match.length)) ? lead + form(verb) : match);
}

/**
 * ZD: the description's running/done/infinitive forms, or null when its
 * first word is not a known verb.
 * @returns {{running: string, done: string, infinitive: string} | null}
 */
export function describeVerb(description) {
  if (typeof description !== "string") return null;
  const trimmed = description.trimStart();
  const indent = description.slice(0, description.length - trimmed.length);
  const parts = /^(\S+)([\s\S]*)$/.exec(trimmed);
  if (!parts) return null;
  const [, first, rest] = parts;
  const prefixed = PREFIXED.exec(first);
  if (prefixed && verbShaped(prefixed[2])) {
    const [, prefix, stem] = prefixed;
    const joined = (prefix + stem).toLowerCase(), stemLower = stem.toLowerCase();
    if (NOT_A_VERB.has(joined) || NOT_A_VERB.has(stemLower) || (!VERBS.has(joined) && !VERBS.has(stemLower))) return null;
    // "re-run" -> "re-running": a joined irregular form ("rerunning") keeps its own spelling.
    const hyphenated = (table, form) => prefix + "-" + keepCase(stem, own(table, joined) ? table[joined].slice(prefix.length) : form(stem));
    return {
      running: indent + hyphenated(PARTICIPLE, participle) + conjugateChained(rest, participle),
      done: indent + hyphenated(PAST, past) + conjugateChained(rest, past),
      infinitive: indent + first.toLowerCase() + rest,
    };
  }
  if (!verbShaped(first) || !VERBS.has(first.toLowerCase())) return null;
  return {
    running: indent + keepCase(first, participle(first)) + conjugateChained(rest, participle),
    done: indent + keepCase(first, past(first)) + conjugateChained(rest, past),
    infinitive: indent + first.charAt(0).toLowerCase() + first.slice(1) + rest,
  };
}
