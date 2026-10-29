import React, { useMemo } from 'react';
import { parseSideChatUserText } from './generated/code-editor/side-chat-user-segments.mjs';
import { renderSideChatUserSegment, sideChatTextBreaks } from './generated/code-editor/side-chat-user-render.mjs';
import { detectSideChatSecrets as detectSecrets, maskSideChatSecret } from './generated/code-editor/side-chat-secrets.mjs';
import { SourceRedactedSecret } from './source-session.jsx';

// Current Bp/z: ordinary text and line breaks, with independently revealable
// secret runs. These are user messages, so links/fences stay literal.
function SideChatText({ text }) {
  const secrets = useMemo(() => detectSecrets(text), [text]);
  if (!secrets.length) return sideChatTextBreaks(text);
  const runs = [];
  let offset = 0;
  for (const secret of secrets) {
    if (secret.start > offset) runs.push(<React.Fragment key={`text-${offset}`}>{sideChatTextBreaks(text.slice(offset, secret.start))}</React.Fragment>);
    runs.push(<SourceRedactedSecret key={JSON.stringify([secret.start, secret.value])} value={secret.value} patternId={secret.patternId} maskValue={maskSideChatSecret}/>);
    offset = secret.end;
  }
  if (offset < text.length) runs.push(<React.Fragment key={`text-${offset}`}>{sideChatTextBreaks(text.slice(offset))}</React.Fragment>);
  return runs;
}
const renderText = text => <SideChatText text={text}/>;

// OT's ccd_user_message_lists_main branch is enabled locally. Both parser and
// recursive SP/xP renderer (c96d752d0, with list dir and bidi isolation) are extracted from the 3.6556.2 snapshot.
// cccc2cf0a HF `c`: the segments (YF = Ao(segment, index, BF)) sit in `div.flex flex-col gap-1.25`.
export function SourceSideChatUserContent({ text }) {
  const segments = useMemo(() => parseSideChatUserText(text), [text]);
  return <div className="flex flex-col gap-1.25">{segments.map((segment, index) => renderSideChatUserSegment(segment, index, renderText))}</div>;
}
