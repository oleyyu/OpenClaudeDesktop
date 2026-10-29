// w13-chatfn-artifacts (research/w13-chatfn.md A1, chatfn-25/26): the official Chat's server-side `artifacts` tool on
// the local side. Its input is the 3.6556.2 frontend's shape for the tool (shared-104-CTONUSaz.js VI: command
// create|update|rewrite, id, title, type, language, content, old_str, new_str; the server-only version_uuid /
// version_number / source / md_citations are not taken). Each write is a new version in the chat's local store
// (electron/chat-artifact-store.mjs, through ctx.chatArtifacts from main.cjs host.provide); the transcript shows the
// call as cc1aae219's "Created artifact: {id}" / "Updated artifact: {id}" chip, which opens the artifact panel.
// ctx.chatArtifacts: { apply(args) → {command, created, artifact: {id, title, type, version, extension}} }
import { ARTIFACT_COMMANDS, ARTIFACT_TYPES, CODE_EXTENSIONS } from '../chat-artifact-types.mjs';

export const group = 'artifacts';
export const surfaces = ['chat'];

function service(ctx) {
  const store = ctx?.chatArtifacts;
  if (!store || typeof store.apply !== 'function') throw new Error('Artifacts aren’t available here.');
  return store;
}

/** The tool's text for the model: the official chip's words, plus the version it made. */
export function resultText({ created, artifact }) {
  return `${created ? 'Created' : 'Updated'} artifact: ${artifact.id} (version ${artifact.version}, ${artifact.type}${artifact.language ? `, ${artifact.language}` : ''}).`;
}

export const tools = [
  {
    name: 'artifacts',
    title: 'Artifacts',
    description: 'Create and edit artifacts: substantial, self-contained content the user will likely reuse, edit or download '
      + '(documents, code files, HTML pages, SVG images, diagrams). The user sees each artifact in a panel beside the chat, with '
      + 'its versions. Use it for content over about 20 lines or anything the user asks to keep; answer short things in the reply. '
      + 'command "create" writes a new artifact (id: a short kebab-case name you choose, title, type, content; creating an existing id '
      + 'adds a new version). "update" replaces old_str with new_str in the latest version: old_str must match exactly once, so copy '
      + 'it with enough context. "rewrite" replaces the whole content with a new version. Types: text/markdown, text/html (one '
      + 'self-contained page; scripts run sandboxed and cannot fetch), image/svg+xml, application/vnd.ant.code (set language), '
      + 'text/plain, application/vnd.ant.mermaid and application/vnd.ant.react (both shown to the user as code here).',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', enum: [...ARTIFACT_COMMANDS], description: 'create, update or rewrite.' },
        id: { type: 'string', pattern: '^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$', description: 'The artifact’s id (kebab-case); the same id for every edit.' },
        title: { type: 'string', description: 'A short title shown in the panel and the Artifacts library.' },
        type: { type: 'string', enum: Object.values(ARTIFACT_TYPES), description: 'The content type (create; rewrite may change it).' },
        language: { type: 'string', description: `For application/vnd.ant.code: ${Object.keys(CODE_EXTENSIONS).join(', ')}.` },
        content: { type: 'string', description: 'The full content (create, rewrite).' },
        old_str: { type: 'string', description: 'update: the exact text to replace; it must appear exactly once.' },
        new_str: { type: 'string', description: 'update: the replacement text.' },
      },
      required: ['command', 'id'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    handler: async (args = {}, ctx) => resultText(await service(ctx).apply(args)),
  },
];
