// The host's answers to the desktop's GrowthBook flags. The host has no GrowthBook client; every generated area's
// GrowthBook adapter (shared-25 Zs / ec and the per-area gate readers) answers from this one table, so a flag the user
// opens is open everywhere it is read. A flag that is not listed is off (D29 / D31).
//
//   (__gb__2846116625 turnStatusRows is not served: W14-code r4 gates-r4-11 (E95) — it is not in the desktop's Uon; the
//   Code session turns the rows on itself, cf74bc599 `Gn = eh() || Wn` with Wn the rendererChrome (source-transcript.jsx
//   statusRows → source-transcript-rows.jsx TranscriptRowsScope).)
//   __gb__3525173228  the transcript's per-row crash boundary (c4a9ee384 sp). D34: on.
//   (__gb__496524976 is not served: W14-code r4 gates-r4-06 (E95) — the sidebar account button's initials avatar (shared-19
//   S0, read by E0/T0) is not in the desktop's Uon, so the slot shows the static Spark as the 3P desktop does.)
//   (ccd_palette_session_actions, ccd_prompt_jump and ccd_user_message_lists_main are not served: W14-code r5 gates-r5-01 /
//   gates-r5-03 (E81) — none is in the desktop's Uon, so the Code ⌥⌘ session chords, the prompt jumps and the side chat's
//   user-message list parse are off, replacing B25's "on" (shortcuts-dialog-model.mjs, sidebar-palette-model.mjs,
//   source-side-chat-user-content.jsx).)
//   (__gb__100087145 is not served: W14-code r7 r7c-02 / sh7-04 / gates-r7-01 (E81) — cc43287c9 Ide's Code notice region
//   (`var Fde = "__gb__100087145"; … r = Mt(Fde, !0) … if (!a) return n;`) is not in the desktop's Uon, so the 3P desktop
//   has no region: no slot table, no Rde stack, and each Code band (workflow size, usage limit, sleep, kept awake) draws
//   inline as c227f4d5e oL where its column mounts it (main.jsx renderSessionNotices; local_code_notice_region below).)
export const HOST_GROWTHBOOK = Object.freeze({
  __gb__3525173228: true,
  // W14 E81 (Uon `always !0`, the desktop's 3P defaults): cai_soft_fern, the F6 / ⇧F6 page-area cycle and its two
  // shortcuts-dialog rows (shared-20 kv, c518a31cc je; the host keeps the cycle on, focus-region-model.mjs).
  __gb__1686253244: true,
  // W14 E81 (Uon `always !0`): smartQuotes, the reply prose's typographic quotes (cfc0d8c26 n, read by c96d752d0 D2e in
  // the Code transcript renderer). E49's Chat ruling is unchanged: source-chat-markdown.jsx passes smartQuotes={false}.
  __gb__2215170874: true,
  // W14 E81 / E86 (Uon `always !0`; renderer-core): code_unified_renderer, the Code transcript drawn by the 3.6556.2
  // CodeTranscriptRenderer (cf74bc599 uw `transcriptRenderer: Rn ? Tn(E3) : void 0`; host: source-code-transcript.jsx,
  // main.jsx), and what it reads: code_step_pictures (a tool step's result pictures, c06cf64bb am / c96d752d0 R3 t4),
  // code_stream_live_text (the reply's live text store, cf74bc599 uw `w = ve(Wc)` → dw holdLiveText), transcript_hold_place
  // (the reading position held across a width change, c4a9ee384 Qp → cb264bc23 createHoldPlace) and alluviumFixes (the
  // reply prose's alluvium parse fixes, c19e90103 Mf).
  __gb__3413676205: true,
  __gb__101380594: true,
  __gb__2714218019: true,
  __gb__4175257006: true,
  __gb__3019411446: true,
  // W14 E81 (Uon `always !0`; transcript-rest): the clay mark's quill (shared-4 MS, read by cc39db724 K as
  // `quill: h(activity === "compose")`): while the reply is being written the working line's mark plays the sprite
  // sheet's compose (quill) clips instead of write (cc39db724 xe `ne === "compose" && !v ? "write" : ne`).
  __gb__2346508742: true,
  // W14-code r2 gates-r2-01 (E81 / E92; Uon `{rule: "follows", condition: "sessionsRunOnThisComputer"}`, lsn
  // `sessionsRunOnThisComputer: e => !e.noSessionRunsOnThisDevice` — true for a desktop that runs its sessions itself,
  // as this host does): claudeai_cc_epitaxy_session_presets_main (the presets gate, shared-11 gc / Tl; D10 already on in
  // the sidebar, so no E82 default changes) and claudeai_cc_epitaxy_turn_edits_card (c227f4d5e `vt(…turn_edits_card)`).
  __gb__3264789062: true,
  __gb__2136381871: true,
  // W14-code r4 sidebar-new fr4-07 (E81; Uon `1002481325:{rule:"always",value:!0}`): the sidebar hover card's edit-type
  // tools (shared-20 DO `ve("__gb__1002481325")`, jO `(c || !EO(e)) && wO(…)`) are offered inline with their diff body.
  __gb__1002481325: true,
  // Region batch 1 btw-pane (4.16336.0, Uon `1951358650:{rule:"always",value:!0}`): shared-1 sI, read by the /btw and
  // approval-card focus hand-back CI (generated/btw-pane-v4/focus-hand-back.mjs through btw-focus-host.mjs): a
  // keyboard-activated click (mouse-typed, buttons 1, no sourceCapabilities) counts as a keyboard decision.
  __gb__1951358650: true,
  // surfaces-prod-2 host-native (4.16336.0 Wbn, the 3P desktop's bootstrap defaults; index.chunk-Du-Wqi0E.js @2536501, read
  // by pxn/fxn; audit: analysis/…/surfaces-prod-2/host-native/tools/gb-align.mjs). Only keys a live 4.16336.0 area reads
  // land here; keys read only by a staged -v4 output wait for its cutover (cowork_subagent_model "inherit",
  // yukon_silver_clocks follows scheduledTasksEnabled → true; yukon_silver_config computed coworkConfig), as does
  // __gb__1616707004 (approval-landing cluster).
  //   claude_ai_plugins_in_chat (`1179150525:{rule:"always",value:!0}`): settings-nav (shared-55 `_ = ht("claude_ai_plugins_in_chat")`,
  //   `y = g === "chat" && !_ ? v : void 0`) draws the Customize › Plugins row enabled on the Chat surface too, without
  //   "Plugins are only available in Cowork and Code".
  __gb__1179150525: true,
  //   `130942744:{rule:"always",value:!0}`: home-chat-cowork shared-123 DB's admin-withheld gate (read only behind bB = !1).
  __gb__130942744: true,
  // W8A-3 (round4 wave8b sidebar; ruling D32): chilling_sloth_clocks (Wbn `2971093051:{rule:"follows",condition:
  // "scheduledTasksEnabled"}`, uxn `scheduledTasksEnabled: e => e.scheduledTasksEnabled`; the desktop answers
  // `scheduledTasksEnabled: rT() && B_n("coworkRoutines", …)`, rT = T_n(q()) `e.workspace?.scheduledTasksEnabled !== !1`,
  // true on this host, which runs its scheduled tasks itself — the same answer as yukon_silver_clocks). Read by shared-123
  // fR (`t = V("chilling_sloth_clocks")`, with lR().enabled + NA().onThisDevice + CCDScheduledTasks) → shared-31 Om
  // ccdEnabled → the Code sidebar's "Scheduled" row (shared-21 qN `p = d.codeEnabled`).
  __gb__2971093051: true,
  // Round-4 wave 8d sidebar lane (ruling R4-G1: a copy-only flag the 3P defaults omit takes the value the user's official
  // screenshots prove): claude_ai_unified_routines (`__gb__2405438802`; not in Wbn, so a 3P desktop reads it off). Read by
  // shared-140 Aa `function Aa(){return Ce(ka)}` (ka = "claude_ai_unified_routines"), re-exported as shared-18 aq and read
  // by shared-21 qN (`i = mu()`, mu = aq): `n.id === "scheduled" && t === "code" && !i && (p = e.formatMessage(zN.routines))`,
  // so off draws the Code nav row "Routines" and on keeps zN.scheduled "Scheduled". Evidence: official-reference/
  // user-screens/02 (official 4.16336.0, Code mode) labels that row "Scheduled". Its other readers only pick strings
  // (shared-18 cq message set, shared-57 XE untitled name, shared-140 sd delete-dialog copy); no request depends on it.
  __gb__2405438802: true,
  // W14-code r4 E90 / E95 rollback switches (host entries, not desktop GrowthBook flags; looked up by name through
  // growthBookFlagKey). Open: the official layout, which needs the user's GUI check; set false to roll back.
  //   local_popout_traffic_lights: pane windows fill the window and share the title row with the traffic lights
  //     (c3af3d0ed / cd377abb5 data-popout, c5638815a epitaxy-pane-window; pane-window-header.jsx).
  [growthBookFlagKey("local_popout_traffic_lights")]: true,
  //   local_sidebar_hover_card: the Code sidebar rows' 3.6556.2 hover card (shared-20 QO; source-sidebar-hover-card.jsx,
  //     W14-code r4 sidebar-new fr4-07): hover / focus delay 400 ms awaiting, inline Deny / Allow once.
  [growthBookFlagKey("local_sidebar_hover_card")]: true,
  //   local_sidebar_routines: the Code sidebar's 3.6556.2 Routines section (shared-21 p4 / m4 / Q4 and Show › Routines;
  //     source-sidebar-routines.jsx, W14-code r4 sidebar-new fr4-06). false: no section and no Show › Routines item.
  [growthBookFlagKey("local_sidebar_routines")]: true,
  //   local_official_workflow_row: a model-started workflow run in the Code transcript is the renderer's Workflow call —
  //     c96d752d0 F$ (N$'s compact card while it runs, the settled step after) — W14-code r4 ct-feed R4T-08b. false: the
  //     host's WorkflowRow (main.jsx, source-workflow.jsx).
  [growthBookFlagKey("local_official_workflow_row")]: true,
  //   local_pierre_file_viewer: the Files viewer's read-only text body is pierre File in its scroller (cd2efac6e
  //     `a(oi, {className: "h-full overflow-y-auto select-text", children: a(li, {file, options, metrics, style})})`;
  //     source-file-viewer.jsx, W14-code r5 pierre). false: the host's numbered rows (.sfv-line).
  [growthBookFlagKey("local_pierre_file_viewer")]: true,
  //   local_pierre_changes_body: the Changes pane body is c44d00c7f Ju (qu over the pierre CodeView ca7ba268c Ba), which
  //     Jd draws in the main window (`pt = Le(!dt && !Ye)`; source-diff.jsx PierreChangesBody, W14-code r6 pierre,
  //     generated/pierre-changes). false: the host's per-file rows (FileDiff / .sdiff-row).
  [growthBookFlagKey("local_pierre_changes_body")]: true,
  //   local_feed_ooe_scroller (under __gb__4175257006, the Code feed list): the Code transcript scrolls in Aat's scroller
  //     ooe (c4a9ee384 Hp: follow engine c7f8992b4 `x`, Fe.Provider for the list) — W14-code r6 review fix R6T-01 =
  //     gates-r6-01 (source-code-feed.jsx useOfficialFeedScroll). false: the host's scroller (use-transcript-scroll.js).
  [growthBookFlagKey("local_feed_ooe_scroller")]: true,
  //   local_code_stream_snapshot (under __gb__2714218019, code_stream_live_text): the running reply's text is the live
  //     stream's snapshot — the Codex agentMessage deltas fed to c06cf64bb W, read by cd4f82e77 zt and laid over the
  //     entries by c96d752d0 fO (cf74bc599 dw) — W14-code r7 复核 R7T-06 = gates-r7-02 (source-code-transcript.jsx,
  //     code-stream-feed.mjs). false: the reply's text is the engine item's own, as before.
  [growthBookFlagKey("local_code_stream_snapshot")]: true,
  //   local_code_notice_region (W14-code r7 notices, E81 / E95; rollback switch, closed = the official 3P layout): true
  //     brings back the host's Code notice region (source-sleep-notice.jsx SourceCodeNoticeRegion: Ide's providers, the
  //     c227f4d5e slot table, the Rde stack in rI's order) that the round-6 sleep lane mounted; needs the user's GUI check.
  [growthBookFlagKey("local_code_notice_region")]: false,
  //   local_new_page_home (integration-3 review-0 P1; host gate ruling, rollback switch): the Chat / Cowork new page draws
  //     the "home" arm of shared-19 pS (fS.home: columnTopOffsetClass Gx, greetingLockup "compact" → $x Qx
  //     clamp(1.5rem,1.15rem+1vw,2rem) + uS font-ui-serif 360, greetingSlotClass "mt-3 w-full", phone seat "top") instead
  //     of "classic". Officially the arm is GrowthBook __gb__1085985672 new_page_home, live only on the hub home route
  //     (shared-21 Ay `homeLayoutLive: a.gateOn && a.stringsDelivered`; ce73cda51 Ha's outside-hub eligibility is the
  //     constant Va=!1) or through the new-page-layout-latch; it is not in the desktop's Uon, so a 3P desktop draws
  //     classic. The user's official 4.16336.0 (official-reference/user-screens/03, a 1P account) draws home: heading cap
  //     2.36× the sidebar N cap vs 2.85× for classic (38/32), heading ~35–40 px lower — so the host takes that arm.
  //     false: classic (D29 / D31). Read by source-chat-home.jsx newPageLayoutVariant and source-surfaces.jsx.
  [growthBookFlagKey("local_new_page_home")]: true,
});
/**
 * The table key of a GrowthBook feature: shared-0 Do (`function Do(e){if(e.startsWith("__gb__"))return e.slice(6);let
 * t=0;for(…)t=(t<<5)-t+e.charCodeAt(n),t&=t;return((t&4294967295)>>>0).toString()}`) turns a feature name into its id
 * (the desktop's payload is keyed by id), so a generated reader that asks by name ("claudeai_cc_epitaxy_session_presets_main")
 * finds the same entry as one that asks by `__gb__<id>`.
 */
