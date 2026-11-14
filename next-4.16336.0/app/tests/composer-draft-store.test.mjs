import test from "node:test";
import assert from "node:assert/strict";
import { HOME_DRAFT_KEY, EMPTY_DRAFT, draftKey, saveDraft, takeDraft, clearDraft, isEmptyDraft, mapDraftAttachments,
  DRAFT_STORAGE_PREFIX, PERSISTED_DRAFT_LIMIT, persistDraft, readPersistedDraft, forgetDraft } from "../src/composer-draft-store.mjs";

// code-workspace.js:1888-1915 / cc43287c9-BMbiZYzF.js:28617, :6425-6450: drafts are keyed per session.
const pill = { id: "a1", kind: "image", status: "ready", path: "/tmp/a.png", previewUrl: "blob:a" };

test("draft keys: epitaxy-<sessionId>; the home draft has one constant key", () => {
  assert.equal(draftKey("t1"), "epitaxy-t1");
  assert.equal(draftKey(null), HOME_DRAFT_KEY);
  assert.equal(draftKey(undefined), HOME_DRAFT_KEY);
  assert.equal(draftKey(""), HOME_DRAFT_KEY);
  assert.equal(HOME_DRAFT_KEY, "epitaxy-draft");
});

test("save then take round-trips text, attachments and mentions; take empties the slot", () => {
  const mentions = [{ path: "src/a.ts", name: "a.ts" }];
  let map = saveDraft(new Map(), draftKey("A"), { text: "half-written", attachments: [pill], mentions });
  assert.equal(map.size, 1);
  const taken = takeDraft(map, draftKey("A"));
  assert.deepEqual(taken.draft, { text: "half-written", attachments: [pill], mentions });
  assert.equal(taken.draft.attachments[0], pill, "the same entry (its preview URL is not revoked)");
  assert.equal(taken.map.size, 0);
  assert.equal(map.size, 1, "pure: the input map is untouched");
  map = taken.map;
  assert.equal(takeDraft(map, draftKey("B")).draft, EMPTY_DRAFT, "an unknown key restores an empty composer");
});

test("separate keys stay isolated and an empty composer leaves no entry", () => {
  let map = saveDraft(new Map(), draftKey("A"), { text: "for A" });
  map = saveDraft(map, draftKey("B"), { text: "for B", attachments: [pill] });
  map = saveDraft(map, HOME_DRAFT_KEY, { text: "home idea" });
  assert.equal(takeDraft(map, draftKey("A")).draft.text, "for A");
  assert.equal(takeDraft(map, draftKey("B")).draft.attachments.length, 1);
  assert.equal(takeDraft(map, HOME_DRAFT_KEY).draft.text, "home idea");
  map = saveDraft(map, draftKey("A"), { text: "", attachments: [], mentions: [] });
  assert.equal(map.has(draftKey("A")), false);
  assert.equal(isEmptyDraft({}), true);
  assert.equal(isEmptyDraft({ text: " " }), false, "whitespace is still a draft");
});

test("clear on send: the key goes away (only when the text still matches) and returns the removed entry", () => {
  let map = saveDraft(new Map(), draftKey("A"), { text: "sent text", attachments: [pill] });
  assert.equal(clearDraft(map, draftKey("A"), { text: "other" }).map, map, "a newer draft is kept");
  const cleared = clearDraft(map, draftKey("A"), { text: "sent text" });
  assert.equal(cleared.map.has(draftKey("A")), false);
  assert.deepEqual(cleared.draft.attachments, [pill]);
  assert.deepEqual(clearDraft(cleared.map, draftKey("A")), { map: cleared.map, draft: null });
  map = saveDraft(new Map(), HOME_DRAFT_KEY, { text: "x" });
  assert.equal(clearDraft(map, HOME_DRAFT_KEY).map.size, 0, "without a text filter the key is cleared");
});

