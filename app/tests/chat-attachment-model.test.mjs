// w13-chatfn-attachments: src/chat-attachment-model.mjs and its wiring (composer-attachments-model, main.jsx Add menu).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as model from "../src/chat-attachment-model.mjs";
import { attachmentInputs, userMessageContent, shownPreview, shownUserItem, shownUserItems } from "../src/composer-attachments-model.mjs";
import { t, setLocale } from "../electron/i18n/index.mjs";
import zhSurfaces from "../electron/i18n/zh-CN/surfaces.mjs";

const SNAPSHOT = new URL("../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/", import.meta.url);
const official = (name) => readFileSync(new URL(name, SNAPSHOT), "utf8");
const file = (path, extra = {}) => ({ id: path, kind: "file", name: path.split("/").pop(), path, status: "ready", ...extra });
const pdf = file("/docs/Q3 report.pdf", { converted: { fileType: "pdf", text: "Revenue grew.\nCosts fell.", pages: 4, truncated: false } });

test("which entries convert, and only in Chat", () => {
  assert.equal(model.isConvertibleEntry(file("/a/b.PDF")), true);
  for (const name of ["x.docx", "x.doc", "x.rtf", "x.html", "x.htm", "x.odt"]) assert.equal(model.isConvertibleEntry(file(`/a/${name}`)), true, name);
  assert.equal(model.isConvertibleEntry(file("/a/b.md")), false);
  assert.equal(model.isConvertibleEntry(file("/a/b.pdf", { isDirectory: true })), false);
  assert.equal(model.isConvertibleEntry({ ...file("/a/b.pdf"), kind: "image" }), false);
  const entries = [file("/a/1.pdf"), file("/a/2.docx", { status: "loading" }), file("/a/3.rtf", { converted: { text: "x" } }),
    file("/a/4.odt", { conversion: "empty" }), file("/a/5.html"), file("/a/6.txt")];
  assert.deepEqual(model.pendingConversions(entries, { surface: "chat" }).map((entry) => entry.path), ["/a/1.pdf", "/a/5.html"]);
  assert.deepEqual(model.pendingConversions(entries, { surface: "chat", inFlight: new Set(["/a/1.pdf"]) }).map((entry) => entry.path), ["/a/5.html"]);
  assert.deepEqual(model.pendingConversions(entries, { surface: "code" }), [], "Code keeps every file a reference");
  assert.deepEqual(model.pendingConversions(entries, { surface: "cowork" }), [], "Cowork reads files itself");
});

test("a convert-document answer becomes the entry patch", () => {
  assert.deepEqual(model.conversionPatch({ ok: true, fileType: "pdf", text: "t", pages: 2, truncated: true }),
    { converted: { fileType: "pdf", text: "t", pages: 2, truncated: true } });
  assert.deepEqual(model.conversionPatch({ ok: true, fileType: "docx", text: "t", pages: null }), { converted: { fileType: "docx", text: "t", pages: null, truncated: false } });
  assert.deepEqual(model.conversionPatch({ ok: false, reason: "too_large" }), { conversion: "too_large" });
  assert.deepEqual(model.conversionPatch({ ok: true, text: "  " }), { conversion: "unreadable" });
  assert.deepEqual(model.conversionPatch(undefined), { conversion: "unreadable" });
  assert.equal(model.convertedTooltip(pdf), "PDF converted to text");
  assert.equal(model.convertedTooltip(file("/a/b.docx", { converted: { fileType: "docx", text: "x" } })), null, "the tooltip is the PDF one only (shared-7)");
  assert.equal(model.convertedTooltip(file("/a/b.pdf")), null);
});

