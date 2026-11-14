// Checks the 4.16336.0 session rail Changes graph (scripts/extract-session-rail-changes-v4.mjs ->
// src/generated/session-rail-changes-v4) byte for byte, with its reviewed pins (cds-core manifest, root and adapter
// declarations, pending roots, adapter module).
import { extractSessionRailChangesV4 } from './extract-session-rail-changes-v4.mjs';
await extractSessionRailChangesV4({ check: true });
