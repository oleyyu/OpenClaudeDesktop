// Checks the 4.16336.0 turn box graph (scripts/extract-turn-box-v4.mjs -> src/generated/turn-box-v4) byte for byte, with
// its reviewed pins (cds-core manifest, root and adapter declarations, linked roots, pending roots, adapter module).
import { extractTurnBoxV4 } from './extract-turn-box-v4.mjs';
await extractTurnBoxV4({ check: true });
