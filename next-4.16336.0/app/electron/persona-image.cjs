// C2 persona: pick a custom assistant icon image and return it as a data URL.
// Only node:* requires (packaging drops node_modules).
const fs = require("node:fs");

const MAX_BYTES = 256 * 1024;
const FILTERS = [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "svg"] }];

/** Sniff the image type from its bytes; null when it is not a supported image. */
function sniffImage(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return null;
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  const text = buffer.subarray(0, 1024).toString("utf8").replace(/^﻿/, "").trimStart();
  if (/^<svg[\s>]/i.test(text) || /^<\?xml[\s?]/i.test(text)) {
    if (!/<svg[\s>]/i.test(buffer.toString("utf8"))) return null;
    return "image/svg+xml";
  }
  return null;
}

function imageDataUrl(buffer) {
  if (buffer.length > MAX_BYTES) throw new Error("The image is too large. Choose one under 256 KB.");
  const type = sniffImage(buffer);
  if (!type) throw new Error("Choose a PNG, JPEG, WebP or SVG image.");
  return `data:${type};base64,${buffer.toString("base64")}`;
}

function createPersonaImage({ dialog, getWindow, readFile = (file) => fs.promises.readFile(file), stat = (file) => fs.promises.stat(file) }) {
  async function pickImage() {
    const win = getWindow?.();
    const options = { title: "Choose an assistant icon", properties: ["openFile"], filters: FILTERS };
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
    if (!result || result.canceled || !result.filePaths?.length) return null;
    const file = result.filePaths[0];
    const info = await stat(file);
    if (!info.isFile()) throw new Error("Choose an image file.");
    if (info.size > MAX_BYTES) throw new Error("The image is too large. Choose one under 256 KB.");
    return { dataUrl: imageDataUrl(await readFile(file)) };
  }
  return {
    async run(p = {}) {
      if (p?.op === "pick-image") return pickImage();
      throw new Error("Unknown persona operation.");
    },
  };
}

module.exports = { createPersonaImage, sniffImage, imageDataUrl, MAX_BYTES };
