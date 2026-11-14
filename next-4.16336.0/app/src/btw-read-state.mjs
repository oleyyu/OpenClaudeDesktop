// R2-btw NBS-5: host adapter for the two declarations of 2.42304.0 shared-11 that the generated shown-session registry
// (generated/btw-pane/shown-session.mjs: v_ / x_) reads.
//
//   y_ (`unreadStore`): the official renderer unread store (zustand, persisted as "epitaxy-unread-v1"). v_ reads
//      `getState().unreadIds.includes(id)` and calls `markRead(id)`; x_ calls `markUnread(id)`. Locally the unread
//      state is `sessionMetadata[id].unread`, kept by main.cjs (sidebar-state "metadata"): a read is `{unread:false}`
//      and the automatic mark is `{unread:true}` with `automatic` (main drops it while a window's layout shows the row).
//   h_ (`paneSessions`): the sessions the window's panes show (set by g_ from c702f5cd1). Locally: the open session
//      or one a split side shows.
//
// The primary side (side 0) binds the host: it is the side that reports turn results (main.jsx), and it lives as
// long as its window. A later binding wins until it unbinds, so a remount never leaves a stale one in charge.
//
// R4g-btw BT1 (X7-15): the official y_ persists through shared-52 $p (localStorage), so zustand hydrates it while the
// store is created and v_'s mount check `unreadIds.includes(e)` always reads the stored state. The local state is the
// main process's sessionMetadata, which reaches the renderer later (sidebar-state), so a /btw child shown before its
// record arrives would never be checked. Such a probe (no record for the id yet) is kept, and when the record arrives the
// mount check runs once on it, for as long as the child is still registered in the original shown list (__, asked
// through the original x_ with the pane set and the write held back). Later updates of the record do not repeat it:
// v_ checks once per mount, and the official rehydrate hook (onRehydrateStorage) re-marks only the open session (m_).
//
// R4g-btw BT3 (X7-14): x_ also skips a child in __, and the official popouts are window.open children of the one
// renderer (cd377abb5 `window.open("about:blank",j,"")`), so __ covers every window there. Locally each window is its
// own renderer and the automatic unread mark is decided by main.cjs over the windows' layouts (sidebar-state
// "metadata"). useReportShownSession keeps this renderer's list beside __ (registered and released as v_ does, every
// split side included) and the bound host reports it ("window-side-sessions"); window-registry.cjs layoutSessions counts it.
import { useEffect, useRef } from 'react';
import { markUnreadUnlessShown } from './generated/btw-pane/shown-session.mjs';

const hosts = [];
const deferred = new WeakMap();
let probe = null;
// X7-14: the children this renderer's session tiles show (one registration per mount, as __), and what each host
// reported last.
const reported = [];
const sent = new WeakMap();
let flushQueued = false;

function flushShown() {
  flushQueued = false;
  const host = live();
  if (typeof host?.reportShown !== 'function') return;
  const ids = [...new Set(reported)];
  const key = ids.join('\n');
  if (sent.get(host) === key) return;
  sent.set(host, key);
  host.reportShown(ids);
}
function queueFlush() {
  if (flushQueued) return;
  flushQueued = true;
  queueMicrotask(flushShown);
}

// The /btw child a session tile shows (the id main.jsx gives useShownSession), reported for the other windows.
export function useReportShownSession(id) {
  useEffect(() => {
    if (id === undefined) return undefined;
    reported.push(id);
    queueFlush();
    return () => {
      const index = reported.lastIndexOf(id);
      if (index !== -1) reported.splice(index, 1);
      queueFlush();
    };
  }, [id]);
}

export function shownSideSessions() {
  return [...new Set(reported)];
}

export function bindBtwReadState(host) {
  hosts.push(host);
  if (!deferred.has(host)) deferred.set(host, new Set());
  queueFlush();
  return () => {
    const index = hosts.lastIndexOf(host);
    if (index !== -1) hosts.splice(index, 1);
    queueFlush();
  };
}

const live = () => hosts[hosts.length - 1] ?? null;
const has = (metadata, id) => Object.prototype.hasOwnProperty.call(metadata, id);

export const unreadStore = {
  getState: () => {
    const host = live();
    const metadata = host?.metadata() ?? {};
    const unreadIds = Object.keys(metadata).filter((id) => metadata[id]?.unread === true);
    // v_'s mount check; the only caller of includes on this list. Not enumerable, so the list still reads as an array.
    if (host) Object.defineProperty(unreadIds, 'includes', { value: (id, from) => {
      const hit = Array.prototype.includes.call(unreadIds, id, from);
      if (!hit && typeof id === 'string' && !has(metadata, id)) deferred.get(host)?.add(id);
      return hit;
    } });
    return {
      unreadIds,
      markRead: (id) => host?.markRead(id),
      markUnread: (id) => { if (probe) probe.hidden = true; else host?.markUnread(id); },
    };
  },
};

export const paneSessions = { has: (id) => !probe && live()?.paneShows(id) === true };

// x_ with the pane set (h_) answering no and markUnread recording instead of writing: whether __ still lists the id.
function stillShown(id) {
  probe = { hidden: false };
  try { markUnreadUnlessShown(id); return !probe.hidden; } finally { probe = null; }
}

// Runs the kept mount checks whose records have arrived; a child no longer shown drops its probe.
export function settleDeferredReads(host) {
  const waiting = deferred.get(host);
  if (!waiting?.size || live() !== host) return;
  const metadata = host.metadata() ?? {};
  for (const id of [...waiting]) {
    const arrived = has(metadata, id);
    if (!arrived && stillShown(id)) continue;
    waiting.delete(id);
    if (arrived && metadata[id]?.unread === true && stillShown(id)) host.markRead(id);
  }
}

// main.jsx side 0: binds its live sidebar metadata and metadata writer for as long as it is mounted. The values are
// read through a ref, so the binding never closes over one render's metadata.
// Each new metadata snapshot settles the mount checks kept while records were missing (X7-15); this effect is declared
// before main.jsx's useShownSession, so a child mounting in the same render is checked by v_ itself.
export function useBtwReadStateHost(enabled, values) {
  const latest = useRef(values);
  latest.current = values;
  const bound = useRef(null);
  useEffect(() => {
    if (!enabled) return undefined;
    const host = {
      metadata: () => latest.current.metadata,
      markRead: (id) => Promise.resolve(latest.current.update(id, { unread: false })).catch((error) => latest.current.onReadError?.(error)),
      markUnread: (id) => Promise.resolve(latest.current.update(id, { unread: true }, { automatic: true })).catch(() => {}),
      paneShows: (id) => latest.current.paneShows?.(id) === true,
      reportShown: (ids) => { try { Promise.resolve(latest.current.reportShown?.(ids)).catch(() => {}); } catch {} },
    };
    bound.current = host;
    const unbind = bindBtwReadState(host);
    return () => { if (bound.current === host) bound.current = null; unbind(); };
  }, [enabled]);
  useEffect(() => { if (bound.current) settleDeferredReads(bound.current); }, [enabled, values.metadata]);
}
