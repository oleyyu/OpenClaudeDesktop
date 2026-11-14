import { linkDispatch, linkConfirmation } from './generated/code-editor/preview-link-decisions.mjs';
import { externalOnlyLink } from './generated/code-editor/preview-link-origin.mjs';

export function canRoutePreviewLink(url, event) {
  if (event && ((event.button ?? 0) !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey)) return false;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password && !externalOnlyLink(url);
  } catch { return false; }
}

// Local transport for source Qu. Original decisions control the chooser, while
// an ownership token prevents an old open from revealing another session.
export function createPreviewLinkRouter(host) {
  let owner = null, generation = 0, pending = null, confirmed = false;
  const listeners = new Set();
  const publish = () => { for (const listener of listeners) listener(); };
  const clear = () => { pending = null; confirmed = false; publish(); };
  const dispatch = async (sessionId, url) => {
    const token = ++generation;
    let result;
    try { result = await host.openPreview(sessionId, url); } catch { result = null; }
    if (token !== generation || owner !== sessionId) return;
    if (result?.opened) host.reveal(sessionId);
    else await host.openExternal(url);
  };
  return {
    getSnapshot: () => pending,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
    setOwner(sessionId) { if (owner !== sessionId) { owner = sessionId; generation++; clear(); } },
    request(url, event, available) {
      if (!owner || !available || !canRoutePreviewLink(url, event) || !host.linksEnabled()) return host.openExternal(url);
      const action = linkDispatch({ hasPendingUrl: true, explicit: false, chooserOpen: !!pending,
        chooserSeen: host.chooserSeen(), alreadyPrompted: false, settledAtUrlArrival: true,
        linksInPreview: host.linksEnabled(), infraOk: available });
      if (action === 'hold') return;
      if (action === 'prompt') { pending = { sessionId: owner, url }; confirmed = false; publish(); return; }
      if (action === 'dispatch') return dispatch(owner, url);
    },
    confirm() { confirmed = true; },
    close() {
      if (!pending) return;
      const { sessionId, url } = pending;
      const action = linkConfirmation({ explicit: false, confirmed, inPreview: host.linksEnabled() });
      clear();
      if (owner !== sessionId) return;
      if (action === 'keep') return dispatch(sessionId, url);
      if (action === 'release') return host.openExternal(url);
    },
    dispose() { generation++; owner = null; clear(); listeners.clear(); },
  };
}

export function createPreviewChooserStore() {
  let value = false, save;
  const listeners = new Set(), notify = () => { for (const listener of listeners) listener(); };
  return {
    getSnapshot: () => value,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
    connect(saved, writer) { save = writer; const next = saved === true; if (next !== value) { value = next; notify(); } },
    set(next) { const before = value; value = !!next; notify(); return Promise.resolve(save?.(value)).catch(error => { value = before; notify(); throw error; }); },
  };
}
export const previewChooserStore = createPreviewChooserStore();
