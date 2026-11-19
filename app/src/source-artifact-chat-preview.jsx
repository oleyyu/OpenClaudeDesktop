// U-49: the Artifacts library's Chat artifact preview, the host answer for the official ChatArtifactPreview
// (3.6556.2 cbbbbbd87 N, 4.16336.0 c33ae67d6 j), which src/source-artifact-v3-adapters.jsx and
// src/source-artifact-library-v4-adapters.jsx export. Followed from the official:
//   - a published artifact's screenshot (`/public/artifacts/{uuid}/screenshot`): none here (no claude.ai publishing);
//   - markdown with preview text: the Chat text renderer (c89efce1a s, StandardMarkdown) in `artifact-markdown-preview`
//     with leftAlignTableHeaders, no code header, links inert (onLinkClick preventDefault), smartQuotes off (the
//     GrowthBook flag cfc0d8c26 t is not served), inside "text-[0.6rem] leading-[0.8rem] p-4 … font-claude-response";
//   - text or code with preview text: the text itself, "whitespace-pre-wrap text-[0.6rem] leading-[0.8rem] p-4
//     font-mono-ui [overflow-wrap:anywhere]";
//   - otherwise the type icon (N / F): Image for SVG, Atom for HTML / React, else Note, size lg, text-muted-as-secondary.
// The chunk's inline stylesheet cf9803775 (.artifact-markdown-preview) is source-artifact-chat-preview.css, verbatim.
// Concrete generated files, not facades (E41): the artifact library sits under the chat graph.
import { StandardMarkdown } from './generated/chat-renderer/c89efce1a-C_nlrFif.mjs';
import { CdsIcon } from './generated/view-tabs/shared-frame-6jtSkIit.js';
import './source-artifact-chat-preview.css';

// shared-104 Pt / shared-153 J: the artifact MIME types.
const ARTIFACT_TYPE = { Text: 'text/plain', Markdown: 'text/markdown', Html: 'text/html', Code: 'application/vnd.ant.code',
  Svg: 'image/svg+xml', React: 'application/vnd.ant.react' };
const inertLink = (event) => event.preventDefault();

function ChatArtifactTypeIcon({ type }) {
  const name = type === ARTIFACT_TYPE.Svg ? 'Image' : type === ARTIFACT_TYPE.Html || type === ARTIFACT_TYPE.React ? 'Atom' : 'Note';
  return <div data-gallery-type-media="" className="flex items-center justify-center w-full h-full text-muted-as-secondary">
    <CdsIcon name={name} size="lg" />
  </div>;
}

export function ChatArtifactPreview({ type, preview }) {
  if (preview && type === ARTIFACT_TYPE.Markdown) {
    return <div className="text-[0.6rem] leading-[0.8rem] p-4 [overflow-wrap:anywhere] font-claude-response text-primary">
      <StandardMarkdown leftAlignTableHeaders text={preview} flagShowCodeHeader={false} onLinkClick={inertLink}
        className="artifact-markdown-preview" smartQuotes={false} />
    </div>;
  }
  if (preview && (type === ARTIFACT_TYPE.Text || type === ARTIFACT_TYPE.Code)) {
    return <div className="whitespace-pre-wrap text-[0.6rem] leading-[0.8rem] p-4 font-mono-ui [overflow-wrap:anywhere]">{preview}</div>;
  }
  return <ChatArtifactTypeIcon type={type} />;
}
