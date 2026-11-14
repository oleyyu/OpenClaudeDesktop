// Checks the 4.16336.0 Cowork live sections graph (scripts/extract-cowork-live-v4.mjs -> src/generated/cowork-live-v4)
// byte for byte, with its reviewed pins (cds-core manifest, root and adapter declarations, removed roots, adapter module).
import { extractCoworkLiveV4 } from './extract-cowork-live-v4.mjs';
await extractCoworkLiveV4({ check: true });
