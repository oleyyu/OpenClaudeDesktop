// Checks the 4.16336.0 start card graph (scripts/extract-code-start-v4.mjs -> src/generated/code-start-v4) byte for byte,
// with its reviewed pins (finalized cds-core manifest, root declarations, the Clawd replay classes). prepare:ui runs it.
import { extractCodeStartV4 } from './extract-code-start-v4.mjs';
await extractCodeStartV4({ check: true });
