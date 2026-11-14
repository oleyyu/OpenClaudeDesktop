// Checks the 4.16336.0 composer environment bar graph (scripts/extract-composer-env-v4.mjs -> src/generated/composer-env-v4)
// byte for byte, with its reviewed pins (finalized cds-core manifest, root declarations, linked code-composer-v4 module).
// prepare:ui runs it.
import { extractComposerEnvV4 } from './extract-composer-env-v4.mjs';
await extractComposerEnvV4({ check: true });
