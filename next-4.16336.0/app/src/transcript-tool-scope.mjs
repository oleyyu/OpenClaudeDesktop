// The host's answers for the desktop services the original 2.42304.0 tool rows read (generated/transcript-rows group-status
// n0 / e0 / Uz and the rows-*.mjs originals they reach), provided once per transcript by
// source-transcript-tool-rows.jsx and read by source-transcript-rows-adapters.jsx. No React component here, so the
// adapter module (which the generated rows import) can import it without a cycle.
//
//   transcriptView      "normal" | "verbose" | … (cd4f82e77 _n / vn: verbose opens every row and group)
//   showThinking        thinking rows shown (cd4f82e77 yn)
//   surface             the engine surface fM answers (the host's tool row and group mounts), or null
//   pendingApprovalItemIds  the tool use ids an approval of the session waits on (shared-11 X requestsBySession)
//   renderMarkdown      (text) → the transcript's markdown for text a tool body shows as a message (c19e90103 Ix)
//   renderAttachedFiles (tool, placement) → the host's deliverables of the tool's engine item (cb6930dae iu)
//   renderImages        (images [{mimeType, data}], path) → the host's output images (cb6930dae Hu)
//   renderCard          (kind, props) → the host's card for a tool card m2e / e0 pick by name, or undefined (the
//                       card's fallback, the tool row)
//   liveOutputTask      (toolUseId) → the background task whose live output the row links, or undefined
//   openLiveOutput      (taskId) → show it
import { createContext } from "react";

export const TranscriptToolScope = createContext(Object.freeze({
  transcriptView: "normal",
  showThinking: true,
  surface: null,
  pendingApprovalItemIds: null,
  renderImages: null,
  renderMarkdown: null,
  renderAttachedFiles: null,
  renderCard: null,
  liveOutputTask: null,
  openLiveOutput: null,
}));
