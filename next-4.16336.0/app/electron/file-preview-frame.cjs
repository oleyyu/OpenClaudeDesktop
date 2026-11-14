// B13: the Files viewer's rendered HTML preview (2.31226.0 cd2efac6e Ql -> Ge.Html, drawn by the cc61d0d63 sandbox
// frame `nn` from the hosted user-content renderer with runsScript and externalLinkBehavior "ask"). Locally the
// frame's document comes from this private scheme instead of a hosted origin: the renderer registers the text it
// shows (file:preview-frame) and gets back an unguessable oc-file-preview://<token>/<path> URL, which the viewer
// loads in an <iframe sandbox="allow-scripts"> (an opaque origin: no app storage, no parent DOM, no popups and no
// top navigation). A srcdoc/blob/data frame would inherit or be refused by the app's own CSP (script-src 'self'),
// so the page's scripts would never run. Relative stylesheets, scripts, images and fonts resolve against the HTML
// file's folder and are read from disk inside the registered workspace only (files.cjs scopedPath); the frame's
// CSP has no connect-src, so its scripts cannot read workspace files back. Links to the web are posted to the
// viewer, which routes them through the app's link chooser (the reference's "ask").
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { scopedPath } = require("./files.cjs");

const SCHEME = "oc-file-preview";
const MAX_FRAMES = 32;
const MAX_TEXT = 4 * 1024 * 1024;
const MAX_RESOURCE = 32 * 1024 * 1024;
const LINK_MESSAGE = "oc-file-preview-link";

const TYPES = {
  html: "text/html; charset=utf-8", htm: "text/html; charset=utf-8", css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8", mjs: "text/javascript; charset=utf-8", cjs: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8", map: "application/json; charset=utf-8", txt: "text/plain; charset=utf-8",
  xml: "application/xml; charset=utf-8", svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
  gif: "image/gif", webp: "image/webp", avif: "image/avif", bmp: "image/bmp", ico: "image/x-icon",
  woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf", otf: "font/otf", wasm: "application/wasm",
  mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg",
  m4a: "audio/mp4", pdf: "application/pdf",
};
const contentType = (file) => TYPES[path.extname(file).slice(1).toLowerCase()] ?? "application/octet-stream";
const isHtml = (file) => /\.html?$/i.test(file);

// The page's own scripts and styles run (inline and from the workspace or https), nothing can be fetched back
// (connect-src 'none'), forms and nested frames are off, and the CSP sandbox repeats the iframe's flags so the
// document stays sandboxed even if it is ever loaded on its own.
const ORIGINS = `${SCHEME}: https:`;
const FRAME_CSP = [
  "default-src 'none'",
  `script-src 'unsafe-inline' 'unsafe-eval' ${ORIGINS}`,
  `style-src 'unsafe-inline' ${ORIGINS}`,
  `img-src ${ORIGINS} data: blob:`,
  `font-src ${ORIGINS} data:`,
  `media-src ${ORIGINS} data: blob:`,
  "connect-src 'none'", "frame-src 'none'", "worker-src blob:", "form-action 'none'",
  "sandbox allow-scripts",
].join("; ");

// Runs first in every served HTML document: a click on a web link (http/https, not the page's own relative pages
// or fragments) is posted to the viewer instead of navigating the frame. Registered in the bubbling phase so a
// page that handles its own clicks (preventDefault) keeps them.
const LINK_SCRIPT = `<script>(()=>{const send=(e)=>{if(e.defaultPrevented||e.button>1)return;const t=e.target;const a=t&&t.closest?t.closest("a[href]"):null;if(!a)return;let u;try{u=new URL(a.getAttribute("href"),document.baseURI)}catch{return}if(u.protocol!=="https:"&&u.protocol!=="http:")return;e.preventDefault();parent.postMessage({type:${JSON.stringify(LINK_MESSAGE)},href:u.href,button:e.button,metaKey:e.metaKey,ctrlKey:e.ctrlKey,shiftKey:e.shiftKey,altKey:e.altKey},"*")};addEventListener("click",send);addEventListener("auxclick",send)})();</script>`;

/** The document with the link script placed after a leading doctype (so the page keeps its rendering mode). */
function withLinkScript(html) {
  const text = String(html);
  const doctype = /^﻿?\s*<!doctype[^>]*>/i.exec(text);
  return doctype ? `${doctype[0]}${LINK_SCRIPT}${text.slice(doctype[0].length)}` : `${LINK_SCRIPT}${text}`;
}

const encodePath = (relative) => relative.split(path.sep).map(encodeURIComponent).join("/");

function createFilePreviewFrames() {
  const frames = new Map();
  /** {root, relative, text} -> {url}: the frame URL of the HTML file at `relative` inside `root`, showing `text`. */
  async function register({ root, relative, text } = {}) {
    if (typeof root !== "string" || !root || typeof relative !== "string" || !relative) throw new Error("Invalid preview request.");
    if (typeof text !== "string" || text.length > MAX_TEXT) throw new Error("This file is too large to preview.");
    if (!isHtml(relative)) throw new Error("Only HTML files have a rendered preview.");
    const realRoot = await fs.realpath(root);
    const resolved = await scopedPath(realRoot, relative);
    const rel = path.relative(realRoot, resolved);
    if (!rel || rel.startsWith("..")) throw new Error("File is outside the selected workspace.");
    const token = crypto.randomBytes(16).toString("hex");
    frames.set(token, { root: realRoot, rel: rel.split(path.sep).join("/"), text });
    while (frames.size > MAX_FRAMES) frames.delete(frames.keys().next().value);
    return { url: `${SCHEME}://${token}/${encodePath(rel)}` };
  }
  function release(url) {
    try { const parsed = new URL(String(url)); if (parsed.protocol === `${SCHEME}:`) frames.delete(parsed.hostname); } catch { /* not a frame URL */ }
    return true;
  }
  const notFound = () => new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  /** The protocol.handle handler: the registered document, or a file of its workspace. GET only. */
  async function handle(request) {
    let url;
    try { url = new URL(request.url); } catch { return notFound(); }
    const frame = url.protocol === `${SCHEME}:` ? frames.get(url.hostname) : undefined;
    if (!frame || (request.method && request.method !== "GET")) return notFound();
    let relative;
    try { relative = url.pathname.split("/").filter(Boolean).map(decodeURIComponent).join("/"); } catch { return notFound(); }
    if (!relative || relative.includes("\0")) return notFound();
    const headers = { "Content-Type": contentType(relative), "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
    if (relative === frame.rel) return new Response(withLinkScript(frame.text), { headers: { ...headers, "Content-Security-Policy": FRAME_CSP } });
    try {
      const target = await scopedPath(frame.root, relative);
      const stat = await fs.stat(target);
      if (!stat.isFile() || stat.size > MAX_RESOURCE) return notFound();
      const bytes = await fs.readFile(target);
      if (isHtml(target)) return new Response(withLinkScript(bytes.toString("utf8")), { headers: { ...headers, "Content-Security-Policy": FRAME_CSP } });
      return new Response(bytes, { headers: { ...headers, ...(/\.svg$/i.test(target) ? { "Content-Security-Policy": FRAME_CSP } : {}) } });
    } catch {
      return notFound();
    }
  }
  return { register, release, handle, size: () => frames.size };
}

module.exports = { SCHEME, LINK_MESSAGE, FRAME_CSP, createFilePreviewFrames, withLinkScript };
