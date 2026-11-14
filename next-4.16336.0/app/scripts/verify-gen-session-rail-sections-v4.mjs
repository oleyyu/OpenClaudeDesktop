// Checks the 4.16336.0 session rail Servers and Background tasks graph (scripts/extract-session-rail-sections-v4.mjs ->
// src/generated/session-rail-sections-v4) byte for byte, with its reviewed pins (cds-core manifest, root and adapter declarations, adapter module).
import { extractSessionRailSectionsV4 } from './extract-session-rail-sections-v4.mjs';
await extractSessionRailSectionsV4({ check: true });
