// Host boundaries of generated/workflow-card-v4 (scripts/extract-workflow-card-v4.mjs HOST_ADAPTERS): the 4.16336.0
// workflow task card (c96d752d0 jU) and task Stop button (QH). Each is the host answer another graph already gives the
// same official binding; nothing is answered here.
//   cef1e6037 Z    localSessionClient    the local session client (no readFile: the card keeps the task's own progress)
//   c5da7eb42 LL   useSessionBandFields  the session band fields hook (a host session is local, never a bridge)
//   c06cf64bb vO   sessionBucketsStore   the session engine store (HTe wakes only a remote session; none here)
//   vendor-intl q  useIntl               react-intl over the host catalog
export { localSessionClient } from "./source-code-feed-adapters.jsx";
export { useSessionBandFields } from "./source-session-rail-adapters.jsx";
export { sessionBucketsStore } from "./source-code-transcript-adapters.jsx";
export { useIntl } from "./source-transcript-rows-adapters.jsx";
// c96d752d0's inline style c1bc4f7a0 (the agent cells), identical in 3.6556.2 and 4.16336.0: the one file
// extract-code-transcript.mjs writes (extract-workflow-card-v4.mjs AGENT_CELL_STYLE checks it against this version).
import "./generated/code-transcript/agent-cell.css";
