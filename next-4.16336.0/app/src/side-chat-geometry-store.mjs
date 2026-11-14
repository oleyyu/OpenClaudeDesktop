import { readSideChatPanelRect } from './generated/code-editor/side-chat-persistence.mjs';
import { browserStorage } from './composer-draft-store.mjs';

// c593f7513 provider Es({persistKey:"epitaxy.sideChat.v1"}) / c03935b01 Qn.
// Only geometry persists: messages, quotes and draft text stay in memory.
export const SIDE_CHAT_GEOMETRY_KEY = 'epitaxy.sideChat.v1';
export function createSideChatGeometryStore({ storage = browserStorage(), key = SIDE_CHAT_GEOMETRY_KEY } = {}) {
  let rect = readSideChatPanelRect(storage, key);
  return {
    get: () => rect,
    set(value) {
      rect = { left:value.left, top:value.top, width:value.width, height:value.height,
        ...(value.viewport ? {viewport:{width:value.viewport.width,height:value.viewport.height}} : {}) };
      try { storage?.setItem(key, JSON.stringify(rect)); } catch {}
    },
  };
}
export const sideChatGeometryStore = createSideChatGeometryStore();
