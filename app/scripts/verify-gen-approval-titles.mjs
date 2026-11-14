import { extractApprovalTitles, contractVersions } from './extract-approval-titles.mjs';
// Both source contracts: 3.6556.2 (src/generated/approval-titles, production) and 4.16336.0 (src/generated/approval-titles-v4,
// staged until the batch-11 cutover).
for (const version of contractVersions) await extractApprovalTitles({ check: true, version });
