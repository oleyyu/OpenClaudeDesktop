// Checks the 4.16336.0 usage countdown graph (scripts/extract-usage-countdown-v4.mjs -> src/generated/usage-countdown-v4)
// byte for byte, with its reviewed pins (cds-core manifest, root and adapter declarations, adapter module).
import { extractUsageCountdownV4 } from './extract-usage-countdown-v4.mjs';
await extractUsageCountdownV4({ check: true });
