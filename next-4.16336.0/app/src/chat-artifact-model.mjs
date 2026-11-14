// w13-chatfn-artifacts (research/w13-chatfn.md A1–A5): the pure side of Chat artifacts, shared by the main-process store
// (electron/chat-artifact-store.mjs), the `artifacts` agent tool (electron/agent-tools/chat-artifacts.mjs) and the panel
// (src/source-chat-artifact-panel.jsx). Plain node can import it (no React, no DOM, no i18n).
//
// Official 3.6556.2 evidence (ion-dist/assets/v1, read as text):
//   shared-104-CTONUSaz.js `Q`  the artifact MIME types: Text="text/plain", Markdown="text/markdown", Html="text/html",
//                               Code="application/vnd.ant.code", Svg="image/svg+xml", Mermaid="application/vnd.ant.mermaid",
//                               React="application/vnd.ant.react"; `WI` maps an unknown type to Text.
//   shared-104 `HI` / `GI`      the extension of each type; Code by its language (python→py, …, default txt).
//   shared-104 `VI`             the tool input: command create|update|rewrite, id, title, type, language, content, old_str,
//                               new_str (version_uuid / version_number / source / md_citations are server-side fields).
//   ca2ef848d-ChLvq6yZ.js        the file header's split button `ye` (CdsSplitDropdownButton): label "Copy" with items
//                               "Download as {ext}" (`si.toUpperCase()`), "Copy as image" (`ic`: an SVG, ce187ccc8 B / V),
//                               "Add to project" (`j && lt && ce`: the chat is in a project), "Print as PDF" (`To`:
//                               fileSyntax markdown or plaintext); "Publish artifact" / "Share artifact" need claude.ai (E59).
//   frame-shell-header-B1Xokuj0.js nt.versionOrdinal "Version {n}", the history trigger's aria-label
//                               "Version history, {count, plural, one {# version} other {# versions}}".
//   cc1aae219-CeSwM-tp.js        the transcript chip: "Created artifact: {id}" / "Updated artifact: {id}".

// The pieces the main process needs too (the store, the agent tool, main.cjs) live in electron/chat-artifact-types.mjs:
// the package keeps electron/ but leaves src/ out (package.json `--ignore=^/src/…`), so the main side never imports this file.
import { ARTIFACT_CHAT_MISSING, ARTIFACT_COMMANDS, ARTIFACT_ID, ARTIFACT_NOT_FOUND, ARTIFACT_TYPES, ARTIFACT_VERSION_MISSING, artifactExtension,
  artifactType } from '../electron/chat-artifact-types.mjs';
export { ARTIFACT_COMMANDS, ARTIFACT_ID, ARTIFACT_TYPES, CODE_EXTENSIONS, MAX_CONTENT_CHARS, MAX_TITLE_CHARS, MAX_VERSIONS, artifactExtension,
  artifactFileName, artifactType, chatArtifactKey, knowledgeFileName, parseChatArtifactKey } from '../electron/chat-artifact-types.mjs';

// shared-104 HI syntaxName: what ca2ef848d reads as fileSyntax (To: markdown | plaintext prints as PDF).
const TYPE_SYNTAX = Object.freeze({
  [ARTIFACT_TYPES.Text]: 'plaintext', [ARTIFACT_TYPES.Markdown]: 'markdown', [ARTIFACT_TYPES.Html]: 'html', [ARTIFACT_TYPES.Svg]: 'svg',
  [ARTIFACT_TYPES.Code]: 'plaintext', [ARTIFACT_TYPES.Mermaid]: 'mermaid', [ARTIFACT_TYPES.React]: 'tsx',
});

export function artifactSyntax({ type } = {}) {
  return TYPE_SYNTAX[artifactType(type)];
}

// ca2ef848d's file-content failures (the detail view's fetch `V` / `B` / `ee`): a 404 says "This file is no longer
// available." (WEjZqzBur7, failureReason http_404); anything else says "Failed to load file content" (6u3/Jh2Vzp). The
// store's "not found" reads (no such artifact, version or chat) are this app's 404; the main process's own English
// message is never shown. Returns the i18n key the panel passes to t().
const GONE = new Set([ARTIFACT_NOT_FOUND, ARTIFACT_VERSION_MISSING, ARTIFACT_CHAT_MISSING]);
export function artifactReadFailure(failure) {
  const message = typeof failure === 'string' ? failure : failure?.message;
  return GONE.has(message) ? 'This file is no longer available.' : 'Failed to load file content';
}


/**
 * How the panel shows an artifact (chatfn-27 / 27b). The body is the host's file viewer over a file named
 * `<id>.<ext>`: markdown renders, html runs in the sandboxed preview frame (`sandbox="allow-scripts"`, no same origin,
 * file-preview-frame.cjs CSP: connect-src 'none'), svg draws as an image, code and text are highlighted. React and
 * Mermaid need a JSX transpiler / mermaid at run time, which this app does not ship (D27: package.json unchanged), so
 * they stay a code view with a note.
 */
