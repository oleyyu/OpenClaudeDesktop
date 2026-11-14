// Checks the 4.16336.0 MCP elicitation form graph (scripts/extract-approval-elicitation-v4.mjs ->
// src/generated/approval-elicitation-v4) byte for byte, with its reviewed pins (cds-core manifest, root and adapter
// declarations, adapter module, linked modules).
import { extractApprovalElicitationV4 } from './extract-approval-elicitation-v4.mjs';
await extractApprovalElicitationV4({ check: true });
