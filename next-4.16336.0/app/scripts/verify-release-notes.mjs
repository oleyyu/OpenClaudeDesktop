// B29 (cb63ed069 N/z/B: the What’s new nudge needs notes for the running version): a build whose package version has
// no RELEASE_NOTES entry would never show the nudge after an update, so prepare-ui stops here and says what to add.
import fs from "node:fs";
import path from "node:path";
import { hasReleaseNotes, releaseNotesFor } from "../src/release-notes.mjs";

const root = path.resolve(import.meta.dirname, "..");
const { version } = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (!hasReleaseNotes(version))
  throw new Error(`src/release-notes.mjs has no entry for ${version}: add {version: "${version}", date, items} at the top of RELEASE_NOTES so What’s new shows after this update.`);
if (releaseNotesFor(version)[0]?.version !== version)
  throw new Error(`src/release-notes.mjs: the ${version} entry must be the newest one shown for this version.`);