export function artifactRenderer({ type } = {}) {
  switch (artifactType(type)) {
    case ARTIFACT_TYPES.Markdown: return { kind: 'markdown', preview: true };
    case ARTIFACT_TYPES.Html: return { kind: 'html', preview: true, sandbox: 'allow-scripts' };
    case ARTIFACT_TYPES.Svg: return { kind: 'svg', preview: true };
    case ARTIFACT_TYPES.React: return { kind: 'code', preview: false, codeOnly: 'react' };
    case ARTIFACT_TYPES.Mermaid: return { kind: 'code', preview: false, codeOnly: 'mermaid' };
    default: return { kind: 'code', preview: false };
  }
}

/** A best-effort SVG check (ce187ccc8 B parses the text for an <svg> without foreignObject). */
export function looksLikeSvg(text) {
  return typeof text === 'string' && /<svg[\s>]/i.test(text) && !/<foreignObject[\s>]/i.test(text);
}

/**
 * The split button's menu (ca2ef848d `ye` items, in its order) for an artifact: what the host offers, each with the
 * official message. `inProject`: the chat belongs to a project (j && lt && ce). Publish / Share are never offered.
 */
export function artifactActions(artifact = {}, { inProject = false } = {}) {
  const type = artifactType(artifact.type);
  const ext = artifactExtension(artifact).toUpperCase();
  const syntax = artifactSyntax(artifact);
  const actions = [{ id: 'download', message: 'Download as {ext}', values: { ext } }];
  // ic = isSvg && clipboard.write && TC(text): an SVG file whose text parses as an <svg> without foreignObject.
  if (type === ARTIFACT_TYPES.Svg && (typeof artifact.content !== 'string' || looksLikeSvg(artifact.content)))
    actions.push({ id: 'copyAsImage', message: 'Copy as image' });
  if (inProject) actions.push({ id: 'addToProject', message: 'Add to project' });
  if (syntax === 'markdown' || syntax === 'plaintext') actions.push({ id: 'downloadAsPdf', message: 'Print as PDF' });
  return actions;
}

/** The version menu's rows, newest first: {n, current, message: "Version {n}"}. */
export function artifactVersionRows(versions = [], selected = null) {
  const list = Array.isArray(versions) ? versions.filter((entry) => Number.isInteger(entry?.n) && entry.n > 0) : [];
  const latest = list.reduce((max, entry) => Math.max(max, entry.n), 0);
  const shown = Number.isInteger(selected) ? selected : latest;
  return list.slice().sort((a, b) => b.n - a.n).map((entry) => ({ n: entry.n, current: entry.n === shown, latest: entry.n === latest,
    message: 'Version {n}', values: { n: entry.n } }));
}

/** cc1aae219 chip: the call an `artifacts` tool item made ({id, command, updated}) or null. */
export function artifactToolCall(item) {
  if (!item || (item.type !== 'mcpToolCall' && item.type !== 'dynamicToolCall')) return null;
  const server = typeof item.server === 'string' ? item.server : typeof item.namespace === 'string' ? item.namespace : '';
  const tool = typeof item.tool === 'string' ? item.tool : typeof item.name === 'string' ? item.name : '';
  const own = (server === 'code_desktop' || server === 'mcp__code_desktop') ? tool === 'artifacts'
    : !server && (tool === 'code_desktop_artifacts' || tool === 'mcp__code_desktop__artifacts');
  if (!own) return null;
  let args = item.arguments;
  if (typeof args === 'string') { try { args = JSON.parse(args); } catch { args = null; } }
  if (!args || typeof args !== 'object' || Array.isArray(args)) return null;
  const id = typeof args.id === 'string' && ARTIFACT_ID.test(args.id) ? args.id : null;
  if (!id) return null;
  const command = ARTIFACT_COMMANDS.includes(args.command) ? args.command : 'create';
  const failed = item.status === 'failed' || item.status === 'error' || item.result?.isError === true || !!item.error;
  return { id, command, updated: command !== 'create', failed, title: typeof args.title === 'string' ? args.title : null };
}



/**
 * In a Chat, an `artifacts` call is its own chip (cc1aae219), never a member of a tool group: split each group row
 * (file-tool-model groupFileTools: {...first, type: 'fileToolGroup', toolGroup}) around its artifact calls, keeping the
 * order and rebuilding the remaining runs the way groupFileTools does. A failed call stays a tool row (its error).
 */
export function withArtifactChips(rows) {
  if (!Array.isArray(rows)) return rows;
  const chip = (item) => { const call = artifactToolCall(item); return !!call && !call.failed; };
  if (!rows.some((row) => Array.isArray(row?.toolGroup) && row.toolGroup.some(chip))) return rows;
  const out = [];
  for (const row of rows) {
    if (!Array.isArray(row?.toolGroup) || !row.toolGroup.some(chip)) { out.push(row); continue; }
    let run = [];
    const flush = () => { if (run.length > 1) out.push({ ...run[0], type: 'fileToolGroup', toolGroup: run }); else out.push(...run); run = []; };
    for (const member of row.toolGroup) {
      if (chip(member)) { flush(); out.push(member); } else run.push(member);
    }
    flush();
  }
  return out;
}
