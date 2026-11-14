// Checks the 4.16336.0 Cowork progress graph (scripts/extract-cowork-progress-v4.mjs -> src/generated/cowork-progress-v4)
// byte for byte, with its reviewed pins (cds-core manifest, root and adapter declarations, removed roots, adapter module).
import { extractCoworkProgressV4 } from './extract-cowork-progress-v4.mjs';
await extractCoworkProgressV4({ check: true });
