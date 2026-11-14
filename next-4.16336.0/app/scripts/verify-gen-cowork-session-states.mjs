// Both source contracts: 3.6556.2 (src/generated/cowork-session-states, production, linked by session-rail) and
// 4.16336.0 (src/generated/cowork-session-states-v4, the isolated graph linking cds-core and routines-shared-v4), each
// regenerated in memory and compared byte for byte.
import { contractVersions, extractCoworkSessionStates } from './extract-cowork-session-states.mjs';
for (const version of contractVersions) await extractCoworkSessionStates({ check: true, version });
