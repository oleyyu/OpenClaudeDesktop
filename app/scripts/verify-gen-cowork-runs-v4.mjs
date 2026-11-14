// Checks the 4.16336.0 Cowork Runs / Upcoming graph (scripts/extract-cowork-runs-v4.mjs -> src/generated/cowork-runs-v4)
// byte for byte, with its reviewed pins (cds-core manifest, root and adapter declarations, adapter module).
import { extractCoworkRunsV4 } from './extract-cowork-runs-v4.mjs';
await extractCoworkRunsV4({ check: true });
