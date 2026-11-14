// Checks the 4.16336.0 proposal group graph (scripts/extract-proposal-group-v4.mjs -> src/generated/proposal-group-v4)
// byte for byte, with its reviewed pins (cds-core manifest, root and adapter declarations, removed roots, adapter module).
import { extractProposalGroupV4 } from './extract-proposal-group-v4.mjs';
await extractProposalGroupV4({ check: true });
