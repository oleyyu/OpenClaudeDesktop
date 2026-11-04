// W14-code r8 (r8pa-02): the Files editor's line comments, 3.6556.2 cd2efac6e Hu over the cc8941b7b store (F, the one the
// Changes pane keeps its comments in, source "file" here) and the official card c82eca2bd st (`oo`, canPostToGitHub
// false). The host's own card (FileCommentCard, `.sfv-comment-*`) and its comment store (file-comments-store.mjs, one
// localStorage list per editor) are gone; that list is read once into F (importLegacyFileComments below).
import React, { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { st as DiffAnnotationCard } from './generated/pierre-changes/pierre-c82eca2bd-CImI7zNG.mjs';
import { useDiffAnnotationStore, diffAnnotationActions, diffAnnotationKey, isFileAnnotationKey, useFileAnnotations, useFileAnnotationDrafts,
  Dt as useActiveAnnotationKey, W as annotationNotHeld, P as diffAnnotationBodies } from './generated/pierre-changes/pierre-cc8941b7b-DAgMZRvX.mjs';
// The F persist adapter (comment fields only, cross-window re-read) is set up by this module; its sync flag below.
import { subscribeCommentChanges } from './source-diff-comments.jsx';

/** The composer snippet a saved Files comment rides on (replaced on edit, removed on delete). */
export const fileCommentAttachmentKey = (scope, id) => `file-comment:${scope}:${id}`;
const isFileComment = (annotation) => annotation?.source === 'file';

/** The host's pre-r8 Files comments (localStorage `epitaxy-file-comments:<scope>`, entries {start, end, code, body,
 * savedBody?}), imported once into F for the editor's session and file: saved ones become source "file" annotations,
 * unsaved ones with text drafts (F does not persist drafts, as before r8 an empty one was dropped on unmount). The old
 * value is kept under FILE_COMMENTS_IMPORTED_PREFIX, so nothing is lost and nothing is imported twice. */
export const FILE_COMMENTS_PREFIX = 'epitaxy-file-comments:';
export const FILE_COMMENTS_IMPORTED_PREFIX = 'epitaxy-file-comments-imported:';
export function importLegacyFileComments({ storage, store, bodies, scope, sessionId, filePath }) {
  if (!storage || typeof scope !== 'string' || typeof filePath !== 'string') return 0;
  let raw = null, entries = [];
  try { raw = storage.getItem(FILE_COMMENTS_PREFIX + scope); } catch { return 0; }
  if (raw == null) return 0;
  try { entries = JSON.parse(raw); } catch { entries = []; }
  const state = () => store.getState(), before = state().activeBySession?.[sessionId] ?? null;
  let count = 0;
  for (const entry of Array.isArray(entries) ? entries : []) {
    if (!entry || !Number.isInteger(entry.start) || !Number.isInteger(entry.end) || entry.start < 1 || entry.end < entry.start || typeof entry.body !== 'string') continue;
    const code = typeof entry.code === 'string' ? entry.code.trimEnd() : '';
    const span = { filePath, side: 'additions', startLine: entry.start, endLine: entry.end, source: 'file', ...(code ? { snippet: code } : {}) };
    const key = diffAnnotationKey(span);
    if (typeof entry.savedBody === 'string' && entry.savedBody.trim()) {
      const same = (state().annotationsBySession?.[sessionId]?.[filePath] ?? []).some((annotation) => isFileComment(annotation)
        && annotation.startLine === entry.start && annotation.endLine === entry.end && annotation.body === entry.savedBody);
      if (!same) { state().addAnnotation(sessionId, { ...span, body: entry.savedBody }); count++; }
    } else if (entry.body.trim() && !state().draftsBySession?.[sessionId]?.[filePath]?.[key]) {
      state().setDraft(sessionId, span);
      bodies.getState().setDraftBody(sessionId, filePath, key, entry.body);
      count++;
    }
  }
  if (state().activeBySession?.[sessionId] !== before) state().setActive(sessionId, before);
  try { storage.setItem(FILE_COMMENTS_IMPORTED_PREFIX + scope, raw); storage.removeItem(FILE_COMMENTS_PREFIX + scope); } catch {}
  return count;
}
const hostStorage = () => { try { return globalThis.localStorage ?? null; } catch { return null; } };
const imported = new Set();

export function fileCommentSnippet(annotation, scope) {
  return { id: diffAnnotationKey(annotation), annotationId: annotation.id, start: annotation.startLine, end: annotation.endLine,
    code: annotation.snippet ?? '', body: annotation.body, savedBody: annotation.body, key: fileCommentAttachmentKey(scope, annotation.id), source: 'file' };
}
/** The file's source "file" annotations by id, for the composer bridge. */
export function fileComments(state, sessionId, filePath) {
  const out = new Map();
  for (const annotation of state.annotationsBySession?.[sessionId]?.[filePath] ?? []) if (isFileComment(annotation)) out.set(annotation.id, annotation);
  return out;
}

const { setDraft, setActive, clearDraft, clearHighlight, releaseActivationOrigin } = diffAnnotationActions;
const byLine = (a, b) => a.line - b.line;
/**
 * cd2efac6e Hu: `{slots, renderComment, activeRange, addComment}` while enabled, else null. slots are the cards' ids (F's
 * card keys, `file:${endLine}`) and end lines for the editor's comment widgets; renderComment(id) the official card;
 * activeRange the active card's lines (null for one line); addComment(start, end, code) opens a draft there or reopens the
 * draft / saved comment already at that key. Hu's onSaved (`requestComposerAction(submit ? "submit" : "focus")`) and the
 * composer's own read of F are the host's snippet bridge: each Files comment F saves, edits or removes for this file is
 * written to or taken out of the composer (onSaveComment / onDeleteComment, keyed by fileCommentAttachmentKey), and a
 * keyboard save focuses / submits it.
 */
export function useFileComments({ sessionId, filePath, scope, lang, enabled, onSaveComment, onDeleteComment }) {
  const session = sessionId ?? '';
  const on = !!enabled && typeof filePath === 'string';
  if (on && !imported.has(`${session}\0${scope}`)) {
    imported.add(`${session}\0${scope}`);
    importLegacyFileComments({ storage: hostStorage(), store: useDiffAnnotationStore, bodies: diffAnnotationBodies, scope, sessionId: session, filePath });
  }
  const instanceId = useId();
  const saved = useFileAnnotations(session, filePath);
  const drafts = useFileAnnotationDrafts(session, filePath);
  const activeKey = useActiveAnnotationKey(session, filePath);
  const created = useRef(new Set());
  // Hu's unmount: release this view's activation, a file highlight, and the empty drafts it opened.
  useEffect(() => {
    if (!on) return undefined;
    const mine = created.current;
    return () => {
      releaseActivationOrigin(session, filePath, instanceId);
      const state = useDiffAnnotationStore.getState(), active = state.activeBySession[session];
      if (active && isFileAnnotationKey(active.key)) clearHighlight(session, filePath);
      const open = state.draftsBySession[session]?.[filePath] ?? {}, texts = diffAnnotationBodies.getState().bodiesBySession[session]?.[filePath];
      for (const key of mine) if (open[key] !== undefined && !texts?.[key]?.trim()) clearDraft(session, filePath, key);
      mine.clear();
    };
  }, [on, session, filePath, instanceId]);
  const cards = useMemo(() => {
    const map = new Map();
    if (!on) return map;
    for (const [key, draft] of Object.entries(drafts)) if (isFileComment(draft)) map.set(key, { kind: 'draft', key, draft });
    for (const annotation of saved) if (isFileComment(annotation)) { const key = diffAnnotationKey(annotation); map.set(key, { kind: 'saved', key, annotation }); }
    return map;
  }, [on, saved, drafts]);
  const slots = useMemo(() => Array.from(cards, ([id, card]) => ({ id, line: card.kind === 'saved' ? card.annotation.endLine : card.draft.endLine })).sort(byLine), [cards]);
  const activeRange = useMemo(() => {
    const card = activeKey == null ? null : cards.get(activeKey);
    if (!card) return null;
    const { startLine, endLine } = card.kind === 'saved' ? card.annotation : card.draft;
    return startLine === endLine ? null : { from: startLine, to: endLine };
  }, [cards, activeKey]);

  const actions = useRef(null);
  actions.current = { onSaveComment, onDeleteComment, scope };
  const lastSaved = useRef(null);
  useEffect(() => {
    if (!on) return undefined;
    return subscribeCommentChanges(useDiffAnnotationStore, (state) => fileComments(state, session, filePath), {
      onSaved: (annotation) => { lastSaved.current = annotation; actions.current.onSaveComment?.(fileCommentSnippet(annotation, actions.current.scope), { viaKeyboard: false, submit: false }); },
      onRemoved: (annotation) => {
        if (lastSaved.current?.id === annotation.id) lastSaved.current = null;
        actions.current.onDeleteComment?.(fileCommentSnippet(annotation, actions.current.scope));
      },
    });
  }, [on, session, filePath]);
  const onSaved = useCallback((options) => {
    const annotation = lastSaved.current, { onSaveComment: save, scope: where } = actions.current;
    if (annotation && save) save(fileCommentSnippet(annotation, where), { viaKeyboard: true, submit: options?.submit === true });
  }, []);

  const renderComment = useCallback((id) => {
    const card = cards.get(id);
    return card ? <DiffAnnotationCard sessionId={session} filePath={filePath} cardKey={card.key} instanceId={instanceId}
      annotation={card.kind === 'saved' ? card.annotation : undefined} draft={card.kind === 'draft' ? card.draft : undefined}
      isActive={activeKey === card.key} onSaved={onSaved} canPostToGitHub={false} /> : null;
  }, [cards, session, filePath, instanceId, activeKey, onSaved]);
  const addComment = useCallback((start, end, code) => {
    if (!on) return;
    const span = { filePath, side: 'additions', startLine: Math.min(start, end), endLine: Math.max(start, end), source: 'file' };
    const key = diffAnnotationKey(span), state = useDiffAnnotationStore.getState();
    if (state.draftsBySession[session]?.[filePath]?.[key] !== undefined
      || (state.annotationsBySession[session]?.[filePath]?.some((annotation) => diffAnnotationKey(annotation) === key && annotationNotHeld(state, session, annotation.id)) ?? false)) {
      setActive(session, { filePath, key, originId: instanceId });
      return;
    }
    setDraft(session, { ...span, snippet: String(code ?? '').trimEnd() || undefined, lang }, instanceId);
    created.current.add(key);
  }, [on, session, filePath, lang, instanceId]);
  return on ? { slots, renderComment, activeRange, addComment } : null;
}
