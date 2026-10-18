// The Code transcript's tool rows as the 2.42304.0 originals draw them (turnStatusRows on, GrowthBook __gb__2846116625,
// host-growthbook.mjs): every run of tool calls — a host tool group's members, or one standalone tool row — is the
// desktop's tool group n0 (c96d752d0 v2e) over the run's SDK tool calls (transcript-sdk-tools.mjs). v2e coalesces the
// runs, writes the summary, draws one tool alone as its row (p2e → m2e's tool card by name, else the tool row JIe) and a
// longer run as XAe over its members (e0), and each tool row reads its label, verb and meta from c52b02f3f fn by the SDK
// tool name. All of that is generated/transcript-rows/group-status.mjs; this module only provides what the desktop's
// session would (the engine surface, the session scope, the host services in TranscriptToolScope) and keeps the host's
// outer markers (.source-message with data-transcript-item-id / data-tool-group, which the UI scripts and the
// transcript's feed navigation read).
//
// The engine surface (fM): Claude Desktop mounts an alternative engine's own rows through it (mM over JIe:
// epitaxyEngineToolRow; over v2e: withEngineSurfaceScope; v2e's EngineToolGroupDrawing). The host's engine items that
// have a host card — agents (collabAgentToolCall), computer use, image / sleep / hook items — render it inside the
// original group through epitaxyEngineToolRow; every other tool is the original row. The surface gives no
// epitaxyEngineToolResult, so every row's body is the original result body (c96d752d0 KIe → GIe → cb6930dae Tu: the
// terminal output, the pierre diff of an edit, the Shiki-highlighted file preview of a read, the search listings, …).
//
// The session's file contexts the original file links (c856385e2 In) and bodies read, as a local session provides them:
//   SessionFileOpenerProvider (r3b-transcript c856385e2 ot)  open a path in the Files pane: (path, line, endLine, mode)
//   DiffOpenerProvider (Vt)          preferDiff links (an edit's file name) open the Changes pane first: (path) → handled
//   PathResolverProvider (dt, mt)    toAbs / toRel against the session folder (the link checks and resolves paths by it)
//   CurrentSessionIdContext (files-changes c9b8e0296 r)  the session (the link's gone check asks main file:gone)
// and none of: a remote URL (ht: the desktop only links a remote session's files on the web), a links block (_t), a read
// refusal (Y: remote sessions only), missing / output files (c53aca076 / c19ad462c).
import React, { useContext, useMemo } from "react";
import { ToolGroupRows, ToolRow } from "./generated/transcript-rows/group-status.mjs";
import { SessionScopeContext } from "./generated/transcript-rows/rows-cd96b5fdc-ByQr-Uye.mjs";
import { PathResolverProvider, usePathResolver } from "./generated/transcript-rows/rows-c856385e2-DVsjb2QL.mjs";
import { DiffOpenerProvider, SessionFileOpenerProvider } from "./generated/r3b-transcript/session-file-access.mjs";
import { CurrentSessionIdContext } from "./generated/files-changes/session-context.mjs";
import { TranscriptToolScope } from "./transcript-tool-scope.mjs";
import { sdkToolRun } from "./transcript-sdk-tools.mjs";
import { showsThinking } from "./transcript-view-model.mjs";

/** Engine items the host draws with its own card inside an original group (see the header). */
export const HOST_CARD_TYPES = new Set(["collabAgentToolCall", "computerUse", "imageView", "imageGeneration", "sleep", "hookPrompt"]);

const surfaceRows = new WeakMap();
function hostEngineToolRow(Original) {
  if (surfaceRows.has(Original)) return surfaceRows.get(Original);
  function HostEngineToolRow(props) {
    const scope = useContext(TranscriptToolScope);
    const item = props.tool?.hostItem;
    if (item && HOST_CARD_TYPES.has(item.type) && scope.renderHostRow) return scope.renderHostRow(item, props) ?? null;
    return <Original {...props} />;
  }
  surfaceRows.set(Original, HostEngineToolRow);
  return HostEngineToolRow;
}
function NoDrawing() {
  return null;
}
/** The host's engine surface (one object: c96d752d0 pM caches the mounted rows per surface). */
export const HOST_ENGINE_SURFACE = Object.freeze({
  epitaxyEngineToolRow: hostEngineToolRow,
  withEngineSurfaceScope: (Group) => Group,
  // KIe = mM(GIe, (e) => e.epitaxyEngineToolResult): the result body stays the original (GIe → cb6930dae Tu).
  epitaxyEngineToolResult: (Body) => Body,
  EngineToolGroupDrawing: NoDrawing,
});

