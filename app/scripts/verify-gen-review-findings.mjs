// Both source contracts: 3.6556.2 (src/generated/review-findings, production) and 4.16336.0 (src/generated/review-findings-v4,
// the isolated graph linking cds-core), each regenerated in memory and compared byte for byte.
import { contracts, extractReviewFindings } from './extract-review-findings.mjs';
for (const version of Object.keys(contracts)) await extractReviewFindings({ check: true, version });
