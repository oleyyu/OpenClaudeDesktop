import { serializeSelectedElement } from './generated/code-editor/preview-element-serialization.mjs';
import { selectedElementLabel, selectedElementScreenshot } from './generated/code-editor/preview-element-label.mjs';

// The renderer receives page data only from its own native view. A delayed
// selection is not a request to switch sessions or resurrect an old draft.
export function ownsSelectedElement(event, { sessionId, instanceId, tabId }) {
  return typeof sessionId === 'string' && sessionId.length > 0
    && typeof instanceId === 'string' && instanceId.length > 0
    && typeof tabId === 'string' && tabId.length > 0
    && event?.kind === 'preview-element-selected'
    && event.sessionId === sessionId && event.instanceId === instanceId
    && event.tabId === tabId && !!event.context;
}

let sequence = 0;
export function makeSelectedElementAttachment(context, { id, previewId, tabId, asFile = false } = {}) {
  if (!context || context.source === 'simulator' || typeof context.tagName !== 'string'
    || !Array.isArray(context.classes) || !context.computedStyles) {
    throw new TypeError('Expected a captured browser element');
  }
  const value = { ...context, origin: { previewId, tabId } };
  return {
    id: id ?? `element-${Date.now().toString(36)}-${sequence++}`,
    kind: 'elementContext', status: value.screenshot ? 'loading' : 'ready',
    context: value, name: selectedElementLabel(value),
    mime: 'image/png', path: '', previewUrl: selectedElementScreenshot(value) ?? '',
    ...(asFile ? { asFile: true } : {}),
  };
}

function equalData(a, b) {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a), other = Object.keys(b);
  return keys.length === other.length && keys.every(key => Object.hasOwn(b, key) && equalData(a[key], b[key]));
}

// c9ab8b233 a/push: replace an identical capture only when it has an origin,
// nonempty screenshot and nonempty bounds. Separate pages/picks remain separate.
export function addSelectedElementAttachment(entries, entry) {
  const context = entry.context;
  const comparable = context.origin !== undefined && !!context.screenshot
    && context.boundingBox?.width > 0 && context.boundingBox?.height > 0;
  const index = comparable ? entries.findIndex(item => item.kind === 'elementContext' && equalData(item.context, context)) : -1;
  return index < 0 ? [...entries, entry] : entries.map((item, at) => at === index ? { ...entry, id: item.id } : item);
}

// The official serializer owns all page-data escaping. Only its image transport
// changes: this app's cores consume staged local paths instead of base64 blocks.
// A failed/unfinished PNG must never silently become a text-only selection.
export function selectedElementInputs(entries, { fileMentions = true } = {}) {
  return entries.filter(entry => entry.kind === 'elementContext').flatMap(entry => {
    if (entry.status !== 'ready' || (entry.context.screenshot && !entry.path)) {
      throw new Error('Selected element screenshot is not ready');
    }
    return serializeSelectedElement(entry.context).flatMap(part => {
      if (part.type === 'text') return [{ type: 'text', text: `${part.text}\n\n`, text_elements: [] }];
      if (!entry.asFile) return [{ type: 'localImage', path: entry.path }];
      return [
        ...(!fileMentions ? [{ type: 'text', text: `\n\n[Attached file: ${entry.path}]`, text_elements: [] }] : []),
        { type: 'mention', name: 'element-screenshot.png', path: entry.path },
      ];
    });
  });
}
