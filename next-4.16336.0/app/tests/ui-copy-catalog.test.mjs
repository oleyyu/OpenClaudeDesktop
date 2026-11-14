import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ACTION_ERROR_COPY } from "../src/action-error-model.mjs";

// R03 catalog copy: visible failure and status strings use the 2.2553.1 catalog wording ("Couldn’t …", typographic
// apostrophe), read from reference/current-2.2553.1/ion-dist/i18n/en-US.json (read-only).
const app = path.resolve(import.meta.dirname, "..");
const catalog = JSON.parse(readFileSync(path.resolve(app, "../reference/current-2.2553.1/ion-dist/i18n/en-US.json"), "utf8"));
const source = (file) => readFileSync(path.join(app, "src", file), "utf8");

const COPY = {
  mpiKUCMipZ: ["Couldn’t copy image.", ["source-response-image.jsx", "response-image-model.mjs"]],
  Bb7iLWtweK: ["Couldn’t save image.", ["source-response-image.jsx"]],
  "9CrhUOPyTg": ["Couldn’t save changes. Try again.", ["manual-text-save.mjs"]],
  "7ck8ciIf0O": ["Couldn’t rename this task. Try again.", ["action-error-model.mjs"]],
  "ugO0/irMRD": ["Couldn’t copy to the clipboard. Try again.", ["source-code-block.jsx", "source-turn-footer.jsx", "source-user-actions.jsx"]],
  "dKe/N6RHQF": ["Review complete", ["main.jsx"]],
  "m/7Y4kJLsg": ["What’s new", ["source-titlebar.jsx"]],
  bW7B87wFFp: ["New", ["release-notes.mjs"]],
  RGAbslYMBE: ["Improved", ["release-notes.mjs"]],
  jzcSPWIERo: ["Fixed", ["release-notes.mjs"]],
  "8yjUcIlaPp": ["No release notes yet.", ["source-titlebar.jsx"]],
};

test("every replacement string is the exact catalog entry and is used where it belongs", () => {
  for (const [id, [text, files]] of Object.entries(COPY)) {
    assert.equal(catalog[id], text, id);
    for (const file of files) assert.ok(source(file).includes(text), `${file} uses “${text}”`);
  }
  // K5b1jjmNX7 "Couldn’t remove {serverName}." with the server name interpolated.
  assert.equal(catalog.K5b1jjmNX7, "Couldn’t remove {serverName}.");
  assert.ok(source("source-settings-pages.jsx").includes("t('Couldn’t remove {serverName}.', { serverName: selectedName })"));
  // RlffS0HJJO lag note: the first sentence (the changelog link has no local counterpart).
  assert.ok(catalog.RlffS0HJJO.startsWith("These release notes are included with this version of the app and may be one release behind."));
  assert.ok(source("source-titlebar.jsx").includes("These release notes are included with this version of the app and may be one release behind."));
  for (const [kind, message] of Object.entries(ACTION_ERROR_COPY))
    if (message) assert.ok(Object.values(catalog).includes(message), `${kind}: “${message}” is in the catalog`);
});

test("the files R03 edited carry no “Could not …” copy", () => {
  for (const file of ["source-response-image.jsx", "response-image-model.mjs", "manual-text-save.mjs", "source-titlebar.jsx",
    "source-code-block.jsx", "source-turn-footer.jsx", "source-user-actions.jsx", "source-settings-pages.jsx", "source-settings.jsx",
    "action-error-model.mjs", "release-notes.mjs"])
    assert.doesNotMatch(source(file), /Could not/, file);
  // main.jsx keeps its git-status read error ("Could not read repository changes", not R03's); the replaced copy is gone.
  const main = source("main.jsx");
  for (const old of ["Could not rename", "Review completed"]) assert.equal(main.includes(old), false, old);
  for (const file of ["../scripts/turn-footer-ui-test.mjs", "../scripts/user-actions-ui-test.mjs", "../scripts/code-fence-ui-test.mjs", "../scripts/rich-copy-ui-test.mjs"])
    assert.doesNotMatch(source(file), /Could not copy/, file);
});