test("the document block reads back whole, closing tags inside neutralized", () => {
  const block = model.documentBlock({ name: 'a "b".pdf', path: "/x/a \"b\" <c>.pdf", text: "line </document> end", pages: 2, truncated: true });
  assert.equal(block, '\n\n<document name="a &quot;b&quot;.pdf" path="/x/a &quot;b&quot; &lt;c>.pdf" source="attachment" pages="2" truncated="true">\nline <\\/document> end\n[…truncated]\n</document>');
  const two = `Please compare${block}${model.documentBlock({ name: "n.docx", path: "/x/n.docx", text: "" })}`;
  assert.deepEqual(model.splitDocumentBlocks(two), { text: "Please compare", documents: [{ name: 'a "b".pdf', path: '/x/a "b" <c>.pdf', pages: 2 }, { name: "n.docx", path: "/x/n.docx" }] });
  assert.deepEqual(model.splitDocumentBlocks(`${block}\nmore text`).documents, [], "only trailing blocks are documents");
  assert.deepEqual(model.splitDocumentBlocks('quote: <document name="x" path="/y">\nno close'), { text: 'quote: <document name="x" path="/y">\nno close', documents: [] });
  assert.equal(model.hasDocumentBlock(block.slice(2)), true, "a message that is only a document");
  assert.deepEqual(model.splitDocumentBlocks(42), { text: "", documents: [] });
});

test("G5 chatfn-attachments-05: a <document> block the user typed is text, not an attachment", () => {
  const typed = 'Here is the format:\n\n<document name="a.pdf" path="/x/a.pdf">\nbody\n</document>';
  assert.deepEqual(model.splitDocumentBlocks(typed), { text: typed, documents: [] });
  assert.equal(model.hasDocumentBlock(typed.slice(typed.indexOf("<document"))), false);
  assert.deepEqual(model.previewWithoutDocuments(typed), { text: typed, names: [], cut: false });
  // Typed text before a real block: the typed one stays, the host's block reads back.
  const real = model.documentBlock({ name: "r.pdf", path: "/x/r.pdf", text: "real" });
  assert.deepEqual(model.splitDocumentBlocks(`${typed}${real}`), { text: typed, documents: [{ name: "r.pdf", path: "/x/r.pdf" }] });
  assert.deepEqual(model.previewWithoutDocuments(`${typed}${real}`.slice(0, typed.length + 30)).names, ["r.pdf"]);
  assert.ok(real.includes(` ${model.DOCUMENT_SOURCE}>`));
});

test("attachmentInputs: a converted Chat file goes as its text, the rest as before", () => {
  const notes = file("/w/notes.md"), image = { id: "i", kind: "image", name: "a.png", path: "/w/a.png", status: "ready" };
  const inputs = attachmentInputs([pdf, notes, image], { fileMentions: false });
  assert.deepEqual(inputs.map((part) => part.type), ["text", "text", "mention", "localImage"]);
  assert.equal(inputs[0].text, "\n\n[Attached file: /w/notes.md]", "the note names only the unconverted file");
  assert.equal(inputs[1].text, '\n\n<document name="Q3 report.pdf" path="/docs/Q3 report.pdf" source="attachment" pages="4">\nRevenue grew.\nCosts fell.\n</document>');
  assert.deepEqual(attachmentInputs([pdf], { surface: "chat" }), [model.documentInput(pdf)]);
  assert.deepEqual(attachmentInputs([pdf], { surface: "code" }), [{ type: "mention", name: "Q3 report.pdf", path: "/docs/Q3 report.pdf" }], "outside Chat it is a file again");
  assert.deepEqual(attachmentInputs([file("/w/x.pdf")]), [{ type: "mention", name: "x.pdf", path: "/w/x.pdf" }], "not converted (yet): a reference, as before");
  assert.deepEqual(attachmentInputs([{ ...pdf, status: "loading" }]), [], "nothing for an entry not ready");
});

