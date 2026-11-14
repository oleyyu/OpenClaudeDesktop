import React from "react";
import { Icon } from "./icons";

// transcriptLinks (markdown-current.js:3336 ds, default off; scroll-messages-current.js:56305-56309
// Cf.Provider value true around assistant text): null keeps every link plain. Inside the
// transcript the value is the session repo slug En() ('owner/name', lowercased; '' when unknown).
export const SourceForgeRepoContext = React.createContext(null);

// markdown-current.js:3713-3786 rc with no PR status known (l === "none"): a pull request
// gets the xs GitPullRequest glyph in the Zs slot, an issue none; no title, so no
// aria-label. The pill classes are drawn by .smd-forge-ref (source-session.css).
const GLYPH_SLOT = "relative bottom-[calc((1cap-1ex)/2)] me-1 inline-flex align-middle";
export function SourceForgeRef({ href, forgeRef, label, onClick, onAuxClick, onDragStart }) {
  return <a href={href} target="_blank" rel="noreferrer" className="hide-focus-ring smd-forge-ref"
    data-forge-kind={forgeRef.kind} onClick={onClick} onAuxClick={onAuxClick} onDragStart={onDragStart}>
    <span className="whitespace-nowrap">
      {forgeRef.kind === "pull" && <span className={GLYPH_SLOT}><Icon name="GitPullRequest" size={12}/></span>}
      {label}
    </span>
  </a>;
}
