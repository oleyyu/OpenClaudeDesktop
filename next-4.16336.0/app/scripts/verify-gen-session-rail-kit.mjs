// Both source contracts: 3.6556.2 (src/generated/session-rail-kit, production, imported by the region plan's 15
// consumers and mcp-app-host) and 4.16336.0 (src/generated/session-rail-kit-v4, the staged isolated graph over cds-core), each
// regenerated in memory and compared byte for byte.
import { contractVersions, extractSessionRailKitVersion } from './extract-session-rail-kit.mjs';
for (const version of contractVersions) await extractSessionRailKitVersion({ version, check: true });
