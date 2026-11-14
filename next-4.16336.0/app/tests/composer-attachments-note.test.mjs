import test from "node:test";
import assert from "node:assert/strict";
import {
  attachmentInputs, attachmentNote, splitAttachmentNote, userMessageContent, coreTakesFileMentions,
} from "../src/composer-attachments-model.mjs";
import { allCores } from "../electron/core-registry.mjs";

const file = (path, name = path.split("/").pop()) => ({ id: path, kind: "file", status: "ready", name, path });
const image = (path) => ({ id: path, kind: "image", status: "ready", name: path.split("/").pop(), path });

test("file mentions: adapters (builtin, bridge) translate them, a native core and an unknown engine do not", () => {
  for (const core of allCores()) assert.equal(coreTakesFileMentions({ engine: core.engine }), core.kind === "builtin" || core.kind === "bridge", core.id);
  assert.equal(coreTakesFileMentions("codex"), false);
  assert.equal(coreTakesFileMentions(undefined), false, "no engine is Codex (coreForEngine)");
  assert.equal(coreTakesFileMentions({ engine: "someday-agent" }), false);
  assert.equal(coreTakesFileMentions({ engine: "codex", capabilities: { fileMentions: true } }), true, "a reported capability wins");
  assert.equal(coreTakesFileMentions({ engine: "deepseek", capabilities: { fileMentions: false } }), false);
});

test("a core that translates file mentions gets the mention parts only, as before", () => {
  const inputs = attachmentInputs([file("/w/notes.md"), image("/w/a.png")], { fileMentions: true });
  assert.deepEqual(inputs, [
    { type: "mention", name: "notes.md", path: "/w/notes.md" },
    { type: "localImage", path: "/w/a.png" },
  ]);
  assert.deepEqual(attachmentInputs([file("/w/notes.md")]), [{ type: "mention", name: "notes.md", path: "/w/notes.md" }], "default keeps mentions only");
});

test("a core that drops file mentions also gets the paths as an attachment-note text item", () => {
  const inputs = attachmentInputs([file("/w/notes.md"), image("/w/a.png"), file("/elsewhere/spec v2].pdf")], { fileMentions: false });
  assert.deepEqual(inputs, [
    { type: "text", text: "\n\n[Attached file: /w/notes.md]\n[Attached file: /elsewhere/spec v2].pdf]", text_elements: [] },
    { type: "mention", name: "notes.md", path: "/w/notes.md" },
    { type: "localImage", path: "/w/a.png" },
    { type: "mention", name: "spec v2].pdf", path: "/elsewhere/spec v2].pdf" },
  ]);
  assert.deepEqual(attachmentInputs([image("/w/a.png")], { fileMentions: false }), [{ type: "localImage", path: "/w/a.png" }], "images need no note");
  assert.deepEqual(attachmentInputs([{ ...file("/w/x.md"), status: "loading" }], { fileMentions: false }), [], "nothing for an entry not ready");
  assert.equal(attachmentNote(["/w/bad\nname", ""]), "", "a path that cannot sit on one line is left to the mention");
});

test("splitAttachmentNote reads back a trailing note, alone or joined into one history string", () => {
  assert.deepEqual(splitAttachmentNote("summarize\n\n[Attached file: /w/a.md]\n[Attached file: /w/b.md]"), { text: "summarize", paths: ["/w/a.md", "/w/b.md"] });
  assert.deepEqual(splitAttachmentNote("\n\n[Attached file: /w/a.md]"), { text: "", paths: ["/w/a.md"] });
  assert.deepEqual(splitAttachmentNote("[Attached file: /w/a.md]"), { text: "", paths: ["/w/a.md"] });
  assert.deepEqual(splitAttachmentNote("see [Attached file: /w/a.md]"), { text: "see [Attached file: /w/a.md]", paths: [] }, "not a note mid-line");
  assert.deepEqual(splitAttachmentNote("[Attached file: /w/a.md]\nthen more"), { text: "[Attached file: /w/a.md]\nthen more", paths: [] }, "only a trailing block");
  assert.deepEqual(splitAttachmentNote(undefined), { text: "", paths: [] });
  const body = "look at this", note = attachmentNote(["/w/a.md"]);
  assert.deepEqual(splitAttachmentNote(body + note), { text: body, paths: ["/w/a.md"] }, "round trip through a \"\" join");
});

test("userMessageContent shows the note as file cards: live echo, persisted items and joined history", () => {
  const sent = [{ type: "text", text: "summarize", text_elements: [] }, ...attachmentInputs([file("/w/a.md"), image("/w/i.png")], { fileMentions: false })];
  assert.deepEqual(userMessageContent(sent), [
    { type: "text", text: "summarize", text_elements: [] },
    { type: "mention", name: "a.md", path: "/w/a.md" },
    { type: "localImage", path: "/w/i.png" },
  ], "the echo's own mention is kept, never doubled");
  assert.deepEqual(userMessageContent([{ type: "text", text: "summarize\n\n[Attached file: /w/a.md]", text_elements: [] }, { type: "localImage", path: "/w/i.png" }]), [
    { type: "text", text: "summarize", text_elements: [] },
    { type: "localImage", path: "/w/i.png" },
    { type: "mention", name: "a.md", path: "/w/a.md" },
  ], "a history string with the note joined in");
  assert.deepEqual(userMessageContent([{ type: "text", text: "\n\n[Attached file: /w/a.md]" }]), [{ type: "mention", name: "a.md", path: "/w/a.md" }], "attachment-only message");
  const plain = [{ type: "text", text: "hello" }, { type: "mention", name: "x", path: "/x" }];
  assert.deepEqual(userMessageContent(plain), plain, "content without a note is unchanged");
  assert.deepEqual(userMessageContent(undefined), []);
});
