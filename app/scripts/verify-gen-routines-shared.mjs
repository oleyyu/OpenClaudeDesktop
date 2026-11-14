// Both source contracts: 3.6556.2 (src/generated/routines-shared, production, linked by the 3.6556.2 consumer areas) and
// 4.16336.0 (src/generated/routines-shared-v4, the isolated graph linking cds-core), each regenerated in memory and compared
// byte for byte.
import { contractVersions, extractRoutinesShared } from './extract-routines-shared.mjs';
for (const version of contractVersions) await extractRoutinesShared({ check: true, version });
