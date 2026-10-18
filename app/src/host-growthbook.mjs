// The host's answers to the desktop's GrowthBook flags. The host has no GrowthBook client; every generated area's
// GrowthBook adapter (shared-25 Zs / ec and the per-area gate readers) answers from this one table, so a flag the user
// opens is open everywhere it is read. A flag that is not listed is off (D29 / D31).
//
//   __gb__2846116625  turnStatusRows (c26fb8b6b Ve): the CDS TurnStatus rows of the Code transcript — the working line,
//                     tool groups, tool rows, the thinking row, the skeleton handoff hold. User ruling: on.
//   __gb__507049721   the clay activity mark (shared-4 Ny) that leads the working line and busy groups. User ruling: on.
//   __gb__3525173228  the transcript's per-row crash boundary (c4a9ee384 sp). D34: on.
//   __gb__496524976   the sidebar account button's avatar slot (shared-19 S0, read by E0/T0): the CDS Avatar of the
//                     principal's initials (C0) instead of the static Spark. User ruling 2026-10-18: on (the shipping
//                     build shows the initials avatar; the host has no image source, so it is always initials).
export const HOST_GROWTHBOOK = Object.freeze({
  __gb__2846116625: true,
  __gb__507049721: true,
  __gb__3525173228: true,
  __gb__496524976: true,
});
export function hostGrowthBookFlag(flag) {
  return HOST_GROWTHBOOK[flag] === true;
}
