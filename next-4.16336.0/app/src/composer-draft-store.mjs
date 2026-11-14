// Per-session composer drafts. The original keys the editor draft by the panel mountKey, which is
// the session id (code-workspace.js:1888-1915 Ul; cc43287c9-BMbiZYzF.js:28617 draftStoreKey), and
// the staged attachments by draftPersistKey = shared-7 cx `epitaxy-${sessionId}` (:6425-6450 RA
// yx(n); code-workspace.js:5046-5048 falls back to one draft key without a session). The keyed entry
// survives a session switch and is cleared only on submit (shared-13 :14825 Gn(draftStoreKey)).
// Pure: every function returns a new Map; the caller keeps it in a ref.
export const HOME_DRAFT_KEY = "epitaxy-draft";
export const EMPTY_DRAFT = Object.freeze({ text: "", attachments: Object.freeze([]), mentions: Object.freeze([]) });

export function draftKey(sessionId) {
  return typeof sessionId === "string" && sessionId ? `epitaxy-${sessionId}` : HOME_DRAFT_KEY;
}

function normalize(draft) {
  return {
    text: typeof draft?.text === "string" ? draft.text : "",
    attachments: Array.isArray(draft?.attachments) ? draft.attachments : [],
    mentions: Array.isArray(draft?.mentions) ? draft.mentions : [],
  };
}

export function isEmptyDraft(draft) {
  const value = normalize(draft);
  return value.text === "" && value.attachments.length === 0 && value.mentions.length === 0;
}

// Stash the composer of `key`. An empty composer leaves no entry behind.
export function saveDraft(map, key, draft) {
  const next = new Map(map);
  const value = normalize(draft);
  if (isEmptyDraft(value)) next.delete(key);
  else next.set(key, value);
  return next;
}

// Restore the composer of `key`: the stashed entry (or an empty one) leaves the map, because the
// live composer now owns it until the next switch stashes it again.
export function takeDraft(map, key) {
  if (!map.has(key)) return { map, draft: EMPTY_DRAFT };
  const next = new Map(map);
  const draft = next.get(key);
  next.delete(key);
  return { map: next, draft };
}

// A successful send or command clears its key. With `text`, only an entry still holding exactly the
// submitted text is dropped (a send that resolved after the user left and came back with a new draft
// keeps that draft). The removed entry is returned so its attachment previews can be released.
export function clearDraft(map, key, { text } = {}) {
  const entry = map.get(key);
  if (!entry || (text !== undefined && entry.text !== text)) return { map, draft: null };
  const next = new Map(map);
  next.delete(key);
  return { map: next, draft: entry };
}

// Late attachment staging (markReady / markFailed after the user switched sessions) also reaches the
// stashed entries, so a restored pill is never stuck loading.
export function mapDraftAttachments(map, update) {
  let next = null;
  for (const [key, entry] of map) {
    const attachments = update(entry.attachments);
    if (attachments === entry.attachments) continue;
    next ??= new Map(map);
    next.set(key, { ...entry, attachments });
  }
  return next ?? map;
}

// Persisted drafts (2.2553.1 ion-dist shared-7-DsClUbcz.js): every draft is mirrored to storage under
// ox "composer-draft:" + its persistKey (cx `epitaxy-${sessionId}`, px "epitaxy-draft"). The writer Xx removes the
// key for an empty draft (no text, files or snippets) and otherwise stores JSON; Qx reads it back through the $x
// shape check and treats a missing or unparsable entry as none; ax = 20 caps the drafts and Rx evicts the oldest
// one together with its stored entry (cc43287c9-BMbiZYzF.js:6428-6457 draftPersistKey, :7300-7330 restored_draft).
// Locally an entry holds the text, the '@' mentions and the ready attachment refs {path, name, kind, isDirectory};
// pasted images already live in userData/attachments, so a path is enough to stage them again.
// Snippets keep their text, label and source range; they do not need filesystem inspection. Storage is
// injected (localStorage in the renderer); every access is guarded, so a null or throwing storage is a no-op.
export const DRAFT_STORAGE_PREFIX = "composer-draft:";
export const PERSISTED_DRAFT_LIMIT = 20;

export function browserStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

