// Host adapters for src/generated/chat-artifact-card (scripts/extract-chat-artifact-card.mjs; the generator checks each
// original declaration's features before it points the slice here). OpenClaude has no claude.ai account (plan-w13 E59):
// a Chat's artifacts are the ones its local `artifacts` tool calls wrote (electron/agent-tools/chat-artifacts.mjs), and
// the "drawer" is the Chat artifact panel beside the conversation (src/source-chat-artifact-panel.jsx).
import { createContext, useContext } from 'react';

// What the Chat's artifact blocks read, provided by src/source-chat-artifact-card.jsx around each block:
//   artifacts    id -> {id, title, type, language}: the artifacts this Chat's tool calls wrote (the conversation's store);
//   selected     the open panel as a drawer item {type: "artifact", id, toolUseId?} or null;
//   closeDrawer  closes the panel.
export const ChatArtifactCardContext = createContext(null);

// shared-104 VI: `o({ version_uuid: BI, version_number: u().int().optional().catch(void 0), command: s(["create","update",
// "rewrite"]).optional().catch(void 0), id: BI, title: BI, type: a(Q).optional().catch(void 0), language: BI, content: BI,
// old_str: BI, new_str: BI, source: s(["c","w"]).optional().catch(void 0), md_citations: i().optional() })` with
// BI = `n().nullish().transform(e => e ?? void 0)`. The same rules without zod: a string field is a string, null or
// absent (anything else fails the parse, as zod throws); the `.catch(void 0)` fields drop an invalid value.
const STRING_FIELDS = ['version_uuid', 'id', 'title', 'language', 'content', 'old_str', 'new_str'];
const COMMANDS = new Set(['create', 'update', 'rewrite']);
const TYPES = new Set(['text/plain', 'text/markdown', 'text/html', 'application/vnd.ant.code', 'image/svg+xml', 'application/vnd.ant.mermaid',
  'application/vnd.ant.react']);
export const chatArtifactsInputSchema = Object.freeze({
  parse(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Expected object');
    const out = {};
    for (const key of STRING_FIELDS) {
      const value = input[key];
      if (value !== undefined && value !== null && typeof value !== 'string') throw new TypeError(`Expected string at ${key}`);
      out[key] = value ?? undefined;
    }
    out.version_number = Number.isInteger(input.version_number) ? input.version_number : undefined;
    out.command = COMMANDS.has(input.command) ? input.command : undefined;
    out.type = TYPES.has(input.type) ? input.type : undefined;
    out.source = input.source === 'c' || input.source === 'w' ? input.source : undefined;
    out.md_citations = input.md_citations;
    return out;
  },
});

// shared-4 DS: `j(ES)[e] === !0`, the transcript's capabilities. `toolResultMarkersTrusted`: the block takes its version
// number from the tool input's version_number — here the local tool's own result names the version it wrote (the host
// copies it into the input), so it is trusted; nothing else is on.
export function useChatTranscriptCapability(name) {
  return name === 'toolResultMarkersTrusted';
}

// shared-2 tE: the drawer context (`x(eE)`); the block only calls closeDrawer (a stopped artifact the panel shows that
// was never written).
const noop = () => {};
export function useChatArtifactDrawer() {
  const host = useContext(ChatArtifactCardContext);
  return { closeDrawer: host?.closeDrawer ?? noop };
}

// shared-130 AY (the conversation's stored artifact) and kY (the streaming one, else the stored one): this Chat's.
export function useChatArtifactRecord(conversationUuid, id) {
  const host = useContext(ChatArtifactCardContext);
  return id && host?.artifacts && Object.hasOwn(host.artifacts, id) ? host.artifacts[id] : undefined;
}
export function useChatArtifactEntry(conversationUuid, id) {
  return useChatArtifactRecord(conversationUuid, id);
}

// c7d03f0bf s: `t(e.selectedDrawerItem)` over the drawer store — the open panel's item.
export function useChatArtifactDrawerSelected(select) {
  const host = useContext(ChatArtifactCardContext);
  return select(host?.selected ?? null);
}
