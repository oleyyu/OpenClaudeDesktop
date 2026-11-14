// Checks the 4.16336.0 composer session chin graph (scripts/extract-composer-chin-v4.mjs -> src/generated/composer-chin-v4)
// byte for byte, with its reviewed pins (cds-core manifest, root and adapter declarations, adapter module, linked graphs).
import { extractComposerChinV4 } from './extract-composer-chin-v4.mjs';
await extractComposerChinV4({ check: true });
