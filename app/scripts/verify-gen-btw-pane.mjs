import { contracts, extractBtwPane } from './extract-btw-pane.mjs';
// Both source contracts: the 3.6556.2 graph the host links and the isolated 4.16336.0 graph (sharedGraph cds-core).
for (const version of Object.keys(contracts)) await extractBtwPane({ check: true, version });
