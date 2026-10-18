import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

// The stats card must not wait for init, which awaits the whole core connection
// (initialize, account/read, model/list: the 2–4 s Harness boot, or a 30 s
// timeout); main.cjs 'stats' needs only initialize or last launch's kept result.
test("loadStats() starts in the mount effect beside init() and home-shape, not after `await call(\"init\")`", async () => {
  const main = await fs.readFile(path.join(root, "src/main.jsx"), "utf8");
  const init = main.slice(main.indexOf("async function init() {"), main.indexOf("async function loadSessions("));
  assert.ok(init.includes('await call("init")'), "init() located");
  assert.doesNotMatch(init, /loadStats\(\)/, "init() no longer chains loadStats");
  const mount = main.slice(main.indexOf("    init();\n"), main.indexOf('call("home-shape")'));
  assert.match(mount, /^ {4}init\(\);\n[\s\S]*loadStats\(\);\n\s*$/, "the mount effect calls loadStats() right after starting init()");
  // The 'stats' push event still refreshes the snapshot after turns, and Retry reloads it.
  assert.match(main, /e\.kind === "stats" && e\.stats && Array\.isArray\(e\.stats\.dailyActivity\)\) setStatsSnapshot\(e\.stats\)/);
  assert.doesNotMatch(main, /<SourceStatsCard/, "presets replaces the home stats view");
  assert.equal(main.match(/loadStats\(\);/g)?.length, 1, "one load per mount");
});

// F09: the card renders the original stats object only (no account/ledger mixing),
// and its hold skeleton's reveal counts from the home mount (Zk Lo startedAt).
test("presets home uses saved environments; the standalone stats renderer still uses core stats", async () => {
  const main = await fs.readFile(path.join(root, "src/main.jsx"), "utf8");
  const start = main.slice(main.indexOf('<SourceCodeStart'), main.indexOf('<SourceCodeStart') + 600);
  assert.match(start, /ready=\{sessionsLoaded && recentFolderFields !== null && detectedProjects !== null && savedEnvironments.ready\}/);
  assert.match(start, /savedEnvironments=\{savedEnvironments.environments\}/);
  assert.match(start, /onSelectEnvironment=\{selectSavedEnvironment\}/);
  assert.match(main, /const homeStartedAt = useHomeStartedAt\(section === "new" && !current\);/);
  assert.doesNotMatch(main, /readAccountUsage=|accountIdentity=|accountPending=/);
  const home = await fs.readFile(path.join(root, "src/source-home.jsx"), "utf8");
  assert.doesNotMatch(home, /useHomeAccountUsage|accountActivity|sh-account-source|aggregateLedger/);
  assert.match(home, /aggregateStats\(stats, range, today\)/);
  for (const removed of ["src/use-home-account-usage.jsx", "src/home-account-usage.mjs"])
    await assert.rejects(fs.access(path.join(root, removed)), `${removed} is deleted`);
});