export function growthBookFlagKey(flag) {
  const name = String(flag ?? "");
  if (name.startsWith("__gb__")) return name;
  let hash = 0;
  for (let index = 0; index < name.length; index++) { hash = (hash << 5) - hash + name.charCodeAt(index); hash &= hash; }
  return `__gb__${((hash & 4294967295) >>> 0).toString()}`;
}
export function hostGrowthBookFlag(flag) {
  return HOST_GROWTHBOOK[growthBookFlagKey(flag)] === true;
}
// cds-core wave 8 (cds-wave8/design/plan.json classification b, W8-M2): the two GrowthBook readers cds-core now holds the
// callers of, answered from this one table (no GrowthBook client on the host):
//   shared-0 Ru `function Ru(e){let t=ju();return t?t.isOn(yu(e)):!1}` — no client: false; a listed `true` is on. Same answer
//   as hostGrowthBookFlag (one reader, one table).
//   shared-0 Ku `function Ku(e,t){let n=ju();return n?n.evalFeature(yu(e)).value??t:t}` — no client: the caller's fallback t;
//   a listed value is the feature's value (`?? t` as officially).
export const hostGrowthBookIsOn = hostGrowthBookFlag;
export function hostGrowthBookValue(flag, fallback) {
  const key = growthBookFlagKey(flag);
  return (Object.hasOwn(HOST_GROWTHBOOK, key) ? HOST_GROWTHBOOK[key] : undefined) ?? fallback;
}
