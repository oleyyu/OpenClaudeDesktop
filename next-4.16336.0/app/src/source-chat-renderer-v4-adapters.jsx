// Host adapters of the 4.16336.0 Chat answer renderer graph (scripts/extract-chat-renderer-v4.mjs ->
// src/generated/chat-renderer-v4; round2 units chat-renderer:a / :b). Each export answers one original declaration, which
// the extractor feature-checks and pins (HOST_ADAPTERS / ADAPTER_PINS). Staged only: the host still renders Chat answers
// with the 3.6556.2 graph (src/generated/chat-renderer, src/source-chat-renderer-adapters.jsx, unchanged).
//
// Defined here (no existing host adapter answers the 4.16336.0 original without loading a 3.6556.2 graph):

// shared-0 eP = P(iP, N.O11Y_INTERNALS) (export xm): iP wraps the error as `[<tag>] <message>` and reports it to datadog
// with source "handled_severe"; ca129fbf3 rt calls it once per plugin for a refused formula ("katex_refuse_failed").
// OpenClaude Desktop has no account and sends no telemetry (3.6556.2 renderer: shared-0 iO reportO11yError, plan-w13 E59),
// so nothing is reported, as the 3.6556.2 adapter does.
export function reportHandledError() {}
