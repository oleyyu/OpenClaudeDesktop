# Current Code sidebar row and metadata

Reference: local Claude Desktop 2.37337.1. Verification is source-only.

The Code session row now renders the original shared-18 `KT` rather than a local
button with absolute status/PR slots. The extracted implementation owns one-line
and described geometry, leading icons, label fading, right decoration, PR tail,
control placement, touch-selected controls and inline rename. Old host hover and
selection backgrounds are excluded from these rows to avoid double painting.
Archived styling is attached to the original row as in shared-21 `z1`.

`Show → Metadata` persists through the existing sidebar preference service. The
host passes observed branch and repository/folder records to shared-20
`Zw/TT/ET/OT`, and renders original `tT/_T` descriptions and environment marks.
Pinned rows suppress these details. Project headings deduplicate folder text;
blocked state takes precedence over branch metadata; multiple distinct branches
are not collapsed to an invented branch. Typed remote records retain their source
cloud/SSH/bridge glyph behavior, but the local environment service still supplies
local folders. The feature is offered only for Code.

Rename now uses original `UT/WT`: entry focus/select with the 250ms blur guard,
trimmed submit, blank/unchanged suppression, cancel/refocus, modifier-double-click
protection, IME-aware Enter/Escape and optimistic rollback. The host persistence
callback returns its promise and rejection to the original controller.

## Source and adapter boundaries

The extraction recipe retains original function bodies and dependencies. Added
modules are `sidebar-row-view`, `sidebar-details-model`, `sidebar-details-view`,
`sidebar-remote-name` and `sidebar-environment-copy`. Original `In/he/Oe` supply
variant classes, stable callbacks and merged refs through the shared source graph.
Manifests include source/output SHA-256 values; the build verifies regeneration.

Local adapters still own session selection, drag, menus, persistence, icons and
localization. The More button has not yet moved to the original CDS Button.
The optional account-gated emoji-shortcode rename enhancer is explicitly absent.
Blocked reason text, full filter/menu variants, remote services, multi-repository
PR discovery and the blue character background remain incomplete.

## Verification

- 18 related test files: **191 passed, 0 failed, 0 skipped**, including 11 new
  metadata/row/rename behavior tests using SSR and controlled hooks/events.
- Production build passed; existing large-chunk and mixed-import warnings remain.
- 71 current helper modules; 15 shared view/preview modules, 1599 bindings.
- Five official CSS files match after only `/assets/v1/` to `./` URL conversion.
- Source fingerprint: `8909e98bb7839b03139002dde724dee9aab5c71da88620b48b7cd1a1c68bcbf4`
  across 1283 source files; full method and logs in
  `analysis/code-ui-unpack-20261015/source-migration/verification-sidebar-row-current.json`.
- Original backup remains at
  `/Users/oleyyu/claude-ui-lab-backups/openclaude-0.2.186-before-ui-2.37337.1-20261015-194822/`.

No GUI, screenshot, live model/core or GitHub calls were used. This verifies this
source migration slice, not full frontend/pixel parity. Audit statuses were not
promoted merely because these checks passed.
