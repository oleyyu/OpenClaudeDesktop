// Checks the 4.16336.0 Cowork tool approval card graph (scripts/extract-cowork-approval-v4.mjs ->
// src/generated/cowork-approval-v4) byte for byte, with its reviewed pins (cds-core manifest, root and adapter
// declarations, adapter module, linked modules, the verbatim public-suffix chunk).
import { extractCoworkApprovalV4 } from './extract-cowork-approval-v4.mjs';
await extractCoworkApprovalV4({ check: true });
