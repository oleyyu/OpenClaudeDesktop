import test from "node:test";
import assert from "node:assert/strict";
import { parseInlineRuns, parseFileRef, linkTarget, trimBareUrl, normalizeHttpUrl,
  hasLeadingSlashCommand, chipPathOpenable, INLINE_RUN_CAP, LEADING_SLASH } from "../src/user-inline-model.mjs";

const kinds = (runs) => runs.map((run) => run.kind);
function assertContiguous(runs, text) {
  let cursor = 0;
  for (const run of runs) {
    assert.equal(run.start, cursor, `run at ${run.start} must start where the previous ended`);
    assert.ok(run.end > run.start, "runs are non-empty");
    assert.equal(text.slice(run.start, run.end), run.kind === "code" ? `\`${run.text}\`` : run.text);
    cursor = run.end;
  }
  assert.equal(cursor, text.length, "runs cover the whole text");
}

test("leading slash pill only at offset 0 of the first text and only when asked", () => {
  const runs = parseInlineRuns("/review src", { leadingSlash: true });
  assert.deepEqual(kinds(runs), ["slash", "text"]);
  assert.equal(runs[0].text, "/review"); assert.equal(runs[0].name, "review"); assert.equal(runs[1].text, " src");
  assertContiguous(runs, "/review src");
  assert.deepEqual(kinds(parseInlineRuns("/review src")), ["text"], "the caller decides whether the message qualifies");
  assert.deepEqual(kinds(parseInlineRuns("a /review", { leadingSlash: true })), ["text"]);
  assert.deepEqual(kinds(parseInlineRuns("//x", { leadingSlash: true })), ["text"]);
  assert.deepEqual(kinds(parseInlineRuns("/re-view:x.y", { leadingSlash: true })), ["slash"]);
  assert.deepEqual(kinds(parseInlineRuns("/review(1)", { leadingSlash: true })), ["text"], "token must end at whitespace or end");
  assert.ok(LEADING_SLASH.test("/x\nnext line"));
});

test("hasLeadingSlashCommand mirrors d$: raw text start and no file-type attachments", () => {
  assert.equal(hasLeadingSlashCommand("/review src"), true);
  assert.equal(hasLeadingSlashCommand("  /review src"), false);
  assert.equal(hasLeadingSlashCommand("/review src", { hasFileAttachments: true }), false);
  assert.equal(hasLeadingSlashCommand(""), false);
  assert.equal(hasLeadingSlashCommand(null), false);
});

test("inline backticks become code runs with an optional workspace file reference", () => {
  const text = "run `npm test` then see `src/app.js:12` and `` and `a\nb`";
  const runs = parseInlineRuns(text);
  assertContiguous(runs, text);
  const codes = runs.filter((run) => run.kind === "code");
  // VQ needs at least one non-backtick character: the empty pair leaves its
  // second backtick to open the next span, and a span never crosses a newline.
  assert.deepEqual(codes.map((run) => run.text), ["npm test", "src/app.js:12", " and "]);
  assert.equal(codes[0].fileRef, null);
  assert.deepEqual(codes[1].fileRef, { path: "src/app.js", line: 12 });
  assert.equal(runs.at(-1).text, "a\nb`", "a multi-line span stays literal");
});

test("file references follow ug: slash path with extension, optional line forms, no schemes", () => {
  assert.deepEqual(parseFileRef("src/app.js"), { path: "src/app.js" });
  assert.deepEqual(parseFileRef("/abs/dir/file.test.mjs:7"), { path: "/abs/dir/file.test.mjs", line: 7 });
  assert.deepEqual(parseFileRef("src/app.js:12-14"), { path: "src/app.js", line: 12, endLine: 14 });
  assert.deepEqual(parseFileRef("src/app.js:14-12"), { path: "src/app.js", line: 12, endLine: 14 });
  assert.deepEqual(parseFileRef("src/app.js:12-12"), { path: "src/app.js", line: 12 });
  assert.deepEqual(parseFileRef("src/app.js:12:5"), { path: "src/app.js", line: 12 }, "column is accepted and dropped");
  assert.deepEqual(parseFileRef("src/データ/файл.txt"), { path: "src/データ/файл.txt" });
  assert.equal(parseFileRef("app.js"), null, "a bare file name is not a reference");
  assert.equal(parseFileRef("src/app"), null, "an extension is required");
  assert.equal(parseFileRef("https://example.com/a.js"), null);
  assert.equal(parseFileRef("npm test"), null);
  assert.equal(parseFileRef("src/app.js:x"), null);
  assert.equal(parseFileRef(""), null);
});

