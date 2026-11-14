import {showsThinking} from './transcript-view-model.mjs';

// The summary when the model gives one; else the raw reasoning (ReasoningItem.content, streamed as
// item/reasoning/textDelta into rawReasoningText), which relays and open-weights models return instead.
// Each ReasoningItem.summary part is its own section (a bold heading and its paragraph), so sections are
// separated by a blank line, as state.js does for item/reasoning/summaryPartAdded while streaming.
const parts = (list, separator = '\n') => (Array.isArray(list) ? list : []).map(part => typeof part === 'string' ? part : part?.text || '')
  .filter(text => separator === '\n' || text.trim()).join(separator);
export function reasoningText(item) {
  return parts(item?.summary, '\n\n') || item?.reasoningText || parts(item?.content) || item?.rawReasoningText || '';
}

// Visibility must be resolved before segmentation as well as rendering.
// Keep these items in the presentation list for real turn-footer anchors.
export function isHiddenTranscriptItem(item, view = 'normal') {
  if (item.type === 'reasoning') return !showsThinking(view) || !reasoningText(item).trim();
  if (item.type === 'agentMessage' || item.type === 'plan') return !(item.text || '').trim();
  return false;
}