test("late staging updates reach stashed attachments only where they change", () => {
  const loading = { ...pill, status: "loading" };
  let map = saveDraft(new Map(), draftKey("A"), { text: "x", attachments: [loading] });
  map = saveDraft(map, draftKey("B"), { text: "y" });
  const ready = mapDraftAttachments(map, (entries) => entries.some((entry) => entry.id === "a1") ? entries.map((entry) => ({ ...entry, status: "ready" })) : entries);
  assert.equal(takeDraft(ready, draftKey("A")).draft.attachments[0].status, "ready");
  assert.equal(ready.get(draftKey("B")), map.get(draftKey("B")));
  assert.equal(mapDraftAttachments(map, (entries) => entries), map, "no change keeps the map");
});

// R05 persisted drafts (shared-7-DsClUbcz.js ox "composer-draft:", cx/px keys, Xx/Qx/Rx with ax = 20).
function memoryStorage() {
  const map = new Map();
  return { map, get length() { return map.size; }, key: (index) => [...map.keys()][index] ?? null,
    getItem: (name) => (map.has(name) ? map.get(name) : null), setItem: (name, value) => { map.set(name, String(value)); }, removeItem: (name) => { map.delete(name); } };
}

test("persist then read round-trips text, mentions and ready attachment refs under 'composer-draft:<key>'", () => {
  const storage = memoryStorage();
  const mentions = [{ path: "src/a.ts", name: "a.ts" }];
  const attachments = [pill, { id: "f1", kind: "file", status: "ready", path: "/tmp/notes.md", name: "notes.md", previewUrl: "" },
    { id: "l1", kind: "image", status: "loading", path: "", name: "pending.png" }];
  assert.equal(persistDraft(storage, draftKey("A"), { text: "keep me @src/a.ts ", mentions, attachments }, { now: 5 }), true);
  assert.equal(DRAFT_STORAGE_PREFIX, "composer-draft:");
  assert.deepEqual([...storage.map.keys()], ["composer-draft:epitaxy-A"]);
  assert.deepEqual(readPersistedDraft(storage, draftKey("A")), { text: "keep me @src/a.ts ", mentions,
    attachments: [{ path: "/tmp/a.png", name: "", kind: "image" }, { path: "/tmp/notes.md", name: "notes.md", kind: "file" }] }, "only ready refs, no ids or preview URLs");
  persistDraft(storage, HOME_DRAFT_KEY, { text: "home draft" });
  assert.equal(readPersistedDraft(storage, HOME_DRAFT_KEY).text, "home draft");
  assert.ok(storage.map.has("composer-draft:epitaxy-draft"));
  assert.equal(readPersistedDraft(storage, draftKey("missing")), null);
});

test("a null or throwing storage is a no-op; a corrupt entry reads as none", () => {
  for (const storage of [null, undefined]) {
    assert.equal(persistDraft(storage, HOME_DRAFT_KEY, { text: "x" }), false);
    assert.equal(readPersistedDraft(storage, HOME_DRAFT_KEY), null);
    assert.equal(forgetDraft(storage, HOME_DRAFT_KEY), false);
  }
  const boom = () => { throw new Error("SecurityError"); };
  const throwing = { get length() { return boom(); }, key: boom, getItem: boom, setItem: boom, removeItem: boom };
  assert.doesNotThrow(() => persistDraft(throwing, HOME_DRAFT_KEY, { text: "x" }));
  assert.equal(persistDraft(throwing, HOME_DRAFT_KEY, { text: "x" }), false);
  assert.equal(readPersistedDraft(throwing, HOME_DRAFT_KEY), null);
  assert.equal(forgetDraft(throwing, HOME_DRAFT_KEY), false);
  const storage = memoryStorage();
  storage.setItem("composer-draft:epitaxy-draft", "{not json");
  assert.equal(readPersistedDraft(storage, HOME_DRAFT_KEY), null);
  storage.setItem("composer-draft:epitaxy-draft", JSON.stringify(["array"]));
  assert.equal(readPersistedDraft(storage, HOME_DRAFT_KEY), null);
  storage.setItem("composer-draft:epitaxy-draft", JSON.stringify({ text: 7, mentions: "x", attachments: [{ path: 3 }] }));
  assert.equal(readPersistedDraft(storage, HOME_DRAFT_KEY), null, "nothing usable survives the shape check");
});