test("the transcript shows the file, not the block: live echo, joined history, preview", () => {
  const sent = [{ type: "text", text: "summarize", text_elements: [] }, ...attachmentInputs([pdf, file("/w/notes.md")], { fileMentions: false })];
  const live = userMessageContent(sent);
  assert.equal(live.filter((part) => part.type === "text").map((part) => part.text).join(""), "summarize", "no block text left");
  assert.deepEqual(live.filter((part) => part.type === "mention").map((part) => part.path).sort(), ["/docs/Q3 report.pdf", "/w/notes.md"]);
  const joined = sent.filter((part) => part.type === "text").map((part) => part.text).join("");
  const history = userMessageContent([{ type: "text", text: joined }]);
  assert.deepEqual(history, [{ type: "text", text: "summarize" }, { type: "mention", name: "notes.md", path: "/w/notes.md" }, { type: "mention", name: "Q3 report.pdf", path: "/docs/Q3 report.pdf" }]);
  const item = { type: "userMessage", id: "u1", content: [{ type: "text", text: joined }] };
  assert.deepEqual(shownUserItem(item).content, history);
  assert.notEqual(shownUserItems([item])[0], item);
  const only = userMessageContent([{ type: "text", text: model.documentInput(pdf).text }]);
  assert.deepEqual(only, [{ type: "mention", name: "Q3 report.pdf", path: "/docs/Q3 report.pdf" }], "a message that is only a document");
  assert.equal(shownPreview(joined), "summarize");
  assert.equal(shownPreview(`summarize${model.documentInput(pdf).text}`.slice(0, 40)), "summarize", "a preview cut inside the block");
  assert.equal(shownPreview(model.documentInput(pdf).text.slice(0, 50)), "Q3 report.pdf", "a document-only message reads as its name");
  assert.equal(shownPreview("plain"), "plain");
  assert.equal(shownPreview("a\n\n[Attached file: /w/x.md]"), "a", "the note alone as before");
});

test("image budget: shared-52 Fb 100 / 80, Cv's four sentences, PDF pages behind the gate", () => {
  assert.deepEqual(model.IMAGE_LIMITS, { max: 100, approaching: 80 });
  assert.equal(model.approachingImageCount(), 80);
  assert.equal(model.approachingImageCount(30), 24);
  assert.equal(model.imageLimitNotice(79), null);
  assert.deepEqual(model.imageLimitNotice(80), { key: "approaching", text: "This chat has 80 of 100 images. Consider starting a new chat." });
  assert.deepEqual(model.imageLimitNotice(100), { key: "max", text: "This chat has 100 or more images. If new images don’t send, start a new chat." });
  assert.equal(model.imageLimitNotice(85, { countPdfPages: true }).text, "This chat has 85 of 100 images (including PDF pages). Consider starting a new chat.");
  assert.equal(model.imageLimitNotice(120, { countPdfPages: true }).text, "This chat has reached the 100-image limit (including PDF pages). Start a new chat to add more.");
  assert.equal(model.imageLimitNotice(5, { max: 0 }), null, "Cv: no budget, no warning");
  const items = [
    { type: "userMessage", content: [{ type: "localImage", path: "/a.png" }, { type: "image", url: "data:" }, { type: "text", text: model.documentInput(pdf).text }] },
    { type: "agentMessage", content: [{ type: "localImage", path: "/b.png" }] },
  ];
  const entries = [{ kind: "image" }, pdf, file("/x/n.docx", { converted: { fileType: "docx", text: "x" } }), file("/x/plain.md")];
  assert.equal(model.conversationImageCount({ items, entries }), 3, "images only while the gate is off");
  assert.equal(model.conversationImageCount({ items, entries, countPdfPages: true }), 3 + 4 + 4 + 1, "xM: a document adds its pages (else 1)");
  assert.equal(model.IMAGE_PAGES_GATE, "claudeai_image_cap_client_precheck");
});

