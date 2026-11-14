// Checks the 4.16336.0 Cowork Context section graph (scripts/extract-cowork-context-v4.mjs -> src/generated/cowork-context-v4)
// byte for byte, with its reviewed pins (cds-core manifest, root and adapter declarations, adapter module, required links).
import { extractCoworkContextV4 } from './extract-cowork-context-v4.mjs';
await extractCoworkContextV4({ check: true });
