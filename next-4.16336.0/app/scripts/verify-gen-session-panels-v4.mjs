// Checks the session-panels 4.16336.0 graph (scripts/extract-session-panels-v4.mjs): the pins (snapshot chunks, root and
// also-pinned declarations, the finalized cds-core manifest + adapter), src/session-panels-v4-adapter.mjs and every byte of
// src/generated/session-panels-v4 (CdsPanel layer + the Code session tile line mode the host tile engine consumes).
// prepare:ui discovers and runs it (verify-gen-*.mjs).
import { extractSessionPanelsV4 } from './extract-session-panels-v4.mjs';
await extractSessionPanelsV4({ check: true });
