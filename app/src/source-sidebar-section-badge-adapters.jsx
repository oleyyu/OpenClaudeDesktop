// Host answers for the folded section status badge (R4g-sidebar SB1, research-ext/X7-partial-gaps.md X7-04):
// scripts/extract-sidebar-sections.mjs generates the original 2.42304.0 badge (shared-21 HG / VG and the shared-18
// status dot FD / ND / BD it draws) into src/generated/sidebar-sections/status-dot.mjs and section-badge.mjs; the three
// imports below are what those chunks read from the desktop app's transport and appearance settings. Each export names
// the original binding it stands in for. Kept apart from source-sidebar-sections-adapters.jsx so the badge's host
// answers stay with the badge.
import { createContext, useContext } from 'react';

// ---------------------------------------------------------------- shared-11 n_ (exported `mn`, shared-21 Rb)
// The code session ids whose transport is responding right now (shared-11 Lg / Vg: subscribeResponding /
// respondingJoined, debounced by e_ / t_ while the hold is on). HG's zG reads it to count a responding session as
// "running" and to keep a stale error from showing while it runs. Host: the sidebar's own engine state (state.active /
// a session whose status is active), computed by src/sidebar-sections-layout.mjs (sectionStatusRows) together with the
// rows themselves and provided around the sections list (source-sidebar-sections.jsx SidebarSectionsList).
const noSessions = new Set();
export const SectionRespondingIds = createContext(noSessions);
export function useRespondingSessionIds() { return useContext(SectionRespondingIds); }

// ---------------------------------------------------------------- shared-18 Ox (exported in shared-18 only)
// `kx(Tx(), Dx())`: the status dot look from the appearance settings (wx: clay working dots, Ex: blue "needs you" with
// neutral error ink; provided by shared-18 jx at the app root). This host has neither setting, so it is kx(false, false)
// -- the official look with both off: gray working dots, amber "needs you", surface error ink. The host's own row status
// dots (code-current sidebar-status-glyph FD → NestedStatusDot) draw the same look.
const dotLook = Object.freeze({ working: 'gray', needsYou: 'amber', errorInk: 'surface' });
export function useStatusDotLook() { return dotLook; }

// ---------------------------------------------------------------- shared-18 wD (exported `os`, shared-21 th)
// `wD(intl, category, remote)`: the error title for a turn error category (shared-14 kh / Ft over the error catalog,
// SSH / host wording from shared-104 Jc). VG only asks for the generic one (`th(t, void 0)`): with no category kh's Ft
// answers shared-14 B.generic, "Something went wrong" (JqiqNj0Ooi). The host's error catalog is its own
// (turn-error-model.mjs), and a folded section's badge never carries a category, so every call gets that title.
const genericError = { defaultMessage: 'Something went wrong', id: 'JqiqNj0Ooi' };
export function sidebarErrorTitle(intl) { return intl.formatMessage(genericError); }
