import test from "node:test";
import assert from "node:assert/strict";
import {
  IMAGE_MAX_BYTES, IMAGE_TYPE_ERROR, IMAGE_SIZE_ERROR, IMAGE_PROCESS_ERROR, IMAGE_MODEL_ERROR, trimMessage, maxImagesMessage,
  stageFiles, markReady, markFailed, removeAttachment, attachmentInputs, imageMime, modelAcceptsImages, skillChipInput,
} from "../src/composer-attachments-model.mjs";

const makeId = (index) => `id-${index}`;
const png = (name, size = 10, path = `/tmp/${name}`) => ({ name, size, type: "image/png", path });

test("accept rules: PNG/JPEG/GIF/WebP by type or extension; anything else is a file entry", () => {
  assert.equal(imageMime({ name: "a.PNG" }), "image/png");
  assert.equal(imageMime({ name: "a.jpeg", type: "" }), "image/jpeg");
  assert.equal(imageMime({ name: "a.bin", type: "image/webp" }), "image/webp");
  assert.equal(imageMime({ name: "a.bmp", type: "image/bmp" }), "");
  const staged = stageFiles([], [png("a.png"), { name: "notes.md", size: 5, type: "text/markdown", path: "/tmp/notes.md" }], { makeId });
  assert.deepEqual(staged.notices, []);
  assert.deepEqual(staged.entries.map((entry) => [entry.kind, entry.status]), [["image", "loading"], ["file", "ready"]]);
});

test("image lane (paste/drop): a .bmp alone yields the type toast and no entry", () => {
  const staged = stageFiles([], [{ name: "shot.bmp", size: 100, type: "image/bmp" }], { imagesOnly: true, makeId });
  assert.deepEqual(staged.entries, []);
  assert.deepEqual(staged.notices, [IMAGE_TYPE_ERROR]);
});

test("31457281-byte PNG is dropped with the 30 MB toast; 31457280 bytes is accepted", () => {
  const over = stageFiles([], [png("big.png", IMAGE_MAX_BYTES + 1)], { makeId });
  assert.deepEqual(over.entries, []);
  assert.deepEqual(over.notices, [IMAGE_SIZE_ERROR]);
  const edge = stageFiles([], [png("edge.png", IMAGE_MAX_BYTES)], { makeId });
  assert.equal(edge.entries.length, 1);
  assert.deepEqual(edge.notices, []);
});

test("cap of five images: the sixth is dropped with Claude's max-images message", () => {
  const files = Array.from({ length: 6 }, (_, index) => png(`i${index}.png`));
  const staged = stageFiles([], files, { makeId });
  assert.equal(staged.entries.length, 5);
  assert.deepEqual(staged.notices, [maxImagesMessage(5)]);
  assert.equal(maxImagesMessage(5), "Maximum of 5 images allowed.");
  assert.equal(trimMessage(1, 5), "Removed 1 image — this session allows up to 5.");
  assert.equal(trimMessage(2, 5), "Removed 2 images — this session allows up to 5.");
  const more = stageFiles(staged.entries, [png("extra.png")], { makeId });
  assert.equal(more.entries.length, 5);
  assert.deepEqual(more.notices, [maxImagesMessage(5)]);
});

test("dedupe by path, removal, ready/failed transitions", () => {
  let staged = stageFiles([], [png("a.png"), png("a.png")], { makeId });
  assert.equal(staged.entries.length, 1);
  staged = stageFiles(staged.entries, [png("a.png")], { makeId });
  assert.equal(staged.entries.length, 1);
  const ready = markReady(staged.entries, "id-0", { previewUrl: "blob:x" });
  assert.equal(ready[0].status, "ready");
  assert.equal(ready[0].previewUrl, "blob:x");
  // W14-code r4 gen-final-4: attachmentsReady (test-only; the composer computes its own readiness) is deleted.
  assert.equal(ready.every((entry) => entry.status === "ready"), true);
  assert.equal(staged.entries.every((entry) => entry.status === "ready"), false);
  const failed = markFailed(ready, "id-0");
  assert.deepEqual(failed.entries, []);
  assert.equal(failed.notice, IMAGE_PROCESS_ERROR);
  assert.equal(markFailed(ready, "missing").notice, null);
  assert.deepEqual(removeAttachment(ready, "id-0"), []);
});

test("turn input mapping: localImage for images, mention for files, no descriptive text", () => {
  const staged = stageFiles([], [png("a.png"), { name: "notes.md", size: 5, path: "/w/docs/notes.md" }], { makeId });
  const inputs = attachmentInputs(markReady(staged.entries, "id-0"));
  assert.deepEqual(inputs, [
    { type: "localImage", path: "/tmp/a.png" },
    { type: "mention", name: "notes.md", path: "/w/docs/notes.md" },
  ]);
  assert.equal(attachmentInputs(staged.entries).length, 1, "a loading image is not sent");
  assert.ok(!JSON.stringify(inputs).includes("Attached file"));
});

