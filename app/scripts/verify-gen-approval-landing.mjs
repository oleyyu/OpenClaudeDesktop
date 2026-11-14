import { contractVersions, extractApprovalLanding } from './extract-approval-landing.mjs';
// Both source contracts: the 3.6556.2 graph the host and its 3.6556.2 consumers link, and the isolated 4.16336.0 graph.
for (const version of contractVersions) await extractApprovalLanding({ check: true, version });
