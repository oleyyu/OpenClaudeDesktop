import { extractRetryDecision, retryDecisionReleases } from './extract-retry-decision.mjs';
// Both graphs: the 3.6556.2 one the host and session-rail import today, and the isolated 4.16336.0 migration target.
for (const release of Object.keys(retryDecisionReleases)) await extractRetryDecision({ check: true, release });
