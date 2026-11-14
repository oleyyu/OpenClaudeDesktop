// Checks the 4.16336.0 effort control graph (scripts/extract-effort-control-v4.mjs -> src/generated/effort-control-v4)
// byte for byte, with its reviewed pins (cds-core manifest, root and adapter declarations, adapter module).
// verify-gen-effort-control.mjs keeps checking the 3.6556.2 graph the host still renders.
import { extractEffortControlV4 } from './extract-effort-control-v4.mjs';
await extractEffortControlV4({ check: true });
