# Current sidebar pull-request integration

Reference: installed Claude Desktop **2.37337.1**, source-only verification.

The Code sidebar now uses the current source PR glyph and preview card instead
of the old generic 16px pull-request icon. This completes that presentation slice
for the local engine's existing single-PR-per-session records. It does not establish
complete frontend or screenshot parity.

## Original source retained

- `shared-18-DScmD_-G.js`: `Lw/Rw/Kw/$w` state resolution, aggregation,
  case-insensitive repository/number deduplication, URL filtering and ordering;
  `YC/XC/ZC/ew` glyphs, colors and labels; `_B` preview collision padding.
- `shared-20-78nc04b9.js`: `Fw/zw/iT` preview entries, `Jw` check/status copy,
  `fT/hT` 12px title glyph and multi-entry count, `uT` 250ms lazy preview with
  menu/drag suppression and event containment, `dT` keyboard preview around
  the row's More control. The generated module retains all reachable local
  dependencies of these declarations.
- `shared-5-BUdnChDq.js`: original `Sg` preview primitive, including lazy hover
  initialization, focus-visible opening and focus transfer. Its reachable Base UI
  dependencies share the existing view-tab extraction graph and the host React
  instance. `shared-2 Gy` and `shared-26 zp` are the only new module boundaries.
- The generated PR view uses the original `shared-frame X` class merge rather
  than a substitute class-merging implementation.

Extraction recipes and manifests preserve source/output hashes. The production
build re-extracts in check mode and fails if generated code diverges.

## Local adapter boundary

`app/src/sidebar-pr-current-model.mjs` projects the existing `prInfo` observed
branch lookup, or the cached `codeDesktop.pr`/`prState`/`prLink` record, into the
original aggregation input. Observed data wins over cached state. The adapter
infers repository identity only from an actual PR link when the record lacks it.
Missing titles, diff counts and check results stay absent. All-skipped local CI
maps to passed for the source card's three-state CI contract.

`app/electron/git-pull-request.cjs` adds `additions,deletions` to its existing
read-only lookup and forwards valid nonnegative integers. Verification injects
the lookup runner; no GitHub request or CLI lookup was executed for this change.

Pinned, archived and PR-hidden rows do not show a PR tail. Unread remains a
separate status mark. Screen-reader text announces the PR state separately from
the visible glyph. The row's existing menu button is wrapped with the original
keyboard preview; card clicks and pointer-down events stop at the popup.

Other explicit host seams are localization, icon rendering, no-entry tooltip,
document direction and menu/drag state. Local row placement still uses the
existing sidebar adapter; the full original row component has not been migrated.

## Verification and limits

- New tests cover original state priority, duplicate PRs, unsafe-link filtering,
  observed/cached data, count validation, all glyph states, entry rendering,
  multi-entry count rendering, actual sidebar wiring, pointer/menu suppression,
  keyboard previews and source focus behavior.
- Related sidebar, view-tab, git and home source tests and production build are
  recorded in `verification-sidebar-pr-current.json` under the migration analysis
  directory.
- No GUI, screenshot comparison, Electron window, model call or live GitHub call
  was used. Tests use SSR, controlled hooks/events and injected lookup responses.
- Multi-PR aggregation and rendering are source-tested, but the local data source
  still supplies one branch PR per session. This is not full multi-repository
  service integration. Merge-queue discovery is not added by this change.
- Environment/branch description rows, remaining full-row variants and the
  unresolved full-page blue character background remain incomplete. `home-18`
  stays unresolved; no invented animation was substituted.
- The old application backup remains at
  `/Users/oleyyu/claude-ui-lab-backups/openclaude-0.2.186-before-ui-2.37337.1-20261015-194822/`.
