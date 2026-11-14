// Checks the 4.16336.0 composer notices graph (scripts/extract-composer-notices-v4.mjs -> src/generated/composer-notices-v4)
// byte for byte, with its reviewed pins (cds-core manifest, root declarations, the linked root, call sites).
import { extractComposerNoticesV4 } from './extract-composer-notices-v4.mjs';
await extractComposerNoticesV4({ check: true });
