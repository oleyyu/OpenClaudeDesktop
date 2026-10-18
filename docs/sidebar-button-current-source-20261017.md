# Original sidebar More control and shared CDS primitives

The Code row now uses shared-18 `dE/fE` with the original shared-frame `bl`
CDS Button and `Ro` Icon. The existing shared extraction graph includes their
reachable declarations; its former StartButton/StartIcon substitutions have been
removed. React and ReactDOM remain the host instance.

The button retains source ghost painting, control-size utilities, compact 12px
optical glyph, held-key suppression, busy-state isolation, pointer feedback and
click stop/prevent before the host menu callback. The sidebar provides compact
CDS density explicitly. Shared view tabs already supply their density context and
now use these same original primitives. Local menu content remains a host adapter.

A source cascade review found that the unlayered global native-control reset
would override the original row's font, color and padding utilities. A narrowly
scoped `revert-layer` bridge releases these properties for current-row buttons
and rename inputs. This also preserves the original row's alignment and rounding.
The five official stylesheet files themselves remain unchanged apart from their
existing asset-URL conversion.

Verification uses SSR and controlled hooks/events only. It covers the rendered
CDS paint structure, compact/comfortable icon sizing, row click isolation, held
activation, busy activation and existing sidebar/tab behavior. No GUI, screenshot,
live model/core or GitHub call is used. The production build checks the extraction
manifests. See `verification-sidebar-button-current.json` for final counts, source
fingerprint, CSS checks and build logs.

The broader cursor-policy suite also reports an existing allowlist mismatch for
`.saved-environment-dialog .saved-environment-link` and `.swf-compatibility summary`.
Neither file was changed in this phase. This failure is recorded separately from
the related sidebar regressions, not hidden as a pass.

The original row and More control are connected; complete frontend parity remains
unfinished. Host menu/filter variants, optional emoji rename enhancement, remote
services, blocked-reason data, multi-repository PR discovery and the unresolved
blue character background are among the remaining differences. The old application
backup is retained. No commit, packaging or installed-app replacement was made.

Final verification: 18 related files, **195/195 passed**, no failures or skips;
production build passed. Expanded cursor check: 197/198 passed, the one existing
allowlist failure described above. The shared graph contains 15 modules and 1705
bindings; current helper modules remain 71. All five CSS checks and backup presence
checks passed. Source SHA-256 across 1283 files:
`ecd7d032fa0340ada178087b59706d2cc831c299fd5a347076df60ac4ac08072`.