test("Markdown links: label rules, balanced parens, lookbehind, host disclosure", () => {
  const text = "see [docs](https://example.com/x) and [same](https://example.com/x)";
  const runs = parseInlineRuns(text);
  assertContiguous(runs, text);
  assert.deepEqual(kinds(runs), ["text", "link", "text", "link"]);
  assert.equal(runs[1].href, "https://example.com/x"); assert.equal(runs[1].label, "docs"); assert.equal(runs[1].discloseHost, "example.com");
  const same = parseInlineRuns("[https://example.com/x](https://example.com/x)");
  assert.equal(same[0].kind, "link"); assert.equal(same[0].discloseHost, null);
  const host = parseInlineRuns("[example.com/x](https://example.com/y)");
  assert.equal(host[0].discloseHost, null, "a host-only label that matches needs no disclosure");
  const port = parseInlineRuns("[example.com:8443](https://example.com/)");
  assert.equal(port[0].discloseHost, "example.com:443");
  const scheme = parseInlineRuns("[http://example.com](https://example.com/)");
  assert.equal(scheme[0].discloseHost, "https://example.com");
  const paren = parseInlineRuns("[w](https://en.wikipedia.org/wiki/A_(b)) tail");
  assert.equal(paren[0].href, "https://en.wikipedia.org/wiki/A_(b)"); assert.equal(paren[1].text, " tail");
  const blocked = parseInlineRuns("x[docs](https://example.com/x)");
  assert.deepEqual(kinds(blocked), ["text", "link", "text"], "a word character before [ blocks the Markdown link; the bare URL inside still links");
  assert.equal(blocked[1].bare, true); assert.equal(blocked[1].href, "https://example.com/x"); assert.equal(blocked[2].text, ")");
  const newline = parseInlineRuns("[a\nb](https://example.com/x)");
  assert.deepEqual(kinds(newline), ["text", "link", "text"], "a newline in the label defeats the Markdown link; the URL is still a bare link");
  assert.equal(newline[0].text, "[a\nb](");
  assert.deepEqual(kinds(parseInlineRuns("[js](javascript:alert(1))")), ["text"]);
  assert.deepEqual(kinds(parseInlineRuns("[ftp](ftp://example.com/x)")), ["text"]);
  const bidi = parseInlineRuns("[‮docs](https://example.com/x)");
  assert.equal(bidi[0].label, "docs", "bidi controls are stripped from labels");
  const creds = parseInlineRuns("[example.com](https://user:pw@example.com/)");
  assert.equal(creds[0].discloseHost, "example.com", "credentials in the URL always disclose the host");
});

test("bare URLs: angle brackets, trailing punctuation and unbalanced parentheses", () => {
  const text = "Go to https://example.com/y. Then (https://example.com/z) or <https://example.com/w> done https://a.b/(c)";
  const runs = parseInlineRuns(text);
  assertContiguous(runs, text);
  const links = runs.filter((run) => run.kind === "link");
  assert.deepEqual(links.map((run) => run.href), ["https://example.com/y", "https://example.com/z", "https://example.com/w", "https://a.b/(c)"]);
  assert.ok(links.every((run) => run.bare && run.discloseHost === null && run.label === run.href));
  assert.deepEqual(trimBareUrl("https://x.y/a)."), ["https://x.y/a", ")."]);
  assert.deepEqual(trimBareUrl("https://x.y/a))"), ["https://x.y/a", "))"]);
  assert.deepEqual(trimBareUrl("https://x.y/(a)"), ["https://x.y/(a)", ""]);
  assert.deepEqual(kinds(parseInlineRuns("nothing here")), ["text"]);
});

test("Markdown links win over bare URLs; URLs around them are still linked and code spans are opaque", () => {
  const text = "https://a.b/1 [l](https://a.b/2) https://a.b/3 `https://a.b/4`";
  const runs = parseInlineRuns(text);
  assertContiguous(runs, text);
  assert.deepEqual(kinds(runs), ["link", "text", "link", "text", "link", "text", "code"]);
  assert.equal(runs[2].label, "l");
  assert.equal(runs[6].text, "https://a.b/4");
});

