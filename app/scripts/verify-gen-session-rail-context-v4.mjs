// Checks the 4.16336.0 session rail Context graph (scripts/extract-session-rail-context-v4.mjs ->
// src/generated/session-rail-context-v4) byte for byte, with its reviewed pins (cds-core manifest, root and adapter
// declarations, w3's measured size, adapter module).
import { extractSessionRailContextV4 } from './extract-session-rail-context-v4.mjs';
await extractSessionRailContextV4({ check: true });
