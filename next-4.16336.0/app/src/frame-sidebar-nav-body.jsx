// The frame-sidebar SidebarNavBody slot on Claude Desktop 4.16336.0: the sliced official nav body (generated/frame-sidebar-nav
// SidebarNavBody = shared-22 PI) under its host (src/frame-sidebar-nav-host.jsx).
//
// Module order is the point of this file (task SB-1 host order, surfaces-prod-3/sidebar/relink-prep/plan.json): the official
// nav chunks call host capabilities while they evaluate (shared-140 defineLazyEntry for its lazy entries), so the host table
// (installFrameSidebarNavHost in frame-sidebar-nav-host.jsx) has to be installed before generated nav-body.mjs is evaluated.
// ES modules evaluate a module's imports in order: frame-sidebar-nav-host.jsx (the table) first, then the nav body.
import React from "react";
import { FrameSidebarNavHost, navigateOfficialPathname, provideNavGroups, provideNavPins } from "./frame-sidebar-nav-host.jsx";
import { SidebarNavBody, frameMountResets } from "./generated/frame-sidebar-nav/nav-body.mjs";
import { PerformanceMetricsProvider } from "./generated/frame-sidebar-nav/shared-4.mjs";
import { AppFeaturesBootstrap } from "./generated/frame-sidebar-nav/shared-23.mjs";
import { provideFrameMountResets, provideOfficialNavigation } from "./frame-sidebar-host.jsx";
// The official hub_sidebar_first_look boundary (shared-20 EC, official export to; sliced root HubSidebarFirstLook, round-4 r6
// sidebar lane, R6-W8D W8D-H1 = A). EC renders DC, which mounts the official session-presets latch (shared-39 Pu, official export
// Ss; cds-core writer_shared39_Pu, round-4 addendum D / R4-Q1: the Au Provider that also writes the module latch ju, read by
// shared-39 Iu / Lu, presets and project grouping) as its `Im` under the look providers; the host no longer mounts Pu itself.
import { HubSidebarFirstLook } from "./generated/frame-sidebar-nav/shared-20.mjs";
// U-NAV-IMPORT: the host's Import history row under the official Customize row (main.jsx sidebarNavValue.openImport).
import { NavImportRow } from "./frame-sidebar-nav-import-row.jsx";
// U-NAV-MENU: the official Code pins (shared-39 Vf, the persisted "dframe-starred-code" store: Kf reads a session id, Jf
// writes it), the Pinned section's source. The host's own Pin / Unpin (session metadata `pinned`) is mirrored into them.
import { Jf as setCodeSessionStarred, Kf as codeSessionStarred } from "./generated/frame-sidebar-nav/shared-39.mjs";
// The Code list's group scope (Group and sort writes nothing without one) and Group by › Model (frame-sidebar-nav-groups.jsx).
import { NAV_GROUP_ANSWERS, holdLocalGroupScope, loadModelGroupChoice } from "./frame-sidebar-nav-groups.jsx";

// The frame-sidebar frameMountResets boundary (vB `useEffect(bB, [])`) is the sliced official shared-22 bB of this graph.
provideFrameMountResets(frameMountResets);
// The router boundary both graphs reuse (shared-25 $u): the nav body's pathnames (shared-57 Ok `/epitaxy/${id}` …) are main.jsx's
// routes through this host (officialPathToHostRoute); frame-sidebar-host.jsx keeps answering the settings routes itself.
provideOfficialNavigation(navigateOfficialPathname);
provideNavPins({ get: codeSessionStarred, set: setCodeSessionStarred });
holdLocalGroupScope();
loadModelGroupChoice();
provideNavGroups(NAV_GROUP_ANSWERS);

// The frame-sidebar SidebarNavBody slot: KR passes PI's props (coworkChecklistMounted, codeSessionListChrome,
// classicSearchRow; official shared-22 KR `o(PI,{coworkChecklistMounted:_,codeSessionListChrome:u,classicSearchRow:de})`).
export function HostSidebarNavBody({ value, ...props }) {
  // The official PerformanceMetricsProvider (shared-4 jk, sliced by this graph; context cds-core ctx_shared4_rO) gives
  // usePerformanceMetrics (shared-4 tA) its value. Official placement is the app root (index vD); in this host the nav body is
  // the only subtree that reads the context, so it wraps the body, inside the host table's provider (its boundaries answer from it).
  // The official app-root appFeatures resolver (shared-23 KA → shared-92 Uv, sliced root AppFeaturesBootstrap): the official app
  // mounts it once at the root; here it sits under the nav host, whose AppFeatures bridge answers main.jsx's supported features
  // (the nav's Scheduled row reads the resolved appFeatures: shared-123 lR → fR → shared-31 Om().codeEnabled).
  // The official hub_sidebar_first_look boundary (shared-20 EC → DC): the official app layout (shared-23) mounts it around the app
  // content; here, like PerformanceMetricsProvider, it wraps the nav body, the subtree that reads its contexts (shared-123 Xu / Yu,
  // shared-1 Lq). DC asks shared-18 BL("device") with the official inputs this host has (Cowork VM delivery status: cds-core
  // hubDeliveryStatusStore, never written here, so the official "unknown" branch; account: useOptionalCurrentAccount; GrowthBook:
  // HOST_GROWTHBOOK; appFeatures.desktopHome: absent, the official answer without an enterprise chatSurface policy), reports the
  // look through cds-core reportHubLook (shared-123 nd → Zu / Qu / $u, read by useHubLook everywhere) and mounts the session-presets
  // latch (cds-core shared-39 Pu, gate claudeai_cc_epitaxy_session_presets_main through cds-core's go / Z boundaries,
  // host-session-presets.mjs) around the nav body, whose rows read Iu / Lu.
  return <FrameSidebarNavHost value={value}><AppFeaturesBootstrap /><PerformanceMetricsProvider><HubSidebarFirstLook><SidebarNavBody {...props} /></HubSidebarFirstLook></PerformanceMetricsProvider><NavImportRow onOpen={value?.openImport} /></FrameSidebarNavHost>;
}
