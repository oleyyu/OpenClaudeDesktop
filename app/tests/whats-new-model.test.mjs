import test from "node:test";
import assert from "node:assert/strict";
import { WHATS_NEW_SEEN_KEY, whatsNewVisible, markSeenValue, readSeenVersion, writeSeenVersion } from "../src/whats-new-model.mjs";
import { RELEASE_NOTES, RELEASE_NOTE_KINDS, RELEASE_NOTE_KIND_LABELS, LOCAL_RELEASE_NOTE_VERSIONS, compareVersions, hasReleaseNotes, releaseNoteDate, releaseNoteSegments, releaseNotesFor } from "../src/release-notes.mjs";

// titlebar-release-notes.js:5058-5069 P and :5238-5256 V (`justUpdated || modalOpen`).
test("key is the source code-surface N", () => {
  assert.equal(WHATS_NEW_SEEN_KEY, "ccd-whats-new-seen-version");
});
test("visible on first run for the current version, hidden once seen, back for a new version", () => {
  assert.equal(whatsNewVisible({ version: "0.2.126", hasNotes: true, seen: "", open: false }), true);
  assert.equal(whatsNewVisible({ version: "0.2.126", hasNotes: true, seen: "0.2.126", open: false }), false);
  assert.equal(whatsNewVisible({ version: "0.2.127", hasNotes: true, seen: "0.2.126", open: false }), true);
});
test("hidden without notes for the running version or without a version", () => {
  assert.equal(whatsNewVisible({ version: "0.2.126", hasNotes: false, seen: "", open: false }), false);
  assert.equal(whatsNewVisible({ version: "", hasNotes: true, seen: "x", open: false }), false);
  assert.equal(whatsNewVisible({ version: null, hasNotes: true, seen: "", open: false }), false);
});
test("visible while the modal is open even when already seen", () => {
  assert.equal(whatsNewVisible({ version: "0.2.126", hasNotes: true, seen: "0.2.126", open: true }), true);
  assert.equal(whatsNewVisible({ version: "0.2.126", hasNotes: false, seen: "", open: true }), true);
});
test("markSeen records only a version that has notes (P l: t && n && o(t))", () => {
  assert.equal(markSeenValue({ version: "0.2.126", hasNotes: true }), "0.2.126");
  assert.equal(markSeenValue({ version: "0.2.126", hasNotes: false }), null);
  assert.equal(markSeenValue({ version: "", hasNotes: true }), null);
});
test("storage helpers tolerate missing, throwing and non-string storage", () => {
  const map = new Map(), storage = { getItem: (k) => map.has(k) ? map.get(k) : null, setItem: (k, v) => map.set(k, String(v)) };
  assert.equal(readSeenVersion(storage), "");
  assert.equal(writeSeenVersion(storage, "0.2.126"), true);
  assert.equal(map.get(WHATS_NEW_SEEN_KEY), "0.2.126");
  assert.equal(readSeenVersion(storage), "0.2.126");
  const throwing = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  assert.equal(readSeenVersion(throwing), "");
  assert.equal(writeSeenVersion(throwing, "0.2.126"), false);
  assert.equal(readSeenVersion(null), "");
  assert.equal(readSeenVersion({ getItem: () => 7 }), "");
});
test("LocalReleaseNotes are core-neutral: they announce the agent cores, name DeepSeek only as the built-in DeepSeek Harness, and never mention Codex", async () => {
  const { readFile } = await import("node:fs/promises");
  const notes = JSON.stringify(RELEASE_NOTES);
  assert.match(notes, /frame for agent cores/);
  assert.match(notes, /Settings › Cores/);
  assert.match(notes, /DeepSeek Harness is built in/);
  assert.doesNotMatch(notes, /DeepSeek(?! Harness)/, "no DeepSeek-as-the-assistant (or DeepSeek models/billing) claims");
  assert.doesNotMatch(notes, /now powered by DeepSeek Harness|Sessions run on DeepSeek/);
  assert.doesNotMatch(notes, /Codex/i);
  assert.equal(releaseNoteDate(RELEASE_NOTES.find((entry) => entry.version === "0.2.130").date), "October 1, 2026");
  const source = await readFile(new URL("../src/source-titlebar.jsx", import.meta.url), "utf8");
  const dialog = source.slice(source.indexOf("export function LocalReleaseNotes"));
  assert.doesNotMatch(dialog, /Codex/i);
  // B is the shared Dialog: size md, 'What’s new' in the standard Header (3.6556.2 cb63ed069 B `t(u.Header, { showClose:
  // !0, … })`, no bleed bar); no hand-rolled backdrop, Tab trap or Escape listener.
  assert.match(dialog, /<SourceDialog open=\{open\} onExited=\{onExited\} onClose=\{onClose\} size="md" title=\{t\("What’s new"\)\}/);
  assert.doesNotMatch(source, /modal-backdrop|st-release-backdrop|Close release notes|addEventListener\("keydown"/);
  // B29 (cb63ed069 N/z/B): every shipped version has its entry (scripts/verify-release-notes.mjs fails the build
  // otherwise), so an update re-arms the nudge for users who saw the previous notes.
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(hasReleaseNotes(pkg.version), true, `release-notes.mjs needs an entry for ${pkg.version}`);
  assert.equal(releaseNotesFor(pkg.version)[0].version, pkg.version, "the running version's entry is the newest shown");
  assert.equal(whatsNewVisible({ version: pkg.version, hasNotes: hasReleaseNotes(pkg.version), seen: "0.2.130", open: false }), true);
});

// titlebar-release-notes.js:4184-4200 j, :5059-5069 P (`n`: an entry for the running version) and :5161-5165 B.
test("release notes are versioned: no entry for the running version means no nudge", () => {
  assert.deepEqual([...LOCAL_RELEASE_NOTE_VERSIONS], RELEASE_NOTES.map((entry) => entry.version));
  assert.equal(hasReleaseNotes("0.2.130"), true);
  assert.equal(hasReleaseNotes("0.2.185"), true);
  for (const version of ["0.2.131", "0.3.0", "", null]) {
    assert.equal(hasReleaseNotes(version), false, String(version));
    assert.equal(whatsNewVisible({ version, hasNotes: hasReleaseNotes(version), seen: "", open: false }), false, String(version));
    assert.equal(markSeenValue({ version, hasNotes: hasReleaseNotes(version) }), null);
  }
  for (const entry of RELEASE_NOTES) {
    assert.match(entry.version, /^\d+\.\d+\.\d+$/);
    assert.match(entry.date, /^\d{4}-\d{2}-\d{2}$/);
    for (const item of entry.items) assert.ok(RELEASE_NOTE_KINDS.includes(item.kind), item.kind);
  }
});
test("entries above the running version are hidden; newest first; groups New / Improved / Fixed", () => {
  const notes = [
    { version: "0.2.131", date: "2026-10-05", items: [{ kind: "fix", text: "later" }] },
    { version: "0.2.129", date: "2026-09-20", items: [{ kind: "feat", text: "older" }] },
    { version: "0.2.130", date: "2026-10-01", items: [{ kind: "improvement", text: "current" }] },
  ];
  assert.deepEqual(releaseNotesFor("0.2.130", notes).map((entry) => entry.version), ["0.2.130", "0.2.129"]);
  assert.deepEqual(releaseNotesFor("0.2.10", notes).map((entry) => entry.version), []);
  assert.deepEqual(releaseNotesFor("1.0.0", notes).map((entry) => entry.version), ["0.2.131", "0.2.130", "0.2.129"]);
  assert.deepEqual(releaseNotesFor("dev-build", notes).length, 3, "an unparseable running version shows every entry (B: s && d(s))");
  assert.equal(compareVersions("0.2.10", "0.2.9") > 0, true);
  assert.deepEqual([...RELEASE_NOTE_KINDS], ["feat", "improvement", "fix"]);
  assert.deepEqual({ ...RELEASE_NOTE_KIND_LABELS }, { feat: "New", improvement: "Improved", fix: "Fixed" });
  assert.deepEqual(releaseNotesFor("0.2.130").map((entry) => entry.version), ["0.2.130"]);
  assert.deepEqual(releaseNotesFor("0.2.185").map((entry) => entry.version), ["0.2.185", "0.2.130"]);
});
test("note text: [[keys]] become keycaps and backticks code (I)", () => {
  assert.deepEqual(releaseNoteSegments("Fixed [[cmd+k]] search and `~/.dsh` paths."), [
    { type: "text", value: "Fixed " }, { type: "keys", value: "cmd+k" }, { type: "text", value: " search and " },
    { type: "code", value: "~/.dsh" }, { type: "text", value: " paths." },
  ]);
  assert.deepEqual(releaseNoteSegments("plain"), [{ type: "text", value: "plain" }]);
  assert.deepEqual(releaseNoteSegments("`a`[[b]]"), [{ type: "code", value: "a" }, { type: "keys", value: "b" }]);
});
