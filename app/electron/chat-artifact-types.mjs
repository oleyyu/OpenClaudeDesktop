// w13-chatfn-artifacts (research/w13-chatfn.md A1, A2): the Chat artifact facts both sides need — the main process (the
// store electron/chat-artifact-store.mjs, the `artifacts` agent tool, main.cjs) and the renderer (src/chat-artifact-model.mjs
// re-exports these). It lives under electron/ because the packaged app keeps electron/ but leaves src/ out except for a
// few named models (package.json `--ignore='^/src/(?!(…)\.mjs$)'`), and main must not import a file the package drops.
// Plain node can import it (no React, no DOM, no i18n).
//
// Official 3.6556.2 evidence (ion-dist/assets/v1, read as text):
//   shared-104-CTONUSaz.js `Q`  the artifact MIME types: Text="text/plain", Markdown="text/markdown", Html="text/html",
//                               Code="application/vnd.ant.code", Svg="image/svg+xml", Mermaid="application/vnd.ant.mermaid",
//                               React="application/vnd.ant.react"; `WI` maps an unknown type to Text.
//   shared-104 `HI` / `GI`      the extension of each type; Code by its language (python→py, …, default txt).
//   shared-104 `VI`             the tool input's command: create | update | rewrite.
//   ca2ef848d-ChLvq6yZ.js `j2`   Add to project uploads `new File([text], cS(t.path))`: the artifact's text under its file name.

export const ARTIFACT_TYPES = Object.freeze({
  Text: 'text/plain',
  Markdown: 'text/markdown',
  Html: 'text/html',
  Code: 'application/vnd.ant.code',
  Svg: 'image/svg+xml',
  Mermaid: 'application/vnd.ant.mermaid',
  React: 'application/vnd.ant.react',
});
const TYPE_VALUES = new Set(Object.values(ARTIFACT_TYPES));
export const ARTIFACT_COMMANDS = Object.freeze(['create', 'update', 'rewrite']);

// shared-104 HI: Code's extension by language (the switch, in order), else "txt".
export const CODE_EXTENSIONS = Object.freeze({
  python: 'py', javascript: 'js', typescript: 'ts', java: 'java', csharp: 'cs', go: 'go', rust: 'rs', ruby: 'rb', php: 'php',
  swift: 'swift', kotlin: 'kt', dart: 'dart', scala: 'scala', perl: 'pl', elixir: 'ex', haskell: 'hs', clojure: 'clj', r: 'r',
  groovy: 'groovy', bash: 'sh', css: 'css', scss: 'scss', less: 'less', sql: 'sql', graphql: 'graphql', json: 'json', html: 'html',
});
const TYPE_EXTENSIONS = Object.freeze({
  [ARTIFACT_TYPES.Text]: 'txt', [ARTIFACT_TYPES.Markdown]: 'md', [ARTIFACT_TYPES.Html]: 'html', [ARTIFACT_TYPES.Svg]: 'svg',
  [ARTIFACT_TYPES.Mermaid]: 'mermaid', [ARTIFACT_TYPES.React]: 'tsx',
});

/** shared-104 WI: a known artifact type, else text/plain. */
export function artifactType(type) {
  return TYPE_VALUES.has(type) ? type : ARTIFACT_TYPES.Text;
}
/** shared-104 GI: the file extension of an artifact {type, language}. */
export function artifactExtension({ type, language } = {}) {
  const known = artifactType(type);
  // shared-104 HI [Q.Code].extension: `switch(e?.language){case"python":return"py";…}` — the name as the model gave it,
  // case and all ("Python" is txt there too; w13-close-main-process, chatfn-artifacts review low 3).
  if (known === ARTIFACT_TYPES.Code) return (typeof language === 'string' && Object.hasOwn(CODE_EXTENSIONS, language) ? CODE_EXTENSIONS[language] : null) ?? 'txt';
  return TYPE_EXTENSIONS[known];
}

// Ids are the model's own names (official ids read like "quarterly-report"); kept to a safe file-name subset.
export const ARTIFACT_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
export const MAX_TITLE_CHARS = 200;
export const MAX_CONTENT_CHARS = 1024 * 1024;
export const MAX_VERSIONS = 200;

// The store's read failures the panel shows as ca2ef848d's http_404 copy "This file is no longer available."
// (WEjZqzBur7); any other failure shows "Failed to load file content" (6u3/Jh2Vzp). src/chat-artifact-model.mjs
// artifactReadFailure maps them.
export const ARTIFACT_NOT_FOUND = 'Artifact not found.';
export const ARTIFACT_VERSION_MISSING = 'That version of the artifact isn’t available.';
export const ARTIFACT_CHAT_MISSING = 'This chat isn’t available.';

/** The artifact's file name, `<id>.<ext>` (what the panel's viewer, the library row's path and Add to project use). */
export function artifactFileName(artifact = {}) {
  return `${artifact.id || 'artifact'}.${artifactExtension(artifact)}`;
}

/** The library rows' key for a Chat artifact (the Cowork rows' keys are JSON arrays, artifact-index.mjs). */
export function chatArtifactKey(threadId, id) {
  return `chat:${threadId}:${id}`;
}
export function parseChatArtifactKey(key) {
  const match = /^chat:(.+):([A-Za-z0-9][A-Za-z0-9_-]{0,127})$/.exec(typeof key === 'string' ? key : '');
  return match ? { threadId: match[1], id: match[2] } : null;
}

/** The project-knowledge file an artifact is added as (ca2ef848d j2: the text under the artifact's file name). */
export function knowledgeFileName(artifact = {}) {
  return artifactFileName(artifact);
}
