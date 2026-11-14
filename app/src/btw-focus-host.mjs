// Host adapter the 4.16336.0 /btw focus hand-back (generated/btw-pane-v4/focus-hand-back.mjs, scripts/extract-btw-pane.mjs)
// reads in place of shared-0 Uu (exported `Rx`): `let t = Wu(e); return t === void 0 ? zu(e) : t;`, the forced
// GrowthBook value of a feature, else the client's. shared-1 sI asks it for "__gb__1951358650" and compares `=== !0`.
// The host has no GrowthBook client; host-growthbook.mjs is the one table every area's gate readers answer from, and a
// flag it does not list is off (D29 / D31).
import { hostGrowthBookFlag } from './host-growthbook.mjs';

export function readGrowthBookValue(flag) {
  return hostGrowthBookFlag(flag);
}
