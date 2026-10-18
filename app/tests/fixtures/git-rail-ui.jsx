import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { SourceGitStatus } from "../../src/source-git-status";
import { commitAction } from "../../src/git-rail-model.mjs";
import "../../src/style.css";

// Isolated fixture for the git band rows that the real app cannot reach on demand (the behind indicator forced on, a
// reserved dismiss slot, an uncounted dirty tree, a responding turn). Nothing here is read by the production entry point.
// R4f-rail SR-8: the 2.3x stacked rail half (SourceGitRail) is retired. The session rail is the 2.42304.0 flat rail that
// src/source-session-rail.jsx mounts in the Code session page; its Changes row is generated (src/generated/session-rail-changes)
// and covered by tests/session-rail-changes.test.mjs, tests/session-rail-mount.test.mjs and tests/source-git-band.test.mjs.
// The file keeps its name because scripts/git-rail-ui-test.mjs and tests/fixtures/git-rail-fixture.html load it.
// F12: Commit gates on workingTreeDirty (git-status-card Qe isWorkingTreeDirty), the row on hasChanges.
const dirty = { isRepo: true, cwd: "/fixtures/rail-repo", repoName: "rail-repo", branch: "feature", hasChanges: true, workingTreeDirty: true, added: 2, removed: 1, files: 1 };
const behind = { count: 1, base: "main", tooltip: "1 commit behind main" };
const log = [];
window.gitRailFixtureLog = log;

function Fixture() {
  const [uncounted, setUncounted] = useState(false);
  const [responding, setResponding] = useState(false);
  const live = uncounted ? { ...dirty, added: 0, removed: 0, binaryFiles: 1 } : dirty;
  const action = commitAction(live, { responding });
  // Same density scope as the app's workspace <main> (main.jsx: cds-root + data-density="compact").
  return <div className="cds-root" data-density="compact" style={{ display: "flex", gap: 32, padding: 24, alignItems: "flex-start" }}>
    <div style={{ width: 768, display: "flex", flexDirection: "column", gap: 6 }} data-fixture="band">
      <SourceGitStatus status={live} prMode="commit" behind={behind} showBehind
        onOpenFolder={() => log.push("folder")} onCopyBranch={() => log.push("copy")} onOpenChanges={() => log.push("band:changes")}
        onAction={() => log.push("band:commit")} actionLabel="Commit" actionDisabled={action.disabled} actionDisabledReason={action.disabledReason} />
      <SourceGitStatus status={dirty} prMode="commit" dismissReserved onOpenChanges={() => log.push("band-reserved:changes")} />
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }} data-fixture="controls">
      <button type="button" onClick={() => setUncounted((value) => !value)}>Fixture: toggle uncounted</button>
      <button type="button" onClick={() => setResponding((value) => !value)}>Fixture: toggle responding</button>
    </div>
  </div>;
}
createRoot(document.getElementById("root")).render(<Fixture />);