function storedMentions(mentions) {
  return (Array.isArray(mentions) ? mentions : [])
    .filter((entry) => typeof entry?.path === "string" && entry.path)
    .map((entry) => ({ path: entry.path, name: typeof entry.name === "string" ? entry.name : entry.path }));
}

function storedAttachments(attachments) {
  return (Array.isArray(attachments) ? attachments : []).flatMap(entry => {
    // The source element-context store is session memory, not a persisted file
    // attachment. Keep it in live/stashed drafts without restoring a bare PNG.
    if (entry?.kind === "elementContext") return [];
    if (entry?.status !== "ready") return [];
    if (entry.kind === "snippet") {
      if (typeof entry.text !== "string" || !entry.text.trim()) return [];
      return [{ kind: "snippet", text: entry.text,
        ...(typeof entry.label === "string" ? { label: entry.label } : {}),
        ...Object.fromEntries(["key", "terminalTabId", "sourceFile"].filter(key => typeof entry[key] === "string" && entry[key]).map(key => [key, entry[key]])) }];
    }
    return typeof entry.path === "string" && entry.path ? [{ path: entry.path, name: typeof entry.name === "string" ? entry.name : "", kind: entry.kind === "image" ? "image" : "file",
      ...(entry.isDirectory === true ? { isDirectory: true } : {}) }] : [];
  });
}

function parseStored(raw) {
  if (typeof raw !== "string" || !raw) return null;
  let value;
  try { value = JSON.parse(raw); } catch { return null; }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return {
    text: typeof value.text === "string" ? value.text : "",
    mentions: storedMentions(value.mentions),
    attachments: storedAttachments((Array.isArray(value.attachments) ? value.attachments : []).map((entry) => ({ ...entry, status: "ready" }))),
    savedAt: Number.isFinite(value.savedAt) ? value.savedAt : 0,
  };
}

// Rx: past the cap the least recently written entries go first; `keep` (the one just written) never does.
function evictPersisted(storage, keep) {
  const entries = [];
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const name = storage.key(index);
      if (typeof name !== "string" || !name.startsWith(DRAFT_STORAGE_PREFIX) || name === keep) continue;
      entries.push({ name, savedAt: parseStored(storage.getItem(name))?.savedAt ?? 0, index });
    }
  } catch { return; }
  const excess = entries.length + 1 - PERSISTED_DRAFT_LIMIT;
  if (excess <= 0) return;
  entries.sort((left, right) => left.savedAt - right.savedAt || left.index - right.index);
  for (const entry of entries.slice(0, excess)) {
    try { storage.removeItem(entry.name); } catch {}
  }
}

/** Xx: write `draft` under `key`; a draft without text or ready attachments removes the key. */
export function persistDraft(storage, key, draft, { now = Date.now() } = {}) {
  if (!storage || typeof key !== "string" || !key) return false;
  const name = DRAFT_STORAGE_PREFIX + key;
  const text = typeof draft?.text === "string" ? draft.text : "";
  const attachments = storedAttachments(draft?.attachments);
  try {
    if (!text && attachments.length === 0) { storage.removeItem(name); return true; }
    storage.setItem(name, JSON.stringify({ text, mentions: storedMentions(draft?.mentions), attachments, savedAt: now }));
  } catch { return false; }
  evictPersisted(storage, name);
  return true;
}

/** Qx: the stored {text, mentions, attachments} of `key`, or null. */
export function readPersistedDraft(storage, key) {
  if (!storage || typeof key !== "string" || !key) return null;
  let raw;
  try { raw = storage.getItem(DRAFT_STORAGE_PREFIX + key); } catch { return null; }
  const value = parseStored(raw);
  if (!value || (!value.text && value.attachments.length === 0)) return null;
  return { text: value.text, mentions: value.mentions, attachments: value.attachments };
}

/** A sent draft clears its stored key; with `text`, only an entry still holding exactly that text (like clearDraft). */
export function forgetDraft(storage, key, { text } = {}) {
  if (!storage || typeof key !== "string" || !key) return false;
  const name = DRAFT_STORAGE_PREFIX + key;
  try {
    if (text !== undefined) {
      const stored = parseStored(storage.getItem(name));
      if (!stored || stored.text !== text) return false;
    }
    storage.removeItem(name);
    return true;
  } catch { return false; }
}
