import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { isSparkImage } from "../electron/prefs/persona.mjs";
const require = createRequire(import.meta.url);
const { createPersonaImage, sniffImage, imageDataUrl, MAX_BYTES } = require("../electron/persona-image.cjs");

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]);
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBPVP8 ")]);

test("sniffs magic bytes, not extensions", () => {
  assert.equal(sniffImage(PNG), "image/png");
  assert.equal(sniffImage(JPEG), "image/jpeg");
  assert.equal(sniffImage(WEBP), "image/webp");
  assert.equal(sniffImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')), "image/svg+xml");
  assert.equal(sniffImage(Buffer.from('﻿<?xml version="1.0"?>\n<svg></svg>')), "image/svg+xml");
  assert.equal(sniffImage(Buffer.from('<?xml version="1.0"?><html/>')), null);
  assert.equal(sniffImage(Buffer.from("GIF89a....")), null);
  assert.equal(sniffImage(Buffer.from("hi")), null);
});

test("data URLs fit the persona schema, the largest allowed file included", () => {
  assert.equal(isSparkImage(imageDataUrl(PNG)), true);
  const largest = Buffer.concat([PNG, Buffer.alloc(MAX_BYTES - PNG.length)]);
  assert.equal(isSparkImage(imageDataUrl(largest)), true);
  assert.throws(() => imageDataUrl(Buffer.concat([largest, Buffer.alloc(1)])), /256 KB/);
  assert.throws(() => imageDataUrl(Buffer.from("plain text")), /PNG, JPEG, WebP or SVG/);
});

test("pick-image: canceled → null, picked → dataUrl, oversize and unknown ops rejected", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "persona-image-"));
  try {
    const good = path.join(dir, "a.png"), big = path.join(dir, "b.png");
    fs.writeFileSync(good, PNG); fs.writeFileSync(big, Buffer.concat([PNG, Buffer.alloc(MAX_BYTES)]));
    let answer = { canceled: true, filePaths: [] }, seen = null;
    const dialog = { showOpenDialog: async (win, options) => { seen = { win, options }; return answer; } };
    const persona = createPersonaImage({ dialog, getWindow: () => "WIN" });
    assert.equal(await persona.run({ op: "pick-image" }), null);
    assert.equal(seen.win, "WIN");
    assert.deepEqual(seen.options.filters[0].extensions, ["png", "jpg", "jpeg", "webp", "svg"]);
    answer = { canceled: false, filePaths: [good] };
    assert.deepEqual(await persona.run({ op: "pick-image" }), { dataUrl: `data:image/png;base64,${PNG.toString("base64")}` });
    answer = { canceled: false, filePaths: [big] };
    await assert.rejects(persona.run({ op: "pick-image" }), /256 KB/);
    await assert.rejects(persona.run({ op: "nope" }), /Unknown persona operation/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