/**
 * One run of tool calls (`items`: engine items) as the original tool group. `host` carries the host's renderers and
 * session: {sessionKey, cwd, transcriptView, pendingApprovalItemIds, renderHostRow(item, props), renderCard(kind, props),
 * renderImages(images, path), renderMarkdown(text), renderAttachedFiles(tool, placement), openFilePath(path, {line,
 * endLine}), openDiff(path) → handled, liveOutputTask(toolUseId), openLiveOutput(taskId), isMcpAppTool(name), liveTail}.
 * `rest`: the outer element's attributes.
 */
export function SourceToolRun({ items, host = {}, groupKey, rest }) {
  const { sessionKey = null, cwd = null, transcriptView = "normal", pendingApprovalItemIds = null, liveTail = false } = host;
  const tools = useMemo(() => sdkToolRun(items, { awaitingIds: pendingApprovalItemIds }), [items, pendingApprovalItemIds]);
  const scope = useMemo(() => ({
    transcriptView, showThinking: showsThinking(transcriptView), surface: HOST_ENGINE_SURFACE,
    pendingApprovalItemIds,
    renderHostRow: host.renderHostRow ?? null,
    renderImages: host.renderImages ?? null,
    renderMarkdown: host.renderMarkdown ?? null,
    renderAttachedFiles: host.renderAttachedFiles ? (tool, placement) => host.renderAttachedFiles(tool?.hostItem, placement) : null,
    renderCard: (kind, props) => {
      if (kind === "row") return <ToolRow tool={props.tool} />;
      return host.renderCard ? host.renderCard(kind, props) : undefined;
    },
    liveOutputTask: host.liveOutputTask ?? null,
    openLiveOutput: host.openLiveOutput ?? null,
  }), [transcriptView, pendingApprovalItemIds, host.renderHostRow, host.renderImages, host.renderMarkdown, host.renderAttachedFiles, host.renderCard, host.liveOutputTask, host.openLiveOutput]);
  // ot: the desktop opens (path, line, endLine, mode, …) in its Files pane; mode "defaultApp" / "noPreviewPane" pick
  // another surface the host does not have, so every mode opens the Files pane.
  const fileOpener = useMemo(() => (host.openFilePath ? (path, line, endLine) => { host.openFilePath(path, { line, endLine }); } : null), [host.openFilePath]);
  // Vt: (path, {probe}) → whether the Changes pane takes the path (a probe only asks).
  const diffOpener = useMemo(() => (host.openDiff ? (path, options) => (options?.probe === true ? true : host.openDiff(path) === true) : null), [host.openDiff]);
  const resolver = usePathResolver(cwd || null, null, null);
  const session = useMemo(() => (sessionKey ? { sessionId: sessionKey } : null), [sessionKey]);
  const sessionRef = useMemo(() => (sessionKey ? { id: sessionKey, type: "local" } : undefined), [sessionKey]);
  if (!tools.length) return null;
  return <div {...rest} className={`source-message flex w-full min-w-0 flex-col ${rest?.className ?? ""}`.trim()}>
    <SessionScopeContext.Provider value={session}>
      <CurrentSessionIdContext.Provider value={sessionKey}>
        <SessionFileOpenerProvider value={fileOpener}>
          <DiffOpenerProvider value={diffOpener}>
            <PathResolverProvider value={cwd ? resolver : null}>
              <TranscriptToolScope.Provider value={scope}>
                <ToolGroupRows tools={tools} sessionRef={sessionRef} isOwnedSession isMcpAppTool={host.isMcpAppTool} liveTail={!!liveTail}
                  groupKey={groupKey ?? tools[0]?.id} />
              </TranscriptToolScope.Provider>
            </PathResolverProvider>
          </DiffOpenerProvider>
        </SessionFileOpenerProvider>
      </CurrentSessionIdContext.Provider>
    </SessionScopeContext.Provider>
  </div>;
}
