import { responseFileReference } from './response-link-model.mjs';

// Default word mode from markdown-current qo/as. No network, timer or DOM.
export const RESPONSE_FADE_MS = 200;
export const RESPONSE_SETTLE_MS = 1000;
export function createResponseRevealLedger(initialText = '', now = () => performance.now()) {
  let previous = initialText, primed = initialText.length > 400;
  let pass = 0, serial = 0, batch = null, opened = 0, scheduled = 0, horizon = 0;
  const words = new Map();
  const close = time => { batch = null; horizon = time; };
  const settled = entry => entry.done || (horizon >= entry.endsAt && (entry.done = true));
  return {
    begin(text) {
      const time = now(); pass++;
      if (!text.startsWith(previous)) {
        for (const entry of words.values()) entry.done = true;
        close(time);
      } else if (batch && time - opened >= 100 && /\s\S/.test(previous.slice(-1) + text.slice(previous.length))) close(time);
      if (text !== previous) primed = false;
      previous = text;
    },
    reveal(key, length) {
      if (words.has(key)) return words.get(key);
      if (primed) {
        const entry = { id: ++serial, done: true, startsAt: 0, endsAt: 0 };
        words.set(key, entry); return entry;
      }
      const time = now(), limit = batch?.pass === pass ? 16 : 48;
      if (!batch || batch.chars + length > limit) {
        if (!batch) opened = time;
        scheduled = Math.min(Math.max(time, scheduled) + length * 2.5, time + 600);
        batch = { id: ++serial, pass, chars: 0, startsAt: time + Math.round(scheduled - time), delay: Math.round(scheduled - time), endsAt: 0, done: false };
      } else scheduled = Math.min(scheduled + length * 2.5, time + 600);
      batch.chars += length;
      batch.endsAt = Math.max(batch.endsAt, time + batch.delay + RESPONSE_FADE_MS);
      words.set(key, batch); return batch;
    },
    settled,
    finish() { for (const entry of words.values()) entry.done = true; words.clear(); batch = null; },
  };
}

// Preserve every UTF-16 code unit (including CJK, emoji, CRLF and whitespace).
export const responseWords = text => text.match(/(?:^\s+)?\S+\s*/g) || [];

const atomic = new Set(['code', 'kbd', 'sup', 'response-math']);
const blocks = new Set(['p','h1','h2','h3','h4','h5','h6','ul','ol','li','blockquote','table','thead','tbody','tr','td','th','section']);
const ignored = new Set(['pre','img','input','button','script','style']);
const textLength = node => node.type === 'text' ? node.value.length : node.tagName === 'response-math'
  ? String(node.properties?.value || '').length : (node.children || []).reduce((sum, child) => sum + textLength(child), 0);

// Source hi/mi + el: a plain label is one atom, but formatted descriptive
// labels reveal their children. Simple formatted file labels display the
// destination; its length schedules the atom without changing sibling offsets.
export function responseLinkRevealLength(node) {
  const children = node.children || [];
  if (children.length === 1 && children[0].type === 'text') return children[0].value.length;
  const href = node.properties?.href;
  if (!responseFileReference(href)) return null;
  let label = '';
  for (const child of children) {
    if (child.type === 'text') { label += child.value; continue; }
    if (child.type !== 'element' || !['strong', 'em', 'code'].includes(child.tagName)
      || child.children?.length !== 1 || child.children[0].type !== 'text') return null;
    label += child.children[0].value;
  }
  if (!label || /\s/.test(label)) return null;
  try { return decodeURI(href).length; } catch { return href.length; }
}
const wrapper = (children, entry) => {
  // ReactMarkdown reparses a growing paragraph. Retain previously painted
  // shells until end-of-stream cleanup so native selections keep their nodes.
  entry.decorated = true;
  return {type:'element',tagName:'span',properties:{className:['smd-word-reveal'],'data-response-reveal':'','data-wf':''},data:{responseReveal:entry},children};
};

// HAST decoration runs before React's existing link/chip/code handlers. Keep
// original children for atomic links so shortening and file chips still work.
export function decorateResponseReveal(tree, ledger, blockOffset = null) {
  if (!ledger) return tree;
  const walk = (parent, namespace, cursor) => {
    const next = [];
    let blockIndex = 0;
    for (const child of parent.children || []) {
      if (child.type === 'text') {
        const parts = responseWords(child.value);
        if (!parts.length) { next.push(child); cursor.offset += child.value.length; continue; }
        let current = null;
        for (const text of parts) {
          const entry = ledger.reveal(`${namespace}:${cursor.offset}`, text.length);
          cursor.offset += text.length;
          if (ledger.settled(entry) && !entry.decorated) { next.push({type:'text',value:text}); current = null; }
          else if (current?.data.responseReveal === entry) current.children[0].value += text;
          else { current = wrapper([{type:'text',value:text}],entry); next.push(current); }
        }
      } else if (child.type !== 'element' || ignored.has(child.tagName) || child.tagName === 'response-math' && child.properties?.display) {
        next.push(child); cursor.offset += textLength(child);
      } else if (atomic.has(child.tagName) || child.tagName === 'a' && responseLinkRevealLength(child) !== null) {
        const length = textLength(child), revealLength = child.tagName === 'a' ? responseLinkRevealLength(child) : length;
        const entry = ledger.reveal(`${namespace}:${cursor.offset}`, revealLength);
        cursor.offset += length;
        next.push(length && (!ledger.settled(entry) || entry.decorated) ? wrapper([child],entry) : child);
      } else {
        if (blocks.has(child.tagName)) walk(child,`${namespace}.b${blockIndex++}`,{offset:0});
        else walk(child,namespace,cursor);
        next.push(child);
      }
    }
    parent.children = next;
  };
  walk(tree,blockOffset===null?'message':`message.r${blockOffset}`,{offset:0});return tree;
}
export function rehypeResponseReveal({ ledger, blockOffset = null }) { return tree => { decorateResponseReveal(tree,ledger,blockOffset); }; }
