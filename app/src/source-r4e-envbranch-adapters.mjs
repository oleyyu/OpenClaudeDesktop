// Host dependency of the 2.42304.0 start-branch check (R4e-envbranch, home-15; src/generated/r4e-envbranch/**, generated
// by scripts/extract-r4e-envbranch.mjs). qZ itself (cc43287c9: skip origin/… and 40-hex shas, then a non-empty fresh
// local-branch list without the branch and isBranchOnOrigin(cwd, branch) === false) is original; only the desktop
// bridge namespace it reads is answered here.
//
// shared-0 Ix (exported `Om`, `globalThis["claude.web"]?.LocalSessions`): qZ only calls isBranchOnOrigin, and returns
// false (never missing) without it, so the method exists only while the preload's desktop bridge does (not in SSR,
// tests without a stub, or a plain browser). Main answers `branch-on-origin` with the original
// GitStatusService.isBranchOnOrigin (electron/generated/r4e-envbranch-origin.cjs over electron/r4e-envbranch-origin.cjs):
// true when refs/remotes/origin/<branch> resolves, false when it doesn't although origin's fetch refspecs would have
// fetched it, null when that can't be told. Anything else the bridge answers counts as null (unknown).
const tristate = value => (value === true || value === false ? value : null);
export const LocalSessions = Object.freeze({
  get isBranchOnOrigin() {
    const call = globalThis.window?.desktop?.call;
    return typeof call === 'function'
      ? (cwd, branch) => Promise.resolve(call('branch-on-origin', { cwd, branch })).then(tristate)
      : undefined;
  },
});
