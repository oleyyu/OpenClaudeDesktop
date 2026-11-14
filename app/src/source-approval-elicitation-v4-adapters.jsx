// Host adapters of the 4.16336.0 MCP elicitation form graph (scripts/extract-approval-elicitation-v4.mjs ->
// src/generated/approval-elicitation-v4). Re-exports only: vendor-intl q (react-intl useIntl) is answered by the same
// routines-shared host adapter the 3.6556.2 graph (src/generated/approval-elicitation) already uses (semantics documented
// there); the extractor pins the original declaration by features and raw sha256 and checks this file re-exports nothing else.
export { useIntl } from "./source-routines-shared-adapters.jsx";
// vendor-frame i / ce (the CommonJS loaders of React and react/jsx-runtime): the host's one React, as cds-core uses it.
export { loadHostReact, hostJsxRuntime } from "./cds-core-adapter.mjs";
