# Current Code sidebar grouping and sorting

OpenClaude's Code sidebar now renders the installed 2.37337.1 session-list branch
of shared-21 `XH`, its original grouping and sort controls, and the shared CDS
Filter button. The extraction selects the original JSX expression and group
options from the parsed module, records their fragment hashes, and preserves the
selected expression. Host adapters supply React, localization, menu primitives,
persisted preferences and local session records. This is a scoped migration;
the entire sidebar and Sessions page are not yet source-identical.

## Connected behavior

- Group and sort: original None / Status / Date / Environment / gated Custom
  options, Last updated / Date created sorting, and Descending / Ascending.
- Sort direction, metadata and empty-group changes keep the menu open. Group
  changes, reset and nested-family visibility actions close it. Keyboard regroup
  restores focus using original `aU/oU` when the menu closes without stealing
  focus from another control.
- Original `hN/gN/_N/bN` and `BR/VR` compare local records. Invalid, nonpositive or
  post-update creation timestamps fall back to update time. Ties remain stable.
  The legacy non-Code path remains separate.
- Original `QR/$R/iz/oz` resolve family membership and ordering. Recency places a
  family by its best member; created sorting uses the parent position. Sibling
  spawner ordering is retained.
- Original `BC/VC/GC/KC` date buckets use local calendar boundaries, family
  pivots, created-time fallback and ascending bucket order. Pinned rows remain
  outside those buckets. The local loaded list has no server cap, so the adapter
  passes Infinity and leaves row reveal/truncation to the existing host list.
- For created-date Older groups, original `bulkScope` excludes whole families
  whose newest member is recent. Both archive/delete target calculation and the
  rendered bulk-action button consume this scope, including an empty scope.
- Current Status grouping no longer applies the classic activity-age cutoff.
  Reset changes grouping/sort/direction/empty groups and preserves metadata,
  nested collapse and other preferences, as the original `XH.gt` does.

## Host boundaries and unfinished work

The newer original Sessions page provides active/archived browsing via View all.
The current host does not yet mount that page, and its View-all context is null;
therefore this phase does not claim a completed archive-browsing migration. The
old status submenu is no longer shown by the new Code menu. Archived records are
still loaded and remain available to the existing search palette; no records or
archive metadata are deleted. This gap needs the original Sessions page and route,
not a renamed search palette.

New group still uses the existing local custom-group dialog and persistence;
independent manual sections are not migrated. Custom grouping is currently kept
available for that host data model. The routine visibility option remains gated
out because its local visibility service is not connected. The original menu
trigger/open-state service is adapted to the existing local popup controller.
Full environment filtering, newer grouping services and other audit items remain
unfinished. The full-page blue character background is still source-unresolved.

## Verification

Source-only verification uses extraction checks, controlled hooks/events, SSR
and a production build. No GUI, screenshot, live model/core or GitHub operation
was used. The related regression log is `sidebar-sort-final-tests.log` (19 files,
214 passing tests before the final rendered-bulk test). The focused final
`sidebar-sort-bulk-render.log` rerun includes all 20 new tests and passes. Together
these verify 215 distinct related tests with no failures or skips; the suite-wide
run and focused rerun are recorded separately in the receipt.

The existing cursor-policy allowlist mismatch from the prior phase is still
recorded separately; this is not a full application suite pass. See
`analysis/code-ui-unpack-20261015/source-migration/verification-sidebar-sort-current.json`
for build status, final source fingerprint, stylesheet hashes and backup check.
No commit, packaging or installed-application replacement was performed.

Final artifact checks: installed/reference version 2.37337.1; 80 extracted current
helper modules; 15 shared modules / 1705 bindings; all five CSS comparisons passed;
old backup present. Production build passed with the previously recorded chunk
size and mixed-import warnings. Source fingerprint across 1295 files:
`3ee0c6b3b964a38b154eda04dda128696aa94e72aaef151816329dbf13a5eed0`.

## Located source for the next page migration

The actual Sessions page is `cbd6c85c8-DE5A3B1p.js:Du` (Code-scoped active/archived
surfaces), with `Ou/ku` row content. It uses `cd75b47e6-BGc3mOFc.js:a` and
`c193cfc9b-DtXxzg5b.js:C` for the CDS page shell, `c9c7785eb-Cw0jgQYC.js:M/w`
for the selectable table/state, and `c75e89812-TU4KttI4.js:i/a/o` for row layout,
time and More control. Formatted source copies are saved under the existing
readable/new directory. These have been located and read, not integrated.