test("official 3.6556.2 originals for the budget and the screenshot item", () => {
  const shared52 = official("shared-52-uHFNjl7C.js"), shared7 = official("shared-7-DBAgAi5H.js"), shared78 = official("shared-78-D5Fw2h0a.js"), menu = official("c752b32f8-mYZAs6yC.js");
  assert.ok(shared52.includes("maxImagesPerConversation:100,approachingImagesPerConversation:80"));
  assert.ok(shared52.includes('"claudeai_image_cap_client_precheck"'));
  assert.ok(/return Math\.ceil\(e\*\w+\.approachingImagesPerConversation\/\w+\.maxImagesPerConversation\)/.test(shared7), "wv");
  for (const text of ["This chat has reached the {max}-image limit (including PDF pages). Start a new chat to add more.",
    "This chat has {count} of {max} images (including PDF pages). Consider starting a new chat.",
    "This chat has {max} or more images. If new images don\\u2019t send, start a new chat.",
    "This chat has {count} of {max} images. Consider starting a new chat."]) assert.ok(shared78.includes(`defaultMessage:"${text}"`), text);
  assert.equal(model.SCREENSHOT_LABEL, "Take a screenshot");
  assert.equal(model.SCREENSHOT_ERROR, "Could not capture screen.");
  assert.equal(model.SCREENSHOT_TESTID, "add-menu-screenshot");
  assert.equal(model.SCREENSHOT_ICON, "Camera");
  assert.ok(menu.includes(`screenshot:"${model.SCREENSHOT_TESTID}"`));
  assert.ok(menu.includes(`defaultMessage:"${model.SCREENSHOT_LABEL}"`) && menu.includes(`defaultMessage:"${model.SCREENSHOT_ERROR}"`));
  // ra's slot order: uploadFile, addPeople, googleDrive, addFolder, teach, screenshot.
  assert.ok(/uploadFile:\w+,addPeople:null,googleDrive:[^]{0,200}?addFolder:\w+,teach:\w+,screenshot:\w+,/.test(menu), "screenshot follows teach");
});

test("main.jsx: Chat's Add menu has the item after Record a skill; staged files convert; the budget toast", () => {
  const main = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
  // w13-chatfn-tools: Chat's + menu is c752b32f8 Js (source-chat-tools-menu.jsx); the screenshot is its Fs slot, which iN
  // places after teach (Record a skill) — tests/chat-tools-model.test.mjs renders the order.
  const add = main.indexOf('case "add": {');
  const chat = main.slice(main.indexOf('if (mode === "chat") {', add), main.indexOf('return <ChatAddMenuItems', add));
  assert.match(chat, /chatAddMenuSlots\(\{ attach, attachShortcut: "cmd\+u", screenshot: captureScreenshot, teach: addTeachRow,/);
  assert.match(main, /call\("convert-document", \{ path: entry\.path \}\)/);
  assert.match(main, /pendingConversions\(attachments, \{ surface: mode, inFlight: conversionsInFlight\.current \}\)/);
  assert.match(main, /call\("capture-screenshot"\)/);
  assert.match(main, /\.catch\(\(\) => setError\(t\("Could not capture screen\."\)\)\)/);
  assert.match(main, /imageLimitNotice\(conversationImageCount\(\{ items, entries: attachments \}\)\)/);
  assert.match(main, /attachmentInputs\(attachments, \{ fileMentions: coreTakesFileMentions\(boot\?\.core\) \}\)/, "the composer input call is unchanged (converted entries carry it)");
});

test("zh-CN covers the new copy", () => {
  for (const key of ["Take a screenshot", "Could not capture screen.", "PDF converted to text"]) assert.equal(typeof zhSurfaces[key], "string", key);
  setLocale("zh-CN");
  try {
    assert.equal(t("Take a screenshot"), "截取屏幕");
    assert.equal(model.convertedTooltip(pdf), "PDF 已转换为文本");
    assert.equal(model.imageLimitNotice(80).text, "此聊天已有 80/100 张图片。建议开始新聊天。");
    assert.equal(model.imageLimitNotice(100).text, "此聊天已有 100 张或更多图片。如果新图片无法发送，请开始新聊天。");
  } finally { setLocale("en-US"); }
});
