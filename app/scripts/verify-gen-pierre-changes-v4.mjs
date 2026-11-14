// Checks the 4.16336.0 Pierre Changes graph (scripts/extract-pierre-changes-v4.mjs -> src/generated/pierre-changes-v4)
// byte for byte, with its reviewed pins (cds-core manifest, root / call-site / adapter declarations, held roots, adapter module).
import { extractPierreChangesV4 } from './extract-pierre-changes-v4.mjs';
await extractPierreChangesV4({ check: true });
