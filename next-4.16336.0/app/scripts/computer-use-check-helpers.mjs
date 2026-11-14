// Shared by the computer-use live checks (computer-use-m1-check.mjs, computer-use-m2-check.mjs): image facts from
// the JPEGs the native module returns, with no image library (sips decodes to BMP).
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

/** Width and height from a JPEG's SOF marker. */
export function jpegSize(bytes) {
  for (let i = 2; i < bytes.length - 9;) {
    if (bytes[i] !== 0xff) { i += 1; continue; }
    const marker = bytes[i + 1], length = bytes.readUInt16BE(i + 2);
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7)) return { height: bytes.readUInt16BE(i + 5), width: bytes.readUInt16BE(i + 7) };
    i += 2 + length;
  }
  throw new Error('no SOF marker');
}

/** Decoded pixels of a JPEG file: {width, height, at(x, y) → [r, g, b]}. */
export async function decode(jpegFile) {
  const bmpFile = jpegFile.replace(/\.jpe?g$/, '.bmp');
  execFileSync('sips', ['-s', 'format', 'bmp', jpegFile, '--out', bmpFile], { stdio: 'ignore' });
  const b = await fs.readFile(bmpFile);
  const offset = b.readUInt32LE(10), width = b.readInt32LE(18), rawHeight = b.readInt32LE(22), bytes = b.readUInt16LE(28) / 8;
  const height = Math.abs(rawHeight), stride = Math.ceil((width * bytes) / 4) * 4;
  const at = (x, y) => { const p = offset + (rawHeight > 0 ? height - 1 - y : y) * stride + x * bytes; return [b[p + 2], b[p + 1], b[p]]; };
  return { width, height, at };
}

const clip = (image, rect) => ({ x0: Math.max(0, rect.x), y0: Math.max(0, rect.y), x1: Math.min(image.width, rect.x + rect.w), y1: Math.min(image.height, rect.y + rect.h) });

/** Mean RGB of a rectangle (every other pixel). */
export async function meanRGB(jpegFile, rect) {
  const image = await decode(jpegFile), { x0, y0, x1, y1 } = clip(image, rect);
  let r = 0, g = 0, bl = 0, n = 0;
  for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) { const [pr, pg, pb] = image.at(x, y); r += pr; g += pg; bl += pb; n += 1; }
  return n ? [r / n, g / n, bl / n] : null;
}

/** Mean absolute per-channel difference between two same-size JPEGs over a rectangle (0–255). */
export async function meanAbsDiff(fileA, fileB, rect) {
  const [a, b] = [await decode(fileA), await decode(fileB)];
  if (a.width !== b.width || a.height !== b.height) return 255;
  const { x0, y0, x1, y1 } = clip(a, rect ?? { x: 0, y: 0, w: a.width, h: a.height });
  let sum = 0, n = 0;
  for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) {
    const [p, q] = [a.at(x, y), b.at(x, y)];
    sum += Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]); n += 3;
  }
  return n ? sum / n : 0;
}

export const saveDataUrl = async (file, dataUrl) => { await fs.writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64')); return file; };
