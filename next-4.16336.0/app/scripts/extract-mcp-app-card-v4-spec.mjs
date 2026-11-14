// The 4.16336.0 source contract of extract-mcp-app-card-v4.mjs: roots, features, raw pins, local cuts, host adapters,
// call sites and the closure allow-list (see extract-mcp-app-card.mjs for the 3.6556.2 contract these were ported from).
const HOST_CHUNK = 'c96d752d0-D9VB6ArX.js';

export const chunks = {
  [HOST_CHUNK]: { target: 'tool-card.mjs',
    roots: { ZB: 'McpAppToolCard', QJe: 'McpAppToolCardBody', cYe: 'McpAppWidgetCard', pJe: 'mcpAppSkipReason', UJe: 'SKIP_REASON_OUTCOME',
      RB: 'isVisualizeMatch', IB: 'stripToolServerPrefix', IJe: 'visualizeStatus', LJe: 'visualizeStatusLabel', zB: 'truncateMiddle',
      LB: 'messageTextForComposer', MJe: 'rememberedWidgetHeight', EB: 'COLLAPSED_WIDGET_HEIGHT', hJe: 'NO_SAFE_AREA_INSETS',
      gJe: 'INLINE_DISPLAY_MODES', _Je: 'PANE_DISPLAY_MODES', PB: 'appRendererChunk', NJe: 'LazyAppRenderer', yJe: 'AUTO_PANE_GATE', xJe: 'SERVER_HEADER_GATE' },
    features: {
      ZB: ["var ZB = w(QJe);"],
      QJe: ["tool: t,", "sessionRef: n,", "fallback: l,", {"loose": "headerlessTitle: d,"}, {"loose": "sharesWithSession: y,"}, {"loose": "drawnWhileWritten: b,"}, {"loose": "savesViewState: x,"}, {"loose": "mcpAppsSandboxProxyUrl: O"}, {"loose": "sessionOwned: L,"}, {"loose": "isSshHostEntry: B,"}, "`mcpApp:${t.id}`", {"loose": "headerlessUnverified: We,"}, {"loose": "callRefused: Fe,"}, {"loose": "callFailed: Ie,"}, {"loose": "sshHostCallNotCompleted: Ue,"}, {"loose": "sshHostSwitchesUnknown: H,"}, {"loose": "isPendingApproval: A,"}, {"loose": "hostResident: ze === \"resident\","}, {"loose": "conversationHash: xe ?? void 0,"}, {"loose": "savesViewState: x === !0,"}, {"loose": "onHoldsRow: $e,"}, {"loose": "heldRowHeight: it?.height,"}, "? \"built_in\"", "? \"first_party\"", "? \"claude_code\"", "? \"connector\"", ": \"other\",", {"loose": "f(wz, { tool: t, defaultOpen: e })"}],
      cYe: [{"loose": "me && { _hostHandlesNotSent: !0 }"}, {"loose": "availableDisplayModes: Jt,"}, "\"data-mcp-app-card\": \"\",", "defaultMessage: \"Widget from {server}\",", "id: \"FhYnU4Hl8w\",", "defaultMessage: \"Widget from {server} on {host}\",", "id: \"H7+OhBL0+m\",", "{ defaultMessage: \"{server} on {host}\", id: \"j7hAGxq49x\" }", "defaultMessage: \"A server on {host}: {server}\",", "defaultMessage: \"Rendering widget\",", "defaultMessage: \"Show in another pane\",", "icon: \"Expand\",", "defaultMessage: \"Showing in another pane\",", "defaultMessage: \"Show here\",", "defaultMessage: \"Show more\",", {"loose": "accessibleTitle: ni,"}, {"loose": "smoothInitialHeight: W,"}, {"loose": "intersectDeclaredFrameDomains: X,"}, "\"[Epitaxy MCP App] ui/message without iframe-originated user activation blocked\",", "if (i !== \"https:\" &&", "\"relative text-muted-as-secondary after:absolute after:-inset-0.5\"", "\"flex min-w-0 gap-xs [&>button]:min-w-0\"", "\"relative flex h-[1lh] shrink-0 items-center\"", "n = Number.isFinite(t) && t > 8;", {"loose": "Te && { _keepMenuClear: In, _reduceMotion: Ln }"}, {"loose": "onmessage: a && Te ? Oi : i ? Si : void 0,"}, {"loose": "ondownloadfile: Te ? zi : void 0,"}, {"loose": "onDisplayModeChange: Wt === null ? void 0 : Za,"}, {"loose": "retrySandboxSetupAfterLoadMs: oe ? fa : 0,"}, {"loose": "onCopyImage: Te ? Wi : void 0,"}, "onCopyText:"],
      pJe: ["? \"unverified\"", "? \"connector_rows_from_elsewhere\"", "? \"conversation_hash_pending\"", "? \"init_error\"", "? \"host_chunk_failed\"", "? \"host_chunk_not_resident\"", "? \"pending_approval\"", "? \"result_payload_missing\"", "? \"call_refused\"", "? \"call_not_run\"", "? \"call_failed\"", "? \"ssh_host_call_not_completed\"", "? \"ssh_host_switches_unknown\"", ": \"sandbox_url_missing\"", "? \"local_client_missing\"", ": \"remote_client_missing\"", ": \"server_unknown\"", ": \"gate_off\";"],
      UJe: ["connector_rows_from_elsewhere: \"rows_from_elsewhere\",", "call_refused: \"result_payload_missing\",", "call_failed: \"result_payload_missing\",", "ssh_host_switches_unknown: \"result_payload_missing\","],
      RB: ["return e?.server.isBuiltIn === !0 &&"],
      IB: ["let n = `mcp__${t}__`;", "let r = `${t}:`;", "let n = e.slice(21);", "if (e.startsWith(\"mcp__\")) {"],
      IJe: ["? \"settled\"", "? \"failed\"", "? \"making\"", "? \"made\""],
      LJe: ["case \"making\":", "case \"made\":", "case \"failed\":", "case \"settled\":", ".making);", ".made);", ".failed);"],
      zB: ["`${n.slice(0, t - 1 - r).join(\"\")}\\u2026${n.slice(-r).join(\"\")}`"],
      LB: ["(e) => (e.type === \"text\" ? [e.text] : [])", "return i.trim() === \"\" ? null : i;"],
      MJe: ["return Number.isFinite(t) && t > 8 ? Math.min(t,"],
      EB: ["var EB = 280;"],
      hJe: ["var hJe = { top: 0, right: 0, bottom: 0, left: 0 };"],
      gJe: ["var gJe = [\"inline\"];"],
      _Je: ["var _Je = [\"inline\", \"fullscreen\"];"],
      PB: ["id: \"epitaxy_mcp_app_host\",", "tier: \"T1\",", "priority: 120,", "pick: (e) => e.AppRenderer,", "ssr: !1,", "(\"placeholder-would-mislead\")", "onChunkError: \"fail-open\","],
      NJe: ["var NJe = PB.Component;"],
      yJe: ["var yJe = \"__gb__2398473450\";"],
      xJe: ["var xJe = \"__gb__3106245306\";"],
    },
    raw: [['"Widget from {server}"', 1], ['"Widget from {server} on {host}"', 1], ['"A server on {host}: {server}"', 1], ['"Rendering widget"', 1],
      ['"Show in another pane"', 1], ['"Showing in another pane"', 1], ['"data-mcp-app-card"', 1], ['retrySandboxSetupAfterLoadMs:', 1],
      ['id:"epitaxy_mcp_app_host"', 1], ['yJe="__gb__2398473450"', 1], ['xJe="__gb__3106245306"', 1], ['sYe="mcp_apps_telemetry_config"', 1],
      ['"call_refused"', 1], ['"call_failed"', 1], ['"ssh_host_call_not_completed"', 1], ['"ssh_host_switches_unknown"', 1]],
    localCuts: {
      wz: { name: 'ToolRowFallback', features: ['(e) => e.epitaxyEngineToolRow,'] },
      Qqe: { name: 'GatedServerHeaderRow', features: ['"group/tool relative flex w-full min-w-0 items-center gap-xs"', { loose: 'manageable: a,' }, { loose: 'children: [o, s, c, u],' }] },
    },
    dynamicImports: { PB: { 'cd9b7fccf-CzNhbnyC.js': '../mcp-app-host-v4/app-renderer.mjs' } } },
  'c52b02f3f-C_QlcoDp.js': { target: 'visual-messages.mjs', roots: { N: 'VISUAL_MESSAGES' }, raw: [['defaultMessage:"Visual from Claude"', 1]], features: {"N": ["defaultMessage: \"Making a visual\"", "defaultMessage: \"Made a visual\"", "defaultMessage: \"Failed to make a visual\"", "defaultMessage: \"Visual from Claude\""]} },
  'c5a04f8c8-BzgeiYHs.js': { target: 'file-save.mjs', roots: { v: 'downloadBlob' }, features: {"v": ["(a.download = t),", "a.click(),", "setTimeout(() => URL.revokeObjectURL(i),"]} },
  // Bx: an MCP server name as a tool-name segment (mcp__<segment>__<tool>), isolated so plain node loads it (E42).
  'shared-183-B2N6Zy4J.js': { target: 'shared-183.mjs', isolate: { target: 'tool-names.mjs', locals: ['Bx'] }, roots: { Bx: 'mcpServerSegment' }, features: {"Bx": ["return e.replace(/[^a-zA-Z0-9_-]/g, \"_\");"]} },
  'shared-123-1Hc1RTKl.js': { target: 'shared-123.mjs', roots: { yE: 'isVisualizeToolName', IC: 'errorTags', LC: 'tagError', X: 'assertNever', Lj: 'claudeInChromeServerName' }, features: {"yE": ["e.startsWith(\"visualize:\")", "e.startsWith(\"mcp__visualize__\")", "e.startsWith(\"mcp__6f616b42-0ed8-571e-823f-ee4aca6b7ce9__\")", "e.startsWith(\"mcp__local_visualize__\")", "e.startsWith(\"mcp__internal_visualize__\")"], "IC": ["var IC = new WeakMap();"], "LC": ["return (IC.set(t, e), t);"], "X": ["\"assert_never\",", "Unhandled discriminated union member: "], "Lj": ["var Lj = \"Claude in Chrome\";"]} },
  'shared-92-BOgyxePb.js': { target: 'shared-92.mjs', roots: { FM: 'variationSelectors' }, features: {"FM": ["var FM = new Set([\"\\uFE0E\", \"\\uFE0F\"]);"]} },
  // Ha: load the public suffix list chunk once (3.6556.2 shared-78 _o); the host does not load it, so the favicon derives
  // no remote URL (letter / globe).
  'shared-62-DoCqVpIq.js': { target: 'shared-62.mjs',
    localCuts: { Ha: { name: 'loadPublicSuffixList', features: [{ loose: 'return typeof window > "u" ? Promise.resolve() : ((Pa ??= Va()), Pa);' }] } } },
  'shared-31-C9BqSSuD.js': { target: 'shared-31.mjs', roots: { dC: 'mcpAppModelContextStore' }, features: {"dC": ["statesByConversation: {},", "readBackByConversation: {},", "updateModelContext: async (n, r, i, a) => {"]} },
};
export const adapters = {
 "shared-36-fqRFYwOb.js": {
  "Eo": {
   "name": "appearanceSettingsStore",
   "local": "Om",
   "features": [
    {
     "loose": "chatTextSize: Sg(Ag.chatTextSize) ? Ag.chatTextSize : \"m\","
    },
    "setChatTextSize: (t) => e({ chatTextSize: t }),"
   ]
  }
 },
 "cc0e3547f-B7QVH-Nw.js": {
  "A": {
   "name": "AppSignInOverlay",
   "local": "yt",
   "features": [
    "\"pointer-events-auto absolute inset-0 z-[5] bg-bg-100/60\""
   ]
  },
  "k": {
   "name": "AppSignInPrompt",
   "local": "_t",
   "features": [
    "chromeClassName: \"border-b-0.5 bg-surface-1 px-3 py-2\","
   ]
  },
  "S": {
   "name": "cancelWidgetLoadTiming",
   "local": "Ft",
   "features": [
    "clearTimeout(t.deadlineTimer)"
   ]
  },
  "y": {
   "name": "endWidgetLoadTiming",
   "local": "Lt",
   "features": [
    ".isInstanceLive() ||",
    "toolResultIsError:"
   ]
  },
  "w": {
   "name": "markWidgetHandoff",
   "local": "Nt",
   "features": [
    "\"handoff\""
   ]
  },
  "x": {
   "name": "markWidgetInitialized",
   "local": "At",
   "features": [
    "\"guest_initialize_deadline\"",
    "\"success\""
   ]
  },
  "C": {
   "name": "markWidgetLoadError",
   "local": "jt",
   "features": [
    "kind: \"load_failure\""
   ]
  },
  "T": {
   "name": "markWidgetResultClean",
   "local": "Pt",
   "features": [
    ".toolResultSettledClean = !0",
    "\"failure\""
   ]
  },
  "b": {
   "name": "startWidgetLoadTiming",
   "local": "kt",
   "features": [
    "startMs: performance.now(),",
    "toolResultSettledClean: t.toolResult === \"clean\","
   ]
  },
  "_": {
   "name": "useAppSignInParking",
   "local": "Rt",
   "features": [
    "\"Another request from this app is already waiting for you to sign in.\""
   ]
  },
  "p": {
   "name": "useMcpAppFileIntoTranscript",
   "local": "rn",
   "features": [
    "mayFile()",
    "hiddenLineHazard",
    "\"hidden_characters\"",
    "\"not_here\""
   ]
  }
 },
 "ca5db7aaf-C8dMH-IH.js": {
  "u": {
   "name": "canExpandTile",
   "local": "j",
   "features": [
    "e.hasSidePanes &&",
    ".toggleExpandedTile)",
    ".tileLayout).has(t)"
   ]
  }
 },
 "shared-11-CNsu0Zu8.js": {
  "Pt": {
   "name": "chunkGateAttributes",
   "local": "Iv",
   "features": [
    "preload_reason:",
    "stamp_age_h:"
   ]
  },
  "Ft": {
   "name": "mcpAppRecentUse",
   "local": "jv",
   "features": [
    "\"tool_cell_mcp_app\""
   ]
  }
 },
 "c227f4d5e-DGDdGBTz.js": {
  "ga": {
   "name": "cleanSendText",
   "local": "TR",
   "features": [
    "removedCount: 0"
   ]
  },
  "ba": {
   "name": "keepSplitForTile",
   "local": "xR",
   "features": [
    ".keepSplit = !0"
   ]
  }
 },
 "cb3e475a7-DVRcQh8O.js": {
  "n": {
   "name": "findMcpAppToolServer",
   "local": "P",
   "features": [
    "hubClientToolNames === !0",
    "\"lcl-\"",
    "serverUuid: r.server.uuid"
   ]
  }
 },
 "cef1e6037-Dm5Rlsox.js": {
  "I": {
   "name": "isBridgeHeldSession",
   "local": "Kt",
   "features": [
    {
     "loose": "function Tt(e){return M.has(e)}"
    }
   ]
  },
  "U": {
   "name": "useIsSshHostEntry",
   "local": "Mn",
   "features": [
    ".bySession[e], t) !== void 0"
   ]
  },
  "J": {
   "name": "useProxiedConnectorCall",
   "local": "wn",
   "features": [
    {
     "loose": "sessionRef: n,"
    },
    "toolUseId: r,",
    {
     "loose": "wanted: a"
    },
    ".calls["
   ]
  },
  "q": {
   "name": "useSessionCliMcpServers",
   "local": "jn",
   "features": [
    "t.bySession[e];",
    "return n?.length ? n : void 0;"
   ]
  },
  "V": {
   "name": "useSessionMcpClient",
   "local": "Wt",
   "features": [
    {
     "loose": "sessionId: n,"
    },
    "serverSegment: r,",
    "sessionOwned: i,",
    "isSshHostEntry: a",
    {
     "loose": ".clients, n, r, c"
    }
   ]
  },
  "Y": {
   "name": "useSshReconnectGeneration",
   "local": "Pn",
   "features": [
    "e === void 0 ? 0 : (t.bySession[e] ?? 0)"
   ]
  },
  "K": {
   "name": "useSshServerHold",
   "local": "mn",
   "features": [
    ".here[a] === void 0",
    ".sshHost[a]",
    "held: f,",
    "sshHost: p"
   ]
  },
  "B": {
   "name": "useConnectorRowsHere",
   "local": "hn",
   "features": [
    {
     "loose": "r=vn(e,t)"
    },
    {
     "loose": "yn(n,r)"
    }
   ]
  },
  "G": {
   "name": "useSessionMcpState",
   "local": "Fn",
   "features": [
    {
     "loose": "n=jn(e)"
    },
    {
     "loose": "n?xe(t,n):t"
    }
   ]
  }
 },
 "c68c4283d-FxwfdZSA.js": {
  "Ln": {
   "name": "logQuestionForm",
   "local": "jc",
   "features": [
    "\"claudeai.epitaxy.mcp_app.question_form\""
   ]
  },
  "Cf": {
   "name": "logSidePaneOpened",
   "local": "Hd",
   "features": [
    "opened: !0,",
    "presentation:",
    "\"overlay\"",
    "\"split\""
   ]
  },
  "Df": {
   "name": "logSidePaneToggled",
   "local": "U",
   "features": [
    "\"claudeai.epitaxy.side_pane.toggled\""
   ]
  },
  "Rn": {
   "name": "logWidgetFallback",
   "local": "kc",
   "features": [
    "\"claudeai.epitaxy.mcp_app.widget_fallback\""
   ]
  },
  "zn": {
   "name": "logWidgetMounted",
   "local": "Ac",
   "features": [
    "\"claudeai.epitaxy.mcp_app.widget_mounted\""
   ]
  }
 },
 "c06cf64bb-CoZso5N4.js": {
  "_t": {
   "name": "pendingTurnArmedAt",
   "local": "Jk",
   "features": [
    ".pendingTurn?.armedAt"
   ]
  },
  "sn": {
   "name": "usePendingTurnLocalArmed",
   "local": "sk",
   "features": [
    {
     "loose": "function sk(e){return X(e,ck)}"
    }
   ]
  },
  "ht": {
   "name": "localArmedPendingTurnAt",
   "local": "Yk",
   "features": [
    ".pendingTurn?.localArmed === !0 ?"
   ]
  }
 },
 "preload-helper-BBljBeZo.js": {
  "t": {
   "name": "preloadChunk",
   "local": "s",
   "features": [
    "\"vite:preloadError\""
   ]
  }
 },
 "c5da7eb42-aEqbSKbC.js": {
  "Er": {
   "name": "questionPromptsStore",
   "local": "sw",
   "features": [
    "promptsBySession: {},",
    "\"trailing\""
   ]
  },
  "Jr": {
   "name": "questionHostDelivery",
   "local": "kS",
   "features": [
    "\"not_host_delivered\"",
    "\"host_delivered\""
   ]
  },
  "qr": {
   "name": "questionSourceOf",
   "local": "jS",
   "features": [
    "\"no_single_server\"",
    "\"not_sent\""
   ]
  },
  "Kr": {
   "name": "questionHostDelivered",
   "local": "OS",
   "features": [
    {
     "loose": "if(n===void 0||!DS(n,t))return!1"
    }
   ]
  }
 },
 "shared-25-D-aF0gt9.js": {
  "Fg": {
   "name": "readGrowthBookGate",
   "local": "ko",
   "features": [
    {
     "loose": "return $o(J1($,0,e)?K1($,0,e,H(e)):$[1]).on"
    }
   ]
  },
  "Rg": {
   "name": "readGrowthBookGate",
   "local": "Vo",
   "features": [
    {
     "loose": "return Ho(e).on"
    }
   ]
  },
  "Wg": {
   "name": "readGrowthBookFlag",
   "local": "Mo",
   "features": [
    "!n?.growthbook"
   ]
  }
 },
 "shared-0-CnnWnVrT.js": {
  "dn": {
   "name": "useHostConfiguration",
   "local": "y4",
   "features": [
    "\"useConfiguration must be called from within ConfigurationProvider\""
   ]
  },
  "xm": {
   "name": "reportHandledError",
   "local": "eP",
   "features": [
    {
     "loose": "eP=P(iP,N.O11Y_INTERNALS)"
    }
   ],
   "also": {
    "iP": [
     "source: \"handled_severe\",",
     "handled_reason: e,"
    ]
   }
  }
 },
 "c9d6d9802-DYBH81aC.js": {
  "r": {
   "name": "useApprovedFrameDomains",
   "local": "F",
   "features": [
    {
     "loose": "remoteServerUuid: r"
    },
    "\"mcp_apps_frame_domains\""
   ]
  }
 },
 "shared-62-DoCqVpIq.js": {
  "Jf": {
   "name": "useDynamicConfig",
   "local": "RS",
   "features": [
    {
     "loose": "function Kp(e){let $=J9(5),t=We(),n=J1($,0,e)?K1($,0,e,fr(e)):$[1];return J2($,2,t,n)?K2($,2,t,n,Re(t,n)):$[4]}"
    }
   ]
  }
 },
 "vendor-intl-BJgYK7RA.js": {
  "p": {
   "name": "useIntl",
   "local": "q",
   "features": [
    {
     "loose": "function q(){let e=a(K);return Mt(e),e}"
    }
   ]
  },
  "l": {
   "name": "FormattedMessage",
   "local": "Gt",
   "features": [
    {
     "loose": "Gt=a(Wt,Ut)"
    }
   ]
  }
 },
 "c03935b01-BylKMWqe.js": {
  "bt": {
   "name": "useMainPaneHost",
   "local": "Of",
   "features": [
    {
     "loose": "function gu(){let e=Q(_u);return pu()&&e}"
    }
   ]
  },
  "Et": {
   "name": "usePaneStore",
   "local": "Q",
   "features": [
    {
     "loose": "function Q(e){let t=f(Z);return Ye(t??su,e)}"
    }
   ]
  },
  "Dt": {
   "name": "usePaneStoreContext",
   "local": "wf",
   "features": [
    {
     "loose": "function fu(){return f(Z)}"
    }
   ]
  }
 },
 "cc6e65d4b-CkNcfjau.js": {
  "r": {
   "name": "useOpenConfirmedLink",
   "local": "S",
   "features": [
    {
     "loose": ".getState().setPendingPreviewLinkUrl(r, { explicit: !0 })"
    }
   ]
  }
 },
 "cd4f82e77-Cuw99s6A.js": {
  "b": {
   "name": "useSidePaneAutoOpen",
   "local": "Mn",
   "features": [
    "sessionId: e,",
    "messageId: t,",
    "toolId: n,",
    "enabled: r,",
    "none: !1,"
   ]
  }
 },
 "c87a7a2df-2Qex5zmu.js": {
  "i": {
   "name": "useSidePanePortalHost",
   "local": "g",
   "features": [
    "\"h-full w-full\""
   ]
  },
  "n": {
   "name": "SidePanePortalSlot",
   "local": "v",
   "features": [
    "{ host: n } = t,",
    "className: \"h-full w-full\""
   ]
  }
 },
 "cc6e9624e-QSsNXeYh.js": {
  "u": {
   "name": "useTranscriptRowExpanded",
   "local": "m",
   "features": [
    ".getState().setRowExpanded(e, n);",
    "(t) => t.rows[e]"
   ]
  }
 },
 "shared-123-1Hc1RTKl.js": {
  "kh": {
   "name": "cachedResourceMeta",
   "local": "jO",
   "features": [
    {
     "loose": "function BI(e,t){return LI.get(zI(t,e))?.meta}"
    }
   ]
  },
  "Et": {
   "name": "defineLazyChunk",
   "local": "W$",
   "features": [
    "e.options.suspense === !0",
    "\"ui-unsized\"",
    "\"placeholder\""
   ]
  },
  "Kv": {
   "name": "useInCodeRoute",
   "local": "GS",
   "features": [
    ".isCCDRoute"
   ]
  },
  "$b": {
   "name": "useMcpAppPaneSupported",
   "local": "K_",
   "features": [
    "?.epitaxyMcpAppPane?.status === \"supported\""
   ]
  },
  "ex": {
   "name": "useMcpAppsEnabled",
   "local": "W_",
   "features": [
    "?.epitaxyMcpApps",
    "status === \"supported\""
   ]
  }
 },
 "shared-183-B2N6Zy4J.js": {
  "cf": {
   "name": "connectRemoteMcpServer",
   "local": "Uw",
   "features": [
    "waitWhileTurnedOff: n = !1",
    ".remoteConnectionStates["
   ]
  },
  "Vf": {
   "name": "isSessionOwnedServer",
   "local": "QT",
   "features": [
    {
     "loose": "function dw(e,t){return cw.get(e)?.has(t)===!0}"
    }
   ]
  },
  "uf": {
   "name": "matchSessionMcpTool",
   "local": "dE",
   "features": [
    "?.toolsEnumerated === !1",
    "\"forLabel\""
   ]
  },
  "im": {
   "name": "mcpClientsStore",
   "local": "X",
   "features": [
    {
     "loose": "X=Zl()(By(Xl((...e)=>({...Rc(...e),...Mb(...e)}))))"
    }
   ]
  },
  "Fm": {
   "name": "RemoteMcpClient",
   "local": "rx",
   "features": [
    "this.inflightRequestCount = 0",
    "disconnectIfNoOngoingRequests()"
   ]
  },
  "_r": {
   "name": "useLazyChunkState",
   "local": "DJ",
   "features": [
    "reportWait",
    "e.preload(\"open\")"
   ]
  }
 },
 "shared-39-ZCs0lAwB.js": {
  "$n": {
   "name": "toolApprovalStore",
   "local": "$y",
   "features": [
    "requestsBySession: {},",
    "addRequest: (t) => {",
    "setRequestStatus:"
   ]
  }
 },
 "c5a04f8c8-BzgeiYHs.js": {
  "t": {
   "name": "useSaveFile",
   "local": "y",
   "features": [
    "\"claudeai.ochre_wren.download_sign\""
   ]
  }
 },
 "vendor-query-Bl2Kfzgk.js": {
  "d": {
   "name": "QueryClientContext",
   "local": "q",
   "features": [
    {
     "loose": "q=o(void 0)"
    }
   ]
  }
 },
 "c2fd10b8d-DEwP4IO5.js": {
  "Fa": {
   "name": "registerPaneQuestion",
   "local": "_c",
   "features": [
    {
     "loose": "let a=dc.get(e)??new Map"
    }
   ]
  },
  "Ma": {
   "name": "isPaneQuestionBackOpen",
   "local": "Ac",
   "features": [
    {
     "loose": "n?.back===!1&&(t===void 0||n.toolUseId===t)"
    }
   ]
  },
  "Ra": {
   "name": "usePaneQuestionBackOpen",
   "local": "jc",
   "features": [
    {
     "loose": "e!==null&&Ac(e,t)"
    }
   ]
  },
  "Aa": {
   "name": "closePaneQuestionBack",
   "local": "kc",
   "features": [
    {
     "loose": "Dc.delete(e),t.end(),hc(),t.toolUseId"
    }
   ]
  },
  "za": {
   "name": "usePaneQuestionCount",
   "local": "Mc",
   "features": [
    {
     "loose": "(e&&Oc.get(e)?.get(t))??0"
    }
   ]
  },
  "Na": {
   "name": "isPaneQuestionHeld",
   "local": "wc",
   "features": [
    {
     "loose": "function wc(e){return Cc.has(e)}"
    }
   ]
  },
  "Ia": {
   "name": "usePaneQuestionAnswered",
   "local": "Ec",
   "features": [
    "paneStore: t,",
    "cannotStart: a,",
    "e.onAnswered?.(!0)"
   ]
  }
 },
 "c8b5c2821-DrjqITWr.js": {
  "B": {
   "name": "useSessionFamilyApprovals",
   "local": "B",
   "features": [
    ".requestsBySession[t]",
    "t.sessions, e"
   ]
  },
  "z": {
   "name": "hasPendingApprovalInFamily",
   "local": "he",
   "features": [
    "e.status === \"pending\"",
    "requestsBySession: t"
   ]
  }
 },
 "cbec108f3-BRX95MA5.js": {
  "i": {
   "name": "usePanelFirst",
   "local": "l",
   "features": [
    "panelFirst: t,",
    "paneReady: r"
   ]
  }
 },
 "c5dea2982-sL3SapZ-.js": {
  "o": {
   "name": "registerMcpAppViewTools",
   "local": "B",
   "features": [
    "\"mcp_app_view_tools_unavailable\""
   ]
  }
 },
 "shared-5-u8kha2eH.js": {
  "_p": {
   "name": "persistedValuesLoading",
   "local": "I_",
   "features": [
    {
     "loose": "return On?.getPreferences!==void 0&&a_!==void 0&&i_===void 0"
    }
   ]
  },
  "bp": {
   "name": "readPersistedValue",
   "local": "L_",
   "features": [
    "`persisted.${e}`"
   ]
  },
  "Op": {
   "name": "usePersistedValue",
   "local": "U_",
   "features": [
    "`persisted.${e}`"
   ]
  },
  "kp": {
   "name": "writePersistedValue",
   "local": "z_",
   "features": [
    "`persisted.${e}`"
   ]
  }
 }
};
export const callSites = [
  { source: HOST_CHUNK, binding: "M$e", role: "Transcript row kinds: a tool the session marks as an MCP App tool is its own \"mcp_app\" row, not a tool group member",
    features: ["t.isMcpAppTool?.(e.name)", "? \"mcp_app\""] },
  { source: HOST_CHUNK, binding: "Y$e", role: "Solo tool row: in an owned session an MCP App tool is ZB with savesViewState (no fallback; ZB falls back to wz)",
    features: ["tool: t.tools[0],", "sessionRef: n,", "onPrefillComposer: r,", "savesViewState: !0,"] },
  { source: HOST_CHUNK, binding: "GW", role: "Grouped tool row: the same ZB with the group row as fallback and savesViewState",
    features: [{"loose": "tool: d,"}, "sessionRef: a,", "onPrefillComposer: o,", {"loose": "fallback: E,"}, "savesViewState: !0,"] },
  { source: HOST_CHUNK, binding: "snt", role: "Channel visualize widget (Cowork / channels, not the Code transcript): ZB with sharesWithSession false and the channel props",
    features: ["\"data-testid\": \"channel-widget-visualize\",", "sharesWithSession: !1,", "drawCards: m,", {"loose": "unboxed: w,"}, {"loose": "drawnWhileWritten: I,"}] },
];
export const ALLOWED_CLOSURE_CHUNKS = [
  'c03935b01-BylKMWqe.js',
  'c0532af3d-CvAg_NYA.js',
  'c16f659b9-Lmh4bP4f.js',
  'c276141f2-rCRo95z9.js',
  'c2fe82d8c-CW-G2LID.js',
  'c425fb3cf-Gc8R9PSy.js',
  'c4a9ee384-BWj_BT12.js',
  'c4aadae05-C5n0aS02.js',
  'c4acc1503-BXsdaWDM.js',
  'c4e84d61d-DGahuBzY.js',
  'c531c760b-C4CteqY-.js',
  'c5da7eb42-aEqbSKbC.js',
  'c7407a74b-DfIefIC1.js',
  'c81ea1931-ChuE7vym.js',
  'c87a7a2df-2Qex5zmu.js',
  'c87c3b28f-9GgpBGw3.js',
  'c8f38bf1f-B4N4qS0l.js',
  'c9081d688-BX2sunDu.js',
  'c91e0ef26-CZBX0cDf.js',
  'c9d6d9802-DYBH81aC.js',
  'ca54373d2-CQSkPIrz.js',
  'cb3e475a7-DVRcQh8O.js',
  'cbae7e792-CCgc6kmN.js',
  'cc0e3547f-B7QVH-Nw.js',
  'cc44b66a7-CBE7MOEW.js',
  'cc6e28b86-Cu2obdhN.js',
  'cced621b6-BzJn1GRx.js',
  'ccef66963-yvZ3gf1m.js',
  'cdea36161-Cu5PNWsg.js',
  'ce046217f-k8kVATJC.js',
  'cef1e6037-Dm5Rlsox.js',
  'cf53e1812-B98_08tN.js',
  'cfb7671b3-D5-4wke0.js',
  'shared-0-CnnWnVrT.js',
  'shared-1-D1bGaTaN.js',
  'shared-11-CNsu0Zu8.js',
  'shared-12-DVKzjo12.js',
  'shared-140-DfG6VwpK.js',
  'shared-153-DMw2VzSq.js',
  'shared-18-Cfqwgjc5.js',
  'shared-2-CsjIBQD8.js',
  'shared-212-BHMAi0oa.js',
  'shared-25-D-aF0gt9.js',
  'shared-26-B-POtn5S.js',
  'shared-33-DtdykY0y.js',
  'shared-36-fqRFYwOb.js',
  'shared-4-C_EiQb9h.js',
  'shared-5-u8kha2eH.js',
  'shared-55-BRv2XBP7.js',
  'shared-62-DoCqVpIq.js',
  'shared-8-BqfCbkJd.js',
  'vendor-all-0-uUCo-eCX.js',
];
export const PLAIN_NODE_TARGETS = ['tool-names.mjs'];
export const allowedGlobals = new Set([
  'Math', 'Number', 'Array', 'Object', 'Error', 'TypeError', 'RangeError', 'SyntaxError', 'DOMException', 'Proxy', 'ArrayBuffer', 'DataView', 'String', 'Boolean', 'Set', 'Map', 'WeakMap', 'WeakSet', 'JSON', 'Symbol', 'Promise',
  'RegExp', 'Date', 'Intl', 'Reflect', 'BigInt', 'Function', 'Uint8Array', 'globalThis', 'decodeURIComponent', 'encodeURIComponent', 'decodeURI', 'encodeURI', 'TextDecoder', 'console', 'localStorage', 'sessionStorage', 'Element', 'HTMLElement', 'MutationObserver', 'ResizeObserver', 'IntersectionObserver', 'getComputedStyle',
  'window', 'document', 'navigator', 'performance', 'crypto', 'TextEncoder', 'URL', 'URLSearchParams', 'AbortController', 'setTimeout', 'clearTimeout', 'atob',
  'Node', 'Infinity', 'NaN', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'location', 'Blob', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame',
  'Uint32Array',
]);