test("a model without image input: images are refused with one notice, other files still stage", () => {
  assert.equal(IMAGE_MODEL_ERROR, "The selected model doesn’t support image input.");
  const refused = stageFiles([], [png("a.png")], { imagesAllowed: false, makeId });
  assert.deepEqual(refused.entries, []);
  assert.deepEqual(refused.added, []);
  assert.deepEqual(refused.notices, [IMAGE_MODEL_ERROR]);
  const mixed = stageFiles([], [png("a.png"), png("b.png", IMAGE_MAX_BYTES + 1), { name: "notes.md", size: 5, path: "/w/notes.md" }], { imagesAllowed: false, makeId });
  assert.deepEqual(mixed.entries.map((entry) => [entry.kind, entry.name]), [["file", "notes.md"]]);
  assert.deepEqual(mixed.notices, [IMAGE_MODEL_ERROR], "no size or cap notice for refused images");
  const pasted = stageFiles([], [png("shot.png")], { imagesOnly: true, imagesAllowed: false, makeId });
  assert.deepEqual([pasted.entries, pasted.notices], [[], [IMAGE_MODEL_ERROR]]);
  assert.deepEqual(stageFiles([], [{ name: "shot.bmp", size: 1, type: "image/bmp" }], { imagesOnly: true, imagesAllowed: false, makeId }).notices, [IMAGE_TYPE_ERROR]);
  // inputModalities decides; an absent list (Codex fixtures) allows images.
  assert.equal(modelAcceptsImages({ inputModalities: ["text"] }), false);
  assert.equal(modelAcceptsImages({ inputModalities: ["text", "image"] }), true);
  assert.equal(modelAcceptsImages({ model: "fixture" }), true);
  assert.equal(modelAcceptsImages(undefined), true);
});

// Fidelity F05: a leading skill chip ('/name' from the slash list or Add › Skills) is the skill input item.
test("a leading skill chip becomes {type:'skill',name,path} and leaves the message text", () => {
  const pdf = { name: "pdf", path: "/s/pdf/SKILL.md" };
  assert.deepEqual(skillChipInput("/pdf summarize this", pdf), { text: "summarize this", item: { type: "skill", name: "pdf", path: "/s/pdf/SKILL.md" } });
  assert.deepEqual(skillChipInput("/pdf ", pdf), { text: "", item: { type: "skill", name: "pdf", path: "/s/pdf/SKILL.md" } });
  assert.deepEqual(skillChipInput("/pdf\nnext line", pdf).text, "\nnext line", "only one separator is consumed");
  assert.equal(skillChipInput("/pdfx", pdf), null);
  assert.equal(skillChipInput("read /pdf", pdf), null, "only a leading chip");
  assert.equal(skillChipInput("/pdf", { name: "pdf" }), null, "a skill needs its path");
});

// R06 c099c328d :3542-3590 (Kl/ql → Gl): what clicking a pill opens.
test("attachmentOpenAction routes image, file and directory pills", async () => {
  const { attachmentOpenAction } = await import("../src/composer-attachments-model.mjs");
  const staged = stageFiles([], [{ name: "shot.png", type: "image/png", path: "/w/shot.png" }, { name: "notes.txt", path: "/w/notes.txt" }], { makeId }).entries;
  assert.equal(attachmentOpenAction(staged[0]), null, "an image is loading until processed");
  assert.equal(attachmentOpenAction(markReady(staged, "id-0", { previewUrl: "blob:preview" })[0]), "view");
  assert.equal(attachmentOpenAction(markReady(staged, "id-0")[0]), null, "no preview, nothing to view");
  assert.equal(attachmentOpenAction(staged[1]), "file");
  assert.equal(attachmentOpenAction({ ...staged[1], isDirectory: true }), "reveal");
  assert.equal(attachmentOpenAction({ ...staged[1], path: "" }), null, "a file without a path has nowhere to open");
  assert.equal(attachmentOpenAction(null), null);
});

// R06 review: the composer's image viewer follows its entry and never outlives it.
test("attachmentViewerState keeps the viewer only while its entry is attached and viewable", async () => {
  const { attachmentViewerState } = await import("../src/composer-attachments-model.mjs");
  const ready = markReady(stageFiles([], [png("shot.png")], { makeId }).entries, "id-0", { previewUrl: "blob:preview" });
  const viewer = { id: "id-0", src: "blob:old", alt: "old", origin: "pill" };
  assert.deepEqual(attachmentViewerState(viewer, ready), { id: "id-0", src: "blob:preview", alt: "shot.png", origin: "pill" });
  assert.equal(attachmentViewerState(viewer, []), null, "the last pill removed or sent closes it");
  const swapped = markReady(stageFiles([], [png("other.png")], { makeId: (index) => `other-${index}` }).entries, "other-0", { previewUrl: "blob:other" });
  assert.equal(attachmentViewerState(viewer, swapped), null, "a draft swap to other attachments closes it");
  assert.equal(attachmentViewerState(viewer, markReady(ready, "id-0", { previewUrl: "" })), null, "no preview left to show");
  assert.equal(attachmentViewerState(null, ready), null);
});

test("a core that reads images for a model without vision (imageFallback) takes them as file mentions, with a note", async () => {
  const { stageFiles: stage, attachmentInputs: inputs, markReady: ready, IMAGE_FALLBACK_NOTE, IMAGE_MODEL_ERROR } = await import("../src/composer-attachments-model.mjs");
  const png = { name: "shot.png", size: 10, type: "image/png" };
  const refused = stage([], [png], { imagesAllowed: false, makeId: () => "a" });
  assert.deepEqual([refused.added.length, refused.notices], [0, [IMAGE_MODEL_ERROR]]);
  const staged = stage([], [png], { imagesAllowed: false, imageFallback: true, makeId: () => "a" });
  assert.deepEqual([staged.added.length, staged.added[0].asFile, staged.notices, staged.infos], [1, true, [], [IMAGE_FALLBACK_NOTE]]);
  const entries = ready(staged.entries, "a", { path: "/tmp/shot.png" });
  assert.deepEqual(inputs(entries), [{ type: "mention", name: "shot.png", path: "/tmp/shot.png" }]);
  const normal = ready(stage([], [png], { makeId: () => "b" }).entries, "b", { path: "/tmp/shot.png" });
  assert.deepEqual(inputs(normal), [{ type: "localImage", path: "/tmp/shot.png" }]);
});
