import { useEffect, useRef, useState } from "react";
import { revealRelation } from "./files-search-model.mjs";
import { REVEAL_FLASH_MS } from "./file-tree-row-model.mjs";

/** Used by SourceTreeNode; the existing expansion state remains owned there.
 * Each reveal generation expands each ancestor once, allowing later manual
 * collapse. Target waits for real rows from files IPC, then scrolls without
 * moving focus. A follow reveal (the open file, Ig's follow=true branch) keeps
 * the row "nearest"; an explicit "Reveal in file tree" (follow=false) centres
 * it and flashes it: B33, cccc2cf0a My (:5655-5669) sets data-highlighted for
 * 1200ms once per reveal nonce (revealFlashedRef), and Ay scrolls "center".
 * Returns {highlighted, target} for the row's data-highlighted and transition.
 *
 * R3-files FT-14 (files-10, cccc2cf0a DS with Nx's `start: true` reveal): a start reveal (the worktree session's
 * start folder, revealPath "dir/", generation Rx = -1) also expands the target folder itself (bS puts every folder
 * on the path in revealChain), scrolls its row to the top (`scrollToIndex(index, "start")`), then reports it shown
 * (onStartFolderShown) without selecting or flashing it.
 */
export function useFileTreeReveal({ entry, revealPath, revealGeneration, revealFollow = true,
  revealStart = false, onStartShown = null, treeVisible, expand, rowRef }) {
  const expanded = useRef(null), scrolled = useRef(null), flashed = useRef(null);
  const [highlighted, setHighlighted] = useState(false);
  const relation = revealRelation(entry, revealPath);
  const flashTarget = relation === "target" && !revealFollow && !revealStart && revealGeneration > 0;
  const expands = relation === "ancestor" || (revealStart && relation === "target" && !!entry?.directory);
  useEffect(() => {
    if (!treeVisible || !revealGeneration || !expands || expanded.current === revealGeneration) return;
    expanded.current = revealGeneration;
    expand(true);
  }, [treeVisible, expands, revealGeneration, expand]);
  useEffect(() => {
    if (!treeVisible || !revealGeneration || relation !== "target" || scrolled.current === revealGeneration) return;
    const row = rowRef.current, view = row?.ownerDocument.defaultView;
    if (!row || !view) return;
    const frame = view.requestAnimationFrame(() => {
      if (!row.isConnected || !row.getClientRects().length || row.closest("[hidden], [inert]")) return;
      row.scrollIntoView({ block: revealStart ? "start" : revealFollow ? "nearest" : "center" });
      scrolled.current = revealGeneration;
      if (revealStart) { onStartShown?.(); return; }
      if (!revealFollow && flashed.current !== revealGeneration) setHighlighted(true);
    });
    return () => view.cancelAnimationFrame(frame);
  }, [treeVisible, relation, revealGeneration, revealFollow, revealStart, onStartShown, rowRef]);
  useEffect(() => {
    if (!highlighted) return undefined;
    const generation = revealGeneration;
    const timer = setTimeout(() => {
      setHighlighted(false);
      flashed.current = generation;
    }, REVEAL_FLASH_MS);
    return () => clearTimeout(timer);
  }, [highlighted, revealGeneration]);
  // My: a row that is no longer the reveal target drops the highlight at once.
  useEffect(() => {
    if (!flashTarget) setHighlighted(false);
  }, [flashTarget]);
  return { highlighted: highlighted && flashTarget, target: flashTarget };
}
