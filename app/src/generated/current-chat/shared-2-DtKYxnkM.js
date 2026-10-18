// Extracted from installed Claude Desktop 2.31226.0. Do not edit.
import { ideaFalse as CM } from "../../source-ideas-adapters.jsx";
function $M(e,t){if(!t)return!1;let n=t.sessions[e.sessionId],r=!!t.explicitUnread?.[e.sessionId]||n===0;if(e.unread===!1&&!r&&!CM())return!1;let i=e.lastActivityAt??e.createdAt??0;return n===void 0?i>t.initializedAt:i>n}
function eN(e){return!e.isRunning&&e.lastActivityAt!==void 0}

export { $M, eN, CM };