test("link targets normalize and reject non-http hrefs", () => {
  assert.equal(normalizeHttpUrl("HTTPS://Example.com/a b"), "https://example.com/a%20b");
  assert.equal(normalizeHttpUrl("javascript:alert(1)"), null);
  assert.equal(normalizeHttpUrl("not a url"), null);
  assert.deepEqual(linkTarget("x", "mailto:a@b.c"), { kind: "plain" });
  assert.deepEqual(linkTarget("Example.COM", "https://example.com/"), { kind: "link", href: "https://example.com/", discloseHost: null });
});

test("the decorated-run cap falls back to one literal text run and never splits mid-way", () => {
  const many = Array.from({ length: INLINE_RUN_CAP + 1 }, (_, i) => `\`c${i}\``).join(" ");
  const runs = parseInlineRuns(many);
  assert.deepEqual(runs, [{ kind: "text", start: 0, end: many.length, text: many }]);
  const exactly = Array.from({ length: INLINE_RUN_CAP }, (_, i) => `\`c${i}\``).join(" ");
  assert.equal(parseInlineRuns(exactly).filter((run) => run.kind === "code").length, INLINE_RUN_CAP);
  const urls = Array.from({ length: INLINE_RUN_CAP + 1 }, (_, i) => `https://a.b/${i}`).join(" ");
  assert.deepEqual(kinds(parseInlineRuns(urls)), ["text"]);
});

test("no general Markdown: emphasis, headings and lists stay literal text", () => {
  for (const text of ["**literal text**", "# heading", "- item\n- item", "_em_", "1. one"]) {
    assert.deepEqual(parseInlineRuns(text), [{ kind: "text", start: 0, end: text.length, text }]);
  }
  assert.deepEqual(parseInlineRuns(""), []);
  assert.deepEqual(parseInlineRuns(undefined), []);
});

test("chip link gate is syntactic (oh/rh/eh): missing files stay links, automount and UNC roots do not", () => {
  const root = "/Users/me/project/";
  assert.equal(chipPathOpenable("src/app.js", root), true);
  assert.equal(chipPathOpenable("src/missing.js", root), true, "existence is never consulted");
  assert.equal(chipPathOpenable("../sibling/file.ts", root), true, "parent traversal is allowed by the source");
  assert.equal(chipPathOpenable("/Users/me/project/src/app.js", root), true, "absolute inside the workspace");
  assert.equal(chipPathOpenable("/etc/hosts.conf", root), true, "absolute outside the workspace is still a link; the pane reports the refusal");
  assert.equal(chipPathOpenable("/net/boot.js", root), false);
  assert.equal(chipPathOpenable("/Net/boot.js", root), false, "first segment compares case-insensitively");
  assert.equal(chipPathOpenable("/.vol/1/x.js", root), false);
  assert.equal(chipPathOpenable("/.file/id=1/x.js", root), false);
  assert.equal(chipPathOpenable("/Volumes/a/../../net/x.js", root), false, "traversal is resolved before the automount check");
  assert.equal(chipPathOpenable("/Users/me/project/net/x.js", root), true, "only a leading automount segment is refused");
  assert.equal(chipPathOpenable("//server/share/x.js", root), false, "UNC/device form");
  assert.equal(chipPathOpenable("/??/C:/x.js", root), false);
  assert.equal(chipPathOpenable("//wsl.localhost/Ubuntu/x.js", root), true, "WSL shares are not treated as UNC");
  assert.equal(chipPathOpenable(`${"a/".repeat(2100)}x.js`, root), false, "over 4096 characters");
  let nested = "";
  for (let i = 0; i < 65; i++) nested += "/Volumes/v";
  assert.equal(chipPathOpenable(`${nested}/x.js`, root), false, "more than 64 nested volume roots");
  assert.equal(chipPathOpenable("src/app.js", null), true, "no workspace: only UNC is refused");
  assert.equal(chipPathOpenable("//server/x.js", null), false);
  assert.equal(chipPathOpenable("", root), false);
  assert.equal(chipPathOpenable(42, root), false);
});
