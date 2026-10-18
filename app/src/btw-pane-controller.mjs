// Host transport for c73f45bc3 Ns/Fs: independent creation/send, late-child
// cleanup, 20s opening deadline, and 3s grace for an outstanding close.
export function createBtwPaneController({ start, close, send, show, hide, currentView, listChildren,
  isParentVisible, isOpenElsewhere = () => false, epoch, registered = () => {}, fallback, restoreDraft,
  captureFocus = () => undefined,
  requestId = () => crypto.randomUUID(), setTimer = setTimeout, clearTimer = clearTimeout }) {
  const attempts = new Map(), closings = new Map(), pending = new Map(), archived = new Set();
  function closeChild(parentId, childId) {
    if (!childId || isOpenElsewhere(childId)) return Promise.resolve();
    if (closings.has(childId)) return closings.get(childId);
    const promise = Promise.resolve().then(() => close(childId)).then(result => {
      if (result?.status === 'archived') archived.add(childId);
      return result;
    }).catch(() => {}).finally(() => {
      if (closings.get(childId) === promise) closings.delete(childId);
    });
    closings.set(childId, promise); return promise;
  }
  async function waitForClose(children) {
    const jobs = children.map(child => closings.get(child.id)).filter(Boolean);
    if (!jobs.length) return;
    let timer;
    try { await Promise.race([Promise.allSettled(jobs), new Promise(resolve => { timer = setTimer(resolve, 3000); })]); }
    finally { clearTimer(timer); }
  }
  function onPaneClosed(parentId, childId) {
    // Invalidate a pending open so a late result cannot reopen a closed pane.
    attempts.set(parentId, (attempts.get(parentId) ?? 0) + 1);
    return closeChild(parentId, childId);
  }
  function closePane(parentId) {
    const child = currentView(parentId); hide(parentId);
    return onPaneClosed(parentId, child);
  }
  async function open({ parentId, question = '', context = null, permission, forceNew = false, askedAt = captureFocus() }) {
    const initialEpoch = epoch(), text = question.trim();
    const bare = !text && context === null;
    if (bare && !forceNew && currentView(parentId)) return closePane(parentId);
    if (bare && !forceNew && pending.has(parentId)) return;
    if (bare && !forceNew) {
      const children = listChildren(parentId);
      await waitForClose(children);
      if (epoch() !== initialEpoch || !isParentVisible(parentId)) return;
      if (pending.has(parentId)) return;
      const recent = [...listChildren(parentId)].sort((a, b) => b.createdAt - a.createdAt).find(child => !child.archived && !archived.has(child.id) && !closings.has(child.id) && !isOpenElsewhere(child.id));
      if (recent) { show(parentId, recent.id, { askedAt }); return recent.id; }
    }
    const sequence = (attempts.get(parentId) ?? 0) + 1;
    attempts.set(parentId, sequence); pending.set(parentId, (pending.get(parentId) ?? 0) + 1);
    let timedOut = false, timer;
    const opening = Promise.resolve().then(() => start({ parentId, permission, question: text,
      requestId: requestId(), openedBy: context !== null ? 'selection' : text ? 'question' : 'bare' }));
    opening.then(result => { if (timedOut && result?.status === 'started') void closeChild(parentId, result.sessionId); }, () => {});
    let result;
    try { result = await Promise.race([opening, new Promise(resolve => { timer = setTimer(() => { timedOut = true; resolve(null); }, 20000); })]); }
    catch { result = null; }
    finally {
      clearTimer(timer);
      const remaining = (pending.get(parentId) ?? 1) - 1;
      if (remaining) pending.set(parentId, remaining); else pending.delete(parentId);
    }
    const sameEpoch = epoch() === initialEpoch;
    if (!result || result.status !== 'started') {
      if (sameEpoch && attempts.get(parentId) === sequence) fallback({ parentId, question: text, context });
      return;
    }
    const id = result.sessionId;
    if (!sameEpoch || result.connectionChanged || (!text && (!isParentVisible(parentId) || attempts.get(parentId) !== sequence))) { void closeChild(parentId, id); return; }
    registered(result);
    const selected = isParentVisible(parentId) && attempts.get(parentId) === sequence;
    if (selected) show(parentId, id, { askedAt });
    if (context !== null && !text) restoreDraft(id, `> ${String(context).replace(/\n/g, '\n> ')}\n\n`);
    if (text) {
      const message = context === null ? text : `> ${String(context).replace(/\n/g, '\n> ')}\n\n${text}`;
      try { await send(id, message); }
      catch (error) {
        if (epoch() !== initialEpoch) return;
        // A visible child keeps the user's input for retry; never duplicate an
        // uncertain send by automatically asking it again on another transport.
        restoreDraft(id, message, error);
      }
    }
    return id;
  }
  return { open, closePane, closeChild, onPaneClosed, isClosing: id => closings.has(id), isOpening: id => pending.has(id) };
}

export function btwChildren(sessions, metadata, parentId) {
  return sessions.filter(thread => {
    const meta = metadata[thread.id], from = meta?.spawnedFrom;
    return from?.btw === true && from.sideSession === true && from.userFork === true && !meta.lineageDetached && from.sessionId === parentId;
  }).map(thread => ({ ...thread, createdAt: metadata[thread.id]?.btw?.createdAt ?? 0 })).sort((a, b) => a.createdAt - b.createdAt);
}
// Current NT / FT: the active tab remains present even if it was archived or
// its metadata is still arriving. Closing chooses the next, then previous
// eligible neighbor; it does not steal a session already open elsewhere.
export function btwPaneTabs(sessions, metadata, parentId, activeId) {
  const tabs=btwChildren(sessions,metadata,parentId).filter(thread=>!thread.archived||thread.id===activeId);
  if(activeId&&!tabs.some(thread=>thread.id===activeId))tabs.push(sessions.find(thread=>thread.id===activeId)??{id:activeId});
  return tabs;
}
export function nextBtwTab(tabs, id, openElsewhere=()=>false) {
  const index=tabs.findIndex(tab=>tab.id===id);
  return [tabs[index+1],tabs[index-1]].find(tab=>tab&&!openElsewhere(tab.id))??null;
}
export function ownBtwItems(items, meta) {
  const ids = new Set(meta?.btw?.ownTurnIds ?? []);
  return (items ?? []).filter(item => ids.has(item.turnId));
}

export function createBtwDraftStore(storage = null) {
  const key = 'openclaude-btw-drafts', listeners = new Set();
  let drafts = {};
  try { const saved = JSON.parse(storage?.getItem(key) ?? '{}'); if (saved && typeof saved === 'object' && !Array.isArray(saved)) drafts = Object.fromEntries(Object.entries(saved).filter(([id, value]) => id && typeof value === 'string')); } catch {}
  const notify = () => { try { storage?.setItem(key, JSON.stringify(drafts)); } catch {} for (const listener of listeners) listener(); };
  return { subscribe: callback => { listeners.add(callback); return () => listeners.delete(callback); },
    get: id => drafts[id] ?? '', set(id, value) { if (!id || typeof value !== 'string') return; drafts = { ...drafts, [id]: value }; notify(); },
    restore(id, value) { if (!drafts[id]) { drafts = { ...drafts, [id]: value }; notify(); } } };
}
