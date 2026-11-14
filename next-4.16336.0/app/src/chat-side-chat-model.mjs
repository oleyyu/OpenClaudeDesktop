// w13-close-chat-sidechat (G9, E63 chatfn-branches-09): plain facts the host computes for the 3.6556.2 Chat side chat
// (src/generated/chat-side-chat, ca2ef848d T1). Plain node: no React, no view-tabs (E42).

// T1's send (v1) does nothing while `organizationUuid` is null (`!o || !t || !n`); a local chat belongs to no claude.ai
// organization (E59), so the host passes this placeholder. It never leaves the renderer: the local stream adapter
// (streamChatSideQuestion) ignores it.
export const CHAT_SIDE_CHAT_ORGANIZATION = 'local';

// shared-1 LV btw_side_chat: `shortcut: { bindings: [{ key: ";", modifiers: ["cmd"], platform: "mac" }, { key: ";",
// modifiers: ["ctrl"], platform: "non-mac" }] }`, description pF "Toggle side chat" (fg0STV1kTX).
export const SHORTCUT_BINDINGS = Object.freeze({
  btw_side_chat: Object.freeze([
    Object.freeze({ key: ';', modifiers: Object.freeze(['cmd']), platform: 'mac' }),
    Object.freeze({ key: ';', modifiers: Object.freeze(['ctrl']), platform: 'non-mac' }),
  ]),
});
export const SHORTCUT_DESCRIPTIONS = Object.freeze({ btw_side_chat: 'Toggle side chat' });

/** shared-1 WV's binding filter: a command's bindings for this platform (`platform` / `app` absent or matching). */
export function shortcutBindings(commandId, { mac, app = 'desktop' }) {
  const platform = mac ? 'mac' : 'non-mac';
  return (SHORTCUT_BINDINGS[commandId] ?? []).filter((binding) => (!('platform' in binding) || binding.platform === platform)
    && (!('app' in binding) || binding.app === app));
}
/** shared-1 KV: `[...modifiers, key].join("+")`. */
export const shortcutString = (binding) => (binding ? [...binding.modifiers, binding.key].join('+') : undefined);
/** shared-1 GV: whether a keydown is exactly this binding (code or key, and the four modifiers; AltGr is not Ctrl+Alt). */
export function shortcutMatches(event, binding) {
  if (binding.code) { if (event.code !== binding.code) return false; }
  else if (!event.key || event.key.toLowerCase() !== binding.key.toLowerCase()) return false;
  const modifiers = new Set(binding.modifiers), cmd = modifiers.has('cmd'), ctrl = modifiers.has('ctrl'),
    shift = modifiers.has('shift'), alt = modifiers.has('alt');
  return !((ctrl && alt && !cmd && event.getModifierState?.('AltGraph')) || event.metaKey !== cmd || event.ctrlKey !== ctrl
    || event.shiftKey !== shift || event.altKey !== alt);
}

/**
 * ca2ef848d `tc = G.length`: how many messages of the main chat the side chat sees (x1 "Sees N messages from main
 * chat"). G is the displayed branch's human and assistant messages; a local transcript keeps one userMessage item per
 * turn and may split the reply into several agentMessage items, so a turn's reply counts once.
 */
export function chatSideChatInheritedCount(items) {
  let count = 0;
  const answered = new Set();
  for (const item of Array.isArray(items) ? items : []) {
    if (item?.type === 'userMessage') count++;
    else if (item?.type === 'agentMessage') {
      const turn = item.turnId ?? item.id;
      if (turn === undefined || !answered.has(turn)) { count++; if (turn !== undefined) answered.add(turn); }
    }
  }
  return count;
}

/**
 * T1 L ("Branch to new chat"): `s.push(\`/new?q=${encodeURIComponent(r)}\`)`. The host has no /new route; it reads the
 * prompt back out and fills a new chat's composer with it (c5e8ef052: `/new?q=` prefills, it does not send). Any other
 * href is not a branch: null.
 */
export function chatSideChatBranchText(href) {
  if (typeof href !== 'string' || !href.startsWith('/new?')) return null;
  const text = new URLSearchParams(href.slice('/new?'.length)).get('q');
  return text === null || text === '' ? null : text;
}
