# Current Code Sessions page

The sidebar's **View all** now opens a real Code Sessions page. Its Active and
Archived tabs use loaded local engine records; archived records no longer appear
in the current Code sidebar, including when an older saved preference says
`all` or `archived`. The sidebar's empty-state archive entry opens the Archived
surface. Classic non-Code grouping keeps its existing status filtering.

## Source retained

- `cbd6c85c8:Du`: original main page JSX expression, tab expression, search props
  and empty-state expression, selected through parsed AST nodes. Each fragment's
  hash and host parameters are recorded in the current-helper manifest.
- `cbd6c85c8:Ou/ku/Au`: original row content, title matching, repository label,
  archive badge, live-state slot and relative-time rail.
- `cbd6c85c8:Rl` and shared-20 `dC`: original loading hold and its 800ms held-row /
  10-second backstop behavior. Source skeletons remain nine rows.
- `c193cfc9b:C` and `cf35aed38:Z`: original page shell and responsive sticky page
  header. The source `Yy` band resolver maps this host's existing desktop top bar
  to the compact band; the existing outer desktop chrome remains a host seam.
- `c9c7785eb:M/w`, `ce802b15a`, `c51c45b79` and the reachable dependencies: original
  selectable table, selection hook and row link behavior. Code rows deliberately
  do **not** participate in this page's selection mode, as in `Du`.
- Original shared-10 tabs, CDS Button/Badge/Dropdown/Dialog, title highlighting,
  relative-time clock, More button and action/date rail components.

The shared extraction graph grew to 27 modules / 2326 bindings. The new table
path exposed another official React namespace alias (`vendor-frame:s`); it now
uses the same host React instance, as the existing vendor adapters do. No second
React runtime or official desktop service is executed. Current helpers total 90.

## Host wiring

The parent projects real local session, unread, responding, error and repository
state into the source row model. Local data is already loaded, so there is no
fabricated remote pagination or remote search endpoint. Search uses titles only,
with the source notice, 300ms debounce, immediate clearing, case-insensitive
matching and original Unicode-aware title highlighting. Nonempty query/sort state
is retained in memory per local engine scope across visits; this replaces the
upstream window/org cache scope.

The source row's More button opens the existing session menu and its real
archive/restore/rename/delete handlers. Its open state is reflected on the trigger.
New session and row links go through existing local navigation. Page history
entries are distinct from session IDs; Back/Forward restores the page, and tab
switches replace the current page filter, matching source `Xl`'s replace behavior.
The archive keyboard shortcut ignores this non-session route, so it cannot
archive an old session hidden behind the Sessions page.

Only the outer scroll container and a scoped release of unlayered native-control
resets were added as host CSS. The five official CSS files retain their shipped
content with the existing asset URL conversion only.

## Verification and limits

All checks are source-only: AST provenance, SSR, controlled hooks/events,
extracted actual app navigation functions and production build. No GUI,
screenshot, live model/core, GitHub, packaging or installed-app replacement was
used. Final related regression: **21 files, 238/238 tests passed**, no skips.
The production build passed with the existing large-chunk and mixed-import
warnings. See `verification-sessions-page-current.json` for hashes and receipts.
The earlier unrelated cursor-policy allowlist failure remains recorded separately;
this is not a claim that the entire application test suite passes.

This closes the missing View-all / archived-page wiring recorded in the prior
sort-menu phase. It does not prove complete frontend parity. The outer desktop
chrome, session menu contents, read/engine-store projection and engine-scoped
search cache remain host integrations. Remote providers, remote pagination/search,
manual independent sections, routine visibility services, other audit regions and
the source-unresolved blue character background remain unfinished or unverified.

## New installed-version drift found at final verification

The installed app changed to **2.42304.0** during this work. The page and test
results above target the immutable **2.37337.1** source, so they do not establish
parity with this newly installed build. This is recorded explicitly in the
verification receipt (`installedReferenceMatch: false`). Final local-source
fingerprint: `6fc4f6ed0551645ad6c5839472b37207529931b3e9559d2c7a8f0f2dc4858abf`
across 1324 files.

A new immutable source snapshot was captured at
`reference/installed-2.42304.0-20261017` without copying the unrelated VM image.
Verification byte-compared all **508 ASAR entries and 4224 frontend files** with
the installed app and found zero copy issues. Four of the five previously loaded
stylesheet families have different bytes; shared-frame CSS remains identical.
The detailed rebaseline lives under `analysis/code-ui-unpack-20261017`. No old
snapshot or old application backup was replaced. The local renderer still loads
the prior reference assets until the new source/CSS compatibility audit is done.
