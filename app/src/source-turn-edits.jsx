import React, { useMemo } from "react";
import { TurnEditsCard } from "./generated/r3b-transcript/turn-edits-card.mjs";
import { DiffOpenerProvider, DiffPlacementProvider, SessionFileOpenerProvider } from "./generated/r3b-transcript/session-file-access.mjs";
import { TurnEditsHost } from "./source-r3b-transcript-adapters.jsx";
import "./generated/r3b-transcript/summary-card.css";

// toolcards-06 / toolcards-07 (R3b-transcript step 2): the 2.42304.0 Turn edits card, c96d752d0 N2e (memo M2e),
// generated into src/generated/r3b-transcript/turn-edits-card.mjs with every row, class and stop of the original:
// - D10 takes claudeai_cc_epitaxy_session_presets_main's "on" branch, so the card shows its 'See all' form: an
//   'Edited N files' title row with Undo (base size, flush end) over a divider, file rows without chevrons and with
//   footnote counts, then 'See all' with the turn's totals (three files or fewer) or, past three, the disclosure row
//   that reads 'See all' (and opens Changes as it expands) / 'Show less'. One file: its row is the card, with Undo.
// - A file row's stop is S0's: 'outside_roots' when the session's read refusal refuses the path (only remote sessions
//   have one, c5da7eb42 WN, so never here), the session's links block or 'plain' when there is no Files opener and the
//   Changes diff does not list the file; a stopped row is static (Bn explains any stop but 'plain').
// The row is mounted as p2 mounts it: a data-find-omitted row after the finished turn's last row (the card's own
// mt-pad-xs on top of the transcript's row gap); Undo only for the latest turn.
//
// Host services (src/source-r3b-transcript-adapters.jsx, generated/r3b-transcript/session-file-access.mjs):
//   edits             turn-edits-model.mjs turnEdits() for the turn (the card's `items`, read by the s0 adapter)
//   sessionKey        the session whose tool expansion store keeps the See all / Show less state
//   onUndo            Undo (main.jsx sendUndoTurn), absent when the turn cannot be undone
//   canViewChanges    the Changes pane can show this session (the pane store's hasSidePanes and context)
//   fileInChanges     whether the Changes diff lists a path (main.jsx turnFileInChanges: yes until the diff loads)
//   onRevealInChanges reveal a listed path in the Changes diff (requestDiffReveal + setPanel("changes"))
//   onOpenChanges     open the Changes pane (openDiffPane)
//   onOpenFile        open a path in the Files pane (the session's file opener), absent without a session
// Not provided, as for an official local session: the read refusal (remote sessions only), the links block (only read
// without a Files opener), the session's output files, the artifact page.
export function SourceTurnEdits({ edits, turnId, sessionKey = null, onUndo, canViewChanges = false, fileInChanges, onRevealInChanges, onOpenChanges, onOpenFile }) {
  const changes = canViewChanges === true;
  const host = useMemo(() => ({ sessionKey, canViewChanges: changes, openChanges: changes ? onOpenChanges : undefined }), [sessionKey, changes, onOpenChanges]);
  // X (c856385e2 Vt): reveal a path in the Changes diff when the diff lists it; {probe: true} only asks.
  const diffOpener = useMemo(() => (changes && fileInChanges && onRevealInChanges
    ? (path, options) => {
      if (!fileInChanges(path)) return false;
      if (options?.probe !== true) onRevealInChanges(path);
      return true;
    }
    : null), [changes, fileInChanges, onRevealInChanges]);
  // Gt (c856385e2 Ut): whether the Changes diff places a path.
  const placement = useMemo(() => (changes && fileInChanges ? (path) => fileInChanges(path) : null), [changes, fileInChanges]);
  if (!edits?.files?.length) return null;
  return <div className="source-message" data-turn-edits={turnId} data-find-omitted="">
    <TurnEditsHost.Provider value={host}>
      <SessionFileOpenerProvider value={onOpenFile ?? null}>
        <DiffOpenerProvider value={diffOpener}>
          <DiffPlacementProvider value={placement}>
            <TurnEditsCard items={edits} onUndo={onUndo} />
          </DiffPlacementProvider>
        </DiffOpenerProvider>
      </SessionFileOpenerProvider>
    </TurnEditsHost.Provider>
  </div>;
}
