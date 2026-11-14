// Checks the 4.16336.0 session rail graph (scripts/extract-session-rail-v4.mjs -> src/generated/session-rail-v4) byte for
// byte, with its reviewed pins (cds-core manifest, root and adapter declarations, pending roots, adapter module).
import { extractSessionRailV4 } from './extract-session-rail-v4.mjs';
await extractSessionRailV4({ check: true });
