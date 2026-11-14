// Checks the 4.16336.0 queued message bar graph (scripts/extract-queued-bar-v4.mjs -> src/generated/queued-bar-v4) byte
// for byte, with its reviewed pins (cds-core manifest, root / adapter declarations, raw call sites, adapter module).
import { extractQueuedBarV4 } from './extract-queued-bar-v4.mjs';
await extractQueuedBarV4({ check: true });