test("an empty draft (no text, no ready attachment) removes the key", () => {
  const storage = memoryStorage();
  persistDraft(storage, draftKey("A"), { text: "x" });
  assert.equal(storage.map.size, 1);
  persistDraft(storage, draftKey("A"), { text: "", mentions: [{ path: "a", name: "a" }], attachments: [{ id: "l", kind: "image", status: "loading", path: "" }] });
  assert.equal(storage.map.size, 0);
  persistDraft(storage, draftKey("B"), { text: "", attachments: [pill] });
  assert.deepEqual(readPersistedDraft(storage, draftKey("B")).attachments, [{ path: "/tmp/a.png", name: "", kind: "image" }], "an attachment alone is a draft");
});

test("LRU cap: past PERSISTED_DRAFT_LIMIT the least recently written key goes; other storage keys are untouched", () => {
  const storage = memoryStorage();
  storage.setItem("code-desktop-tiles", "{}");
  assert.equal(PERSISTED_DRAFT_LIMIT, 20);
  for (let index = 0; index < PERSISTED_DRAFT_LIMIT; index += 1) persistDraft(storage, draftKey(`s${index}`), { text: `t${index}` }, { now: 100 + index });
  persistDraft(storage, draftKey("s0"), { text: "t0 again" }, { now: 500 });
  persistDraft(storage, draftKey("new"), { text: "newest" }, { now: 600 });
  const drafts = [...storage.map.keys()].filter((name) => name.startsWith(DRAFT_STORAGE_PREFIX));
  assert.equal(drafts.length, PERSISTED_DRAFT_LIMIT);
  assert.equal(storage.map.has("composer-draft:epitaxy-s1"), false, "the oldest write is evicted");
  assert.ok(storage.map.has("composer-draft:epitaxy-s0"), "a rewritten key counts as recent");
  assert.ok(storage.map.has("composer-draft:epitaxy-new"));
  assert.ok(storage.map.has("code-desktop-tiles"));
});

test("forget removes the key; with text only while the stored text still matches", () => {
  const storage = memoryStorage();
  persistDraft(storage, draftKey("A"), { text: "sent text" });
  assert.equal(forgetDraft(storage, draftKey("A"), { text: "other" }), false);
  assert.equal(readPersistedDraft(storage, draftKey("A")).text, "sent text", "a newer draft is kept");
  assert.equal(forgetDraft(storage, draftKey("A"), { text: "sent text" }), true);
  assert.equal(readPersistedDraft(storage, draftKey("A")), null);
  persistDraft(storage, HOME_DRAFT_KEY, { text: "x" });
  assert.equal(forgetDraft(storage, HOME_DRAFT_KEY), true);
  assert.equal(storage.map.size, 0);
});


test("snippet-only drafts retain text, label and file/line origin across storage; malformed snippets are dropped", () => {
  const storage = memoryStorage(), key = draftKey("file-context");
  persistDraft(storage, key, { text: "", attachments: [
    { kind: "snippet", status: "ready", text: "alpha\nbeta", label: "notes.txt:L1-L2", sourceFile: "notes.txt:L1-L2", id: "volatile", previewUrl: "blob:volatile" },
    { kind: "snippet", status: "ready", text: 42 }, { kind: "snippet", status: "ready", text: "   " },
  ] });
  assert.deepEqual(readPersistedDraft(storage, key), { text: "", mentions: [], attachments: [
    { kind: "snippet", text: "alpha\nbeta", label: "notes.txt:L1-L2", sourceFile: "notes.txt:L1-L2" },
  ] });
});
