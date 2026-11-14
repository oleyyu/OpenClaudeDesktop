// Resume agent() calls in one run-wide invocation chain, including calls from
// parallel(), pipeline() and nested workflows (Claude Code 2.1.286 semantics).
// A changed/missing/failed call invalidates the ordered suffix. A prior started
// attempt without any result or failure is respawned without invalidating it.
// Results win over later started/failed records, as in the native journal reader.
// Local v5 keys use Claude's authored-option identity. v4 included host defaults
// and v3 used branch scopes; neither can establish the same identity. Their
// history stays on disk, but is not reused. human/session keep their keyspace.

import { readFile, appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { createHash } from "node:crypto";

// Deterministic stringify (sorted keys) so hashing is stable across runs.
function stableStringify(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "null";
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  const keys = Object.keys(v).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(v[k])).join(",") + "}";
}

// Only the inputs that determine the model's output participate in identity.
// Display labels and callbacks do not participate in the result identity.
const IDENTITY_KEYS = ["model", "effort", "sandbox", "systemPrompt", "personality", "schema", "agentType", "isolation", "cwd", "disallowedTools", "bashCommandClamp"];

function identityValue(prompt, opts = {}) {
  const identity = { prompt: String(prompt) };
  for (const k of IDENTITY_KEYS) if (opts[k] !== undefined) identity[k] = opts[k];
  return stableStringify(identity);
}

// Claude Code 2.1.280 lo/pr: hash only authored, normalized agent options, not
// the host's cwd/sandbox/system prompt or its resolved model/effort defaults.
export function canonicalAgentOptions(opts = {}) {
  const selected = {};
  for (const key of ['schema', 'model', 'effort', 'isolation', 'agentType', 'disallowedTools', 'bashCommandClamp']) {
    if (opts[key] !== undefined && typeof opts[key] !== 'function') selected[key] = opts[key];
  }
  function canonical(value) {
    if (typeof value === 'function') return undefined;
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') {
      const result = {};
      for (const key of Object.keys(value).sort()) if (key !== '__proto__') result[key] = canonical(value[key]);
      return result;
    }
    return value;
  }
  return JSON.stringify(canonical(selected));
}

export function identityHash(prompt, opts = {}) {
  return createHash("sha256").update(identityValue(prompt, opts)).digest("hex").slice(0, 16);
}

export function rootScope(path = "") {
  return { path, seq: 0 };
}

// The next position in `parent` for a combinator/child workflow; returns its tag.
export function scopeTag(parent, kind) {
  return `${kind}${parent.seq++}`;
}

export function childScope(parent, tag) {
  return { path: `${parent.path}/${tag}`, seq: 0 };
}

// Scopes namespace only local human()/session extensions, never agent caches.
const succeeded = entry => entry && entry.outcome !== 'failed' && entry.outcome !== 'started'
  && Object.hasOwn(entry, 'result') && entry.result !== null;

export class Journal {
  #path;
  #reuse;
  #cache = new Map(); // key -> { key, label, result }
  #previousKey = "";
  #invalidated = false;
  #eligible = new Set();
  // These are immutable resume inputs. Writes in this run must not rewrite its
  // starting evidence, nor may a later started record erase a previous failure.
  #results = new Map();
  #started = new Set();
  #failed = new Set();

  constructor(path, { reuse = false } = {}) {
    this.#path = path;
    this.#reuse = reuse;
  }

  async load() {
    if (!this.#path) return;
    try {
      const text = await readFile(this.#path, "utf8");
      for (const line of text.split("\n")) {
        if (!line.trim()) continue;
        try {
          const e = JSON.parse(line);
          if (typeof e?.key === 'string') {
            this.#cache.set(e.key, e);
            if (e.key.startsWith('v5:')) {
              if (succeeded(e)) this.#results.set(e.key, e);
              else if (e.outcome === 'started') this.#started.add(e.key);
              else this.#failed.add(e.key);
            }
          }
        } catch {}
      }
    } catch {
      // No journal yet — first run.
    }
  }

  // Allocate before awaiting provider or disk work, once for every agent call.
  // Empty combinators and changes to source structure do not advance this chain.
  nextKey(prompt, opts) {
    const key = `v5:${createHash("sha256").update(this.#previousKey).update("\0").update(String(prompt)).update("\0").update(canonicalAgentOptions(opts)).digest("hex")}`;
    this.#previousKey = key;
    if (this.#reuse && !this.#invalidated && this.#results.has(key)) this.#eligible.add(key);
    else if (!this.#reuse || this.#invalidated || !this.#started.has(key) || this.#failed.has(key)) this.#invalidated = true;
    return key;
  }

  hit(key) {
    if (!this.#reuse || !this.#cache.has(key)) return false;
    if (key.startsWith('v5:')) return this.#eligible.has(key);
    if (/^v\d+:/.test(key)) return false;
    return this.#cache.get(key)?.outcome !== 'started' && this.#cache.get(key)?.outcome !== 'failed';
  }

  get(key) {
    return this.entry(key)?.result;
  }

  // Full journal entry (result + meta) for a key — session resume reads the
  // turn's status/threadId/metrics, not just the result.
  entry(key) {
    return this.#eligible.has(key) ? this.#results.get(key) : this.#cache.get(key);
  }

  get reuse() {
    return this.#reuse;
  }

  // `meta` carries non-identity per-agent attribution (phase, effort, model,
  // tokens, ms) for the viewer. Only defined values are persisted, so old
  // journals and metric-less runs stay valid.
  async started(key, label) { await this.record(key, label, null, {outcome:'started'}); }

  async record(key, label, result, meta = {}) {
    let entry = { key, label, result, outcome: result === null ? 'failed' : 'completed' };
    for (const [k, v] of Object.entries(meta)) {
      if (v !== undefined && v !== null) entry[k] = v;
    }
    // Local: Claude Code's journal line kind (type 'started' | 'result' | 'failed') beside outcome, so a model told to
    // read the {"type":"result",...} lines finds them; loading still reads outcome, so older journals stay valid.
    entry = { type: entry.outcome === 'started' ? 'started' : entry.outcome === 'failed' ? 'failed' : 'result', ...entry };
    this.#cache.set(key, entry);
    if (!this.#path) return;
    await mkdir(dirname(this.#path), { recursive: true });
    await appendFile(this.#path, JSON.stringify(entry) + "\n");
  }
}
